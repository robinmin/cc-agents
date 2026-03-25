/**
 * Cline Adapter for rd3:cc-magents (Tier 3 -- Generate Only)
 *
 * Cline is an AI coding agent that supports:
 * - Planning mode vs Standard mode
 * - Task decomposition
 * - Explicit autonomy boundaries
 *
 * Cline-specific approach:
 * - Mode switching (planning vs execution)
 * - No background processes (avoid `&` in shell)
 * - Structured task decomposition
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
import { serializeSections } from '../utils';
import { BaseMagentAdapter } from './base';

// ============================================================================
// Cline-Specific Constants
// ============================================================================

/** Features that Cline focuses on */
const _CLINE_FOCUS_FEATURES = ['planning-mode', 'task-decomposition', 'autonomy-boundaries'];

/** Features that are NOT applicable to Cline (Tier 3 limitations) */
const CLINE_UNSUPPORTED_FEATURES = [
    'hooks',
    'mcp-servers',
    'skills',
    'memory-md',
    'progressive-complexity',
    'system-reminder',
];

/** Cline-specific patterns */
const CLINE_PATTERNS = ['planning mode', 'standard mode', 'task decomposition', 'no background', 'autonomy'];

// ============================================================================
// Options
// ============================================================================

export interface ClineAdapterOptions {
    /** Include planning mode guidelines */
    includePlanningMode?: boolean;
}

// ============================================================================
// Cline Adapter (Tier 3 - Generate Only)
// ============================================================================

export class ClineAdapter extends BaseMagentAdapter {
    readonly platform: MagentPlatform = 'cline';
    readonly displayName = 'Cline';
    readonly tier: PlatformTier = 3;
    private options: ClineAdapterOptions;

    constructor(options: ClineAdapterOptions = {}) {
        super();
        this.options = {
            includePlanningMode: true,
            ...options,
        };
    }

    /**
     * Parse is not supported for Cline (Tier 3 generate-only).
     * @throws UnsupportedError
     */
    async parse(_input: string, _filePath: string): Promise<MagentParseResult> {
        return {
            success: false,
            model: null,
            sourcePlatform: 'cline',
            errors: ['Parsing is not supported for Cline (Tier 3 generate-only adapter)'],
            warnings: ['Use generate() to create Cline configs from UMAM'],
        };
    }

    /**
     * Generate Cline-compatible output from UMAM.
     *
     * Cline:
     * - Supports markdown-based configuration
     * - Planning mode for research + design
     * - Standard mode for implementation
     * - Explicit autonomy boundaries
     */
    protected async generatePlatform(
        model: UniversalMainAgent,
        _options?: MagentGenerateOptions,
    ): Promise<MagentAdapterResult> {
        const warnings: string[] = [];
        const conversionWarnings: ConversionWarning[] = [];

        // Check for unsupported features
        if (model.platformFeatures) {
            for (const feature of model.platformFeatures) {
                if (CLINE_UNSUPPORTED_FEATURES.includes(feature)) {
                    conversionWarnings.push({
                        feature,
                        sourcePlatform: model.sourceFormat,
                        targetPlatform: 'cline',
                        severity: 'warning',
                        description: `Cline does not support '${feature}' - this feature will be omitted`,
                    });
                }
            }
        }

        // Generate output with Cline-specific additions
        const parts: string[] = [];

        // Preamble
        if (model.preamble) {
            parts.push(model.preamble);
            parts.push('');
        }

        // Sections
        const serialized = serializeSections(model.sections);
        parts.push(serialized);

        // Add planning mode guidelines if enabled
        if (this.options.includePlanningMode) {
            parts.push('');
            parts.push('---');
            parts.push('');
            parts.push('## Planning and Execution');
            parts.push('');
            parts.push('**Planning Mode:** Use for research, design, and complex task decomposition.');
            parts.push('- Investigate requirements and existing code patterns');
            parts.push('- Create structured plans with verifiable steps');
            parts.push('- Do NOT make code changes in planning mode');
            parts.push('');
            parts.push('**Standard Mode:** Use for implementation and testing.');
            parts.push('- Execute plans created in planning mode');
            parts.push('- Verify each step before proceeding');
            parts.push('- Never use background processes (avoid `&` in shell commands)');
            parts.push('');
            parts.push('**Autonomy Boundaries:**');
            parts.push('- Ask before destructive actions (delete, force-push)');
            parts.push('- Stop and confirm on ambiguous requirements');
            parts.push('- Escalate environment issues rather than fixing them yourself');
        }

        const output = `${parts.join('\n').trim()}\n`;

        // Cline-specific warnings
        warnings.push('Cline uses markdown-based configuration');
        warnings.push('Complex features (hooks, MCP, memory) are not supported in Cline');
        warnings.push('Avoid background processes (shell `&`) in Cline execution');

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
     * Detect features relevant for Cline.
     */
    protected detectPlatformFeatures(model: UniversalMainAgent): string[] {
        const features: string[] = [];

        // Check for Cline-friendly patterns
        for (const section of model.sections) {
            const combined = `${section.heading} ${section.content}`.toLowerCase();

            for (const pattern of CLINE_PATTERNS) {
                if (combined.includes(pattern)) {
                    if (pattern === 'planning mode') features.push('planning-mode');
                    else if (pattern === 'task decomposition') features.push('task-decomposition');
                    else if (pattern === 'autonomy') features.push('autonomy-boundaries');
                }
            }
        }

        return [...new Set(features)];
    }

    /**
     * Get file paths where Cline configs might be found.
     */
    getDiscoveryPaths(): string[] {
        return ['.cline/rules.md', 'cline.md', '.github/copilot-instructions.md'];
    }
}

/** Factory function */
export function createClineAdapter(options?: ClineAdapterOptions): ClineAdapter {
    return new ClineAdapter(options);
}
