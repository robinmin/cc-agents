/**
 * Generic Pass-Through Adapter for rd3:cc-magents (Tier 3 -- Generate Only)
 *
 * Shared implementation for platforms that don't have their own adapter yet.
 * Used by: gemini-md, codex, pi, and any future platforms.
 *
 * These platforms use standard markdown (AGENTS.md-like) format,
 * so this adapter uses the base UMAM parsing and generation logic.
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
// Generic Adapter (for platforms without their own adapter)
// ============================================================================

export interface GenericPassThroughAdapterOptions {
    /** Platform identifier */
    platform: MagentPlatform;
    /** Human-readable display name */
    displayName: string;
    /** Platform tier */
    tier: PlatformTier;
    /** File discovery paths */
    discoveryPaths: string[];
    /** Features that cannot be represented in this platform's format */
    unsupportedFeatures?: string[];
}

export class GenericPassThroughAdapter extends BaseMagentAdapter {
    readonly platform: MagentPlatform;
    readonly displayName: string;
    readonly tier: PlatformTier;

    private readonly _discoveryPaths: string[];
    private readonly _unsupportedFeatures: string[];

    constructor(options: GenericPassThroughAdapterOptions) {
        super();
        this.platform = options.platform;
        this.displayName = options.displayName;
        this.tier = options.tier;
        this._discoveryPaths = options.discoveryPaths;
        this._unsupportedFeatures = options.unsupportedFeatures ?? [];
    }

    /**
     * Parse standard markdown into UMAM.
     * Uses the base UMAM building logic since these platforms
     * follow AGENTS.md-like format.
     */
    async parse(input: string, filePath: string): Promise<MagentParseResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!input || input.trim().length === 0) {
            errors.push(`${this.displayName} file is empty`);
            return {
                success: false,
                model: null,
                sourcePlatform: this.platform,
                errors,
                warnings,
            };
        }

        try {
            const model = buildUMAM(input, filePath, this.platform);
            model.hierarchy = detectHierarchy(filePath);
            model.platformFeatures = [];

            return {
                success: true,
                model,
                sourcePlatform: this.platform,
                errors,
                warnings,
            };
        } catch (error) {
            errors.push(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                model: null,
                sourcePlatform: this.platform,
                errors,
                warnings,
            };
        }
    }

    /**
     * Generate standard markdown output from UMAM.
     */
    protected async generatePlatform(
        model: UniversalMainAgent,
        _options?: MagentGenerateOptions,
    ): Promise<MagentAdapterResult> {
        const warnings: string[] = [];
        const conversionWarnings: ConversionWarning[] = [];

        // Flag features not supported by this platform
        if (model.platformFeatures) {
            for (const feature of model.platformFeatures) {
                if (this._unsupportedFeatures.includes(feature)) {
                    conversionWarnings.push({
                        feature,
                        sourcePlatform: model.sourceFormat,
                        targetPlatform: this.platform,
                        severity: 'warning',
                        description: `${this.displayName} does not support '${feature}' — this feature will be omitted`,
                    });
                }
            }
        }

        // Generate standard markdown output
        const parts: string[] = [];

        if (model.preamble) {
            parts.push(model.preamble);
            parts.push('');
        }

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
     * Detect platform-specific features (none for generic adapters).
     */
    protected detectPlatformFeatures(_model: UniversalMainAgent): string[] {
        return [];
    }

    /**
     * Get file paths where this platform's config files are typically found.
     */
    getDiscoveryPaths(): string[] {
        return this._discoveryPaths;
    }
}

// ============================================================================
// Factory Functions
// ============================================================================

/** Create Gemini CLI adapter */
export function createGeminiMdAdapter(): GenericPassThroughAdapter {
    return new GenericPassThroughAdapter({
        platform: 'gemini-md',
        displayName: 'GEMINI.md (Gemini CLI)',
        tier: 1,
        discoveryPaths: ['GEMINI.md', '.gemini/GEMINI.md'],
        unsupportedFeatures: ['hooks', 'mcp-servers', 'memory-md'],
    });
}

/** Create Codex adapter */
export function createCodexAdapter(): GenericPassThroughAdapter {
    return new GenericPassThroughAdapter({
        platform: 'codex',
        displayName: 'Codex (OpenAI)',
        tier: 1,
        discoveryPaths: ['codex.md', '.codex/AGENTS.md'],
        unsupportedFeatures: ['hooks', 'mcp-servers', 'memory-md'],
    });
}

/** Create PI CLI adapter */
export function createPiAdapter(): GenericPassThroughAdapter {
    return new GenericPassThroughAdapter({
        platform: 'pi',
        displayName: 'PI CLI',
        tier: 3,
        discoveryPaths: ['.pi/rules.md', 'pi.md'],
        unsupportedFeatures: ['hooks', 'mcp-servers', 'memory-md', 'skills', 'progressive-complexity'],
    });
}
