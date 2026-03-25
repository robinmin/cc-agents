/**
 * OpenCode rules.md Adapter for rd3:cc-magents (Tier 2)
 *
 * OpenCode uses opencode.md or .opencode/rules.md for configuration.
 * It supports:
 * - Markdown-based rules
 * - Standard heading structure
 * - Tool preferences
 *
 * OpenCode-specific features:
 * - Multi-model access (can use different AI models)
 * - Standard markdown format (similar to AGENTS.md)
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
// OpenCode-Specific Constants
// ============================================================================

/** OpenCode-specific section heading patterns */
const OPENCODE_SECTION_PATTERNS = {
    modelPreferences: /\b(model|preferences?|provider)\b/i,
    rules: /\b(rules?|guidelines?)\b/i,
    tools: /\b(tools?|commands?)\b/i,
};

/** Features that are OpenCode-specific and not portable */
const OPENCODE_ONLY_FEATURES = ['model-preferences', 'multi-model-access'];

// ============================================================================
// Options
// ============================================================================

export interface OpenCodeAdapterOptions {
    /** Detect OpenCode-specific features and flag non-portable sections */
    flagNonPortable?: boolean;
}

// ============================================================================
// OpenCode rules.md Adapter
// ============================================================================

export class OpenCodeAdapter extends BaseMagentAdapter {
    readonly platform: MagentPlatform = 'opencode-rules';
    readonly displayName = 'opencode.md (OpenCode)';
    readonly tier: PlatformTier = 2;

    constructor(_options: OpenCodeAdapterOptions = {}) {
        super();
    }

    /**
     * Parse an opencode.md file into UMAM.
     *
     * OpenCode uses standard markdown format.
     * We parse sections and detect OpenCode-specific features.
     */
    async parse(input: string, filePath: string): Promise<MagentParseResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!input || input.trim().length === 0) {
            errors.push('opencode.md file is empty');
            return {
                success: false,
                model: null,
                sourcePlatform: 'opencode-rules',
                errors,
                warnings,
            };
        }

        try {
            // Parse using standard markdown section parsing
            const model = buildUMAM(input, filePath, 'opencode-rules');
            model.hierarchy = detectHierarchy(filePath);

            // Detect OpenCode-specific features
            const features: string[] = [];

            for (const section of model.sections) {
                const headingLower = section.heading.toLowerCase();
                const contentLower = section.content.toLowerCase();

                if (
                    OPENCODE_SECTION_PATTERNS.modelPreferences.test(headingLower) ||
                    OPENCODE_SECTION_PATTERNS.modelPreferences.test(contentLower)
                ) {
                    features.push('model-preferences');
                }
                if (OPENCODE_SECTION_PATTERNS.rules.test(headingLower)) {
                    features.push('rules-section');
                }
                if (OPENCODE_SECTION_PATTERNS.tools.test(headingLower)) {
                    features.push('tools-section');
                }
            }

            model.platformFeatures = [...new Set(features)];

            return {
                success: true,
                model,
                sourcePlatform: 'opencode-rules',
                errors,
                warnings,
            };
        } catch (error) {
            errors.push(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                model: null,
                sourcePlatform: 'opencode-rules',
                errors,
                warnings,
            };
        }
    }

    /**
     * Platform-specific validation for OpenCode rules.
     */
    protected async validatePlatform(
        _model: UniversalMainAgent,
    ): Promise<{ errors: string[]; warnings: string[]; messages?: string[] }> {
        const warnings: string[] = [];
        const messages: string[] = [];

        // OpenCode rules are markdown-based and permissive
        messages.push('opencode.md uses standard markdown format');
        messages.push('OpenCode supports multi-model access via model preferences');

        return { errors: [], warnings, messages };
    }

    /**
     * Generate opencode.md output from UMAM.
     *
     * Generates standard markdown format.
     */
    protected async generatePlatform(
        model: UniversalMainAgent,
        _options?: MagentGenerateOptions,
    ): Promise<MagentAdapterResult> {
        const warnings: string[] = [];
        const conversionWarnings: ConversionWarning[] = [];

        // If source is not opencode-rules, flag non-portable features from source
        if (model.sourceFormat !== 'opencode-rules') {
            // OpenCode is fairly permissive, most features translate well
            if (model.platformFeatures?.includes('hooks')) {
                conversionWarnings.push({
                    feature: 'hooks',
                    sourcePlatform: model.sourceFormat,
                    targetPlatform: 'opencode-rules',
                    severity: 'warning',
                    description: 'Claude hooks may not be supported in OpenCode',
                });
            }
            if (model.platformFeatures?.includes('mcp-servers')) {
                conversionWarnings.push({
                    feature: 'mcp-servers',
                    sourcePlatform: model.sourceFormat,
                    targetPlatform: 'opencode-rules',
                    severity: 'info',
                    description: 'MCP server configuration may not be portable to OpenCode',
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
     * Detect OpenCode-specific features.
     */
    protected detectPlatformFeatures(model: UniversalMainAgent): string[] {
        const features: string[] = [];

        // Check sections for OpenCode-specific patterns
        for (const section of model.sections) {
            const combined = `${section.heading} ${section.content}`.toLowerCase();

            if (/\b(model|preferences?|provider|gpt|claude|gemini)\b/i.test(combined)) {
                features.push('model-preferences');
            }
        }

        return [...new Set(features)];
    }

    /**
     * Get OpenCode-specific conversion warnings when converting FROM OpenCode.
     */
    getConversionWarningsFrom(targetPlatform: MagentPlatform, model: UniversalMainAgent): ConversionWarning[] {
        const warnings: ConversionWarning[] = [];
        const features = this.detectPlatformFeatures(model);

        for (const feature of features) {
            if (OPENCODE_ONLY_FEATURES.includes(feature)) {
                warnings.push({
                    feature,
                    sourcePlatform: 'opencode-rules',
                    targetPlatform,
                    severity: 'warning',
                    description: `OpenCode-specific feature '${feature}' has no equivalent in ${targetPlatform}`,
                });
            }
        }

        return warnings;
    }

    /**
     * Get file paths where OpenCode rules are typically found.
     */
    getDiscoveryPaths(): string[] {
        return ['opencode.md', '.opencode/rules.md', '.opencode/rules'];
    }
}

/** Factory function */
export function createOpenCodeAdapter(options?: OpenCodeAdapterOptions): OpenCodeAdapter {
    return new OpenCodeAdapter(options);
}
