/**
 * OpenCode Adapter for rd3:cc-skills
 *
 * Handles OpenCode-specific permission configuration
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AdapterContext, AdapterResult, IPlatformAdapter, Skill } from '../types';

export interface OpenCodeAdapterOptions {
    validatePermissions?: boolean;
}

/**
 * OpenCode Adapter
 * Handles OpenCode-specific configuration and permissions
 */
export class OpenCodeAdapter implements IPlatformAdapter {
    readonly platform = 'opencode' as const;
    readonly displayName = 'OpenCode';
    options: OpenCodeAdapterOptions;

    constructor(options: OpenCodeAdapterOptions = {}) {
        this.options = {
            validatePermissions: true,
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

        const content = readFileSync(skillMdPath, 'utf-8');

        // Check for OpenCode-specific patterns
        if (content.includes('permission:') || content.includes('permissions:')) {
            messages.push('Found OpenCode permission declarations');
        }

        // Check for shell commands that may need permissions
        const bashCommands = content.match(/```bash\n[\s\S]*?```/g) || [];
        const documentsPermissions =
            content.includes('## Platform Notes') && /permission|permissions/i.test(content);
        if (bashCommands.length > 0 && this.options.validatePermissions && !documentsPermissions) {
            warnings.push('Skill uses bash blocks - consider documenting required permissions');
        }

        // Check for file system operations
        if (content.includes('readFile') || content.includes('writeFile') || content.includes('mkdir')) {
            messages.push('Skill uses file system operations');
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
        // OpenCode doesn't typically require generated companion files
        // It reads directly from SKILL.md
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

        if (content.includes('permission:') || content.includes('permissions:')) {
            features.push('opencode-permissions');
        }

        return features;
    }
}

export function createOpenCodeAdapter(options?: OpenCodeAdapterOptions): OpenCodeAdapter {
    return new OpenCodeAdapter(options);
}
