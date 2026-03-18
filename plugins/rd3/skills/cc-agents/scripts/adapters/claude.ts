/**
 * Claude Code Adapter for rd3:cc-agents
 *
 * Parses Claude Code agent .md files (with YAML frontmatter) into UAM,
 * validates agents for Claude Code compatibility, and generates
 * Claude Code-native agent .md files from UAM.
 *
 * Claude Code agent format:
 * - Markdown file with YAML frontmatter
 * - Located in `.claude/agents/` or plugin `agents/` directories
 * - Frontmatter fields: name, description, tools, disallowedTools, model,
 *   maxTurns, permissionMode, skills, mcpServers, hooks, memory,
 *   background, isolation, color
 * - Body is the system prompt (markdown content)
 */

import { join } from 'node:path';
import type {
    AgentAdapterContext,
    AgentAdapterResult,
    AgentParseResult,
    AgentPlatform,
    UniversalAgent,
} from '../types';
import { VALID_CLAUDE_AGENT_FIELDS } from '../types';
import { generateClaudeFrontmatter, parseFrontmatter, serializeFrontmatter } from '../utils';
import { BaseAgentAdapter } from './base';

// ============================================================================
// Options
// ============================================================================

export interface ClaudeAgentAdapterOptions {
    /** Validate Claude-specific syntax in body */
    validateSyntax?: boolean;
    /** Warn about unknown frontmatter fields */
    warnUnknownFields?: boolean;
}

// ============================================================================
// Claude Code Adapter
// ============================================================================

/**
 * Claude Code Agent Adapter.
 *
 * Handles bidirectional conversion between Claude Code .md agent files
 * and the Universal Agent Model (UAM).
 */
export class ClaudeAgentAdapter extends BaseAgentAdapter {
    readonly platform: AgentPlatform = 'claude';
    readonly displayName = 'Claude Code';
    private options: ClaudeAgentAdapterOptions;

    constructor(options: ClaudeAgentAdapterOptions = {}) {
        super();
        this.options = {
            validateSyntax: true,
            warnUnknownFields: true,
            ...options,
        };
    }

    /**
     * Parse a Claude Code agent .md file into UAM.
     */
    async parse(input: string, _filePath: string): Promise<AgentParseResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Parse frontmatter
        const parsed = parseFrontmatter(input, VALID_CLAUDE_AGENT_FIELDS);

        if (parsed.parseError) {
            errors.push(`YAML parse error: ${parsed.parseError}`);
            return {
                success: false,
                agent: null,
                sourcePlatform: 'claude',
                errors,
                warnings,
            };
        }

        if (!parsed.frontmatter) {
            errors.push('No frontmatter found in agent file');
            return {
                success: false,
                agent: null,
                sourcePlatform: 'claude',
                errors,
                warnings,
            };
        }

        const fm = parsed.frontmatter as Record<string, unknown>;

        // Warn about unknown fields
        if (this.options.warnUnknownFields && parsed.unknownFields.length > 0) {
            warnings.push(`Unknown frontmatter fields: ${parsed.unknownFields.join(', ')}`);
        }

        // Extract required fields
        const name = typeof fm.name === 'string' ? fm.name : '';
        const description = typeof fm.description === 'string' ? fm.description : '';

        if (!name) {
            errors.push('Missing required field: name');
        }
        if (!description) {
            errors.push('Missing required field: description');
        }

        if (!parsed.body || parsed.body.trim().length === 0) {
            errors.push('Agent body (system prompt) is empty');
        }

        if (errors.length > 0) {
            return {
                success: false,
                agent: null,
                sourcePlatform: 'claude',
                errors,
                warnings,
            };
        }

        // Build UAM from Claude frontmatter
        const agent: UniversalAgent = {
            name,
            description,
            body: parsed.body,
        };

        // Map optional fields
        if (Array.isArray(fm.tools)) {
            agent.tools = fm.tools.map(String);
        }
        if (Array.isArray(fm.disallowedTools)) {
            agent.disallowedTools = fm.disallowedTools.map(String);
        }
        if (typeof fm.model === 'string') {
            agent.model = fm.model;
        }
        if (typeof fm.maxTurns === 'number') {
            agent.maxTurns = fm.maxTurns;
        }
        if (typeof fm.permissionMode === 'string') {
            agent.permissionMode = fm.permissionMode;
        }
        if (Array.isArray(fm.skills)) {
            agent.skills = fm.skills.map(String);
        }
        if (Array.isArray(fm.mcpServers)) {
            agent.mcpServers = fm.mcpServers as string[] | Record<string, unknown>[];
        }
        if (fm.hooks && typeof fm.hooks === 'object') {
            agent.hooks = fm.hooks as Record<string, unknown>;
        }
        if (typeof fm.memory === 'string') {
            agent.memory = fm.memory;
        }
        if (typeof fm.background === 'boolean') {
            agent.background = fm.background;
        }
        if (typeof fm.isolation === 'string') {
            agent.isolation = fm.isolation;
        }
        if (typeof fm.color === 'string') {
            agent.color = fm.color;
        }

        // Capture any unknown fields as platform extensions
        if (parsed.unknownFields.length > 0) {
            agent.platformExtensions = {};
            for (const field of parsed.unknownFields) {
                agent.platformExtensions[field] = fm[field];
            }
        }

