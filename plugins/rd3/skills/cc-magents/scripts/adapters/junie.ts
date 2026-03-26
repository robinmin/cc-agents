/**
 * Junie Adapter for rd3:cc-magents (Tier 3 -- Generate Only)
 *
 * Junie is a read-only exploration agent that focuses on:
 * - Query-based code exploration
 * - Clear section headings for discovery
 * - Limited execution capabilities
 *
 * Junie-specific approach:
 * - Read-only by design (no file modification unless explicitly requested)
 * - Focus on clear headings that map to query paths
 * - Exploration-focused output format
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
// Junie-Specific Constants
// ============================================================================

/** Features that are NOT applicable to Junie (Tier 3 limitations) */
const JUNIE_UNSUPPORTED_FEATURES = ['hooks', 'mcp-servers', 'skills', 'memory-md', 'progressive-complexity'];

// ============================================================================
// Options
// ============================================================================

export interface JunieAdapterOptions {
    /** Focus on query-friendly section headings */
    queryFriendly?: boolean;
}

// ============================================================================
// Junie Adapter (Tier 3 - Generate Only)
// ============================================================================

export class JunieAdapter extends BaseMagentAdapter {
    readonly platform: MagentPlatform = 'junie';
    readonly displayName = 'Junie (Exploration Agent)';
    readonly tier: PlatformTier = 3;

    constructor(_options: JunieAdapterOptions = {}) {
        super();
    }

    /**
     * Parse is not supported for Junie (Tier 3 generate-only).
     * @throws UnsupportedError
     */
    async parse(_input: string, _filePath: string): Promise<MagentParseResult> {
        return {
            success: false,
            model: null,
            sourcePlatform: 'junie',
            errors: ['Parsing is not supported for Junie (Tier 3 generate-only adapter)'],
            warnings: ['Use generate() to create Junie-compatible configs from UMAM'],
        };
    }

    /**
     * Generate Junie-compatible output from UMAM.
     *
     * Junie focuses on exploration, so we:
     * - Use clear, descriptive section headings
     * - Organize content for query-friendly discovery
     * - Keep instructions concise and actionable
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
                if (JUNIE_UNSUPPORTED_FEATURES.includes(feature)) {
                    conversionWarnings.push({
                        feature,
                        sourcePlatform: model.sourceFormat,
                        targetPlatform: 'junie',
                        severity: 'warning',
                        description: `Junie does not support '${feature}' - this feature will be omitted`,
                    });
                }
            }
        }

        // Generate output with Junie-specific formatting
        const parts: string[] = [];

        // Preamble
        if (model.preamble) {
            parts.push(model.preamble);
            parts.push('');
        }

        // Sections with Junie-specific organization
        // Junie benefits from clear headings that facilitate query-based exploration
        const serialized = serializeSections(model.sections);
        parts.push(serialized);

        const output = `${parts.join('\n').trim()}\n`;

        // Junie-specific warnings
        warnings.push('Junie is a read-only exploration agent; file modifications require explicit user request');
        warnings.push('Use clear section headings for better query-based discovery');

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
     * Detect features relevant for Junie (exploration-focused).
     */
    protected detectPlatformFeatures(model: UniversalMainAgent): string[] {
        const features: string[] = [];

        // Check for exploration-friendly patterns
        for (const section of model.sections) {
            const combined = `${section.heading} ${section.content}`.toLowerCase();

            if (/exploration|query|discovery|findings?/i.test(combined)) {
                features.push('query-based-exploration');
            }
            if (section.heading.length > 10 && /[A-Z]/.test(section.heading)) {
                features.push('clear-headings');
            }
        }

        return [...new Set(features)];
    }

    /**
     * Get file paths where Junie configs might be found (none standard).
     */
    getDiscoveryPaths(): string[] {
        return ['.junie/rules.md', 'junie.md'];
    }
}

/** Factory function */
export function createJunieAdapter(options?: JunieAdapterOptions): JunieAdapter {
    return new JunieAdapter(options);
}
