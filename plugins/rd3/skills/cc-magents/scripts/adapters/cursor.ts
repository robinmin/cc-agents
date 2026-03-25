/**
 * Cursor .cursorrules Adapter for rd3:cc-magents (Tier 2)
 *
 * .cursorrules is Cursor's native configuration format. It supports:
 * - YAML frontmatter with metadata
 * - Markdown body with rules and guidelines
 * - File pattern matching
 * - Cursor-specific tool preferences
 *
 * Cursor-specific features:
 * - .cursorrules discovery in project root and parent directories
 * - Cursor-specific tool preferences (edit, generate, etc.)
 * - Rule-based configuration with YAML frontmatter
 * - Guidelines organized by file patterns
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
// Cursor-Specific Constants
// ============================================================================

/** .cursorrules uses YAML frontmatter */
const CURSOR_FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

/** Cursor-specific section heading patterns */
const CURSOR_SECTION_PATTERNS = {
    rules: /\b(rules?|constraints?)\b/i,
    guidelines: /\b(guideline?s?)\b/i,
    filePatterns: /\b(file\s+patterns?|glob|include|exclude)\b/i,
    tools: /\b(tools?|preferences?|cursor)\b/i,
};

/** Features that are Cursor-specific and not portable */
const CURSOR_ONLY_FEATURES = ['yaml-frontmatter', 'file-pattern-rules', 'cursor-tool-preferences'];

// ============================================================================
// Options
// ============================================================================

export interface CursorAdapterOptions {
    /** Detect Cursor-specific features and flag non-portable sections */
    flagNonPortable?: boolean;
}

// ============================================================================
// .cursorrules Adapter
// ============================================================================

export class CursorAdapter extends BaseMagentAdapter {
    readonly platform: MagentPlatform = 'cursorrules';
    readonly displayName = '.cursorrules (Cursor)';
    readonly tier: PlatformTier = 2;

    constructor(_options: CursorAdapterOptions = {}) {
        super();
    }

