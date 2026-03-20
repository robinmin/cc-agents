/**
 * AGENTS.md Adapter for rd3:cc-magents (Tier 1 -- Canonical)
 *
 * The AGENTS.md format is the canonical interchange format defined by the
 * Agentic AI Foundation (Linux Foundation). It is "standard Markdown, any
 * headings" with no required fields -- making it the most permissive format.
 *
 * AGENTS.md features:
 * - Standard markdown with any heading structure
 * - Optional metadata in HTML comments or YAML frontmatter
 * - Glob patterns for directory-scoped configs
 * - alwaysApply flag for global applicability
 * - Hierarchical configs (project root + subdirectories)
 * - Supported by 23+ AI coding agents
 *
 * As the canonical format, AGENTS.md is the hub for all cross-platform
 * conversions: Source -> UMAM -> AGENTS.md -> UMAM -> Target
 */

import type {
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
// Options
// ============================================================================

export interface AgentsMdAdapterOptions {
    /** Include metadata comment header in generated output */
    includeMetadataComment?: boolean;
    /** Preserve raw content for lossless round-tripping */
    preserveRaw?: boolean;
}

// ============================================================================
// AGENTS.md Adapter
// ============================================================================

export class AgentsMdAdapter extends BaseMagentAdapter {
    readonly platform: MagentPlatform = 'agents-md';
    readonly displayName = 'AGENTS.md (Universal Standard)';
    readonly tier: PlatformTier = 1;
    private options: AgentsMdAdapterOptions;

    constructor(options: AgentsMdAdapterOptions = {}) {
        super();
        this.options = {
            includeMetadataComment: false,
            preserveRaw: true,
            ...options,
        };
    }

    /**
     * Parse an AGENTS.md file into UMAM.
     *
     * Since AGENTS.md accepts "any valid markdown", parsing is very
     * permissive. We extract sections, classify them, and detect
     * AGENTS.md-specific features.
     */
    async parse(input: string, filePath: string): Promise<MagentParseResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!input || input.trim().length === 0) {
            errors.push('AGENTS.md file is empty');
            return {
                success: false,
                model: null,
                sourcePlatform: 'agents-md',
                errors,
                warnings,
            };
        }

        try {
            const model = buildUMAM(input, filePath, 'agents-md');
            model.hierarchy = detectHierarchy(filePath);

            // AGENTS.md-specific: detect glob metadata
            if (model.metadata?.globs) {
                model.platformFeatures = model.platformFeatures ?? [];
                model.platformFeatures.push('globs');
            }
            if (model.metadata?.alwaysApply) {
                model.platformFeatures = model.platformFeatures ?? [];
                model.platformFeatures.push('alwaysApply');
            }

            // Warn if no sections found (valid but unusual)
            if (model.sections.length === 0 && !model.preamble) {
                warnings.push('AGENTS.md has no headings or content');
            }

            return {
                success: true,
                model,
                sourcePlatform: 'agents-md',
                errors,
                warnings,
            };
        } catch (error) {
            errors.push(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                model: null,
                sourcePlatform: 'agents-md',
                errors,
                warnings,
            };
        }
    }

    /**
     * Platform-specific validation for AGENTS.md.
     *
     * Very permissive since the spec says "any valid markdown".
     * Only checks for things that would be genuinely problematic.
     */
    protected async validatePlatform(
        model: UniversalMainAgent,
    ): Promise<{ errors: string[]; warnings: string[]; messages?: string[] }> {
        const warnings: string[] = [];
        const messages: string[] = [];

        // Check for very short content (might be a stub)
        const totalContent = model.sections.map((s) => s.content).join('');
        if (totalContent.length < 50 && model.sections.length > 0) {
            warnings.push('AGENTS.md has very little content; sections appear to be stubs');
        }

        // Check for duplicate top-level headings
        const topHeadings = model.sections.filter((s) => s.level <= 2).map((s) => s.heading.toLowerCase());
        const seen = new Set<string>();
        for (const heading of topHeadings) {
            if (seen.has(heading)) {
                warnings.push(`Duplicate heading: "${heading}"`);
            }
            seen.add(heading);
        }

        // Informational: section count
        messages.push(`Found ${model.sections.length} sections`);
        if (model.hierarchy) {
            messages.push(`Hierarchy level: ${model.hierarchy}`);
        }

        return { errors: [], warnings, messages };
    }

    /**
     * Generate AGENTS.md output from UMAM.
     *
     * Since AGENTS.md is the canonical format, this is essentially
     * a serialization of the UMAM sections back to markdown.
     */
    protected async generatePlatform(
        model: UniversalMainAgent,
        options?: MagentGenerateOptions,
    ): Promise<MagentAdapterResult> {
        const parts: string[] = [];

        // Optional metadata comment
        if (this.options.includeMetadataComment && model.metadata) {
            const metaParts: string[] = [];
            if (model.metadata.name) metaParts.push(`name: ${model.metadata.name}`);
            if (model.metadata.description) metaParts.push(`description: ${model.metadata.description}`);
            if (model.metadata.version) metaParts.push(`version: ${model.metadata.version}`);
            if (model.metadata.globs) metaParts.push(`globs: ${model.metadata.globs}`);
            if (model.metadata.alwaysApply !== undefined) metaParts.push(`alwaysApply: ${model.metadata.alwaysApply}`);

            if (metaParts.length > 0) {
                parts.push(`<!--\n${metaParts.join('\n')}\n-->`);
                parts.push('');
            }
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

        return {
            success: true,
            output,
            errors: [],
            warnings: [],
        };
    }

    /**
     * Detect AGENTS.md-specific features.
     */
    protected detectPlatformFeatures(model: UniversalMainAgent): string[] {
        const features: string[] = [];

        if (model.metadata?.globs) features.push('globs');
        if (model.metadata?.alwaysApply) features.push('alwaysApply');
        if (model.metadata?.effective) features.push('effective-date');

        // Check for common AGENTS.md patterns
        for (const section of model.sections) {
            if (/decision\s+tree/i.test(section.content)) {
                features.push('decision-trees');
            }
            if (/<example>/i.test(section.content)) {
                features.push('example-blocks');
            }
        }

        return features;
    }
}

/** Factory function for creating an AgentsMdAdapter */
export function createAgentsMdAdapter(options?: AgentsMdAdapterOptions): AgentsMdAdapter {
    return new AgentsMdAdapter(options);
}
