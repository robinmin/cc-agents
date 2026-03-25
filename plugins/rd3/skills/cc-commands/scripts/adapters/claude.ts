/**
 * Claude Code Adapter for rd3:cc-commands
 *
 * Validates Claude-specific syntax and generates Platform Notes
 */

import type { Command, CommandAdapterContext, CommandPlatform } from '../types';
import { BaseCommandAdapter } from './base';

export interface ClaudeAdapterOptions {
    fixSecondPerson?: boolean;
    addArgumentHint?: boolean;
    generatePlatformNotes?: boolean;
}

/**
 * Claude Code Adapter for Commands
 * Validates Claude-specific syntax and can generate Platform Notes
 */
export class ClaudeCommandAdapter extends BaseCommandAdapter {
    readonly platform: CommandPlatform = 'claude';
    readonly displayName = 'Claude Code';
    options: ClaudeAdapterOptions;

    constructor(options: ClaudeAdapterOptions = {}) {
        super();
        this.options = {
            fixSecondPerson: true,
            addArgumentHint: true,
            generatePlatformNotes: true,
            ...options,
        };
    }

    protected async validatePlatform(command: Command): Promise<{ errors: string[]; warnings: string[] }> {
        const errors: string[] = [];
        const warnings: string[] = [];
        const content = command.body;

        // Check for !`cmd` syntax
        const backtickCommands = content.match(/!`[^`]+`/g) || [];
        if (backtickCommands.length > 0) {
            warnings.push(`Found ${backtickCommands.length} Claude command(s)`);
        }

        // Check for $ARGUMENTS and $N variables
        const dollarArgs = content.match(/\$(\d+|ARGUMENTS)/g) || [];
        if (dollarArgs.length > 0) {
            warnings.push(`Found ${dollarArgs.length} argument reference(s)`);
        }

        // Validate command syntax
        const invalidCommands = content.match(/!`[a-z]+\s+[^\s`]+`/g) || [];
        if (invalidCommands.length > 0) {
            warnings.push(`Potential invalid command syntax: ${invalidCommands.join(', ')}`);
        }

        // Check for context: fork
        if (content.includes('context: fork')) {
            warnings.push("'context: fork' is Claude-specific syntax");
        }

        // Check for platform notes section
        if (!content.includes('## Platform Notes') && !content.includes('### Claude Code')) {
            warnings.push("Consider adding '## Platform Notes' section");
        }

        // Check argument-hint consistency
        const hasArgs = /\$(\d+|ARGUMENTS)/.test(content);
        if (hasArgs && !command.frontmatter?.['argument-hint']) {
            warnings.push('Body uses argument references but no argument-hint defined');
        }

        return { errors, warnings };
    }

    protected async generatePlatformCompanions(context: CommandAdapterContext): Promise<Record<string, string>> {
        const files: Record<string, string> = {};

        // Add Claude Code platform notes if requested
        if (this.options.generatePlatformNotes && !context.body.includes('### Claude Code')) {
            // Return empty - we can't modify the original file from here
            // The refine.ts script will handle this
        }

        return files;
    }

    protected detectPlatformSpecificFeatures(command: Command): string[] {
        const features: string[] = [];
        const content = command.body;

        if (content.includes('!`')) {
            features.push('claude-commands');
        }
        if (/\$(\d+|ARGUMENTS)/.test(content)) {
            features.push('claude-arguments');
        }
        if (content.includes('context: fork')) {
            features.push('claude-context-fork');
        }

        return features;
    }
}

/**
 * Create Claude adapter instance
 */
export function createClaudeAdapter(options?: ClaudeAdapterOptions): ClaudeCommandAdapter {
    return new ClaudeCommandAdapter(options);
}
