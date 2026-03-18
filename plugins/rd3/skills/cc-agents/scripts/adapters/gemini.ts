/**
 * Gemini CLI Adapter for rd3:cc-agents
 *
 * Parses Gemini CLI agent .md files (with YAML frontmatter) into UAM,
 * validates agents for Gemini CLI compatibility, and generates
 * Gemini CLI-native agent .md files from UAM.
 *
 * Gemini CLI agent format:
 * - Markdown file with YAML frontmatter
 * - Located in `.gemini/agents/` directories
 * - Frontmatter fields: name, description, tools, model, max_turns,
 *   timeout_mins, temperature, kind
 * - Body is the system prompt (markdown content)
 *
 * Key field mappings (UAM <-> Gemini):
 * - maxTurns <-> max_turns
 * - timeout <-> timeout_mins
 * - temperature (direct)
 * - kind (Gemini-only: local/remote)
 */

import { join } from 'node:path';
import type {
    AgentAdapterContext,
    AgentAdapterResult,
    AgentParseResult,
    AgentPlatform,
    UniversalAgent,
} from '../types';
import { VALID_GEMINI_AGENT_FIELDS } from '../types';
import { parseFrontmatter, serializeFrontmatter } from '../utils';
import { BaseAgentAdapter } from './base';

// ============================================================================
// Options
// ============================================================================

export interface GeminiAgentAdapterOptions {
    /** Warn about Claude-only fields that will be ignored */
    warnDroppedFields?: boolean;
    /** Warn about unknown frontmatter fields */
    warnUnknownFields?: boolean;
}

// ============================================================================
// Gemini CLI Adapter
// ============================================================================

/**
 * Gemini CLI Agent Adapter.
 *
 * Handles bidirectional conversion between Gemini CLI .md agent files
 * and the Universal Agent Model (UAM).
 */
export class GeminiAgentAdapter extends BaseAgentAdapter {
    readonly platform: AgentPlatform = 'gemini';
    readonly displayName = 'Gemini CLI';
    private options: GeminiAgentAdapterOptions;

    constructor(options: GeminiAgentAdapterOptions = {}) {
        super();
        this.options = {
            warnDroppedFields: true,
            warnUnknownFields: true,
            ...options,
        };
    }

    /**
     * Parse a Gemini CLI agent .md file into UAM.
     */
    async parse(input: string, _filePath: string): Promise<AgentParseResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Parse frontmatter
        const parsed = parseFrontmatter(input, VALID_GEMINI_AGENT_FIELDS);

        if (parsed.parseError) {
            errors.push(`YAML parse error: ${parsed.parseError}`);
            return {
                success: false,
                agent: null,
                sourcePlatform: 'gemini',
                errors,
                warnings,
            };
        }

        if (!parsed.frontmatter) {
            errors.push('No frontmatter found in agent file');
            return {
                success: false,
                agent: null,
                sourcePlatform: 'gemini',
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
                sourcePlatform: 'gemini',
                errors,
                warnings,
            };
        }

        // Build UAM from Gemini frontmatter
        const agent: UniversalAgent = {
            name,
            description,
            body: parsed.body,
        };

        // Map optional fields (Gemini -> UAM)
        if (Array.isArray(fm.tools)) {
            agent.tools = fm.tools.map(String);
        }
        if (typeof fm.model === 'string') {
            agent.model = fm.model;
        }
        if (typeof fm.max_turns === 'number') {
            agent.maxTurns = fm.max_turns;
        }
        if (typeof fm.timeout_mins === 'number') {
            agent.timeout = fm.timeout_mins;
        }
        if (typeof fm.temperature === 'number') {
            agent.temperature = fm.temperature;
        }
        if (typeof fm.kind === 'string') {
            agent.kind = fm.kind;
        }

        // Capture unknown fields as platform extensions
        if (parsed.unknownFields.length > 0) {
            agent.platformExtensions = {};
            for (const field of parsed.unknownFields) {
                agent.platformExtensions[field] = fm[field];
            }
        }

