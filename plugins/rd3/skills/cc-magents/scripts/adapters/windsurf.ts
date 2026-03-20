/**
 * Windsurf .windsurfrules Adapter for rd3:cc-magents (Tier 2)
 *
 * .windsurfrules is Windsurf's native configuration format. It supports:
 * - YAML frontmatter with metadata
 * - Markdown body with cascade rules
 * - Non-overridable safety rules
 * - Plan management as first-class operation
 *
 * Windsurf-specific features:
 * - Cascade rules (non-overridable base rules + overridable user rules)
 * - Plan management with update_plan tool
 * - Safety rules that cannot be overridden by user
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
// Windsurf-Specific Constants
// ============================================================================

/** .windsurfrules uses YAML frontmatter (similar to .cursorrules) */
const WINDSURF_FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

/** Windsurf-specific section heading patterns */
const WINDSURF_SECTION_PATTERNS = {
    cascadeRules: /\b(cascade|base\s+rules?)\b/i,
    safetyRules: /\b(safety|critical|non-overridable|cannot\s+allow)\b/i,
    planManagement: /\b(plan|update_plan|planning)\b/i,
    tools: /\b(tools?|commands?|mcp)\b/i,
    workflow: /\b(workflow|process|cascade)\b/i,
};

/** Features that are Windsurf-specific and not portable */
const WINDSURF_ONLY_FEATURES = ['cascade-rules', 'non-overridable-safety', 'update-plan-tool', 'yaml-frontmatter'];

// ============================================================================
// Options
// ============================================================================

export interface WindsurfAdapterOptions {
    /** Detect Windsurf-specific features and flag non-portable sections */
    flagNonPortable?: boolean;
}

// ============================================================================
// .windsurfrules Adapter
// ============================================================================

export class WindsurfAdapter extends BaseMagentAdapter {
    readonly platform: MagentPlatform = 'windsurfrules';
    readonly displayName = '.windsurfrules (Windsurf)';
    readonly tier: PlatformTier = 2;
    private options: WindsurfAdapterOptions;

    constructor(options: WindsurfAdapterOptions = {}) {
        super();
        this.options = {
            flagNonPortable: true,
            ...options,
        };
    }

