/**
 * Antigravity Adapter for rd3:cc-agents
 *
 * Antigravity does not have a formal agent definition format.
 * This adapter:
 * - parse(): Returns error/empty -- no formal format to import
 * - validate(): Generates advisory warnings about Antigravity limitations
 * - generate(): Produces advisory Markdown doc describing how to configure
 *   agent behavior via Antigravity's policy and natural language dispatch
 *
 * Antigravity agents are configured via natural language instructions
 * and policy-based dispatch, not structured config files.
 */

import { join } from 'node:path';
import type {
    AgentAdapterContext,
    AgentAdapterResult,
    AgentParseResult,
    AgentPlatform,
    UniversalAgent,
} from '../types';
import { BaseAgentAdapter } from './base';

// ============================================================================
// Options
// ============================================================================

export interface AntigravityAgentAdapterOptions {
    /** Generate detailed advisory documentation */
    detailedAdvisory?: boolean;
}

// ============================================================================
// Antigravity Agent Adapter
// ============================================================================

/**
 * Antigravity Agent Adapter.
 *
 * Antigravity has no formal agent definition format. This adapter
 * generates advisory documentation describing how to replicate
 * UAM agent behavior through Antigravity's natural language
 * dispatch and policy configuration.
 */
export class AntigravityAgentAdapter extends BaseAgentAdapter {
    readonly platform: AgentPlatform = 'antigravity';
    readonly displayName = 'Antigravity';
    private options: AntigravityAgentAdapterOptions;

    constructor(options: AntigravityAgentAdapterOptions = {}) {
        super();
        this.options = {
            detailedAdvisory: true,
            ...options,
        };
    }

    /**
     * Parse Antigravity format -- not supported.
     *
     * Antigravity has no formal agent definition format to import.
     * Returns an error result.
     */
    async parse(_input: string, _filePath: string): Promise<AgentParseResult> {
        return {
            success: false,
            agent: null,
            sourcePlatform: 'antigravity',
            errors: [
                'Antigravity does not have a formal agent definition format. ' +
                    'Agents are configured via natural language dispatch and policy. ' +
                    'Import from Antigravity is not supported.',
            ],
            warnings: [],
        };
    }

