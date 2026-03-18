/**
 * OpenCode Adapter for rd3:cc-agents
 *
 * Parses OpenCode agent definitions (Markdown or JSON config) into UAM,
 * validates agents for OpenCode compatibility, and generates
 * OpenCode-native agent .md files from UAM.
 *
 * OpenCode agent format (dual input):
 * - Markdown .md file with YAML frontmatter (similar to Claude but with OpenCode fields)
 * - JSON config block with tools as boolean map, steps, mode, hidden, permissions
 *
 * Key field mappings (UAM <-> OpenCode):
 * - maxTurns <-> steps
 * - tools (array) <-> tools (map with boolean values)
 * - hidden (OpenCode-only)
 * - permissions (OpenCode-only)
 * - temperature (direct)
 * - color (direct)
 */

import { join } from 'node:path';
import type {
    AgentAdapterContext,
    AgentAdapterResult,
    AgentParseResult,
    AgentPlatform,
    OpenCodeAgentConfig,
    UniversalAgent,
} from '../types';
import { VALID_OPENCODE_AGENT_FIELDS } from '../types';
import { parseFrontmatter, serializeFrontmatter } from '../utils';
import { BaseAgentAdapter } from './base';

// ============================================================================
// Options
// ============================================================================

export interface OpenCodeAgentAdapterOptions {
    /** Validate tools map format */
    validateToolsMap?: boolean;
    /** Warn about dropped fields */
    warnDroppedFields?: boolean;
}

// ============================================================================
// OpenCode Agent Adapter
// ============================================================================

/**
 * OpenCode Agent Adapter.
 *
 * Handles bidirectional conversion between OpenCode agent definitions
 * (Markdown or JSON config) and the Universal Agent Model (UAM).
 */
export class OpenCodeAgentAdapter extends BaseAgentAdapter {
    readonly platform: AgentPlatform = 'opencode';
    readonly displayName = 'OpenCode';
    private options: OpenCodeAgentAdapterOptions;

    constructor(options: OpenCodeAgentAdapterOptions = {}) {
        super();
        this.options = {
            validateToolsMap: true,
            warnDroppedFields: true,
            ...options,
        };
    }

    /**
     * Parse an OpenCode agent definition into UAM.
     * Supports dual input: Markdown with frontmatter OR JSON config.
     */
    async parse(input: string, filePath: string): Promise<AgentParseResult> {
        const trimmed = input.trim();

        // Detect input format: JSON or Markdown
        if (trimmed.startsWith('{')) {
            return this.parseJsonConfig(trimmed, filePath);
        }

        return this.parseMarkdown(input, filePath);
    }

    /**
     * Parse Markdown format with YAML frontmatter.
     */
    private parseMarkdown(input: string, _filePath: string): AgentParseResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        const parsed = parseFrontmatter(input, VALID_OPENCODE_AGENT_FIELDS);

        if (parsed.parseError) {
            errors.push(`YAML parse error: ${parsed.parseError}`);
            return { success: false, agent: null, sourcePlatform: 'opencode', errors, warnings };
        }

        if (!parsed.frontmatter) {
            errors.push('No frontmatter found in agent file');
            return { success: false, agent: null, sourcePlatform: 'opencode', errors, warnings };
        }

        const fm = parsed.frontmatter as Record<string, unknown>;

        if (parsed.unknownFields.length > 0) {
            warnings.push(`Unknown frontmatter fields: ${parsed.unknownFields.join(', ')}`);
        }

        // Extract fields
        const name = typeof fm.name === 'string' ? fm.name : '';
        const description = typeof fm.description === 'string' ? fm.description : '';

        if (!name) errors.push('Missing required field: name');
        if (!description) errors.push('Missing required field: description');

        // Body can come from markdown body or `prompt` field
        let body = parsed.body;
        if ((!body || body.trim().length === 0) && typeof fm.prompt === 'string') {
            body = fm.prompt;
        }
        if (!body || body.trim().length === 0) {
            errors.push('Agent body (system prompt) is empty');
        }

        if (errors.length > 0) {
            return { success: false, agent: null, sourcePlatform: 'opencode', errors, warnings };
        }

        const agent: UniversalAgent = { name, description, body };

        // Map optional fields
        if (typeof fm.model === 'string') agent.model = fm.model;
        if (typeof fm.temperature === 'number') agent.temperature = fm.temperature;
        if (typeof fm.color === 'string') agent.color = fm.color;
        if (typeof fm.hidden === 'boolean') agent.hidden = fm.hidden;
        if (typeof fm.steps === 'number') agent.maxTurns = fm.steps;

