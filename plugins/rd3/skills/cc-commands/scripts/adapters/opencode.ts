/**
 * OpenCode Adapter for rd3:cc-commands
 *
 * Generates OpenCode-specific command variant
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import YAML from 'yaml';
import type { Command, CommandAdapterContext, CommandAdapterResult, CommandPlatform } from '../types';
import { BaseCommandAdapter, convertArgumentSyntax, convertPseudocodeToNaturalLanguage } from './base';

export interface OpenCodeAdapterOptions {
    generateVariant?: boolean;
    generatePermissions?: boolean;
}

/**
 * OpenCode permissions structure
 */
export interface OpenCodePermissions {
    bins?: string[];
    env?: string[];
    files?: string[];
    network?: boolean;
}

/**
 * OpenCode Adapter for Commands
 * Generates OpenCode command variants
 */
export class OpenCodeCommandAdapter extends BaseCommandAdapter {
    readonly platform: CommandPlatform = 'opencode';
    readonly displayName = 'OpenCode';
    options: OpenCodeAdapterOptions;

    constructor(options: OpenCodeAdapterOptions = {}) {
        super();
        this.options = {
            generateVariant: true,
            generatePermissions: true,
            ...options,
        };
    }

    protected async validatePlatform(command: Command): Promise<{ errors: string[]; warnings: string[] }> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check for features that may require permissions
        if (command.body.includes('!`')) {
            warnings.push('Shell commands may require explicit permissions in OpenCode');
        }

        // Check for file system operations
        const fsOperations = ['readFile', 'writeFile', 'mkdir', 'rm', 'cp', 'mv'];
        for (const op of fsOperations) {
            if (command.body.includes(op)) {
                warnings.push(`File system operation '${op}' may require permissions`);
            }
        }

        // Check for network operations
        if (command.body.includes('fetch') || command.body.includes('http') || command.body.includes('curl')) {
            warnings.push('Network operations may require explicit permissions in OpenCode');
        }

        return { errors, warnings };
    }

    protected async generatePlatformCompanions(context: CommandAdapterContext): Promise<Record<string, string>> {
        const files: Record<string, string> = {};
        const { commandName, frontmatter, body } = context;

        if (this.options.generateVariant) {
            // Generate OpenCode variant of the command
            const variantContent = this.convertToOpenCodeFormat(commandName, frontmatter?.description, body);
            const variantPath = join(dirname(context.outputPath), `${commandName}.opencode.md`);

            files[variantPath] = variantContent;
        }

        if (this.options.generatePermissions) {
            // Generate permissions.yaml if needed
            const permissions = this.detectRequiredPermissions(body);
            if (Object.keys(permissions).length > 0) {
                const permissionsPath = join(dirname(context.outputPath), `${commandName}.permissions.yaml`);
                files[permissionsPath] = YAML.stringify(permissions);
            }
        }

        return files;
    }

    protected detectPlatformSpecificFeatures(command: Command): string[] {
        const features: string[] = [];

        if (command.body.includes('permission:') || command.body.includes('permissions:')) {
            features.push('opencode-permissions');
        }

        if (command.body.includes('!`')) {
            features.push('opencode-shell');
        }

        return features;
    }

    /**
     * Convert command body to OpenCode-compatible format
     */
    private convertToOpenCodeFormat(name: string, description: string | undefined, body: string): string {
        // Convert Task()/Skill() to natural language
        let content = convertPseudocodeToNaturalLanguage(body);

        // Convert $ARGUMENTS to natural language
        content = convertArgumentSyntax(content, 'natural');

        return `---
name: ${name}
description: ${description || `${name} command`}
---

# ${name}

${content}

## OpenCode Notes

- Run commands via Bash tool
- Arguments passed in chat context
- Check permissions before file system or network operations
`;
    }

    /**
     * Detect required permissions from command body
     */
    private detectRequiredPermissions(body: string): OpenCodePermissions {
        const permissions: OpenCodePermissions = {};

        // Detect shell commands
        if (body.includes('!`')) {
            permissions.bins = permissions.bins || [];
            // Common commands that might be used
            if (body.includes('git ')) permissions.bins.push('git');
            if (body.includes('npm ') || body.includes('node ')) permissions.bins.push('node');
            if (body.includes('bun ')) permissions.bins.push('bun');
            if (body.includes('python')) permissions.bins.push('python');
        }

        // Detect network access
        if (body.includes('fetch') || body.includes('http') || body.includes('curl') || body.includes('wget')) {
            permissions.network = true;
        }

        // Detect file operations
        const fsOperations = ['readFile', 'writeFile', 'mkdir', 'rm', 'cp', 'mv', 'readdir'];
        const hasFsOps = fsOperations.some((op) => body.includes(op));
        if (hasFsOps) {
            permissions.files = ['read', 'write'];
        }

        return permissions;
    }
}

/**
 * Create OpenCode adapter instance
 */
export function createOpenCodeAdapter(options?: OpenCodeAdapterOptions): OpenCodeCommandAdapter {
    return new OpenCodeCommandAdapter(options);
}
