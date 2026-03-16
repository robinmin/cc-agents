/**
 * Claude Code Adapter for rd3:cc-skills
 *
 * Validates and generates Claude Code-specific features
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AdapterContext, AdapterResult, IPlatformAdapter, Skill } from '../types';

export interface ClaudeAdapterResult extends AdapterResult {
    info: string[];
}

export interface ClaudeAdapterOptions {
    validateCommands?: boolean;
    validateHooks?: boolean;
    generateHints?: boolean;
}

/**
 * Claude Code Adapter
 * Validates Claude-specific syntax and can generate Platform Notes
 */
export class ClaudeAdapter implements IPlatformAdapter {
    readonly platform = 'claude' as const;
    readonly displayName = 'Claude Code';
    options: ClaudeAdapterOptions;

    constructor(options: ClaudeAdapterOptions = {}) {
        this.options = {
            validateCommands: true,
            validateHooks: true,
            generateHints: true,
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

        // Validate Claude-specific syntax
        if (this.options.validateCommands) {
            // Check for !`cmd` syntax
            const backtickCommands = content.match(/`!`[^`]+``/g) || [];
            if (backtickCommands.length > 0) {
                messages.push(`Found ${backtickCommands.length} Claude command(s)`);
            }

            // Check for $ARGUMENTS and $N variables
            const dollarArgs = content.match(/\$(\d+|ARGUMENTS)/g) || [];
            if (dollarArgs.length > 0) {
                messages.push(`Found ${dollarArgs.length} argument reference(s)`);
            }

            // Validate command syntax
            const invalidCommands = content.match(/`!`[a-z]+\s+[^\s`]+``/g) || [];
            if (invalidCommands.length > 0) {
                warnings.push(`Potential invalid command syntax: ${invalidCommands.join(', ')}`);
            }
        }

        // Check for context: fork
        if (content.includes('context: fork')) {
            messages.push("Skill uses 'context: fork' for parallel execution");
        }

        // Validate hooks configuration
        if (this.options.validateHooks) {
            const hooksPath = join(skillPath, 'hooks');
            if (existsSync(hooksPath)) {
                messages.push('Hooks directory found - will be registered in .claude/hooks.json');
            }
        }

        // Check for platform notes section
        if (!content.includes('## Platform Notes') && !content.includes('### Claude Code')) {
            warnings.push("Consider adding '## Platform Notes' section for Claude-specific features");
        }

        return {
            success: errors.length === 0,
            errors,
            warnings,
            companions: [],
            messages,
        };
    }

    async generateCompanions(context: AdapterContext): Promise<AdapterResult> {
        const errors: string[] = [];
        const warnings: string[] = [];
        const messages: string[] = [];

        if (!this.options.generateHints) {
            return { success: true, errors, warnings, companions: [], messages };
        }

        const skillPath = context.skillPath;
        const skillMdPath = join(skillPath, 'SKILL.md');

        if (!existsSync(skillMdPath)) {
            errors.push('SKILL.md not found');
            return { success: false, errors, warnings, companions: [] };
        }

        const content = readFileSync(skillMdPath, 'utf-8');
        let updatedContent = content;

        // Add Claude Code platform notes if missing
        if (!content.includes('### Claude Code')) {
            const platformNotesSection = `
## Platform Notes

### Claude Code
- Use \`!\`cmd\`\` for live command execution
- Use \`$ARGUMENTS\` or \`$1\`, \`$2\` etc. for parameter references
- Use \`context: fork\` for parallel task execution
- Hooks can be registered in \`.claude/hooks.json\``;

            if (content.includes('## Platform Notes')) {
                // Append to existing Platform Notes section
                updatedContent = content.replace(
                    /(## Platform Notes\n)/,
                    `$1${platformNotesSection.replace('## Platform Notes\n', '')}`,
                );
            } else {
                // Add at end of file
                updatedContent = content + platformNotesSection;
            }

            writeFileSync(skillMdPath, updatedContent, 'utf-8');
            messages.push('Added Claude Code platform notes to SKILL.md');
        }

        return {
            success: errors.length === 0,
            errors,
            warnings,
            companions: [],
            messages,
        };
    }

    detectPlatformFeatures(skill: Skill): string[] {
        const features: string[] = [];
        const content = skill.body;

        if (content.includes('!`')) {
            features.push('claude-commands');
        }
        if (content.includes('$ARGUMENTS') || content.includes('$1')) {
            features.push('claude-arguments');
        }
        if (content.includes('context: fork')) {
            features.push('claude-context-fork');
        }

        return features;
    }
}

export function createClaudeAdapter(options?: ClaudeAdapterOptions): ClaudeAdapter {
    return new ClaudeAdapter(options);
}
