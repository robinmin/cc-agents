/**
 * Antigravity Adapter for rd3:cc-skills
 *
 * Handles Antigravity (Gemini CLI) specific configuration
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { AdapterContext, AdapterResult, IPlatformAdapter, Skill } from '../types';

export interface AntigravityAdapterOptions {
    validateCompat?: boolean;
}

/**
 * Antigravity Adapter
 * Handles Antigravity/Gemini CLI compatibility
 */
export class AntigravityAdapter implements IPlatformAdapter {
    readonly platform = 'antigravity' as const;
    readonly displayName = 'Antigravity';
    options: AntigravityAdapterOptions;

    constructor(options: AntigravityAdapterOptions = {}) {
        this.options = {
            validateCompat: true,
            ...options,
        };
    }

    async validate(skill: Skill): Promise<AdapterResult> {
        const errors: string[] = [];
        const warnings: string[] = [];
        const messages: string[] = [];

        const skillPath = skill.directory;
        const skillMdPath = join(skillPath, 'SKILL.md');

        if (!existsSync(skillMdPath)) {
            errors.push('SKILL.md not found');
            return { success: false, errors, warnings, companions: [] };
        }

        const content = skill.body;

        // Check for Claude-specific features that aren't compatible
        if (content.includes('!`')) {
            warnings.push('Claude-specific !`cmd` syntax found - not directly compatible with Antigravity');
        }

        if (content.includes('$ARGUMENTS') || content.includes('$1')) {
            warnings.push('Claude-specific $ARGUMENTS found - Antigravity uses different argument handling');
        }

        if (content.includes('context: fork')) {
            warnings.push("'context: fork' is Claude-specific - not supported in Antigravity");
        }

        // Check for platform notes
        if (content.includes('## Platform Notes')) {
            messages.push('Found Platform Notes section');
        }

        if (content.includes('### Antigravity') || content.includes('### Gemini')) {
            messages.push('Found Antigravity-specific documentation');
        }

        // Check for hooks
        if (skill.frontmatter.hooks) {
            warnings.push("'hooks:' is Claude-specific - not supported in Antigravity");
        }

        return {
            success: errors.length === 0,
            errors,
            warnings,
            companions: [],
            messages,
        };
    }

    async generateCompanions(_context: AdapterContext): Promise<AdapterResult> {
        // Antigravity doesn't require generated companion files
        // Compatibility is handled through Platform Notes
        return {
            success: true,
            errors: [],
            warnings: [],
            companions: [],
            messages: [],
        };
    }

    detectPlatformFeatures(skill: Skill): string[] {
        const features: string[] = [];
        const content = skill.body;

        // Check for features that are not compatible
        if (content.includes('!`')) {
            features.push('incompatible-claude-commands');
        }

        if (content.includes('$ARGUMENTS')) {
            features.push('incompatible-claude-arguments');
        }

        if (content.includes('context: fork')) {
            features.push('incompatible-claude-context');
        }

        if (content.includes('hooks:')) {
            features.push('incompatible-claude-hooks');
        }

        return features;
    }
}

export function createAntigravityAdapter(options?: AntigravityAdapterOptions): AntigravityAdapter {
    return new AntigravityAdapter(options);
}
