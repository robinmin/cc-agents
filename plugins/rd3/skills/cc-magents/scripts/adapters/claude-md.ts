/**
 * CLAUDE.md Adapter for rd3:cc-magents (Tier 1)
 *
 * CLAUDE.md is Claude Code's native configuration format. It supports:
 * - Hierarchical configs: ~/.claude/CLAUDE.md (global), .claude/CLAUDE.md (project)
 * - Hooks integration
 * - MCP server configuration
 * - Skills/tools configuration
 * - Memory integration (MEMORY.md)
 * - Project instructions with system-reminder injection
 *
 * Claude-specific features not portable to other platforms:
 * - Hooks (PreToolUse, PostToolUse, etc.)
 * - Skills field in agent frontmatter
 * - MCP server integration
 * - Memory persistence (MEMORY.md)
 * - Progressive complexity (system-reminder hierarchy)
 */

import type {
    ConversionWarning,
    MagentAdapterResult,
    MagentGenerateOptions,
    MagentParseResult,
    MagentPlatform,
    PlatformTier,
    UniversalMainAgent,
} from '../types';
import { buildUMAM, detectHierarchy, serializeSections } from '../utils';
import { BaseMagentAdapter } from './base';

// ============================================================================
// Claude-Specific Constants
// ============================================================================

/** Claude-specific section heading patterns */
const CLAUDE_SECTION_PATTERNS = {
    hooks: /\bhooks?\b/i,
    skills: /\bskills?\b/i,
    mcpServers: /\b(mcp|servers?)\b/i,
    memory: /\bmemory\b/i,
    tools: /\b(tool|commands?)\b/i,
    agentRouting: /\b(agent\s+routing|routing)\b/i,
    antiHallucination: /\b(anti.?hallucination|verification)\b/i,
};

/** Features that are Claude-specific and not portable */
const CLAUDE_ONLY_FEATURES = [
    'hooks',
    'mcp-servers',
    'skills-field',
    'memory-md',
    'progressive-complexity',
    'system-reminder',
];

// ============================================================================
// Options
// ============================================================================

export interface ClaudeMdAdapterOptions {
    /** Detect Claude-specific features and flag non-portable sections */
    flagNonPortable?: boolean;
}

// ============================================================================
// CLAUDE.md Adapter
// ============================================================================

export class ClaudeMdAdapter extends BaseMagentAdapter {
    readonly platform: MagentPlatform = 'claude-md';
    readonly displayName = 'CLAUDE.md (Claude Code)';
    readonly tier: PlatformTier = 1;
    private options: ClaudeMdAdapterOptions;

    constructor(options: ClaudeMdAdapterOptions = {}) {
        super();
        this.options = {
            flagNonPortable: true,
            ...options,
        };
    }

