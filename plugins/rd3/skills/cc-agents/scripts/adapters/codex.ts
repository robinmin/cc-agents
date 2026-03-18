/**
 * Codex Adapter for rd3:cc-agents
 *
 * Parses Codex agent configuration (TOML [agents.NAME] sections) into UAM,
 * validates agents for Codex compatibility, and generates
 * Codex-native TOML config output from UAM.
 *
 * Codex agent format:
 * - TOML configuration in [agents.NAME] sections
 * - Fields: description, model, developer_instructions, sandbox_mode,
 *   reasoning_effort, job_max_runtime_seconds
 * - Body maps to developer_instructions
 *
 * Key field mappings (UAM <-> Codex):
 * - body <-> developer_instructions
 * - sandboxMode <-> sandbox_mode
 * - reasoningEffort <-> reasoning_effort
 * - timeout (minutes) <-> job_max_runtime_seconds (seconds / 60)
 */

import { join } from 'node:path';
import type {
    AgentAdapterContext,
    AgentAdapterResult,
    AgentParseResult,
    AgentPlatform,
    CodexAgentConfig,
    UniversalAgent,
} from '../types';
import { BaseAgentAdapter } from './base';

// ============================================================================
// Options
// ============================================================================

export interface CodexAgentAdapterOptions {
    /** Validate sandbox_mode values */
    validateSandboxMode?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const VALID_SANDBOX_MODES = ['read-only', 'read-write', 'full', 'none'];

// ============================================================================
// Codex Agent Adapter
// ============================================================================

/**
 * Codex Agent Adapter.
 *
 * Handles bidirectional conversion between Codex TOML agent configuration
 * and the Universal Agent Model (UAM).
 */
export class CodexAgentAdapter extends BaseAgentAdapter {
    readonly platform: AgentPlatform = 'codex';
    readonly displayName = 'Codex';
    private options: CodexAgentAdapterOptions;

    constructor(options: CodexAgentAdapterOptions = {}) {
        super();
        this.options = {
            validateSandboxMode: true,
            ...options,
        };
    }

    /**
     * Parse a Codex TOML agent config into UAM.
     *
     * Input can be:
     * - A TOML [agents.NAME] section (simplified key=value parsing)
     * - A JSON representation of the TOML section
     */
    async parse(input: string, filePath: string): Promise<AgentParseResult> {
        const trimmed = input.trim();

        // Try JSON first (common for programmatic use)
        if (trimmed.startsWith('{')) {
            return this.parseJson(trimmed, filePath);
        }

        // Parse TOML-style key=value pairs
        return this.parseToml(trimmed, filePath);
    }

    /**
     * Parse JSON representation of Codex config.
     */
    private parseJson(input: string, filePath: string): AgentParseResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        let config: CodexAgentConfig;
        try {
            config = JSON.parse(input) as CodexAgentConfig;
        } catch (e) {
            errors.push(`JSON parse error: ${e instanceof Error ? e.message : String(e)}`);
            return { success: false, agent: null, sourcePlatform: 'codex', errors, warnings };
        }

        return this.configToUam(config, filePath, errors, warnings);
    }

    /**
     * Parse TOML-style [agents.NAME] section.
     * Simplified parsing -- handles common TOML key=value patterns.
     */
    private parseToml(input: string, filePath: string): AgentParseResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        const config: Record<string, unknown> = {};
        let agentName = '';

        const lines = input.split('\n');
        let i = 0;