        // Tools: OpenCode uses boolean map { "Bash": true, "Read": false }
        if (fm.tools && typeof fm.tools === 'object' && !Array.isArray(fm.tools)) {
            const toolsMap = fm.tools as Record<string, boolean>;
            const allowed: string[] = [];
            const disallowed: string[] = [];
            for (const [tool, enabled] of Object.entries(toolsMap)) {
                if (enabled) {
                    allowed.push(tool);
                } else {
                    disallowed.push(tool);
                }
            }
            if (allowed.length > 0) agent.tools = allowed;
            if (disallowed.length > 0) agent.disallowedTools = disallowed;
        } else if (Array.isArray(fm.tools)) {
            agent.tools = fm.tools.map(String);
        }

        // Permissions
        if (fm.permissions && typeof fm.permissions === 'object') {
            agent.permissions = fm.permissions as Record<string, unknown>;
        }

        // Platform extensions
        const extensions: Record<string, unknown> = {};
        if (typeof fm.mode === 'string') extensions.mode = fm.mode;
        if (parsed.unknownFields.length > 0) {
            for (const field of parsed.unknownFields) {
                extensions[field] = fm[field];
            }
        }
        if (Object.keys(extensions).length > 0) {
            agent.platformExtensions = extensions;
        }

        return { success: true, agent, sourcePlatform: 'opencode', errors, warnings };
    }

    /**
     * Parse JSON config format.
     */
    private parseJsonConfig(input: string, filePath: string): AgentParseResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        let config: OpenCodeAgentConfig;
        try {
            config = JSON.parse(input) as OpenCodeAgentConfig;
        } catch (e) {
            errors.push(`JSON parse error: ${e instanceof Error ? e.message : String(e)}`);
            return { success: false, agent: null, sourcePlatform: 'opencode', errors, warnings };
        }

        const description = config.description || '';
        if (!description) {
            errors.push('Missing required field: description');
        }

        // Derive name from file path or config
        const name =
            ((config as Record<string, unknown>).name as string) ||
            filePath
                .replace(/\.[^.]+$/, '')
                .split('/')
                .pop() ||
            'unknown';

        const agent: UniversalAgent = {
            name,
            description,
            body: ((config as Record<string, unknown>).prompt as string) || '',
        };

        if (!agent.body) {
            warnings.push('No body/prompt found in JSON config -- agent will have empty system prompt');
        }

        // Map fields
        if (typeof config.model === 'string') agent.model = config.model;
        if (typeof config.temperature === 'number') agent.temperature = config.temperature;
        if (typeof config.color === 'string') agent.color = config.color;
        if (typeof config.hidden === 'boolean') agent.hidden = config.hidden;
        if (typeof config.steps === 'number') agent.maxTurns = config.steps;

        // Tools: boolean map
        if (config.tools && typeof config.tools === 'object') {
            const allowed: string[] = [];
            const disallowed: string[] = [];
            for (const [tool, enabled] of Object.entries(config.tools)) {
                if (enabled) {
                    allowed.push(tool);
                } else {
                    disallowed.push(tool);
                }
            }
            if (allowed.length > 0) agent.tools = allowed;
            if (disallowed.length > 0) agent.disallowedTools = disallowed;
        }

        if (config.permissions) {
            agent.permissions = config.permissions;
        }

        return {
            success: errors.length === 0,
            agent: errors.length === 0 ? agent : null,
            sourcePlatform: 'opencode',
            errors,
            warnings,
        };
    }

    /**
     * Platform-specific validation for OpenCode agents.
     */
    protected async validatePlatform(
        agent: UniversalAgent,
    ): Promise<{ errors: string[]; warnings: string[]; messages?: string[] }> {
        const errors: string[] = [];
        const warnings: string[] = [];
        const messages: string[] = [];

        // Validate tools map format
        if (this.options.validateToolsMap && agent.tools?.length) {
            messages.push(`Agent uses ${agent.tools.length} allowed tools`);
        }
        if (agent.disallowedTools?.length) {
            messages.push(`Agent disallows ${agent.disallowedTools.length} tools (will use tools: {X: false} format)`);
        }

        // Warn about fields not supported by OpenCode
        if (this.options.warnDroppedFields) {
            const droppedFields: string[] = [];
            if (agent.permissionMode) droppedFields.push('permissionMode');
            if (agent.skills?.length) droppedFields.push('skills');
            if (agent.mcpServers?.length) droppedFields.push('mcpServers');
            if (agent.hooks && Object.keys(agent.hooks).length > 0) droppedFields.push('hooks');
            if (agent.memory) droppedFields.push('memory');
            if (agent.background !== undefined) droppedFields.push('background');
            if (agent.isolation) droppedFields.push('isolation');
            if (agent.kind) droppedFields.push('kind');
            if (agent.timeout !== undefined) droppedFields.push('timeout');
            if (agent.sandboxMode) droppedFields.push('sandboxMode');
            if (agent.reasoningEffort) droppedFields.push('reasoningEffort');

            if (droppedFields.length > 0) {
                warnings.push(`Fields not supported by OpenCode (will be dropped): ${droppedFields.join(', ')}`);
            }
        }

        // Check hidden flag
        if (agent.hidden !== undefined) {
            messages.push(`Agent hidden: ${agent.hidden}`);
        }

        // Check permissions
        if (agent.permissions) {
            messages.push('Agent has permission configuration');
        }

        return { errors, warnings, messages };
    }

    /**
     * Generate an OpenCode agent .md file from UAM.
     */
    protected async generatePlatform(agent: UniversalAgent, context: AgentAdapterContext): Promise<AgentAdapterResult> {
        const warnings: string[] = [];
        const messages: string[] = [];

        // Build OpenCode frontmatter from UAM
        const fm: Record<string, unknown> = {
            name: agent.name,
            description: agent.description,
        };

        if (agent.model) fm.model = agent.model;
        if (agent.temperature !== undefined) fm.temperature = agent.temperature;
        if (agent.color) fm.color = agent.color;
        if (agent.hidden !== undefined) fm.hidden = agent.hidden;
        if (agent.maxTurns !== undefined) fm.steps = agent.maxTurns;

        // Convert tools array + disallowedTools to boolean map
        if (agent.tools?.length || agent.disallowedTools?.length) {
            const toolsMap: Record<string, boolean> = {};
            if (agent.tools) {
                for (const tool of agent.tools) {
                    toolsMap[tool] = true;
                }
            }
            if (agent.disallowedTools) {
                for (const tool of agent.disallowedTools) {
                    toolsMap[tool] = false;
                }
            }
            fm.tools = toolsMap;
        }

        // Permissions
        if (agent.permissions) {
            fm.permissions = agent.permissions;
        }

        // Generate the markdown content
        const output = serializeFrontmatter(fm, agent.body);

        // Determine output file paths
        const mdFilePath = join(context.outputPath, `${agent.name}.md`);
        const jsonFilePath = join(context.outputPath, `${agent.name}.opencode.json`);

        // Generate JSON config snippet (dual format per spec)
        const jsonConfig: Record<string, unknown> = {
            description: agent.description,
        };
        if (agent.model) jsonConfig.model = agent.model;
        if (agent.temperature !== undefined) jsonConfig.temperature = agent.temperature;
        if (agent.color) jsonConfig.color = agent.color;
        if (agent.hidden !== undefined) jsonConfig.hidden = agent.hidden;
        if (agent.maxTurns !== undefined) jsonConfig.steps = agent.maxTurns;
        if (fm.tools) jsonConfig.tools = fm.tools;
        if (agent.permissions) jsonConfig.permissions = agent.permissions;
        if (agent.body) jsonConfig.prompt = agent.body;

        const jsonOutput = JSON.stringify(jsonConfig, null, 2);

        const files: Record<string, string> = {
            [mdFilePath]: output,
            [jsonFilePath]: jsonOutput,
        };

        // Note dropped fields
        const droppedFields: string[] = [];
        if (agent.permissionMode) droppedFields.push('permissionMode');
        if (agent.skills?.length) droppedFields.push('skills');
        if (agent.mcpServers?.length) droppedFields.push('mcpServers');
        if (agent.hooks && Object.keys(agent.hooks).length > 0) droppedFields.push('hooks');
        if (agent.memory) droppedFields.push('memory');
        if (agent.background !== undefined) droppedFields.push('background');
        if (agent.isolation) droppedFields.push('isolation');
        if (agent.kind) droppedFields.push('kind');
        if (agent.timeout !== undefined) droppedFields.push('timeout');
        if (agent.sandboxMode) droppedFields.push('sandboxMode');
        if (agent.reasoningEffort) droppedFields.push('reasoningEffort');

        if (droppedFields.length > 0) {
            warnings.push(`Fields not supported by OpenCode (dropped): ${droppedFields.join(', ')}`);
        }

        messages.push(`Generated OpenCode agent (Markdown): ${mdFilePath}`);
        messages.push(`Generated OpenCode agent (JSON): ${jsonFilePath}`);

        return {
            success: true,
            output,
            companions: [mdFilePath, jsonFilePath],
            files,
            errors: [],
            warnings,
            messages,
        };
    }

    /**
     * Detect OpenCode-specific features in an agent.
     */
    protected detectPlatformFeatures(agent: UniversalAgent): string[] {
        const features: string[] = [];

        if (agent.hidden !== undefined) features.push('opencode-hidden');
        if (agent.permissions) features.push('opencode-permissions');
        if (agent.maxTurns !== undefined) features.push('opencode-steps');
        if (agent.temperature !== undefined) features.push('opencode-temperature');
        if (agent.color) features.push('opencode-color');
        if (agent.disallowedTools?.length) features.push('opencode-tools-deny');

        return features;
    }
}

/**
 * Create an OpenCode agent adapter instance.
 */
export function createOpenCodeAgentAdapter(options?: OpenCodeAgentAdapterOptions): OpenCodeAgentAdapter {
    return new OpenCodeAgentAdapter(options);
}