        return {
            success: true,
            agent,
            sourcePlatform: 'gemini',
            errors,
            warnings,
        };
    }

    /**
     * Platform-specific validation for Gemini CLI agents.
     */
    protected async validatePlatform(
        agent: UniversalAgent,
    ): Promise<{ errors: string[]; warnings: string[]; messages?: string[] }> {
        const errors: string[] = [];
        const warnings: string[] = [];
        const messages: string[] = [];

        // Validate kind field
        if (agent.kind) {
            const validKinds = ['local', 'remote'];
            if (!validKinds.includes(agent.kind)) {
                warnings.push(`Unknown kind '${agent.kind}' -- valid values: ${validKinds.join(', ')}`);
            }
        }

        // Warn about Claude-only fields that will be ignored
        if (this.options.warnDroppedFields) {
            const droppedFields: string[] = [];
            if (agent.disallowedTools?.length) droppedFields.push('disallowedTools');
            if (agent.permissionMode) droppedFields.push('permissionMode');
            if (agent.skills?.length) droppedFields.push('skills');
            if (agent.mcpServers?.length) droppedFields.push('mcpServers');
            if (agent.hooks && Object.keys(agent.hooks).length > 0) droppedFields.push('hooks');
            if (agent.memory) droppedFields.push('memory');
            if (agent.background !== undefined) droppedFields.push('background');
            if (agent.isolation) droppedFields.push('isolation');
            if (agent.color) droppedFields.push('color');
            if (agent.sandboxMode) droppedFields.push('sandboxMode');
            if (agent.reasoningEffort) droppedFields.push('reasoningEffort');
            if (agent.hidden !== undefined) droppedFields.push('hidden');
            if (agent.permissions) droppedFields.push('permissions');

            if (droppedFields.length > 0) {
                warnings.push(`Fields not supported by Gemini CLI (will be dropped): ${droppedFields.join(', ')}`);
            }
        }

        // Detect Claude-specific syntax in body
        if (agent.body) {
            if (agent.body.includes('!`')) {
                warnings.push('Body uses Claude-specific !`cmd` syntax -- not compatible with Gemini CLI');
            }
            if (/\$(\d+|ARGUMENTS)/.test(agent.body)) {
                warnings.push('Body uses Claude-specific $ARGUMENTS syntax');
            }
            if (agent.body.includes('context: fork')) {
                warnings.push('Body uses Claude-specific context: fork');
            }
        }

        return { errors, warnings, messages };
    }

    /**
     * Generate a Gemini CLI agent .md file from UAM.
     */
    protected async generatePlatform(agent: UniversalAgent, context: AgentAdapterContext): Promise<AgentAdapterResult> {
        const warnings: string[] = [];
        const messages: string[] = [];

        // Build Gemini frontmatter from UAM
        const fm: Record<string, unknown> = {
            name: agent.name,
            description: agent.description,
        };

        if (agent.tools?.length) fm.tools = agent.tools;
        if (agent.model) fm.model = agent.model;
        if (agent.maxTurns !== undefined) fm.max_turns = agent.maxTurns;
        if (agent.timeout !== undefined) fm.timeout_mins = agent.timeout;
        if (agent.temperature !== undefined) fm.temperature = agent.temperature;
        if (agent.kind) fm.kind = agent.kind;

        // Generate the markdown content
        const output = serializeFrontmatter(fm, agent.body);

        // Determine output file path
        const filePath = join(context.outputPath, `${agent.name}.md`);
        const files: Record<string, string> = {
            [filePath]: output,
        };

        // Note any fields that were dropped (non-Gemini fields)
        const droppedFields: string[] = [];
        if (agent.disallowedTools?.length) droppedFields.push('disallowedTools');
        if (agent.permissionMode) droppedFields.push('permissionMode');
        if (agent.skills?.length) droppedFields.push('skills');
        if (agent.mcpServers?.length) droppedFields.push('mcpServers');
        if (agent.hooks && Object.keys(agent.hooks).length > 0) droppedFields.push('hooks');
        if (agent.memory) droppedFields.push('memory');
        if (agent.background !== undefined) droppedFields.push('background');
        if (agent.isolation) droppedFields.push('isolation');
        if (agent.color) droppedFields.push('color');
        if (agent.sandboxMode) droppedFields.push('sandboxMode');
        if (agent.reasoningEffort) droppedFields.push('reasoningEffort');
        if (agent.hidden !== undefined) droppedFields.push('hidden');
        if (agent.permissions) droppedFields.push('permissions');

        if (droppedFields.length > 0) {
            warnings.push(`Fields not supported by Gemini CLI (dropped): ${droppedFields.join(', ')}`);
        }

        messages.push(`Generated Gemini CLI agent: ${filePath}`);

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
     * Detect Gemini-specific features in an agent.
     */
    protected detectPlatformFeatures(agent: UniversalAgent): string[] {
        const features: string[] = [];

        if (agent.kind === 'remote') features.push('gemini-remote-agent');
        if (agent.kind === 'local') features.push('gemini-local-agent');
        if (agent.temperature !== undefined) features.push('gemini-temperature');
        if (agent.timeout !== undefined) features.push('gemini-timeout');
        if (agent.maxTurns !== undefined) features.push('gemini-max-turns');

        return features;
    }
}

/**
 * Create a Gemini CLI agent adapter instance.
 */
export function createGeminiAgentAdapter(options?: GeminiAgentAdapterOptions): GeminiAgentAdapter {
    return new GeminiAgentAdapter(options);
}