        while (i < lines.length) {
            const trimLine = lines[i].trim();

            // Skip empty lines and comments
            if (!trimLine || trimLine.startsWith('#')) {
                i++;
                continue;
            }

            // Section header: [agents.NAME]
            const sectionMatch = trimLine.match(/^\[agents\.(.+)\]$/);
            if (sectionMatch) {
                agentName = sectionMatch[1];
                i++;
                continue;
            }

            // Key = value
            const kvMatch = trimLine.match(/^(\w+)\s*=\s*(.+)$/);
            if (kvMatch) {
                const key = kvMatch[1];
                let value: unknown = kvMatch[2].trim();

                // Parse value types
                if (typeof value === 'string') {
                    // Multi-line string (triple quotes)
                    if ((value as string).startsWith('"""')) {
                        const mlValue = (value as string).slice(3);
                        // Single-line triple-quoted: """text"""
                        if (mlValue.endsWith('"""')) {
                            value = mlValue.slice(0, -3);
                        } else {
                            // Collect lines until closing """
                            const mlParts: string[] = [mlValue];
                            i++;
                            while (i < lines.length) {
                                const mlLine = lines[i];
                                if (mlLine.trim().endsWith('"""')) {
                                    const final = mlLine.trimEnd().slice(0, -3);
                                    if (final) mlParts.push(final);
                                    break;
                                }
                                mlParts.push(mlLine);
                                i++;
                            }
                            value = mlParts.join('\n');
                        }
                    }
                    // TOML array: [val1, val2]
                    else if ((value as string).startsWith('[') && (value as string).endsWith(']')) {
                        const arrContent = (value as string).slice(1, -1);
                        value = arrContent.split(',').map((v) => {
                            const t = v.trim();
                            return t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t;
                        });
                    }
                    // Quoted string
                    else if ((value as string).startsWith('"') && (value as string).endsWith('"')) {
                        value = (value as string).slice(1, -1);
                    }
                    // Number
                    else if (/^\d+$/.test(value as string)) {
                        value = Number.parseInt(value as string, 10);
                    }
                    // Boolean
                    else if (value === 'true') {
                        value = true;
                    } else if (value === 'false') {
                        value = false;
                    }
                }

                config[key] = value;
            }

            i++;
        }

        // Use section name or filename as agent name
        if (!agentName) {
            agentName =
                filePath
                    .replace(/\.[^.]+$/, '')
                    .split('/')
                    .pop() || 'unknown';
        }

        const codexConfig: CodexAgentConfig = {
            description: (config.description as string) || '',
            model: config.model as string,
            developer_instructions: config.developer_instructions as string,
            sandbox_mode: config.sandbox_mode as string,
            reasoning_effort: config.reasoning_effort as string,
            job_max_runtime_seconds: config.job_max_runtime_seconds as number,
        };

        // Store name for configToUam
        (codexConfig as Record<string, unknown>).name = agentName;

