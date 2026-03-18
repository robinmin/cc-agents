/**
 * OpenClaw Adapter for rd3:cc-agents
 *
 * Parses OpenClaw agent configuration (JSON config from agents.list) into UAM,
 * validates agents for OpenClaw compatibility, and generates
 * OpenClaw-native JSON config output from UAM.
 *
 * OpenClaw agent format:
 * - JSON configuration in agents.list structure
 * - Fields: description, purpose, tools, runTimeoutSeconds,
 *   maxSpawnDepth, maxConcurrent, maxChildrenPerAgent
 *
 * Key field mappings (UAM <-> OpenClaw):
 * - description <-> description / purpose
 * - timeout (minutes) <-> runTimeoutSeconds (seconds / 60)
 * - tools <-> tools.subagents.tools
 */

import { join } from 'node:path';
import type {
    AgentAdapterContext,
    AgentAdapterResult,
    AgentParseResult,
    AgentPlatform,
    OpenClawAgentConfig,
    UniversalAgent,
} from '../types';
import { BaseAgentAdapter } from './base';

// ============================================================================
// Options
// ============================================================================

export interface OpenClawAgentAdapterOptions {
    /** Validate JSON structure */
    validateJsonStructure?: boolean;
}

// ============================================================================
// OpenClaw Agent Adapter
// ============================================================================

/**
 * OpenClaw Agent Adapter.
 *
 * Handles bidirectional conversion between OpenClaw JSON agent configuration
 * and the Universal Agent Model (UAM).
 */
export class OpenClawAgentAdapter extends BaseAgentAdapter {
    readonly platform: AgentPlatform = 'openclaw';
    readonly displayName = 'OpenClaw';
    private options: OpenClawAgentAdapterOptions;

    constructor(options: OpenClawAgentAdapterOptions = {}) {
        super();
        this.options = {
            validateJsonStructure: true,
            ...options,
        };
    }

    /**
     * Parse an OpenClaw JSON agent config into UAM.
     */
    async parse(input: string, filePath: string): Promise<AgentParseResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        let config: OpenClawAgentConfig;
        try {
            config = JSON.parse(input.trim()) as OpenClawAgentConfig;
        } catch (e) {
            errors.push(`JSON parse error: ${e instanceof Error ? e.message : String(e)}`);
            return { success: false, agent: null, sourcePlatform: 'openclaw', errors, warnings };
        }

        // Validate JSON structure
        if (this.options.validateJsonStructure) {
            if (typeof config !== 'object' || config === null || Array.isArray(config)) {
                errors.push('OpenClaw config must be a JSON object');
                return { success: false, agent: null, sourcePlatform: 'openclaw', errors, warnings };
            }
        }

        // Extract name from config or filename
        const name =
            ((config as Record<string, unknown>).name as string) ||
            filePath
                .replace(/\.[^.]+$/, '')
                .split('/')
                .pop() ||
            'unknown';

        // Description can come from description or purpose field
        const description = config.description || config.purpose || '';
        if (!description) {
            errors.push('Missing required field: description (or purpose)');
        }

        const agent: UniversalAgent = {
            name,
            description,
            body: ((config as Record<string, unknown>).instructions as string) || '',
        };

        if (!agent.body) {
            warnings.push('No instructions found in OpenClaw config -- agent will have empty body');
        }

        // Map timeout
        if (typeof config.runTimeoutSeconds === 'number') {
            agent.timeout = config.runTimeoutSeconds / 60;
        }

        // Map tools from OpenClaw structure
        if (config.tools && typeof config.tools === 'object') {
            const toolsConfig = config.tools as Record<string, unknown>;

            // OpenClaw tools can be nested: tools.subagents.tools, tools.allow, tools.deny
            if (Array.isArray(toolsConfig.allow)) {
                agent.tools = (toolsConfig.allow as unknown[]).map(String);
            }
            if (Array.isArray(toolsConfig.deny)) {
                agent.disallowedTools = (toolsConfig.deny as unknown[]).map(String);
            }

            // Check for subagent tools
            const subagents = toolsConfig.subagents as Record<string, unknown> | undefined;
            if (subagents?.tools && Array.isArray(subagents.tools)) {
                agent.tools = (subagents.tools as unknown[]).map(String);
            }
        }

        // Capture OpenClaw-specific fields as platform extensions
        const extensions: Record<string, unknown> = {};
        const ocConfig = config as Record<string, unknown>;
        if (typeof ocConfig.maxSpawnDepth === 'number') extensions.maxSpawnDepth = ocConfig.maxSpawnDepth;
        if (typeof ocConfig.maxConcurrent === 'number') extensions.maxConcurrent = ocConfig.maxConcurrent;
        if (typeof ocConfig.maxChildrenPerAgent === 'number') {
            extensions.maxChildrenPerAgent = ocConfig.maxChildrenPerAgent;
        }
        if (Object.keys(extensions).length > 0) {
            agent.platformExtensions = extensions;
        }

