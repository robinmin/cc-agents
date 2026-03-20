/**
 * VSCode Copilot Instructions Adapter for rd3:cc-magents (Tier 3 -- Generate Only)
 *
 * VSCode Copilot uses .github/copilot-instructions.md for agent configuration.
 * It supports:
 * - Standard markdown format
 * - Section-based organization
 * - GitHub integration
 *
 * VSCode-specific approach:
 * - Maps to VSCode's agent protocol
 * - Integration with GitHub Copilot
 * - Checkpoint cadence (pause every 3-5 tool calls)
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
// VSCode-Specific Constants
// ============================================================================

/** Features that VSCode Copilot focuses on */
const VSCODE_FOCUS_FEATURES = ['checkpoint-cadence', 'github-integration', 'copilot-agent-protocol'];

/** Features that are NOT applicable to VSCode Copilot (Tier 3 limitations) */
const VSCODE_UNSUPPORTED_FEATURES = [
    'hooks',
    'mcp-servers',
    'skills',
    'memory-md',
    'progressive-complexity',
    'system-reminder',
];

// ============================================================================
// Options
// ============================================================================

export interface VSCodeAdapterOptions {
    /** Include checkpoint cadence recommendations */
    includeCheckpoints?: boolean;
}

// ============================================================================
// VSCode Copilot Instructions Adapter (Tier 3 - Generate Only)
// ============================================================================

export class VSCodeAdapter extends BaseMagentAdapter {
    readonly platform: MagentPlatform = 'vscode-instructions';
    readonly displayName = '.github/copilot-instructions.md (VS Code)';
    readonly tier: PlatformTier = 3;
    private options: VSCodeAdapterOptions;

    constructor(options: VSCodeAdapterOptions = {}) {
        super();
        this.options = {
            includeCheckpoints: true,
            ...options,
        };
    }

    /**
     * Parse is not supported for VSCode (Tier 3 generate-only).
     * @throws UnsupportedError
     */
    async parse(_input: string, _filePath: string): Promise<MagentParseResult> {
        return {
            success: false,
            model: null,
            sourcePlatform: 'vscode-instructions',
            errors: ['Parsing is not supported for VSCode Copilot (Tier 3 generate-only adapter)'],
            warnings: ['Use generate() to create VSCode Copilot instructions from UMAM'],
        };
    }

    /**
     * Generate VSCode Copilot instructions from UMAM.
     *
     * VSCode Copilot instructions:
     * - Use standard markdown format
     * - Include checkpoint cadence (pause every 3-5 tool calls)
     * - Map to Copilot's agent protocol
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
                if (VSCODE_UNSUPPORTED_FEATURES.includes(feature)) {
                    conversionWarnings.push({
                        feature,
                        sourcePlatform: model.sourceFormat,
                        targetPlatform: 'vscode-instructions',
                        severity: 'warning',
                        description: `VSCode Copilot does not support '${feature}' - this feature will be omitted`,
                    });
                }
            }
        }

        // Generate output with VSCode-specific additions
        const parts: string[] = [];

        // Preamble
        if (model.preamble) {
            parts.push(model.preamble);
            parts.push('');
        }

        // Sections
        const serialized = serializeSections(model.sections);
        parts.push(serialized);

        // Add checkpoint cadence recommendation if enabled
        if (this.options.includeCheckpoints) {
            parts.push('');
            parts.push('---');
            parts.push('');
            parts.push('## Checkpoint Cadence');
            parts.push('');
            parts.push('Pause and assess progress after every 3-5 tool calls to ensure alignment with user intent.');
        }

        const output = `${parts.join('\n').trim()}\n`;

        // VSCode-specific warnings
        warnings.push('VSCode Copilot uses .github/copilot-instructions.md');
        warnings.push('Complex features (hooks, MCP, memory) are not supported in VSCode Copilot');

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
     * Detect features relevant for VSCode Copilot.
     */
    protected detectPlatformFeatures(model: UniversalMainAgent): string[] {
        const features: string[] = [];

        // Check for VSCode-friendly patterns
        for (const section of model.sections) {
            const combined = `${section.heading} ${section.content}`.toLowerCase();

            if (/checkpoint|pause|assess/i.test(combined)) {
                features.push('checkpoint-cadence');
            }
        }

        return [...new Set(features)];
    }

    /**
     * Get file paths where VSCode Copilot instructions are typically found.
     */
    getDiscoveryPaths(): string[] {
        return ['.github/copilot-instructions.md'];
    }
}

/** Factory function */
export function createVSCodeAdapter(options?: VSCodeAdapterOptions): VSCodeAdapter {
    return new VSCodeAdapter(options);
}
