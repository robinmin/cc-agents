/**
 * OpenClaw Adapter for rd3:cc-magents (Tier 1 -- Multi-File)
 *
 * OpenClaw uses a 7-file workspace model where each file has a specific role:
 * - SOUL.md: Personality, tone, values, limits
 * - IDENTITY.md: Public identity card (name, role, avatar)
 * - AGENTS.md: Operating manual (workflows, rules, procedures)
 * - USER.md: User context (name, timezone, preferences)
 * - TOOLS.md: Tool configuration and permissions
 * - HEARTBEAT.md: Scheduled/cron tasks
 * - MEMORY.md: Long-term memory and curated facts
 *
 * This adapter handles both parsing (workspace -> UMAM) and generation
 * (UMAM -> workspace files), distributing sections by category.
 *
 * Sources:
 * - Aman Khan, "How to Make Your OpenClaw Agent Useful and Secure" (Substack, Feb 2026)
 * - Roberto Capodieci, "OpenClaw Workspace Files Explained" (Medium, Mar 2026)
 */

import type {
    MagentAdapterResult,
    MagentGenerateOptions,
    MagentParseResult,
    MagentPlatform,
    MultiFileOutput,
    PlatformFileMapping,
    PlatformTier,
    SectionCategory,
    UniversalMainAgent,
} from '../types';
import { buildUMAM, serializeSections } from '../utils';
import { BaseMagentAdapter } from './base';

// ============================================================================
// Constants
// ============================================================================

/**
 * Mapping from OpenClaw workspace files to UMAM section categories.
 * Each file owns specific categories; sections are routed accordingly.
 */
const OPENCLAW_FILE_MAP: Record<string, readonly SectionCategory[]> = {
    'SOUL.md': ['personality'],
    'IDENTITY.md': ['identity'],
    'AGENTS.md': [
        'rules',
        'workflow',
        'standards',
        'verification',
        'output',
        'error-handling',
        'planning',
        'parallel',
        'evolution',
        'testing',
        'bootstrap',
        'custom',
    ],
    'USER.md': ['user-context'],
    'TOOLS.md': ['tools', 'environment'],
    'HEARTBEAT.md': ['heartbeat'],
    'MEMORY.md': ['memory'],
};

/** All recognized OpenClaw workspace files */
const OPENCLAW_FILES = Object.keys(OPENCLAW_FILE_MAP);

/** Reverse lookup: category -> filename */
const CATEGORY_TO_FILE: Record<SectionCategory, string> = Object.entries(OPENCLAW_FILE_MAP).reduce(
    (acc, [filename, categories]) => {
        for (const category of categories) {
            acc[category] = filename;
        }
        return acc;
    },
    {} as Record<SectionCategory, string>,
);

// ============================================================================
// Options
// ============================================================================

export interface OpenClawAdapterOptions {
    /** Include metadata comment headers in generated files */
    includeMetadataComment?: boolean;
    /** Which workspace files to include (default: all 7) */
    includeFiles?: string[];
    /** Skip empty files in output (default: true) */
    skipEmptyFiles?: boolean;
}

// ============================================================================
// OpenClaw Adapter
// ============================================================================

export class OpenClawAdapter extends BaseMagentAdapter {
    readonly platform: MagentPlatform = 'openclaw';
    readonly displayName = 'OpenClaw (Workspace Files)';
    readonly tier: PlatformTier = 1;
    private options: OpenClawAdapterOptions;

    constructor(options: OpenClawAdapterOptions = {}) {
        super();
        this.options = {
            includeMetadataComment: false,
            includeFiles: OPENCLAW_FILES,
            skipEmptyFiles: true,
            ...options,
        };
    }

