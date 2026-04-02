/**
 * Codex Adapter for rd3:cc-agents
 *
 * Parses Codex agent configuration (standalone TOML files) into UAM,
 * validates agents for Codex compatibility, and generates
 * Codex-native TOML output from UAM.
 *
 * Official Codex agent format (per https://developers.openai.com/codex/subagents):
 * - Standalone .toml files in ~/.codex/agents/ or .codex/agents/
 * - Root-level fields: name, description, developer_instructions (required)
 * - Optional: model, model_reasoning_effort, sandbox_mode, nickname_candidates, mcp_servers
 * - Body maps to developer_instructions
 *
 * Key field mappings (UAM <-> Codex):
 * - name <-> name
 * - body <-> developer_instructions
 * - sandboxMode <-> sandbox_mode
 * - reasoningEffort <-> model_reasoning_effort
 * - nicknameCandidates <-> nickname_candidates
 * - mcpServers <-> mcp_servers (nested TOML tables)
 */

import { join } from 'node:path';
import { CODEX_AGENT_DESCRIPTION_MAX_LENGTH, truncateAgentDescriptionForCodex } from '../description-constraints';
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

const VALID_SANDBOX_MODES = ['read-only', 'workspace-write', 'danger-full-access'];
const VALID_REASONING_EFFORTS = ['low', 'medium', 'high'];

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
     * - A standalone TOML file with root-level fields (official format)
     * - A legacy [agents.NAME] section (backward compat with deprecation warning)
     * - A JSON representation of the config
     */
    async parse(input: string, filePath: string): Promise<AgentParseResult> {
        const trimmed = input.trim();

        // Try JSON first (common for programmatic use)
        if (trimmed.startsWith('{')) {
            return this.parseJson(trimmed, filePath);
        }

        // Parse TOML
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
     * Parse TOML agent file.
     * Supports:
     * - Official format: root-level key=value fields
     * - Legacy format: [agents.NAME] sections (with deprecation warning)
     * - Nested tables: [mcp_servers.serverName]
     */
    private parseToml(input: string, filePath: string): AgentParseResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        const config: Record<string, unknown> = {};
        const mcpServers: Record<string, Record<string, unknown>> = {};
        let agentName = '';
        let isLegacyFormat = false;
        let currentNestedTable = '';

        const lines = input.split('\n');
        let i = 0;

        while (i < lines.length) {
            const trimLine = lines[i].trim();

            // Skip empty lines and comments
            if (!trimLine || trimLine.startsWith('#')) {
                i++;
                continue;
            }

            // Legacy section header: [agents.NAME] or [agents.NAME.settings]
            const legacySectionMatch = trimLine.match(/^\[agents\.([^.\]]+)(?:\.settings)?\]$/);
            if (legacySectionMatch) {
                agentName = legacySectionMatch[1];
                isLegacyFormat = true;
                currentNestedTable = '';
                i++;
                continue;
            }

            // Nested table header: [mcp_servers.serverName]
            const nestedTableMatch = trimLine.match(/^\[mcp_servers\.([^\]]+)\]$/);
            if (nestedTableMatch) {
                currentNestedTable = nestedTableMatch[1];
                mcpServers[currentNestedTable] = {};
                i++;
                continue;
            }

            // Any other section header (skip unknown sections)
            if (trimLine.startsWith('[') && trimLine.endsWith(']')) {
                currentNestedTable = '';
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
                    value = parseTomlValue(value as string, lines, i, (newIndex) => {
                        i = newIndex;
                    });
                }

                // Route to nested table or root config
                if (currentNestedTable && mcpServers[currentNestedTable]) {
                    mcpServers[currentNestedTable][key] = value;
                } else {
                    config[key] = value;
                }
            }

            i++;
        }

        if (isLegacyFormat) {
            warnings.push(
                'Legacy [agents.NAME] section format detected. ' +
                    'Official Codex format uses standalone .toml files with root-level fields. ' +
                    'See: https://developers.openai.com/codex/subagents',
            );
        }

        // Determine agent name: explicit name field > section name > filename
        const explicitName = config.name as string | undefined;
        const finalName =
            explicitName ||
            agentName ||
            filePath
                .replace(/\.[^.]+$/, '')
                .split('/')
                .pop() ||
            'unknown';

        const codexConfig: CodexAgentConfig = {
            name: finalName,
            description: (config.description as string) || '',
            model: config.model as string,
            developer_instructions: config.developer_instructions as string,
            sandbox_mode: config.sandbox_mode as string,
            model_reasoning_effort: config.model_reasoning_effort as string,
            nickname_candidates: config.nickname_candidates as string[],
        };

        // Attach mcp_servers if found
        if (Object.keys(mcpServers).length > 0) {
            codexConfig.mcp_servers = mcpServers as Record<string, { url: string }>;
        }

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
            config.name ||
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
        if (typeof config.model_reasoning_effort === 'string') {
            agent.reasoningEffort = config.model_reasoning_effort;
        }
        if (Array.isArray(config.nickname_candidates)) {
            agent.nicknameCandidates = config.nickname_candidates;
        }
        if (config.mcp_servers && Object.keys(config.mcp_servers).length > 0) {
            agent.mcpServers = Object.entries(config.mcp_servers).map(([serverName, serverConfig]) => ({
                name: serverName,
                ...serverConfig,
            }));
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

        if (agent.description.length > CODEX_AGENT_DESCRIPTION_MAX_LENGTH) {
            errors.push(
                `Agent description exceeds Codex maximum length of ${CODEX_AGENT_DESCRIPTION_MAX_LENGTH} characters`,
            );
        }

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

        // Validate model_reasoning_effort
        if (agent.reasoningEffort) {
            if (!VALID_REASONING_EFFORTS.includes(agent.reasoningEffort)) {
                warnings.push(
                    `Unknown model_reasoning_effort '${agent.reasoningEffort}' -- valid values: ${VALID_REASONING_EFFORTS.join(', ')}`,
                );
            } else {
                messages.push(`Reasoning effort: ${agent.reasoningEffort}`);
            }
        }

        // Validate nickname_candidates
        if (agent.nicknameCandidates?.length) {
            const seen = new Set<string>();
            for (const nick of agent.nicknameCandidates) {
                if (!/^[a-zA-Z0-9 _-]+$/.test(nick)) {
                    warnings.push(
                        `nickname_candidates entry '${nick}' contains non-ASCII characters -- only letters, digits, spaces, hyphens, underscores allowed`,
                    );
                }
                if (seen.has(nick)) {
                    warnings.push(`Duplicate nickname_candidates entry: '${nick}'`);
                }
                seen.add(nick);
            }
            messages.push(`Nickname candidates: ${agent.nicknameCandidates.join(', ')}`);
        }

        // Note MCP servers if present
        if (agent.mcpServers?.length) {
            messages.push(`MCP servers: ${agent.mcpServers.length} configured`);
        }

        // Warn about unsupported fields
        const droppedFields: string[] = [];
        if (agent.tools?.length) droppedFields.push('tools');
        if (agent.disallowedTools?.length) droppedFields.push('disallowedTools');
        if (agent.maxTurns !== undefined) droppedFields.push('maxTurns');
        if (agent.timeout !== undefined) droppedFields.push('timeout');
        if (agent.temperature !== undefined) droppedFields.push('temperature');
        if (agent.permissionMode) droppedFields.push('permissionMode');
        if (agent.skills?.length) droppedFields.push('skills');
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
     * Generate a standalone Codex TOML agent file from UAM.
     */
    protected async generatePlatform(agent: UniversalAgent, context: AgentAdapterContext): Promise<AgentAdapterResult> {
        const warnings: string[] = [];
        const messages: string[] = [];
        const constrainedDescription = truncateAgentDescriptionForCodex(agent.description);

        // Generate TOML output with root-level fields (official format)
        const tomlLines: string[] = [];

        // Required fields
        tomlLines.push(`name = "${escapeToml(agent.name)}"`);
        tomlLines.push(`description = "${escapeToml(constrainedDescription.value)}"`);

        // Optional fields
        if (agent.model) {
            tomlLines.push(`model = "${escapeToml(agent.model)}"`);
        }
        if (agent.reasoningEffort) {
            tomlLines.push(`model_reasoning_effort = "${escapeToml(agent.reasoningEffort)}"`);
        }
        if (agent.sandboxMode) {
            tomlLines.push(`sandbox_mode = "${escapeToml(agent.sandboxMode)}"`);
        }
        if (agent.nicknameCandidates?.length) {
            const items = agent.nicknameCandidates.map((n) => `"${escapeToml(n)}"`).join(', ');
            tomlLines.push(`nickname_candidates = [${items}]`);
        }

        // Body becomes developer_instructions (triple-quoted for multiline)
        if (agent.body) {
            tomlLines.push('');
            tomlLines.push('developer_instructions = """');
            tomlLines.push(agent.body);
            tomlLines.push('"""');
        }

        // MCP servers as nested TOML tables
        if (agent.mcpServers?.length) {
            tomlLines.push('');
            for (const server of agent.mcpServers) {
                if (typeof server === 'object' && server !== null) {
                    const serverObj = server as Record<string, unknown>;
                    const serverName = (serverObj.name as string) || 'unnamed';
                    tomlLines.push(`[mcp_servers.${serverName}]`);
                    for (const [key, val] of Object.entries(serverObj)) {
                        if (key === 'name') continue; // name is in the section header
                        if (typeof val === 'string') {
                            tomlLines.push(`${key} = "${escapeToml(val)}"`);
                        } else if (typeof val === 'number' || typeof val === 'boolean') {
                            tomlLines.push(`${key} = ${val}`);
                        }
                    }
                } else if (typeof server === 'string') {
                    tomlLines.push(`[mcp_servers.${server}]`);
                    tomlLines.push('# Configure server URL and settings');
                }
            }
        }

        const output = `${tomlLines.join('\n')}\n`;

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
        if (agent.timeout !== undefined) droppedFields.push('timeout');
        if (agent.temperature !== undefined) droppedFields.push('temperature');
        if (agent.permissionMode) droppedFields.push('permissionMode');
        if (agent.skills?.length) droppedFields.push('skills');
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

        if (constrainedDescription.truncated) {
            warnings.push(
                `Description truncated to ${CODEX_AGENT_DESCRIPTION_MAX_LENGTH} characters for Codex compatibility`,
            );
        }

        messages.push(`Generated Codex agent: ${filePath}`);

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
        if (agent.nicknameCandidates?.length) {
            features.push('codex-nicknames');
        }
        if (agent.mcpServers?.length) {
            features.push('codex-mcp-servers');
        }

        return features;
    }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse a TOML value from a string, handling multiline strings, arrays, etc.
 */
function parseTomlValue(raw: string, lines: string[], currentIndex: number, setIndex: (i: number) => void): unknown {
    // Multi-line string (triple quotes)
    if (raw.startsWith('"""')) {
        const mlValue = raw.slice(3);
        // Single-line triple-quoted: """text"""
        if (mlValue.endsWith('"""')) {
            return mlValue.slice(0, -3);
        }
        // Collect lines until closing """
        const mlParts: string[] = [mlValue];
        let i = currentIndex + 1;
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
        setIndex(i);
        return mlParts.join('\n');
    }

    // TOML array: [val1, val2]
    if (raw.startsWith('[') && raw.endsWith(']')) {
        const arrContent = raw.slice(1, -1);
        return arrContent.split(',').map((v) => {
            const t = v.trim();
            return t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t;
        });
    }

    // Quoted string
    if (raw.startsWith('"') && raw.endsWith('"')) {
        return raw.slice(1, -1);
    }

    // Number
    if (/^\d+$/.test(raw)) {
        return Number.parseInt(raw, 10);
    }

    // Boolean
    if (raw === 'true') return true;
    if (raw === 'false') return false;

    return raw;
}

/**
 * Escape special characters for TOML single-line string values.
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