        return {
            success: errors.length === 0,
            agent: errors.length === 0 ? agent : null,
            sourcePlatform: 'openclaw',
            errors,
            warnings,
        };
    }

    /**
     * Platform-specific validation for OpenClaw agents.
     */
    protected async validatePlatform(
        agent: UniversalAgent,
    ): Promise<{ errors: string[]; warnings: string[]; messages?: string[] }> {
        const errors: string[] = [];
        const warnings: string[] = [];
        const messages: string[] = [];

        // Warn about fields not supported by OpenClaw
        const droppedFields: string[] = [];
        if (agent.maxTurns !== undefined) droppedFields.push('maxTurns');
        if (agent.temperature !== undefined) droppedFields.push('temperature');
        if (agent.permissionMode) droppedFields.push('permissionMode');
        if (agent.skills?.length) droppedFields.push('skills');
        if (agent.mcpServers?.length) droppedFields.push('mcpServers');
        if (agent.hooks && Object.keys(agent.hooks).length > 0) droppedFields.push('hooks');
        if (agent.memory) droppedFields.push('memory');
        if (agent.background !== undefined) droppedFields.push('background');
        if (agent.isolation) droppedFields.push('isolation');
        if (agent.color) droppedFields.push('color');
        if (agent.kind) droppedFields.push('kind');
        if (agent.hidden !== undefined) droppedFields.push('hidden');
        if (agent.permissions) droppedFields.push('permissions');
        if (agent.sandboxMode) droppedFields.push('sandboxMode');
        if (agent.reasoningEffort) droppedFields.push('reasoningEffort');
        if (agent.model) droppedFields.push('model');

        if (droppedFields.length > 0) {
            warnings.push(`Fields not supported by OpenClaw (will be dropped): ${droppedFields.join(', ')}`);
        }

        // Check platform extensions for OpenClaw-specific fields
        if (agent.platformExtensions) {
            const ext = agent.platformExtensions;
            if (typeof ext.maxSpawnDepth === 'number') {
                messages.push(`Max spawn depth: ${ext.maxSpawnDepth}`);
            }
            if (typeof ext.maxConcurrent === 'number') {
                messages.push(`Max concurrent: ${ext.maxConcurrent}`);
            }
            if (typeof ext.maxChildrenPerAgent === 'number') {
                messages.push(`Max children per agent: ${ext.maxChildrenPerAgent}`);
            }
        }

        return { errors, warnings, messages };
    }

    /**
     * Generate an OpenClaw JSON agent config from UAM.
     */
    protected async generatePlatform(agent: UniversalAgent, context: AgentAdapterContext): Promise<AgentAdapterResult> {
        const warnings: string[] = [];
        const messages: string[] = [];

        // Build OpenClaw JSON config
        const config: Record<string, unknown> = {
            name: agent.name,
            description: agent.description,
        };

        // Map timeout to runTimeoutSeconds
        if (agent.timeout !== undefined) {
            config.runTimeoutSeconds = Math.round(agent.timeout * 60);
        }

        // Map tools
        if (agent.tools?.length || agent.disallowedTools?.length) {
            const toolsConfig: Record<string, unknown> = {};
            if (agent.tools?.length) {
                toolsConfig.allow = agent.tools;
            }
            if (agent.disallowedTools?.length) {
                toolsConfig.deny = agent.disallowedTools;
            }
            config.tools = toolsConfig;
        }

        // Add body as instructions
        if (agent.body) {
            config.instructions = agent.body;
        }

        // Restore OpenClaw-specific extensions
        if (agent.platformExtensions) {
            const ext = agent.platformExtensions;
            if (typeof ext.maxSpawnDepth === 'number') config.maxSpawnDepth = ext.maxSpawnDepth;
            if (typeof ext.maxConcurrent === 'number') config.maxConcurrent = ext.maxConcurrent;
            if (typeof ext.maxChildrenPerAgent === 'number') {
                config.maxChildrenPerAgent = ext.maxChildrenPerAgent;
            }
        }

        const output = JSON.stringify(config, null, 2);

        // Determine output file path
        const filePath = join(context.outputPath, `${agent.name}.json`);
        const files: Record<string, string> = {
            [filePath]: output,
        };

        // Note dropped fields
        const droppedFields: string[] = [];
        if (agent.maxTurns !== undefined) droppedFields.push('maxTurns');
        if (agent.temperature !== undefined) droppedFields.push('temperature');
        if (agent.permissionMode) droppedFields.push('permissionMode');
        if (agent.skills?.length) droppedFields.push('skills');
        if (agent.mcpServers?.length) droppedFields.push('mcpServers');
        if (agent.hooks && Object.keys(agent.hooks).length > 0) droppedFields.push('hooks');
        if (agent.memory) droppedFields.push('memory');
        if (agent.background !== undefined) droppedFields.push('background');
        if (agent.isolation) droppedFields.push('isolation');
        if (agent.color) droppedFields.push('color');
        if (agent.kind) droppedFields.push('kind');
        if (agent.hidden !== undefined) droppedFields.push('hidden');
        if (agent.permissions) droppedFields.push('permissions');
        if (agent.sandboxMode) droppedFields.push('sandboxMode');
        if (agent.reasoningEffort) droppedFields.push('reasoningEffort');
        if (agent.model) droppedFields.push('model');

        if (droppedFields.length > 0) {
            warnings.push(`Fields not supported by OpenClaw (dropped): ${droppedFields.join(', ')}`);
        }

        messages.push(`Generated OpenClaw agent config: ${filePath}`);

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
     * Detect OpenClaw-specific features in an agent.
     */
    protected detectPlatformFeatures(agent: UniversalAgent): string[] {
        const features: string[] = [];

        if (agent.timeout !== undefined) features.push('openclaw-timeout');
        if (agent.platformExtensions?.maxSpawnDepth) features.push('openclaw-spawn-depth');
        if (agent.platformExtensions?.maxConcurrent) features.push('openclaw-concurrent');
        if (agent.platformExtensions?.maxChildrenPerAgent) features.push('openclaw-children-limit');

        return features;
    }
}

/**
 * Create an OpenClaw agent adapter instance.
 */
export function createOpenClawAgentAdapter(options?: OpenClawAgentAdapterOptions): OpenClawAgentAdapter {
    return new OpenClawAgentAdapter(options);
}