        return this.configToUam(codexConfig, filePath, errors, warnings);
    }

    /**
     * Convert CodexAgentConfig to UAM.
     */
    private configToUam(
        config: CodexAgentConfig,
        filePath: string,
        errors: string[],
        warnings: string[],
    ): AgentParseResult {
        const description = config.description || '';
        if (!description) {
            errors.push('Missing required field: description');
        }

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
            body: config.developer_instructions || '',
        };

        if (!agent.body) {
            warnings.push('No developer_instructions found -- agent will have empty body');
        }

        // Map fields
        if (typeof config.model === 'string') agent.model = config.model;
        if (typeof config.sandbox_mode === 'string') agent.sandboxMode = config.sandbox_mode;
        if (typeof config.reasoning_effort === 'string') agent.reasoningEffort = config.reasoning_effort;
        if (typeof config.job_max_runtime_seconds === 'number') {
            agent.timeout = config.job_max_runtime_seconds / 60;
        }

        return {
            success: errors.length === 0,
            agent: errors.length === 0 ? agent : null,
            sourcePlatform: 'codex',
            errors,
            warnings,
        };
    }

    /**
     * Platform-specific validation for Codex agents.
     */
    protected async validatePlatform(
        agent: UniversalAgent,
    ): Promise<{ errors: string[]; warnings: string[]; messages?: string[] }> {
        const errors: string[] = [];
        const warnings: string[] = [];
        const messages: string[] = [];

        // Validate sandbox_mode
        if (this.options.validateSandboxMode && agent.sandboxMode) {
            if (!VALID_SANDBOX_MODES.includes(agent.sandboxMode)) {
                warnings.push(
                    `Unknown sandbox_mode '${agent.sandboxMode}' -- valid values: ${VALID_SANDBOX_MODES.join(', ')}`,
                );
            } else {
                messages.push(`Sandbox mode: ${agent.sandboxMode}`);
            }
        }

        // Validate reasoning_effort
        if (agent.reasoningEffort) {
            const validEfforts = ['low', 'medium', 'high'];
            if (!validEfforts.includes(agent.reasoningEffort)) {
                warnings.push(
                    `Unknown reasoning_effort '${agent.reasoningEffort}' -- valid values: ${validEfforts.join(', ')}`,
                );
            } else {
                messages.push(`Reasoning effort: ${agent.reasoningEffort}`);
            }
        }

        // Warn about unsupported fields
        const droppedFields: string[] = [];
        if (agent.tools?.length) droppedFields.push('tools');
        if (agent.disallowedTools?.length) droppedFields.push('disallowedTools');
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

        if (droppedFields.length > 0) {
            warnings.push(`Fields not supported by Codex (will be dropped): ${droppedFields.join(', ')}`);
        }

        return { errors, warnings, messages };
    }

    /**
     * Generate a Codex TOML agent config section from UAM.
     */
    protected async generatePlatform(agent: UniversalAgent, context: AgentAdapterContext): Promise<AgentAdapterResult> {
        const warnings: string[] = [];
        const messages: string[] = [];

        // Generate TOML output
        const tomlLines: string[] = [];
        tomlLines.push(`[agents.${agent.name}]`);
        tomlLines.push(`description = "${escapeToml(agent.description)}"`);

        if (agent.model) {
            tomlLines.push(`model = "${escapeToml(agent.model)}"`);
        }
        if (agent.sandboxMode) {
            tomlLines.push(`sandbox_mode = "${escapeToml(agent.sandboxMode)}"`);
        }
        if (agent.reasoningEffort) {
            tomlLines.push(`reasoning_effort = "${escapeToml(agent.reasoningEffort)}"`);
        }
        if (agent.timeout !== undefined) {
            tomlLines.push(`job_max_runtime_seconds = ${Math.round(agent.timeout * 60)}`);
        }

        // Body becomes developer_instructions
        if (agent.body) {
            tomlLines.push('');
            tomlLines.push('developer_instructions = """');
            tomlLines.push(agent.body);
            tomlLines.push('"""');
        }

        const output = tomlLines.join('\n');

        // Determine output file path
        const filePath = join(context.outputPath, `${agent.name}.toml`);
        const files: Record<string, string> = {
            [filePath]: output,
        };

        // Note dropped fields
        const droppedFields: string[] = [];
        if (agent.tools?.length) droppedFields.push('tools');
        if (agent.disallowedTools?.length) droppedFields.push('disallowedTools');
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

        if (droppedFields.length > 0) {
            warnings.push(`Fields not supported by Codex (dropped): ${droppedFields.join(', ')}`);
        }

        messages.push(`Generated Codex agent config: ${filePath}`);

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
     * Detect Codex-specific features in an agent.
     */
    protected detectPlatformFeatures(agent: UniversalAgent): string[] {
        const features: string[] = [];

        if (agent.sandboxMode) {
            features.push(`codex-sandbox-${agent.sandboxMode}`);
        }
        if (agent.reasoningEffort) {
            features.push(`codex-reasoning-${agent.reasoningEffort}`);
        }
        if (agent.timeout !== undefined) {
            features.push('codex-runtime-limit');
        }

        return features;
    }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Escape special characters for TOML string values.
 */
function escapeToml(value: string): string {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
}

/**
 * Create a Codex agent adapter instance.
 */
export function createCodexAgentAdapter(options?: CodexAgentAdapterOptions): CodexAgentAdapter {
    return new CodexAgentAdapter(options);
}
