/**
 * Codex Adapter for rd3:cc-commands
 *
 * Generates agents/openai.yaml from command metadata
 * and creates a SKILL.md variant for Codex
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import YAML from 'yaml';
import type { Command, CommandAdapterContext, CommandAdapterResult, CommandPlatform } from '../types';
import { BaseCommandAdapter } from './base';

export interface CodexAdapterOptions {
    generateOpenAIYaml?: boolean;
    generateSkillMd?: boolean;
}

export interface OpenAIYAML {
    name: string;
    description: string;
    version?: string;
    icon?: string;
    category?: string;
    tags?: string[];
    instructions?: string;
}

/**
 * Codex Adapter for Commands
 * Generates agents/openai.yaml and SKILL.md for Codex
 */
export class CodexCommandAdapter extends BaseCommandAdapter {
    readonly platform: CommandPlatform = 'codex';
    readonly displayName = 'Codex';
    options: CodexAdapterOptions;

    constructor(options: CodexAdapterOptions = {}) {
        super();
        this.options = {
            generateOpenAIYaml: true,
            generateSkillMd: true,
            ...options,
        };
    }

    protected async validatePlatform(command: Command): Promise<{ errors: string[]; warnings: string[] }> {
        const errors: string[] = [];
        const warnings: string[] = [];

        const outputPath = command.path.replace(/\.md$/, '');
        const agentsDir = join(dirname(command.path), 'agents');
        const openaiYamlPath = join(agentsDir, 'openai.yaml');

        // Check if agents/openai.yaml exists
        if (existsSync(openaiYamlPath)) {
            try {
                const content = readFileSync(openaiYamlPath, 'utf-8');
                const yaml = YAML.parse(content) as OpenAIYAML;

                if (!yaml.name) {
                    errors.push('agents/openai.yaml missing required field: name');
                }
                if (!yaml.description) {
                    errors.push('agents/openai.yaml missing required field: description');
                }
            } catch (e) {
                errors.push(`Failed to parse agents/openai.yaml: ${e}`);
            }
        }

        // Check for CC-specific syntax that isn't compatible
        if (command.body.includes('!`')) {
            warnings.push('Claude-specific !`cmd` syntax found - may not work in Codex');
        }

        if (command.body.includes('$ARGUMENTS')) {
            warnings.push('Claude-specific $ARGUMENTS - Codex uses different argument handling');
        }

        return { errors, warnings };
    }

    protected async generatePlatformCompanions(context: CommandAdapterContext): Promise<Record<string, string>> {
        const files: Record<string, string> = {};
        const { commandName, frontmatter, body } = context;

        if (this.options.generateOpenAIYaml) {
            // Generate agents/openai.yaml
            const agentsDir = join(context.outputPath, '..', 'agents');
            const openaiYamlPath = join(agentsDir, 'openai.yaml');

            const openaiYaml: OpenAIYAML = {
                name: commandName,
                description: frontmatter?.description || `${commandName} command`,
                version: '1.0.0',
                icon: '🛠️',
                category: this.inferCategory(body),
                tags: this.extractTags(body),
            };

            // Add first 2000 chars of instructions if available
            const instructionsMatch = body.match(/(?:#[^\n]+\n+)?([\s\S]{1,2000})/);
            if (instructionsMatch) {
                openaiYaml.instructions = instructionsMatch[1].trim();
            }

            files[openaiYamlPath] = YAML.stringify(openaiYaml);
        }

        if (this.options.generateSkillMd) {
            // Generate SKILL.md variant for Codex
            // Convert command body to skill format
            const skillContent = this.convertToSkillFormat(commandName, frontmatter?.description, body);
            const skillMdPath = join(context.outputPath, '..', 'skills', commandName, 'SKILL.md');

            files[skillMdPath] = skillContent;
        }

        return files;
    }

    protected detectPlatformSpecificFeatures(command: Command): string[] {
        const features: string[] = [];
        const dir = dirname(command.path);

        if (existsSync(join(dir, 'agents', 'openai.yaml'))) {
            features.push('codex-openai-yaml');
        }

        return features;
    }

    private inferCategory(body: string): string {
        const lower = body.toLowerCase();
        if (lower.includes('debug') || lower.includes('error') || lower.includes('fix')) {
            return 'debugging';
        }
        if (lower.includes('test') || lower.includes('spec')) {
            return 'testing';
        }
        if (lower.includes('refactor') || lower.includes('improve')) {
            return 'refactoring';
        }
        if (lower.includes('deploy') || lower.includes('docker') || lower.includes('ci/cd')) {
            return 'devops';
        }
        if (lower.includes('document') || lower.includes('readme')) {
            return 'documentation';
        }
        return 'coding';
    }

    private extractTags(body: string): string[] {
        const tags: string[] = ['command', 'cc-agents'];

        if (body.includes('## Workflow')) {
            tags.push('workflow');
        }
        if (body.includes('```')) {
            tags.push('code');
        }

        return tags;
    }

    private convertToSkillFormat(name: string, description: string | undefined, body: string): string {
        // Convert command to skill format
        // Remove CC-specific pseudocode and use plain language
        const content = body
            .replace(/Task\([^)]+\)/g, 'Delegate to the appropriate agent')
            .replace(/Skill\([^)]+\)/g, 'Use the appropriate skill')
            .replace(/!`([^`]+)`/g, 'Run: $1')
            .replace(/\$ARGUMENTS/gi, 'the arguments')
            .replace(/\$(\d+)/g, 'argument $1');

        return `---
name: ${name}
description: ${description || `${name} skill`}
metadata:
  platforms: codex
---

# ${name}

${content}
`;
    }
}

/**
 * Create Codex adapter instance
 */
export function createCodexAdapter(options?: CodexAdapterOptions): CodexCommandAdapter {
    return new CodexCommandAdapter(options);
}
