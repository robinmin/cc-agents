/**
 * Gemini (Antigravity) Adapter for rd3:cc-commands
 *
 * Generates commands.toml from command metadata.
 * Most complex adaptation because:
 * - $ARGUMENTS -> {{args}}
 * - $N -> {{N}}
 * - Task()/Skill() pseudocode -> natural language
 */

import { dirname, join } from 'node:path';
import type { Command, CommandAdapterContext, CommandAdapterResult, CommandPlatform } from '../types';
import { BaseCommandAdapter, convertArgumentSyntax, convertPseudocodeToNaturalLanguage } from './base';

export interface GeminiAdapterOptions {
    generateToml?: boolean;
}

/**
 * Gemini TOML command structure
 */
export interface GeminiCommand {
    name: string;
    description: string;
    arguments?: string;
    instructions: string;
    tools?: string[];
    model?: string;
}

/**
 * Gemini Adapter for Commands
 * Generates commands.toml for Gemini CLI / Antigravity
 */
export class GeminiCommandAdapter extends BaseCommandAdapter {
    readonly platform: CommandPlatform = 'gemini';
    readonly displayName = 'Gemini (Antigravity)';
    options: GeminiAdapterOptions;

    constructor(options: GeminiAdapterOptions = {}) {
        super();
        this.options = {
            generateToml: true,
            ...options,
        };
    }

    protected async validatePlatform(command: Command): Promise<{ errors: string[]; warnings: string[] }> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check for Claude-specific features
        if (command.body.includes('!`')) {
            warnings.push('Claude-specific !`cmd` syntax - not compatible with Gemini');
        }

        if (command.body.includes('context: fork')) {
            warnings.push("'context: fork' is Claude-specific - not supported in Gemini");
        }

        if (command.frontmatter?.['allowed-tools']) {
            warnings.push("'allowed-tools' may not be supported in Gemini");
        }

        // Check for hooks - not supported
        if (command.body.includes('hooks:')) {
            warnings.push("'hooks:' configuration is Claude-specific");
        }

        return { errors, warnings };
    }

    protected async generatePlatformCompanions(context: CommandAdapterContext): Promise<Record<string, string>> {
        const files: Record<string, string> = {};
        const { commandName, frontmatter, body } = context;

        if (this.options.generateToml) {
            // Convert body to Gemini-compatible format
            const convertedBody = this.convertToGeminiFormat(body);

            // Extract argument hint if present
            let argumentsSpec: string | undefined;
            if (frontmatter?.['argument-hint']) {
                argumentsSpec = frontmatter['argument-hint'];
            } else if (/\$(\d+|ARGUMENTS)/.test(body)) {
                // Infer from body if not explicitly provided
                argumentsSpec = this.inferArguments(body);
            }

            const geminiCommand: GeminiCommand = {
                name: commandName,
                description: frontmatter?.description || `${commandName} command`,
                instructions: convertedBody,
            };

            if (argumentsSpec) {
                geminiCommand.arguments = argumentsSpec;
            }

            if (frontmatter?.model) {
                geminiCommand.model = frontmatter.model;
            }

            // Generate TOML content
            const tomlContent = this.generateToml(geminiCommand);
            const tomlPath = join(dirname(context.outputPath), 'commands.toml');

            files[tomlPath] = tomlContent;
        }

        return files;
    }

    protected detectPlatformSpecificFeatures(command: Command): string[] {
        const features: string[] = [];

        // Check for incompatible features
        if (command.body.includes('!`')) {
            features.push('incompatible-claude-commands');
        }
        if (command.body.includes('$ARGUMENTS') || /\$(\d+)/.test(command.body)) {
            features.push('converted-arguments');
        }
        if (command.body.includes('Task(') || command.body.includes('Skill(')) {
            features.push('converted-pseudocode');
        }

        return features;
    }

    /**
     * Convert command body to Gemini-compatible format
     */
    private convertToGeminiFormat(body: string): string {
        let result = body;

        // Convert Task()/Skill() to natural language
        result = convertPseudocodeToNaturalLanguage(result);

        // Convert $ARGUMENTS to {{args}}, $N to {{N}}
        result = convertArgumentSyntax(result, 'template');

        // Convert !`cmd`` to "run command"
        result = result.replace(/!`([^`]+)`/g, 'Run: $1');

        // Convert context: fork (not supported, remove it)
        result = result.replace(/context:\s*fork/g, 'parallel execution');

        return result;
    }

    /**
     * Infer argument specification from body
     */
    private inferArguments(body: string): string {
        const args: string[] = [];
        const numericArgs = new Set<number>();

        // Find $1, $2, etc.
        const numericMatches = body.matchAll(/\$(\d+)/g);
        for (const match of numericMatches) {
            numericArgs.add(Number.parseInt(match[1], 10));
        }

        // Sort and convert to argument names
        const sortedArgs = Array.from(numericArgs).sort((a, b) => a - b);
        for (const num of sortedArgs) {
            args.push(`arg${num}`);
        }

        // Check for $ARGUMENTS
        if (/\$ARGUMENTS/i.test(body)) {
            args.push('args');
        }

        return args.length > 0 ? args.join(' ') : '<args>';
    }

    /**
     * Generate TOML content from GeminiCommand
     */
    private escapeToml(value: string): string {
        return value
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
    }

    private generateToml(command: GeminiCommand): string {
        const lines: string[] = [];

        lines.push('[[commands]]');
        lines.push(`name = "${this.escapeToml(command.name)}"`);
        lines.push(`description = "${this.escapeToml(command.description)}"`);

        if (command.arguments) {
            lines.push(`arguments = "${this.escapeToml(command.arguments)}"`);
        }

        lines.push('');
        lines.push('[commands.instructions]');
        lines.push(`content = """`);

        // Wrap instructions at 80 chars
        const wrapped = this.wrapText(command.instructions, 76);
        for (const line of wrapped) {
            lines.push(line);
        }

        lines.push(`"""`);

        if (command.model) {
            lines.push('');
            lines.push(`model = "${command.model}"`);
        }

        return lines.join('\n');
    }

    /**
     * Wrap text at specified width
     */
    private wrapText(text: string, width: number): string[] {
        const words = text.split(/\s+/);
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
            if (`${currentLine} ${word}`.trim().length <= width) {
                currentLine = `${currentLine} ${word}`.trim();
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                }
                currentLine = word;
            }
        }

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines;
    }
}

/**
 * Create Gemini adapter instance
 */
export function createGeminiAdapter(options?: GeminiAdapterOptions): GeminiCommandAdapter {
    return new GeminiCommandAdapter(options);
}
