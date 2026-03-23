/**
 * Codex Adapter for rd3:cc-skills
 *
 * Generates agents/openai.yaml for Codex UI integration
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import type { AdapterContext, AdapterResult, IPlatformAdapter, Skill } from '../types';

export interface CodexAdapterOptions {
    platforms?: string[];
    generateOpenAIYaml?: boolean;
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
 * Codex Adapter
 * Generates agents/openai.yaml for Codex UI
 */
export class CodexAdapter implements IPlatformAdapter {
    readonly platform = 'codex' as const;
    readonly displayName = 'Codex';
    options: CodexAdapterOptions;

    constructor(options: CodexAdapterOptions = {}) {
        this.options = {
            platforms: ['claude-code', 'codex'],
            generateOpenAIYaml: true,
            ...options,
        };
    }

    async validate(skill: Skill): Promise<AdapterResult> {
        const errors: string[] = [];
        const warnings: string[] = [];
        const messages: string[] = [];

        const skillPath = skill.directory;
        const agentsDir = join(skillPath, 'agents');
        const openaiYamlPath = join(agentsDir, 'openai.yaml');

        // Check if agents/openai.yaml exists
        if (existsSync(openaiYamlPath)) {
            messages.push('Found agents/openai.yaml');

            try {
                const content = readFileSync(openaiYamlPath, 'utf-8');
                const yaml = YAML.parse(content) as OpenAIYAML;

                // Validate required fields
                if (!yaml.name) {
                    errors.push('agents/openai.yaml missing required field: name');
                }
                if (!yaml.description) {
                    errors.push('agents/openai.yaml missing required field: description');
                }

                // Validate optional fields
                if (yaml.version && !/^\d+\.\d+\.\d+$/.test(yaml.version)) {
                    warnings.push(`Unusual version format: ${yaml.version}`);
                }

                if (yaml.category) {
                    const validCategories = [
                        'architecture-design',
                        'coding',
                        'engineering-core',
                        'plugin-dev',
                        'qa-depth',
                        'debugging',
                        'testing',
                        'refactoring',
                        'documentation',
                        'devops',
                        'data',
                        'workflow-core',
                        'other',
                    ];
                    if (!validCategories.includes(yaml.category)) {
                        warnings.push(`Unusual category: ${yaml.category}`);
                    }
                }

                messages.push('agents/openai.yaml is valid');
            } catch (e) {
                errors.push(`Failed to parse agents/openai.yaml: ${e}`);
            }
        } else {
            warnings.push('No agents/openai.yaml found - Codex will use defaults');
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

        if (!this.options.generateOpenAIYaml) {
            return { success: true, errors, warnings, companions: [], messages };
        }

        const skillPath = context.skillPath;
        const skillMdPath = join(skillPath, 'SKILL.md');
        const agentsDir = join(skillPath, 'agents');
        const openaiYamlPath = join(agentsDir, 'openai.yaml');

        if (!existsSync(skillMdPath)) {
            errors.push('SKILL.md not found');
            return { success: false, errors, warnings, companions: [] };
        }

        // Parse SKILL.md frontmatter
        const content = readFileSync(skillMdPath, 'utf-8');
        const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);

        if (!fmMatch) {
            errors.push('No frontmatter found in SKILL.md');
            return { success: false, errors, warnings, companions: [] };
        }

        try {
            const fm = YAML.parse(fmMatch[1]) as Record<string, unknown>;
            const metadata = fm.metadata as Record<string, unknown> | undefined;
            const openclaw =
                (metadata?.openclaw as Record<string, unknown> | undefined) ||
                (fm.openclaw as Record<string, unknown> | undefined);

            // Create agents directory if it doesn't exist
            if (!existsSync(agentsDir)) {
                mkdirSync(agentsDir, { recursive: true });
            }

            // Generate openai.yaml
            const openaiYaml: OpenAIYAML = {
                name: (fm.name as string) || context.skillName,
                description: (fm.description as string) || '',
                version: (metadata?.version as string) || (fm.version as string) || '1.0.0',
                icon: (openclaw?.emoji as string) || '🛠️',
                category: this.inferCategory(content),
                tags: this.extractTags(content, fm),
            };

            // Extract instructions if available
            const instructionsMatch = content.match(/## Instructions\n\n([\s\S]+?)(?=\n#|$)/);
            if (instructionsMatch) {
                openaiYaml.instructions = instructionsMatch[1].trim().substring(0, 2000);
            }

            writeFileSync(openaiYamlPath, YAML.stringify(openaiYaml), 'utf-8');
            messages.push('Generated agents/openai.yaml');
        } catch (e) {
            errors.push(`Failed to generate agents/openai.yaml: ${e}`);
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
        const skillPath = skill.directory;

        // Check for agents/openai.yaml
        if (existsSync(join(skillPath, 'agents', 'openai.yaml'))) {
            features.push('codex-openai-yaml');
        }

        // Check for codex-specific patterns
        if (content.includes('agents/openai.yaml')) {
            features.push('codex-metadata');
        }

        return features;
    }

    private inferCategory(content: string): string {
        const lower = content.toLowerCase();
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

    private extractTags(content: string, fm: Record<string, unknown>): string[] {
        const tags: string[] = [];

        // Extract from metadata
        if (Array.isArray(fm.tags)) {
            tags.push(...fm.tags.map(String));
        }

        // Extract from content
        const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
        if (codeBlocks.length > 0) {
            tags.push('code');
        }

        const workflows = content.match(/## Workflow/gi) || [];
        if (workflows.length > 0) {
            tags.push('workflow');
        }

        return [...new Set(tags)].slice(0, 5);
    }
}

export function createCodexAdapter(options?: CodexAdapterOptions): CodexAdapter {
    return new CodexAdapter(options);
}