    /**
     * Parse OpenClaw workspace content into UMAM.
     *
     * Accepts either:
     * - A single file's content (with filePath indicating which file)
     * - A combined workspace content (all files concatenated with markers)
     *
     * For multi-file parsing, the input should use the format:
     * ```
     * <!-- FILE: SOUL.md -->
     * ...content...
     * <!-- FILE: AGENTS.md -->
     * ...content...
     * ```
     */
    async parse(input: string, filePath: string): Promise<MagentParseResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!input || input.trim().length === 0) {
            errors.push('OpenClaw workspace content is empty');
            return {
                success: false,
                model: null,
                sourcePlatform: 'openclaw',
                errors,
                warnings,
            };
        }

        try {
            // Check if input contains multi-file markers
            const fileMarkerPattern = /^<!--\s*FILE:\s*(\S+)\s*-->\s*$/gm;
            const hasFileMarkers = fileMarkerPattern.test(input);

            if (hasFileMarkers) {
                return this.parseMultiFile(input, filePath, errors, warnings);
            }

            // Single file: use standard UMAM builder
            const model = buildUMAM(input, filePath, 'openclaw');

            // Assign categories based on filename
            const fileName = filePath.split('/').pop() ?? '';
            const fileCategories = OPENCLAW_FILE_MAP[fileName];
            if (fileCategories && fileCategories.length === 1) {
                // Single-category file: assign category to all sections
                for (const section of model.sections) {
                    if (!section.category || section.category === 'custom') {
                        section.category = fileCategories[0];
                    }
                }
            }

            model.platformFeatures = model.platformFeatures ?? [];
            model.platformFeatures.push('openclaw-workspace');
            model.platformFeatures.push(`workspace-file:${fileName}`);

            return {
                success: true,
                model,
                sourcePlatform: 'openclaw',
                errors,
                warnings,
            };
        } catch (error) {
            errors.push(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                model: null,
                sourcePlatform: 'openclaw',
                errors,
                warnings,
            };
        }
    }

    /**
     * Parse multi-file workspace input (concatenated with FILE markers).
     */
    private parseMultiFile(input: string, filePath: string, errors: string[], warnings: string[]): MagentParseResult {
        const fileBlocks = this.splitFileBlocks(input);
        const allSections: UniversalMainAgent['sections'] = [];
        let preamble: string | undefined;

        for (const [fileName, content] of fileBlocks) {
            if (!content.trim()) continue;

            const fileModel = buildUMAM(content, `${filePath}/${fileName}`, 'openclaw');
            const fileCategories = OPENCLAW_FILE_MAP[fileName];

            for (const section of fileModel.sections) {
                // Override category based on file ownership
                if (fileCategories && fileCategories.length === 1) {
                    section.category = fileCategories[0];
                }
                allSections.push(section);
            }

            // Preserve preamble from SOUL.md or first file
            if (fileModel.preamble && !preamble) {
                preamble = fileModel.preamble;
            }

            if (!OPENCLAW_FILES.includes(fileName)) {
                warnings.push(`Unknown workspace file: ${fileName}`);
            }
        }

        if (allSections.length === 0) {
            errors.push('No sections found in workspace files');
            return {
                success: false,
                model: null,
                sourcePlatform: 'openclaw',
                errors,
                warnings,
            };
        }

        const model: UniversalMainAgent = {
            sourcePath: filePath,
            sourceFormat: 'openclaw',
            sections: allSections,
            ...(preamble ? { preamble } : {}),
            platformFeatures: ['openclaw-workspace', 'multi-file'],
        };

        return {
            success: true,
            model,
            sourcePlatform: 'openclaw',
            errors,
            warnings,
        };
    }

    /**
     * Split multi-file input into [filename, content] pairs.
     */
    private splitFileBlocks(input: string): Array<[string, string]> {
        const blocks: Array<[string, string]> = [];
        const lines = input.split('\n');
        let currentFile: string | null = null;
        let currentContent: string[] = [];

        for (const line of lines) {
            const match = line.match(/^<!--\s*FILE:\s*(\S+)\s*-->$/);
            if (match) {
                if (currentFile) {
                    blocks.push([currentFile, currentContent.join('\n')]);
                }
                currentFile = match[1];
                currentContent = [];
            } else {
                currentContent.push(line);
            }
        }

        if (currentFile) {
            blocks.push([currentFile, currentContent.join('\n')]);
        }

        return blocks;
    }

    /**
     * Platform-specific validation for OpenClaw workspace.
     */
    protected async validatePlatform(
        model: UniversalMainAgent,
    ): Promise<{ errors: string[]; warnings: string[]; messages?: string[] }> {
        const warnings: string[] = [];
        const messages: string[] = [];

        // Check for personality/procedure separation
        const personalitySections = model.sections.filter((s) => s.category === 'personality');
        for (const section of personalitySections) {
            if (/\b(step\s+\d|procedure|workflow)\b/i.test(section.content)) {
                warnings.push(
                    'Personality section contains workflow/procedure content — ' +
                        'move numbered steps to AGENTS.md (rules/workflow category)',
                );
            }
        }

        // Check for secrets in any section
        const secretPatterns = [/api[_-]?key/i, /token\s*[:=]/i, /password\s*[:=]/i, /secret\s*[:=]/i];
        for (const section of model.sections) {
            for (const pattern of secretPatterns) {
                if (pattern.test(section.content)) {
                    warnings.push(
                        `Possible secret reference in "${section.heading}" — ` +
                            'use environment variables, never inline secrets in workspace files',
                    );
                    break;
                }
            }
        }

        // Check for missing critical categories
        const categories = new Set(model.sections.map((s) => s.category));
        if (!categories.has('identity') && !categories.has('personality')) {
            warnings.push('No identity or personality section — agent lacks context about who it is');
        }
        if (!categories.has('rules')) {
            warnings.push('No rules section — agent has no guardrails or constraints');
        }

        // Informational messages
        messages.push(`Found ${model.sections.length} sections across categories: ${[...categories].join(', ')}`);

        return { errors: [], warnings, messages };
    }

    /**
     * Generate OpenClaw workspace output from UMAM.
     *
     * Distributes sections across 7 workspace files by category.
     * Returns a single string with FILE markers for multi-file output.
     * Also populates the `multiFileOutput` property for programmatic access.
     */
    protected async generatePlatform(
        model: UniversalMainAgent,
        _options?: MagentGenerateOptions,
    ): Promise<MagentAdapterResult & { multiFileOutput?: MultiFileOutput }> {
        const fileContents = new Map<string, string>();
        const fileMappings: PlatformFileMapping[] = [];

        // Group sections by target file
        const sectionsByFile = new Map<string, typeof model.sections>();
        for (const file of OPENCLAW_FILES) {
            sectionsByFile.set(file, []);
        }

        for (const section of model.sections) {
            const category = section.category ?? 'custom';
            const targetFile = CATEGORY_TO_FILE[category] ?? 'AGENTS.md';
            const fileSections = sectionsByFile.get(targetFile) ?? [];
            fileSections.push(section);
            sectionsByFile.set(targetFile, fileSections);

            fileMappings.push({ category, filename: targetFile });
        }

        // Generate content for each file
        const outputParts: string[] = [];
        const includeFiles = this.options.includeFiles ?? OPENCLAW_FILES;

        for (const fileName of OPENCLAW_FILES) {
            if (!includeFiles.includes(fileName)) continue;

            const sections = sectionsByFile.get(fileName) ?? [];
            if (this.options.skipEmptyFiles && sections.length === 0) continue;

            let content: string;
            if (sections.length > 0) {
                content = serializeSections(sections);
            } else {
                content = `# ${fileName.replace('.md', '')}\n\n<!-- No content yet -->`;
            }

            // Add metadata comment if requested
            if (this.options.includeMetadataComment) {
                const header = `<!-- OpenClaw Workspace File: ${fileName} -->\n<!-- Categories: ${(OPENCLAW_FILE_MAP[fileName] ?? []).join(', ')} -->\n\n`;
                content = header + content;
            }

            fileContents.set(fileName, `${content.trim()}\n`);
            outputParts.push(`<!-- FILE: ${fileName} -->`);
            outputParts.push(content.trim());
            outputParts.push('');
        }

        const output = `${outputParts.join('\n').trim()}\n`;

        const multiFileOutput: MultiFileOutput = {
            platform: 'openclaw',
            files: fileContents,
            fileMappings,
        };

        return {
            success: true,
            output,
            errors: [],
            warnings: [],
            multiFileOutput,
        };
    }

    /**
     * Detect OpenClaw-specific features.
     */
    protected detectPlatformFeatures(model: UniversalMainAgent): string[] {
        const features: string[] = ['openclaw-workspace'];

        const categories = new Set(model.sections.map((s) => s.category).filter(Boolean));

        // Check which workspace files would be populated
        for (const [fileName, fileCategories] of Object.entries(OPENCLAW_FILE_MAP)) {
            const hasContent = fileCategories.some((cat) => categories.has(cat));
            if (hasContent) {
                features.push(`workspace-file:${fileName}`);
            }
        }

        // Check for bootstrap pattern
        if (categories.has('bootstrap')) {
            features.push('bootstrap-pattern');
        }

        // Check for memory architecture
        if (categories.has('memory')) {
            const memorySections = model.sections.filter((s) => s.category === 'memory');
            const hasDaily = memorySections.some((s) => /YYYY-MM-DD|daily.?memory/i.test(s.content));
            const hasCuration = memorySections.some((s) => /curat|promot|long.?term/i.test(s.content));
            if (hasDaily) features.push('daily-memory');
            if (hasCuration) features.push('memory-curation');
        }

        // Check for heartbeat/scheduled tasks
        if (categories.has('heartbeat')) {
            features.push('scheduled-tasks');
        }

        return features;
    }
}

/** Factory function for creating an OpenClawAdapter */
export function createOpenClawAdapter(options?: OpenClawAdapterOptions): OpenClawAdapter {
    return new OpenClawAdapter(options);
}
