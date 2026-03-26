/**
 * Zed rules.md Adapter for rd3:cc-magents (Tier 2)
 *
 * Zed's configuration uses a two-part approach:
 * - .zed/rules.md: Markdown rules for agent behavior
 * - .zed/settings.json: LSP and editor configuration
 *
 * Zed-specific features:
 * - LSP integration for language-aware assistance
 * - Rules-based configuration in markdown
 * - Collaborative editing features (Zed is a multiplayer editor)
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
// Zed-Specific Constants
// ============================================================================

/** Zed-specific section heading patterns */
const ZED_SECTION_PATTERNS = {
    lspConfig: /\b(lsp|language\s+server|diagnostics?)\b/i,
    rules: /\b(rules?|guidelines?|agent)\b/i,
    collaboration: /\b(collaborat|multiplayer|team)\b/i,
    tools: /\b(tools?|edit|command)s?\b/i,
};

/** Features that are Zed-specific and not portable */
const ZED_ONLY_FEATURES = ['lsp-configuration', 'collaboration-settings', 'zed-specific-sections'];

// ============================================================================
// Options
// ============================================================================

export interface ZedAdapterOptions {
    /** Detect Zed-specific features and flag non-portable sections */
    flagNonPortable?: boolean;
}

// ============================================================================
// Zed rules.md Adapter
// ============================================================================

export class ZedAdapter extends BaseMagentAdapter {
    readonly platform: MagentPlatform = 'zed-rules';
    readonly displayName = '.zed/rules (Zed)';
    readonly tier: PlatformTier = 2;

    constructor(_options: ZedAdapterOptions = {}) {
        super();
    }

    /**
     * Parse a .zed/rules.md file into UMAM.
     *
     * Zed rules use standard markdown with special section markers.
     * We parse sections and detect Zed-specific features.
     */
    async parse(input: string, filePath: string): Promise<MagentParseResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!input || input.trim().length === 0) {
            errors.push('.zed/rules file is empty');
            return {
                success: false,
                model: null,
                sourcePlatform: 'zed-rules',
                errors,
                warnings,
            };
        }

        try {
            // Parse using standard markdown section parsing
            const model = buildUMAM(input, filePath, 'zed-rules');
            model.hierarchy = detectHierarchy(filePath);

            // Detect Zed-specific features
            const features: string[] = [];

            for (const section of model.sections) {
                const headingLower = section.heading.toLowerCase();
                const contentLower = section.content.toLowerCase();

                if (
                    ZED_SECTION_PATTERNS.lspConfig.test(headingLower) ||
                    ZED_SECTION_PATTERNS.lspConfig.test(contentLower)
                ) {
                    features.push('lsp-configuration');
                }
                if (
                    ZED_SECTION_PATTERNS.collaboration.test(headingLower) ||
                    ZED_SECTION_PATTERNS.collaboration.test(contentLower)
                ) {
                    features.push('collaboration-settings');
                }
                if (ZED_SECTION_PATTERNS.tools.test(headingLower)) {
                    features.push('zed-tools');
                }
            }

            model.platformFeatures = [...new Set(features)];

            return {
                success: true,
                model,
                sourcePlatform: 'zed-rules',
                errors,
                warnings,
            };
        } catch (error) {
            errors.push(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                model: null,
                sourcePlatform: 'zed-rules',
                errors,
                warnings,
            };
        }
    }

    /**
     * Platform-specific validation for Zed rules.
     */
    protected async validatePlatform(
        _model: UniversalMainAgent,
    ): Promise<{ errors: string[]; warnings: string[]; messages?: string[] }> {
        const warnings: string[] = [];
        const messages: string[] = [];

        // Zed rules are markdown-based and permissive
        messages.push('.zed/rules uses standard markdown format');
        messages.push('LSP configuration should be kept in settings.json');

        return { errors: [], warnings, messages };
    }

    /**
     * Generate Zed rules.md output from UMAM.
     *
     * Generates standard markdown format.
     */
    protected async generatePlatform(
        model: UniversalMainAgent,
        _options?: MagentGenerateOptions,
    ): Promise<MagentAdapterResult> {
        const warnings: string[] = [];
        const conversionWarnings: ConversionWarning[] = [];

        // If source is not zed-rules, flag non-portable features from source
        if (model.sourceFormat !== 'zed-rules') {
            // Check for features that don't translate well TO zed
            if (model.platformFeatures?.includes('hooks')) {
                conversionWarnings.push({
                    feature: 'hooks',
                    sourcePlatform: model.sourceFormat,
                    targetPlatform: 'zed-rules',
                    severity: 'warning',
                    description: 'Claude hooks have no direct Zed equivalent',
                });
            }
            if (model.platformFeatures?.includes('mcp-servers')) {
                conversionWarnings.push({
                    feature: 'mcp-servers',
                    sourcePlatform: model.sourceFormat,
                    targetPlatform: 'zed-rules',
                    severity: 'info',
                    description: 'MCP configuration is not directly supported in Zed rules',
                });
            }
            if (model.platformFeatures?.includes('lsp-configuration')) {
                conversionWarnings.push({
                    feature: 'lsp-configuration',
                    sourcePlatform: model.sourceFormat,
                    targetPlatform: 'zed-rules',
                    severity: 'info',
                    description: 'LSP settings belong in .zed/settings.json, not rules.md',
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
     * Detect Zed-specific features.
     */
    protected detectPlatformFeatures(model: UniversalMainAgent): string[] {
        const features: string[] = [];

        // Check sections for Zed-specific patterns
        for (const section of model.sections) {
            const combined = `${section.heading} ${section.content}`.toLowerCase();

            if (/\blsp\b/i.test(combined) || /language\s+server/i.test(combined)) {
                features.push('lsp-configuration');
            }
            if (/collaborat|multiplayer|team/i.test(combined)) {
                features.push('collaboration-settings');
            }
        }

        return [...new Set(features)];
    }

    /**
     * Get Zed-specific conversion warnings when converting FROM Zed.
     */
    getConversionWarningsFrom(targetPlatform: MagentPlatform, model: UniversalMainAgent): ConversionWarning[] {
        const warnings: ConversionWarning[] = [];
        const features = this.detectPlatformFeatures(model);

        for (const feature of features) {
            if (ZED_ONLY_FEATURES.includes(feature)) {
                warnings.push({
                    feature,
                    sourcePlatform: 'zed-rules',
                    targetPlatform,
                    severity: 'warning',
                    description: `Zed-specific feature '${feature}' has no equivalent in ${targetPlatform}`,
                });
            }
        }

        return warnings;
    }

    /**
     * Get file paths where Zed rules are typically found.
     */
    getDiscoveryPaths(): string[] {
        return ['.zed/rules', '.zed/rules.md'];
    }
}

/** Factory function */
export function createZedAdapter(options?: ZedAdapterOptions): ZedAdapter {
    return new ZedAdapter(options);
}
