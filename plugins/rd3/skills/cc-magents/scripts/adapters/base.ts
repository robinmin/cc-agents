/**
 * Base Adapter for rd3:cc-magents
 *
 * Platform adapters extend this abstract class to provide platform-specific
 * parsing, validation, generation, and feature detection for main agent
 * configuration files (AGENTS.md, CLAUDE.md, GEMINI.md, etc.).
 *
 * Key difference from cc-agents adapters:
 * - Works with UMAM (section-based) instead of UAM (frontmatter-based)
 * - Includes getDiscoveryPaths() for file discovery
 * - Tiered support: Tier 1 (full), Tier 2 (parse+generate), Tier 3 (generate-only), Tier 4 (pass-through)
 */

import type {
    IMagentPlatformAdapter,
    MagentAdapterResult,
    MagentGenerateOptions,
    MagentParseResult,
    MagentPlatform,
    PlatformTier,
    UniversalMainAgent,
} from '../types';
import { PLATFORM_FILENAMES } from '../types';
import { estimateTokens } from '../utils';

// ============================================================================
// Size Limits
// ============================================================================

/** Default file size warning threshold (50KB) */
const SIZE_WARN_BYTES = 50 * 1024;
/** Default file size error threshold (200KB) */
const SIZE_ERROR_BYTES = 200 * 1024;
/** Default estimated token warning threshold */
const TOKEN_WARN_THRESHOLD = 15000;

/**
 * Abstract base adapter with common functionality.
 * Platform-specific adapters extend this class and implement
 * the abstract/protected methods.
 */
export abstract class BaseMagentAdapter implements IMagentPlatformAdapter {
    abstract readonly platform: MagentPlatform;
    abstract readonly displayName: string;
    abstract readonly tier: PlatformTier;

    /**
     * Parse platform-native format into UMAM.
     * Tier 1 and 2 adapters must override this.
     * Tier 3 and 4 adapters throw UnsupportedError.
     */
    async parse(_input: string, _filePath: string): Promise<MagentParseResult> {
        return {
            success: false,
            model: null,
            sourcePlatform: this.platform,
            errors: [`Parsing is not supported for ${this.displayName} (Tier ${this.tier})`],
            warnings: [],
        };
    }

    /**
     * Validate a UMAM model for this platform's constraints.
     * Runs common checks, then delegates to platform-specific validation.
     */
    async validate(model: UniversalMainAgent): Promise<MagentAdapterResult> {
        const errors: string[] = [];
        const warnings: string[] = [];
        const messages: string[] = [];

        // Common validation: must have sections
        if (!model.sections || model.sections.length === 0) {
            errors.push('Main agent config must have at least one section');
        }

        // Size checks
        const rawLength = model.rawContent?.length ?? 0;
        if (rawLength > SIZE_ERROR_BYTES) {
            errors.push(`File size (${rawLength} bytes) exceeds maximum (${SIZE_ERROR_BYTES} bytes)`);
        } else if (rawLength > SIZE_WARN_BYTES) {
            warnings.push(`File size (${rawLength} bytes) is large; consider splitting into directory-level configs`);
        }

        // Token estimation
        const tokens = model.estimatedTokens ?? estimateTokens(model.rawContent ?? '');
        if (tokens > TOKEN_WARN_THRESHOLD) {
            warnings.push(`Estimated ${tokens} tokens; large configs may reduce context window for actual work`);
        }

        // Platform-specific validation
        const platformResult = await this.validatePlatform(model);
        errors.push(...platformResult.errors);
        warnings.push(...platformResult.warnings);
        if (platformResult.messages) {
            messages.push(...platformResult.messages);
        }

        return {
            success: errors.length === 0,
            errors,
            warnings,
            messages,
        };
    }

    /**
     * Generate platform-native output from UMAM.
     * Runs common pre-checks, then delegates to platform-specific generation.
     */
    async generate(model: UniversalMainAgent, options?: MagentGenerateOptions): Promise<MagentAdapterResult> {
        const errors: string[] = [];

        // Pre-check: must have sections
        if (!model.sections || model.sections.length === 0) {
            errors.push('Cannot generate: model has no sections');
            return { success: false, errors, warnings: [] };
        }

        return this.generatePlatform(model, options);
    }

    /**
     * Detect platform-specific features used in a UMAM model.
     * Returns an array of feature identifiers.
     */
    detectFeatures(model: UniversalMainAgent): string[] {
        const features: string[] = [];

        // Common feature detection
        if (model.metadata) features.push('metadata');
        if (model.hierarchy) features.push(`hierarchy:${model.hierarchy}`);
        if (model.preamble) features.push('preamble');

        // Section-based feature detection
        const categories = new Set(model.sections.map((s) => s.category).filter(Boolean));
        for (const cat of categories) {
            features.push(`section:${cat}`);
        }

        // Platform-specific feature detection
        const platformFeatures = this.detectPlatformFeatures(model);
        features.push(...platformFeatures);

        return features;
    }

    /**
     * Get file paths where this platform's config files are typically found.
     */
    getDiscoveryPaths(): string[] {
        return PLATFORM_FILENAMES[this.platform] ?? [];
    }

    // ========================================================================
    // Protected methods for subclass override
    // ========================================================================

    /**
     * Platform-specific validation.
     * Override in subclasses to add platform-specific checks.
     */
    protected async validatePlatform(
        _model: UniversalMainAgent,
    ): Promise<{ errors: string[]; warnings: string[]; messages?: string[] }> {
        return { errors: [], warnings: [] };
    }

    /**
     * Platform-specific generation.
     * Must be implemented by subclasses.
     */
    protected abstract generatePlatform(
        model: UniversalMainAgent,
        options?: MagentGenerateOptions,
    ): Promise<MagentAdapterResult>;

    /**
     * Platform-specific feature detection.
     * Override in subclasses to detect platform-specific features.
     */
    protected detectPlatformFeatures(_model: UniversalMainAgent): string[] {
        return [];
    }
}
