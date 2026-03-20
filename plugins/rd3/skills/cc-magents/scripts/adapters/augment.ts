/**
 * Augment Code Adapter for rd3:cc-magents (Tier 3 -- Generate Only)
 *
 * Augment Code is an AI coding agent that focuses on:
 * - Task management integration
 * - Knowledge integration
 * - Collaborative coding
 *
 * Augment-specific approach:
 * - Integration with task management (add_tasks, update_tasks)
 * - Knowledge Item (KI) system for context
 * - Multi-file awareness
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
// Augment-Specific Constants
// ============================================================================

/** Features that Augment Code focuses on */
const AUGMENT_FOCUS_FEATURES = ['task-management', 'knowledge-integration', 'multi-file-awareness'];

/** Features that are NOT applicable to Augment Code (Tier 3 limitations) */
const AUGMENT_UNSUPPORTED_FEATURES = ['hooks', 'mcp-servers', 'skills', 'memory-md', 'progressive-complexity'];

/** Augment-specific task management patterns */
const AUGMENT_TASK_PATTERNS = ['add_tasks', 'update_tasks', 'reorganize_tasklist', 'task_management'];

// ============================================================================
// Options
// ============================================================================

export interface AugmentAdapterOptions {
    /** Include task management integration */
    includeTaskManagement?: boolean;
}

// ============================================================================
// Augment Code Adapter (Tier 3 - Generate Only)
// ============================================================================

export class AugmentAdapter extends BaseMagentAdapter {
    readonly platform: MagentPlatform = 'augment';
    readonly displayName = 'Augment Code';
    readonly tier: PlatformTier = 3;
    private options: AugmentAdapterOptions;

    constructor(options: AugmentAdapterOptions = {}) {
        super();
        this.options = {
            includeTaskManagement: true,
            ...options,
        };
    }

    /**
     * Parse is not supported for Augment (Tier 3 generate-only).
     * @throws UnsupportedError
     */
    async parse(_input: string, _filePath: string): Promise<MagentParseResult> {
        return {
            success: false,
            model: null,
            sourcePlatform: 'augment',
            errors: ['Parsing is not supported for Augment Code (Tier 3 generate-only adapter)'],
            warnings: ['Use generate() to create Augment Code configs from UMAM'],
        };
    }

    /**
     * Generate Augment Code-compatible output from UMAM.
     *
     * Augment Code:
     * - Supports standard markdown
     * - Task management integration via tools
     * - Knowledge integration (KI system)
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
                if (AUGMENT_UNSUPPORTED_FEATURES.includes(feature)) {
                    conversionWarnings.push({
                        feature,
                        sourcePlatform: model.sourceFormat,
                        targetPlatform: 'augment',
                        severity: 'warning',
                        description: `Augment Code does not support '${feature}' - this feature will be omitted`,
                    });
                }
            }
        }

        // Generate output with Augment-specific additions
        const parts: string[] = [];

        // Preamble
        if (model.preamble) {
            parts.push(model.preamble);
            parts.push('');
        }

        // Sections
        const serialized = serializeSections(model.sections);
        parts.push(serialized);

        // Add task management integration if enabled
        if (this.options.includeTaskManagement) {
            parts.push('');
            parts.push('---');
            parts.push('');
            parts.push('## Task Management');
            parts.push('');
            parts.push('Use task management tools for complex multi-step operations:');
            parts.push('- Track progress with `add_tasks`, `update_tasks`');
            parts.push('- Reorganize with `reorganize_tasklist` when priorities shift');
            parts.push('- Break down large tasks into smaller, verifiable steps');
        }

        const output = `${parts.join('\n').trim()}\n`;

        // Augment-specific warnings
        warnings.push('Augment Code uses markdown-based configuration');
        warnings.push('Complex features (hooks, MCP, memory) are not supported in Augment Code');

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
     * Detect features relevant for Augment Code.
     */
    protected detectPlatformFeatures(model: UniversalMainAgent): string[] {
        const features: string[] = [];

        // Check for Augment-friendly patterns
        for (const section of model.sections) {
            const combined = `${section.heading} ${section.content}`.toLowerCase();

            for (const pattern of AUGMENT_TASK_PATTERNS) {
                if (combined.includes(pattern.toLowerCase())) {
                    features.push('task-management');
                }
            }
            if (/knowledge|context|ki\b/i.test(combined)) {
                features.push('knowledge-integration');
            }
        }

        return [...new Set(features)];
    }

    /**
     * Get file paths where Augment Code configs might be found.
     */
    getDiscoveryPaths(): string[] {
        return ['.augment/rules.md', 'augment.md'];
    }
}

/** Factory function */
export function createAugmentAdapter(options?: AugmentAdapterOptions): AugmentAdapter {
    return new AugmentAdapter(options);
}