    /**
     * Parse a CLAUDE.md file into UMAM.
     *
     * CLAUDE.md is markdown with optional YAML frontmatter.
     * We detect Claude-specific sections and features.
     */
    async parse(input: string, filePath: string): Promise<MagentParseResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!input || input.trim().length === 0) {
            errors.push('CLAUDE.md file is empty');
            return {
                success: false,
                model: null,
                sourcePlatform: 'claude-md',
                errors,
                warnings,
            };
        }

        try {
            const model = buildUMAM(input, filePath, 'claude-md');
            model.hierarchy = detectHierarchy(filePath);

            // Detect Claude-specific features
            const features: string[] = [];
            for (const section of model.sections) {
                const headingLower = section.heading.toLowerCase();
                const contentLower = section.content.toLowerCase();

                if (
                    CLAUDE_SECTION_PATTERNS.hooks.test(headingLower) ||
                    CLAUDE_SECTION_PATTERNS.hooks.test(contentLower)
                ) {
                    features.push('hooks');
                }
                if (CLAUDE_SECTION_PATTERNS.skills.test(headingLower)) {
                    features.push('skills');
                }
                if (CLAUDE_SECTION_PATTERNS.mcpServers.test(headingLower) || /mcp__/.test(contentLower)) {
                    features.push('mcp-servers');
                }
                if (CLAUDE_SECTION_PATTERNS.memory.test(headingLower)) {
                    features.push('memory-md');
                }
                if (CLAUDE_SECTION_PATTERNS.agentRouting.test(headingLower)) {
                    features.push('agent-routing');
                }
                if (CLAUDE_SECTION_PATTERNS.antiHallucination.test(headingLower)) {
                    features.push('anti-hallucination');
                }
            }

            model.platformFeatures = [...new Set(features)];

            return {
                success: true,
                model,
                sourcePlatform: 'claude-md',
                errors,
                warnings,
            };
        } catch (error) {
            errors.push(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                model: null,
                sourcePlatform: 'claude-md',
                errors,
                warnings,
            };
        }
    }

    /**
     * Platform-specific validation for CLAUDE.md.
     */
    protected async validatePlatform(
        model: UniversalMainAgent,
    ): Promise<{ errors: string[]; warnings: string[]; messages?: string[] }> {
        const warnings: string[] = [];
        const messages: string[] = [];

        // Check hierarchy level is appropriate
        if (model.hierarchy === 'global') {
            messages.push('Global CLAUDE.md detected (applies to all projects)');
        }

        // Warn about very large configs reducing context window
        const tokens = model.estimatedTokens ?? 0;
        if (tokens > 10000) {
            warnings.push(
                `CLAUDE.md has ~${tokens} tokens; Claude Code injects this into every conversation, reducing available context window for actual work`,
            );
        }

        // Check for Claude-specific best practices
        const hasToolPriority = model.sections.some((s) => /tool\s+priority/i.test(s.heading));
        if (!hasToolPriority) {
            messages.push('Consider adding a Tool Priority section for optimal tool selection');
        }

        return { errors: [], warnings, messages };
    }

    /**
     * Generate CLAUDE.md output from UMAM.
     *
     * Preserves Claude-specific features and generates
     * Claude Code-native markdown format.
     */
    protected async generatePlatform(
        model: UniversalMainAgent,
        _options?: MagentGenerateOptions,
    ): Promise<MagentAdapterResult> {
        const warnings: string[] = [];
        const conversionWarnings: ConversionWarning[] = [];

        // If source is not CLAUDE.md, flag non-portable features from source
        if (model.sourceFormat !== 'claude-md') {
            // Check for features that don't translate well TO Claude
            // (Claude is very permissive, so mostly things translate well)
            if (model.platformFeatures?.includes('globs')) {
                conversionWarnings.push({
                    feature: 'globs',
                    sourcePlatform: model.sourceFormat,
                    targetPlatform: 'claude-md',
                    severity: 'info',
                    description:
                        'AGENTS.md globs have no direct CLAUDE.md equivalent; use .claude/ directory structure instead',
                });
            }
        }

        // Generate output
        const parts: string[] = [];

        // Preamble
        if (model.preamble) {
            parts.push(model.preamble);
            parts.push('');
        }

        // Sections
        const serialized = serializeSections(model.sections);
        parts.push(serialized);

        const output = `${parts.join('\n').trim()}\n`;

        const result: MagentAdapterResult = {
            success: true,
            output,
            errors: [],
            warnings,
        };
        if (conversionWarnings.length > 0) {
            result.conversionWarnings = conversionWarnings;
        }
        return result;
    }

    /**
     * Detect Claude-specific features.
     */
    protected detectPlatformFeatures(model: UniversalMainAgent): string[] {
        const features: string[] = [];

        for (const section of model.sections) {
            const combined = `${section.heading} ${section.content}`.toLowerCase();

            if (/\bhooks?\b/.test(combined) && /pretooluse|posttooluse|notification/i.test(combined)) {
                features.push('hooks');
            }
            if (/mcp__\w+__\w+/.test(combined)) {
                features.push('mcp-servers');
            }
            if (/memory\.md/i.test(combined) || /auto-memory/i.test(combined)) {
                features.push('memory-md');
            }
            if (/system-reminder/i.test(combined)) {
                features.push('progressive-complexity');
            }
        }

        return [...new Set(features)];
    }

    /**
     * Get Claude-specific conversion warnings when converting FROM Claude.
     */
    getConversionWarningsFrom(targetPlatform: MagentPlatform, model: UniversalMainAgent): ConversionWarning[] {
        const warnings: ConversionWarning[] = [];
        const features = this.detectPlatformFeatures(model);

        for (const feature of features) {
            if (CLAUDE_ONLY_FEATURES.includes(feature)) {
                warnings.push({
                    feature,
                    sourcePlatform: 'claude-md',
                    targetPlatform,
                    severity: 'warning',
                    description: `Claude-specific feature '${feature}' has no equivalent in ${targetPlatform}`,
                });
            }
        }

        return warnings;
    }
}

/** Factory function */
export function createClaudeMdAdapter(options?: ClaudeMdAdapterOptions): ClaudeMdAdapter {
    return new ClaudeMdAdapter(options);
}