        return {
            success: true,
            agent,
            sourcePlatform: 'claude',
            errors,
            warnings,
        };
    }

    /**
     * Platform-specific validation for Claude Code agents.
     */
    protected async validatePlatform(
        agent: UniversalAgent,
    ): Promise<{ errors: string[]; warnings: string[]; messages?: string[] }> {
        const errors: string[] = [];
        const warnings: string[] = [];
        const messages: string[] = [];

        // Check Claude-specific field constraints
        if (agent.permissionMode) {
            const validModes = ['default', 'plan', 'bypassPermissions'];
            if (!validModes.includes(agent.permissionMode)) {
                warnings.push(
                    `Unknown permissionMode '${agent.permissionMode}' -- valid values: ${validModes.join(', ')}`,
                );
            }
        }

        // Check for tools and disallowedTools conflict
        if (agent.tools?.length && agent.disallowedTools?.length) {
            const overlap = agent.tools.filter((t) => agent.disallowedTools?.includes(t));
            if (overlap.length > 0) {
                errors.push(`Tools both allowed and disallowed: ${overlap.join(', ')}`);
            }
        }

        // Detect Claude-specific syntax in body
        if (this.options.validateSyntax && agent.body) {
            if (agent.body.includes('!`')) {
                messages.push('Body uses Claude Code command syntax (!`cmd`)');
            }
            if (/\$(\d+|ARGUMENTS)/.test(agent.body)) {
                messages.push('Body uses argument references ($ARGUMENTS, $N)');
            }
            if (agent.body.includes('context: fork')) {
                messages.push('Body uses context: fork for parallel execution');
            }
        }

        // Check non-portable fields
        const nonPortableFields: string[] = [];
        if (agent.disallowedTools?.length) nonPortableFields.push('disallowedTools');
        if (agent.permissionMode) nonPortableFields.push('permissionMode');
        if (agent.skills?.length) nonPortableFields.push('skills');
        if (agent.mcpServers?.length) nonPortableFields.push('mcpServers');
        if (agent.hooks && Object.keys(agent.hooks).length > 0) nonPortableFields.push('hooks');
        if (agent.memory) nonPortableFields.push('memory');
        if (agent.background !== undefined) nonPortableFields.push('background');
        if (agent.isolation) nonPortableFields.push('isolation');

        if (nonPortableFields.length > 0) {
            messages.push(`Claude-only fields (not portable): ${nonPortableFields.join(', ')}`);
        }

        return { errors, warnings, messages };
    }

    /**
     * Generate a Claude Code agent .md file from UAM.
     */
    protected async generatePlatform(agent: UniversalAgent, context: AgentAdapterContext): Promise<AgentAdapterResult> {
        const warnings: string[] = [];
        const messages: string[] = [];

        // Build Claude frontmatter from UAM
        const fm = generateClaudeFrontmatter(agent);

        // Generate the markdown content
        const output = serializeFrontmatter(fm, agent.body);

        // Determine output file path
        const filePath = join(context.outputPath, `${agent.name}.md`);
        const files: Record<string, string> = {
            [filePath]: output,
        };

        // Note any fields that were dropped (non-Claude fields)
        const droppedFields: string[] = [];
        if (agent.timeout !== undefined) droppedFields.push('timeout');
        if (agent.temperature !== undefined) droppedFields.push('temperature');
        if (agent.kind) droppedFields.push('kind');
        if (agent.hidden !== undefined) droppedFields.push('hidden');
        if (agent.permissions) droppedFields.push('permissions');
        if (agent.sandboxMode) droppedFields.push('sandboxMode');
        if (agent.reasoningEffort) droppedFields.push('reasoningEffort');

        if (droppedFields.length > 0) {
            warnings.push(`Fields not supported by Claude Code (dropped): ${droppedFields.join(', ')}`);
        }

        messages.push(`Generated Claude Code agent: ${filePath}`);

        return {
            success: true,
            output,
            companions: [filePath],
            files,
            errors: [],
            warnings,
            messages,
        };
    }

    /**
     * Detect Claude-specific features in an agent.
     */
    protected detectPlatformFeatures(agent: UniversalAgent): string[] {
        const features: string[] = [];

        if (agent.disallowedTools?.length) features.push('claude-disallowed-tools');
        if (agent.permissionMode) features.push('claude-permission-mode');
        if (agent.skills?.length) features.push('claude-skills');
        if (agent.mcpServers?.length) features.push('claude-mcp-servers');
        if (agent.hooks && Object.keys(agent.hooks).length > 0) features.push('claude-hooks');
        if (agent.memory) features.push('claude-memory');
        if (agent.background !== undefined) features.push('claude-background');
        if (agent.isolation) features.push('claude-isolation');
        if (agent.color) features.push('claude-color');

        // Check body for Claude-specific syntax
        if (agent.body) {
            if (agent.body.includes('!`')) features.push('claude-command-syntax');
            if (/\$(\d+|ARGUMENTS)/.test(agent.body)) features.push('claude-arguments');
            if (agent.body.includes('context: fork')) features.push('claude-context-fork');
        }

        return features;
    }
}

/**
 * Create a Claude Code agent adapter instance.
 */
export function createClaudeAgentAdapter(options?: ClaudeAgentAdapterOptions): ClaudeAgentAdapter {
    return new ClaudeAgentAdapter(options);
}