    /**
     * Parse a .cursorrules file into UMAM.
     *
     * .cursorrules uses YAML frontmatter + markdown body.
     * We extract metadata, parse sections, and detect Cursor-specific features.
     */
    async parse(input: string, filePath: string): Promise<MagentParseResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!input || input.trim().length === 0) {
            errors.push('.cursorrules file is empty');
            return {
                success: false,
                model: null,
                sourcePlatform: 'cursorrules',
                errors,
                warnings,
            };
        }

        try {
            // Extract YAML frontmatter
            const frontmatterMatch = input.match(CURSOR_FRONTMATTER_PATTERN);
            let body = input;
            let metadata: Record<string, unknown> | null = null;

            if (frontmatterMatch) {
                metadata = parseSimpleYaml(frontmatterMatch[1]);
                body = input.slice(frontmatterMatch[0].length);
            }

            const model = buildUMAM(body, filePath, 'cursorrules');
            model.hierarchy = detectHierarchy(filePath);

            // Attach metadata if found
            if (metadata) {
                model.metadata = {};
                if (metadata.name !== undefined) model.metadata.name = metadata.name as string;
                if (metadata.description !== undefined) model.metadata.description = metadata.description as string;
                if (metadata.version !== undefined) model.metadata.version = metadata.version as string;
                model.metadata.extensions = metadata as Record<string, unknown>;
            }

            // Detect Cursor-specific features
            const features: string[] = [];
            if (metadata) features.push('yaml-frontmatter');

            for (const section of model.sections) {
                const headingLower = section.heading.toLowerCase();
                const contentLower = section.content.toLowerCase();

                if (
                    CURSOR_SECTION_PATTERNS.rules.test(headingLower) ||
                    CURSOR_SECTION_PATTERNS.rules.test(contentLower)
                ) {
                    features.push('rules-section');
                }
                if (CURSOR_SECTION_PATTERNS.guidelines.test(headingLower)) {
                    features.push('guidelines-section');
                }
                if (
                    CURSOR_SECTION_PATTERNS.filePatterns.test(headingLower) ||
                    /\.(ts|js|py|go|rs)\s*:/i.test(contentLower)
                ) {
                    features.push('file-pattern-rules');
                }
                if (CURSOR_SECTION_PATTERNS.tools.test(headingLower)) {
                    features.push('tools-section');
                }
            }

            model.platformFeatures = [...new Set(features)];

            return {
                success: true,
                model,
                sourcePlatform: 'cursorrules',
                errors,
                warnings,
            };
        } catch (error) {
            errors.push(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                model: null,
                sourcePlatform: 'cursorrules',
                errors,
                warnings,
            };
        }
    }

    /**
     * Platform-specific validation for .cursorrules.
     */
    protected async validatePlatform(
        _model: UniversalMainAgent,
    ): Promise<{ errors: string[]; warnings: string[]; messages?: string[] }> {
        const warnings: string[] = [];
        const messages: string[] = [];

        // .cursorrules is fairly permissive
        messages.push('.cursorrules supports YAML frontmatter and markdown body');

        return { errors: [], warnings, messages };
    }

    /**
     * Generate .cursorrules output from UMAM.
     *
     * Generates YAML frontmatter + markdown body format.
     */
    protected async generatePlatform(
        model: UniversalMainAgent,
        _options?: MagentGenerateOptions,
    ): Promise<MagentAdapterResult> {
        const warnings: string[] = [];
        const conversionWarnings: ConversionWarning[] = [];

        // If source is not cursorrules, flag non-portable features from source
        if (model.sourceFormat !== 'cursorrules') {
            // Check for features that don't translate well TO cursorrules
            if (model.platformFeatures?.includes('hooks')) {
                conversionWarnings.push({
                    feature: 'hooks',
                    sourcePlatform: model.sourceFormat,
                    targetPlatform: 'cursorrules',
                    severity: 'warning',
                    description: 'Claude hooks have no direct .cursorrules equivalent',
                });
            }
            if (model.platformFeatures?.includes('mcp-servers')) {
                conversionWarnings.push({
                    feature: 'mcp-servers',
                    sourcePlatform: model.sourceFormat,
                    targetPlatform: 'cursorrules',
                    severity: 'info',
                    description: 'MCP server configuration is Cursor-specific and not portable',
                });
            }
            if (model.platformFeatures?.includes('memory-md')) {
                conversionWarnings.push({
                    feature: 'memory-md',
                    sourcePlatform: model.sourceFormat,
                    targetPlatform: 'cursorrules',
                    severity: 'info',
                    description: 'Memory patterns map to guidelines sections in .cursorrules',
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
     * Detect Cursor-specific features.
     */
    protected detectPlatformFeatures(model: UniversalMainAgent): string[] {
        const features: string[] = [];

        // Check metadata for frontmatter
        if (model.metadata) {
            features.push('yaml-frontmatter');
        }

        // Check sections for Cursor-specific patterns
        for (const section of model.sections) {
            const combined = `${section.heading} ${section.content}`.toLowerCase();

            if (/\b(cursorrules?|cursor)\b/.test(combined) && /preferences?|rules/i.test(combined)) {
                features.push('cursor-preferences');
            }
            if (/\.(ts|js|py|go|rs)\s*:/i.test(section.content)) {
                features.push('file-pattern-rules');
            }
        }

        return [...new Set(features)];
    }

    /**
     * Get Cursor-specific conversion warnings when converting FROM Cursor.
     */
    getConversionWarningsFrom(targetPlatform: MagentPlatform, model: UniversalMainAgent): ConversionWarning[] {
        const warnings: ConversionWarning[] = [];
        const features = this.detectPlatformFeatures(model);

        for (const feature of features) {
            if (CURSOR_ONLY_FEATURES.includes(feature)) {
                warnings.push({
                    feature,
                    sourcePlatform: 'cursorrules',
                    targetPlatform,
                    severity: 'warning',
                    description: `Cursor-specific feature '${feature}' has no equivalent in ${targetPlatform}`,
                });
            }
        }

        return warnings;
    }

    /**
     * Get file paths where .cursorrules is typically found.
     */
    getDiscoveryPaths(): string[] {
        return ['.cursorrules'];
    }
}

/** Factory function */
export function createCursorAdapter(options?: CursorAdapterOptions): CursorAdapter {
    return new CursorAdapter(options);
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