    /**
     * Parse a .windsurfrules file into UMAM.
     *
     * .windsurfrules uses YAML frontmatter + markdown body.
     * We extract metadata, parse sections, and detect Windsurf-specific features.
     */
    async parse(input: string, filePath: string): Promise<MagentParseResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!input || input.trim().length === 0) {
            errors.push('.windsurfrules file is empty');
            return {
                success: false,
                model: null,
                sourcePlatform: 'windsurfrules',
                errors,
                warnings,
            };
        }

        try {
            // Extract YAML frontmatter
            const frontmatterMatch = input.match(WINDSURF_FRONTMATTER_PATTERN);
            let body = input;
            let metadata: Record<string, unknown> | null = null;

            if (frontmatterMatch) {
                metadata = parseSimpleYaml(frontmatterMatch[1]);
                body = input.slice(frontmatterMatch[0].length);
            }

            const model = buildUMAM(body, filePath, 'windsurfrules');
            model.hierarchy = detectHierarchy(filePath);

            // Attach metadata if found
            if (metadata) {
                model.metadata = {};
                if (metadata.name !== undefined) model.metadata.name = metadata.name as string;
                if (metadata.description !== undefined) model.metadata.description = metadata.description as string;
                if (metadata.version !== undefined) model.metadata.version = metadata.version as string;
                model.metadata.extensions = metadata as Record<string, unknown>;
            }

            // Detect Windsurf-specific features
            const features: string[] = [];
            if (metadata) features.push('yaml-frontmatter');

            for (const section of model.sections) {
                const headingLower = section.heading.toLowerCase();
                const contentLower = section.content.toLowerCase();

                if (
                    WINDSURF_SECTION_PATTERNS.cascadeRules.test(headingLower) ||
                    WINDSURF_SECTION_PATTERNS.cascadeRules.test(contentLower)
                ) {
                    features.push('cascade-rules');
                }
                if (
                    WINDSURF_SECTION_PATTERNS.safetyRules.test(headingLower) ||
                    /cannot\s+allow.*override/i.test(contentLower)
                ) {
                    features.push('non-overridable-safety');
                }
                if (WINDSURF_SECTION_PATTERNS.planManagement.test(headingLower) || /update_plan/i.test(contentLower)) {
                    features.push('update-plan-tool');
                }
                if (WINDSURF_SECTION_PATTERNS.workflow.test(headingLower)) {
                    features.push('cascade-workflow');
                }
            }

            model.platformFeatures = [...new Set(features)];

            return {
                success: true,
                model,
                sourcePlatform: 'windsurfrules',
                errors,
                warnings,
            };
        } catch (error) {
            errors.push(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                model: null,
                sourcePlatform: 'windsurfrules',
                errors,
                warnings,
            };
        }
    }

    /**
     * Platform-specific validation for .windsurfrules.
     */
    protected async validatePlatform(
        _model: UniversalMainAgent,
    ): Promise<{ errors: string[]; warnings: string[]; messages?: string[] }> {
        const warnings: string[] = [];
        const messages: string[] = [];

        // .windsurfrules is fairly permissive
        messages.push('.windsurfrules supports YAML frontmatter and markdown body');
        messages.push('Safety rules marked as non-overridable should be preserved');

        return { errors: [], warnings, messages };
    }

    /**
     * Generate .windsurfrules output from UMAM.
     *
     * Generates YAML frontmatter + markdown body format.
     * Preserves non-overridable safety rules.
     */
    protected async generatePlatform(
        model: UniversalMainAgent,
        _options?: MagentGenerateOptions,
    ): Promise<MagentAdapterResult> {
        const warnings: string[] = [];
        const conversionWarnings: ConversionWarning[] = [];

        // If source is not windsurfrules, flag non-portable features from source
        if (model.sourceFormat !== 'windsurfrules') {
            // Check for features that don't translate well TO windsurfrules
            if (model.platformFeatures?.includes('hooks')) {
                conversionWarnings.push({
                    feature: 'hooks',
                    sourcePlatform: model.sourceFormat,
                    targetPlatform: 'windsurfrules',
                    severity: 'warning',
                    description: 'Claude hooks have no direct .windsurfrules equivalent',
                });
            }
            if (model.platformFeatures?.includes('mcp-servers')) {
                conversionWarnings.push({
                    feature: 'mcp-servers',
                    sourcePlatform: model.sourceFormat,
                    targetPlatform: 'windsurfrules',
                    severity: 'info',
                    description: 'MCP server configuration is Windsurf-specific and not portable',
                });
            }
            if (model.platformFeatures?.includes('memory-md')) {
                conversionWarnings.push({
                    feature: 'memory-md',
                    sourcePlatform: model.sourceFormat,
                    targetPlatform: 'windsurfrules',
                    severity: 'info',
                    description: 'Memory patterns should be documented in guidelines sections',
                });
            }
        }

        // Generate output
        const parts: string[] = [];

        // YAML frontmatter (optional metadata)
        if (model.metadata && Object.keys(model.metadata).length > 0) {
            const fmParts: string[] = [];
            fmParts.push('---');
            if (model.metadata.name) fmParts.push(`name: ${model.metadata.name}`);
            if (model.metadata.description) fmParts.push(`description: ${model.metadata.description}`);
            if (model.metadata.version) fmParts.push(`version: ${model.metadata.version}`);
            fmParts.push('---');
            parts.push(fmParts.join('\n'));
            parts.push('');
        }

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
     * Detect Windsurf-specific features.
     */
    protected detectPlatformFeatures(model: UniversalMainAgent): string[] {
        const features: string[] = [];

        // Check metadata for frontmatter
        if (model.metadata) {
            features.push('yaml-frontmatter');
        }

        // Check sections for Windsurf-specific patterns
        for (const section of model.sections) {
            const combined = `${section.heading} ${section.content}`.toLowerCase();

            if (/cascade/i.test(combined) || /base\s+rules?/i.test(combined)) {
                features.push('cascade-rules');
            }
            if (/cannot\s+allow.*override/i.test(combined) || /non-overridable/i.test(combined)) {
                features.push('non-overridable-safety');
            }
            if (/update_plan/i.test(combined)) {
                features.push('update-plan-tool');
            }
        }

        return [...new Set(features)];
    }

    /**
     * Get Windsurf-specific conversion warnings when converting FROM Windsurf.
     */
    getConversionWarningsFrom(targetPlatform: MagentPlatform, model: UniversalMainAgent): ConversionWarning[] {
        const warnings: ConversionWarning[] = [];
        const features = this.detectPlatformFeatures(model);

        for (const feature of features) {
            if (WINDSURF_ONLY_FEATURES.includes(feature)) {
                warnings.push({
                    feature,
                    sourcePlatform: 'windsurfrules',
                    targetPlatform,
                    severity: 'warning',
                    description: `Windsurf-specific feature '${feature}' has no equivalent in ${targetPlatform}`,
                });
            }
        }

        return warnings;
    }

    /**
     * Get file paths where .windsurfrules is typically found.
     */
    getDiscoveryPaths(): string[] {
        return ['.windsurfrules'];
    }
}

/** Factory function */
export function createWindsurfAdapter(options?: WindsurfAdapterOptions): WindsurfAdapter {
    return new WindsurfAdapter(options);
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Simple YAML-like key: value parser for frontmatter.
 */
function parseSimpleYaml(text: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = text.split('\n');

    for (const line of lines) {
        const match = line.match(/^\s*([a-zA-Z_-]+)\s*:\s*(.*?)\s*$/);
        if (match) {
            const key = match[1];
            let value: unknown = match[2];

            // Parse booleans
            if (value === 'true') value = true;
            else if (value === 'false') value = false;
            // Parse numbers
            else if (/^\d+$/.test(value as string)) value = Number.parseInt(value as string, 10);
            // Strip quotes
            else if (typeof value === 'string' && /^['"](.*)['"]$/.test(value)) {
                value = value.slice(1, -1);
            }

            result[key] = value;
        }
    }

    return result;
}