    /**
     * Platform-specific validation for Antigravity.
     * Generates advisory warnings about limitations.
     */
    protected async validatePlatform(
        agent: UniversalAgent,
    ): Promise<{ errors: string[]; warnings: string[]; messages?: string[] }> {
        const errors: string[] = [];
        const warnings: string[] = [];
        const messages: string[] = [];

        // Advisory: Antigravity limitations
        messages.push('Antigravity uses policy-based dispatch, not structured agent definitions');
        messages.push('Generated output will be an advisory document, not a runnable config');

        // Warn about all structured fields that cannot be represented
        const unsupportedFields: string[] = [];
        if (agent.tools?.length) unsupportedFields.push('tools');
        if (agent.disallowedTools?.length) unsupportedFields.push('disallowedTools');
        if (agent.model) unsupportedFields.push('model');
        if (agent.maxTurns !== undefined) unsupportedFields.push('maxTurns');
        if (agent.timeout !== undefined) unsupportedFields.push('timeout');
        if (agent.temperature !== undefined) unsupportedFields.push('temperature');
        if (agent.permissionMode) unsupportedFields.push('permissionMode');
        if (agent.skills?.length) unsupportedFields.push('skills');
        if (agent.mcpServers?.length) unsupportedFields.push('mcpServers');
        if (agent.hooks && Object.keys(agent.hooks).length > 0) unsupportedFields.push('hooks');
        if (agent.memory) unsupportedFields.push('memory');
        if (agent.background !== undefined) unsupportedFields.push('background');
        if (agent.isolation) unsupportedFields.push('isolation');
        if (agent.color) unsupportedFields.push('color');
        if (agent.kind) unsupportedFields.push('kind');
        if (agent.hidden !== undefined) unsupportedFields.push('hidden');
        if (agent.permissions) unsupportedFields.push('permissions');
        if (agent.sandboxMode) unsupportedFields.push('sandboxMode');
        if (agent.reasoningEffort) unsupportedFields.push('reasoningEffort');

        if (unsupportedFields.length > 0) {
            warnings.push(
                `Antigravity has no formal config -- these fields will be documented as advisory: ${unsupportedFields.join(', ')}`,
            );
        }

        // Check body for Claude-specific syntax
        if (agent.body) {
            if (agent.body.includes('!`')) {
                warnings.push('Body uses Claude-specific !`cmd` syntax -- not compatible with Antigravity');
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
     * Generate an advisory Markdown document for Antigravity.
     *
     * Since Antigravity has no formal agent config format, this produces
     * documentation describing how to configure the agent behavior
     * via natural language dispatch and policy settings.
     */
    protected async generatePlatform(agent: UniversalAgent, context: AgentAdapterContext): Promise<AgentAdapterResult> {
        const warnings: string[] = [];
        const messages: string[] = [];

        // Build advisory document
        const sections: string[] = [];

        sections.push(`# Antigravity Advisory: ${agent.name}`);
        sections.push('');
        sections.push('> This is an **advisory document**, not a runnable configuration.');
        sections.push('> Antigravity does not have a formal agent definition format.');
        sections.push('> Use this document as a guide to configure agent behavior via');
        sections.push("> Antigravity's policy and natural language dispatch.");
        sections.push('');

        // Agent overview
        sections.push('## Agent Overview');
        sections.push('');
        sections.push(`- **Name:** ${agent.name}`);
        sections.push(`- **Description:** ${agent.description}`);
        if (agent.model) sections.push(`- **Preferred Model:** ${agent.model}`);
        sections.push('');

        // Policy configuration
        sections.push('## Suggested Policy Configuration');
        sections.push('');

        if (agent.tools?.length) {
            sections.push('### Allowed Tools');
            sections.push('');
            sections.push('Configure Antigravity policy to allow these tools:');
            sections.push('');
            for (const tool of agent.tools) {
                sections.push(`- ${tool}`);
            }
            sections.push('');
        }

        if (agent.disallowedTools?.length) {
            sections.push('### Disallowed Tools');
            sections.push('');
            sections.push('Configure Antigravity policy to restrict these tools:');
            sections.push('');
            for (const tool of agent.disallowedTools) {
                sections.push(`- ${tool}`);
            }
            sections.push('');
        }

        if (agent.timeout !== undefined) {
            sections.push('### Timeout');
            sections.push('');
            sections.push(`Configure timeout to approximately ${agent.timeout} minutes.`);
            sections.push('');
        }

        if (agent.maxTurns !== undefined) {
            sections.push('### Turn Limit');
            sections.push('');
            sections.push(`Limit conversations to approximately ${agent.maxTurns} turns.`);
            sections.push('');
        }

        if (agent.temperature !== undefined) {
            sections.push('### Temperature');
            sections.push('');
            sections.push(`Set generation temperature to ${agent.temperature}.`);
            sections.push('');
        }

        // Natural language dispatch instructions
        sections.push('## Natural Language Dispatch');
        sections.push('');
        sections.push('To invoke this agent via Antigravity, use natural language dispatch:');
        sections.push('');
        sections.push('```');
        sections.push(`@${agent.name} <task description>`);
        sections.push('```');
        sections.push('');

        // System prompt / body
        if (this.options.detailedAdvisory && agent.body) {
            sections.push('## System Prompt');
            sections.push('');
            sections.push('Include the following system prompt when configuring this agent:');
            sections.push('');
            sections.push('```markdown');
            sections.push(agent.body);
            sections.push('```');
            sections.push('');
        }

        // Limitations
        sections.push('## Limitations');
        sections.push('');
        sections.push('The following UAM fields cannot be represented in Antigravity:');
        sections.push('');

        const limitations: string[] = [];
        if (agent.permissionMode) limitations.push(`- permissionMode: ${agent.permissionMode}`);
        if (agent.skills?.length) limitations.push(`- skills: ${agent.skills.join(', ')}`);
        if (agent.mcpServers?.length) limitations.push('- mcpServers (Claude Code only)');
        if (agent.hooks && Object.keys(agent.hooks).length > 0) limitations.push('- hooks (Claude Code only)');
        if (agent.memory) limitations.push(`- memory: ${agent.memory}`);
        if (agent.background !== undefined) limitations.push(`- background: ${agent.background}`);
        if (agent.isolation) limitations.push(`- isolation: ${agent.isolation}`);
        if (agent.sandboxMode) limitations.push(`- sandboxMode: ${agent.sandboxMode} (Codex only)`);
        if (agent.reasoningEffort) limitations.push(`- reasoningEffort: ${agent.reasoningEffort} (Codex only)`);

        if (limitations.length > 0) {
            sections.push(...limitations);
        } else {
            sections.push('- No additional limitations detected.');
        }

        sections.push('');

        const output = sections.join('\n');

        // Determine output file path
        const filePath = join(context.outputPath, `${agent.name}.antigravity.md`);
        const files: Record<string, string> = {
            [filePath]: output,
        };

        warnings.push('Antigravity output is advisory documentation, not a runnable config');
        messages.push(`Generated Antigravity advisory: ${filePath}`);

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
     * Detect Antigravity-specific features in an agent.
     * Since Antigravity has no formal format, this detects incompatibilities.
     */
    protected detectPlatformFeatures(_agent: UniversalAgent): string[] {
        // No Antigravity-specific features to detect
        // (no formal agent definition format)
        return ['antigravity-advisory-only'];
    }
}

/**
 * Create an Antigravity agent adapter instance.
 */
export function createAntigravityAgentAdapter(options?: AntigravityAgentAdapterOptions): AntigravityAgentAdapter {
    return new AntigravityAgentAdapter(options);
}
