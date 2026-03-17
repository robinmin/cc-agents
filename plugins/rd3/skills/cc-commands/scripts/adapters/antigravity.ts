/**
 * Antigravity Adapter for rd3:cc-commands
 *
 * Generates @mention variant for Antigravity (Gemini CLI)
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Command, CommandAdapterContext, CommandAdapterResult, CommandPlatform } from '../types';
import { BaseCommandAdapter, convertArgumentSyntax, convertPseudocodeToNaturalLanguage } from './base';

export interface AntigravityAdapterOptions {
    generateMention?: boolean;
}

/**
 * Antigravity Adapter for Commands
 * Generates @mention variant for Gemini CLI
 */
export class AntigravityCommandAdapter extends BaseCommandAdapter {
    readonly platform: CommandPlatform = 'antigravity';
    readonly displayName = 'Antigravity';
    options: AntigravityAdapterOptions;

    constructor(options: AntigravityAdapterOptions = {}) {
        super();
        this.options = {
            generateMention: true,
            ...options,
        };
    }

    protected async validatePlatform(command: Command): Promise<{ errors: string[]; warnings: string[] }> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check for Claude-specific features that aren't compatible
        if (command.body.includes('!`')) {
            warnings.push('Claude-specific !`cmd` syntax - not directly compatible with Antigravity');
        }

        if (command.body.includes('$ARGUMENTS') || /\$(\d+)/.test(command.body)) {
            warnings.push('Claude-specific $ARGUMENTS found - Antigravity uses different argument handling');
        }

        if (command.body.includes('context: fork')) {
            warnings.push("'context: fork' is Claude-specific - not supported in Antigravity");
        }

        // Check for hooks
        if (command.body.includes('hooks:')) {
            warnings.push("'hooks:' configuration is Claude-specific");
        }

        return { errors, warnings };
    }

    protected async generatePlatformCompanions(context: CommandAdapterContext): Promise<Record<string, string>> {
        const files: Record<string, string> = {};
        const { commandName, frontmatter, body } = context;

        if (this.options.generateMention) {
            // Generate @mention variant
            const mentionContent = this.convertToMentionFormat(commandName, frontmatter?.description, body);
            const mentionPath = join(dirname(context.outputPath), `${commandName}.ag.md`);

            files[mentionPath] = mentionContent;
        }

        return files;
    }

    protected detectPlatformSpecificFeatures(command: Command): string[] {
        const features: string[] = [];

        if (command.body.includes('!`')) {
            features.push('incompatible-claude-commands');
        }

        if (command.body.includes('$ARGUMENTS')) {
            features.push('incompatible-claude-arguments');
        }

        if (command.body.includes('context: fork')) {
            features.push('incompatible-claude-context');
        }

        return features;
    }

    /**
     * Convert command body to Antigravity @mention format
     */
    private convertToMentionFormat(name: string, description: string | undefined, body: string): string {
        // Convert Task()/Skill() to natural language
        let content = convertPseudocodeToNaturalLanguage(body);

        // Convert $ARGUMENTS to natural language form
        content = convertArgumentSyntax(content, 'natural');

        // Convert !`cmd`` to "run command" (not supported)
        content = content.replace(/!`([^`]+)`/g, '[Run: $1]');

        // Convert context: fork (not supported)
        content = content.replace(/context:\s*fork/g, 'parallel execution');

        return `---
name: @${name}
description: ${description || `${name} command`}
---

# @${name}

${content}

## Antigravity Notes

- Use @${name} to invoke this command in Gemini CLI
- Arguments passed as natural language: "@${name} <args>"
- Claude-specific syntax (!\\\`, Task(), etc.) has been converted to natural language
`;
    }
}

/**
 * Create Antigravity adapter instance
 */
export function createAntigravityAdapter(options?: AntigravityAdapterOptions): AntigravityCommandAdapter {
    return new AntigravityCommandAdapter(options);
}
