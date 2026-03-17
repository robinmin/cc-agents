/**
 * OpenClaw Adapter for rd3:cc-commands
 *
 * Generates OpenClaw-specific command variant
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import YAML from 'yaml';
import type { Command, CommandAdapterContext, CommandAdapterResult, CommandPlatform } from '../types';
import { BaseCommandAdapter, convertArgumentSyntax, convertPseudocodeToNaturalLanguage } from './base';

export interface OpenClawAdapterOptions {
    generateVariant?: boolean;
    generateMetadata?: boolean;
}

/**
 * OpenClaw metadata structure
 */
export interface OpenClawMetadata {
    name: string;
    description: string;
    version?: string;
    emoji?: string;
    homepage?: string;
}

/**
 * OpenClaw Adapter for Commands
 * Generates OpenClaw command variants
 */
export class OpenClawCommandAdapter extends BaseCommandAdapter {
    readonly platform: CommandPlatform = 'openclaw';
    readonly displayName = 'OpenClaw';
    options: OpenClawAdapterOptions;

    constructor(options: OpenClawAdapterOptions = {}) {
        super();
        this.options = {
            generateVariant: true,
            generateMetadata: true,
            ...options,
        };
    }

    protected async validatePlatform(command: Command): Promise<{ errors: string[]; warnings: string[] }> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check for Claude-specific features
        if (command.body.includes('!`')) {
            warnings.push('Claude-specific !`cmd` syntax - OpenClaw may not support shell execution');
        }

        if (command.body.includes('context: fork')) {
            warnings.push("'context: fork' may not be supported in OpenClaw");
        }

        // Check for metadata.openclaw file
        const metadataPath = join(dirname(command.path), 'metadata.openclaw');
        if (existsSync(metadataPath)) {
            try {
                const content = readFileSync(metadataPath, 'utf-8');
                YAML.parse(content);
                warnings.push('Found metadata.openclaw file');
            } catch (e) {
                errors.push(`Invalid metadata.openclaw: ${e}`);
            }
        }

        return { errors, warnings };
    }

    protected async generatePlatformCompanions(context: CommandAdapterContext): Promise<Record<string, string>> {
        const files: Record<string, string> = {};
        const { commandName, frontmatter, body } = context;

        if (this.options.generateMetadata) {
            // Generate metadata.openclaw
            const metadata: OpenClawMetadata = {
                name: commandName,
                description: frontmatter?.description || `${commandName} command`,
                version: '1.0.0',
                emoji: '🛠️',
                homepage: 'https://github.com/cc-agents/cc-agents',
            };

            const metadataPath = join(dirname(context.outputPath), 'metadata.openclaw');
            files[metadataPath] = YAML.stringify(metadata);
        }

        if (this.options.generateVariant) {
            // Generate OpenClaw variant of the command
            const variantContent = this.convertToOpenClawFormat(commandName, frontmatter?.description, body);
            const variantPath = join(dirname(context.outputPath), `${commandName}.openclaw.md`);

            files[variantPath] = variantContent;
        }

        return files;
    }

    protected detectPlatformSpecificFeatures(command: Command): string[] {
        const features: string[] = [];
        const dir = dirname(command.path);

        if (existsSync(join(dir, 'metadata.openclaw'))) {
            features.push('openclaw-metadata');
        }

        if (command.body.includes('!`')) {
            features.push('openclaw-shell-commands');
        }

        return features;
    }

    /**
     * Convert command body to OpenClaw-compatible format
     */
    private convertToOpenClawFormat(name: string, description: string | undefined, body: string): string {
        // Convert Task()/Skill() to natural language
        const content = convertPseudocodeToNaturalLanguage(body);

        // Keep $ARGUMENTS and $N references as-is for OpenClaw
        // OpenClaw handles its own argument syntax

        // Keep !`cmd`` but document it
        // OpenClaw may support shell execution differently

        return `---
name: ${name}
description: ${description || `${name} command`}
---

# ${name}

${content}

## OpenClaw Notes

- Run commands via Bash tool
- Arguments passed in chat context
`;
    }
}

/**
 * Create OpenClaw adapter instance
 */
export function createOpenClawAdapter(options?: OpenClawAdapterOptions): OpenClawCommandAdapter {
    return new OpenClawCommandAdapter(options);
}
