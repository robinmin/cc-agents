/**
 * Base Adapter Interface for rd3:cc-commands
 *
 * Platform adapters extend this interface to provide platform-specific
 * validation, companion file generation, and feature detection.
 *
 * Key difference from cc-skills: Commands are single .md files with
 * a strict 5-field frontmatter schema. Platform adapters generate
 * different output formats (TOML for Gemini, YAML for Codex, etc.).
 */

import type {
    Command,
    CommandAdapterContext,
    CommandAdapterResult,
    CommandBodyAnalysis,
    CommandFrontmatter,
    CommandPlatform,
    ICommandPlatformAdapter,
} from '../types';

/**
 * Abstract base adapter with common functionality
 * Platform-specific adapters should extend this class
 */
export abstract class BaseCommandAdapter implements ICommandPlatformAdapter {
    abstract readonly platform: CommandPlatform;
    abstract readonly displayName: string;

    /**
     * Validate command for platform compatibility
     * Override to add platform-specific validation rules
     */
    async validate(command: Command): Promise<CommandAdapterResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check command has content
        if (!command.body || command.body.trim().length === 0) {
            errors.push('Command body is empty');
        }

        // Check description length
        if (command.frontmatter?.description && command.frontmatter.description.length > 60) {
            warnings.push(`Description exceeds 60 characters (${command.frontmatter.description.length})`);
        }

        // Platform-specific validation
        const platformResult = await this.validatePlatform(command);
        errors.push(...platformResult.errors);
        warnings.push(...platformResult.warnings);

        return {
            success: errors.length === 0,
            companions: [],
            errors,
            warnings,
        };
    }

    /**
     * Generate platform-specific companion files
     * Override to generate files like agents/openai.yaml, commands.toml, etc.
     */
    async generateCompanions(context: CommandAdapterContext): Promise<CommandAdapterResult> {
        const companions: string[] = [];
        const errors: string[] = [];
        const warnings: string[] = [];
        const messages: string[] = [];
        const files: Record<string, string> = {};

        // Platform-specific companion generation
        const platformFiles = await this.generatePlatformCompanions(context);
        Object.assign(files, platformFiles);

        // Track companion file paths
        for (const filePath of Object.keys(files)) {
            companions.push(filePath);
        }

        return {
            success: errors.length === 0,
            files,
            companions,
            errors,
            warnings,
            messages,
        };
    }

    /**
     * Detect platform-specific features in command
     * Override to scan for platform-specific syntax
     */
    detectPlatformFeatures(command: Command): string[] {
        const features: string[] = [];

        // Platform-specific feature detection
        const platformFeatures = this.detectPlatformSpecificFeatures(command);
        features.push(...platformFeatures);

        return features;
    }

    /**
     * Platform-specific validation
     * Override in subclasses
     */
    protected async validatePlatform(_command: Command): Promise<{ errors: string[]; warnings: string[] }> {
        return { errors: [], warnings: [] };
    }

    /**
     * Platform-specific companion generation
     * Override in subclasses
     */
    protected async generatePlatformCompanions(_context: CommandAdapterContext): Promise<Record<string, string>> {
        return {};
    }

    /**
     * Platform-specific feature detection
     * Override in subclasses
     */
    protected detectPlatformSpecificFeatures(_command: Command): string[] {
        return [];
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a CommandAdapterContext from a Command
 */
export function createCommandAdapterContext(
    command: Command,
    outputPath: string,
    bodyAnalysis?: CommandBodyAnalysis,
): CommandAdapterContext {
    return {
        command,
        outputPath,
        commandName: command.filename,
        frontmatter: command.frontmatter,
        body: command.body,
        bodyAnalysis: bodyAnalysis || {
            lineCount: command.body.split('\n').length,
            hasPseudocode: false,
            pseudocodeConstructs: [],
            argumentRefs: [],
            usesPluginRoot: false,
            hasSecondPerson: false,
            sections: [],
        },
    };
}

/**
 * Convert command body to imperative form
 * Replaces second-person language with imperative
 */
export function convertToImperative(body: string): string {
    let result = body;

    // Patterns to replace (second-person to imperative)
    const patterns: [RegExp, string][] = [
        [/\byou\s+should\s+/gi, ''],
        [/\byou\s+must\s+/gi, ''],
        [/\byou\s+need\s+to\s+/gi, ''],
        [/\byou\s+can\s+/gi, ''],
        [/\byour\s+/gi, ''],
        [/^You\s+/gm, ''],
    ];

    for (const [pattern, replacement] of patterns) {
        result = result.replace(pattern, replacement);
    }

    return result;
}

/**
 * Convert $ARGUMENTS and $N to template variable format
 * Claude syntax -> Gemini/OpenCode format
 */
export function convertArgumentSyntax(body: string, toFormat: 'template' | 'natural'): string {
    if (toFormat === 'template') {
        // Claude $ARGUMENTS -> {{args}}
        return body
            .replace(/\$ARGUMENTS/gi, '{{args}}')
            .replace(/\$(\d+)/g, '{{$1}}')
            .replace(/\$\{(\d+)\}/g, '{{$1}}');
    }
    // {{args}} -> $ARGUMENTS
    return body.replace(/\{\{args\}\}/gi, '$ARGUMENTS').replace(/\{\{(\d+)\}\}/g, '$$$1');
}

/**
 * Convert Task()/Skill() pseudocode to natural language
 */
export function convertPseudocodeToNaturalLanguage(body: string): string {
    let result = body;

    // Task(subagent_type=...) -> "Delegate to X agent"
    result = result.replace(/Task\s*\(\s*subagent_type\s*=\s*["']([^"']+)["']/gi, 'Delegate to $1 agent');

    // Skill(skill=...) -> "Use X skill"
    result = result.replace(/Skill\s*\(\s*skill\s*=\s*["']([^"']+)["']/gi, 'Use $1 skill');

    // Skill(skill=..., args=...) -> "Use X skill with args"
    result = result.replace(
        /Skill\s*\(\s*skill\s*=\s*["']([^"']+)["']\s*,\s*args\s*=\s*["']([^"']+)["']/gi,
        'Use $1 skill: $2',
    );

    // SlashCommand(...) -> "Call command"
    result = result.replace(/SlashCommand\s*\([^)]+\)/gi, 'Call the command');

    // AskUserQuestion(...) -> Ask user for input
    result = result.replace(/AskUserQuestion\s*\([^)]+\)/gi, 'Ask the user for clarification');

    return result;
}

/**
 * Truncate description to max length with warning
 */
export function truncateDescription(
    description: string,
    maxLength = 60,
): {
    value: string;
    wasTruncated: boolean;
} {
    if (description.length <= maxLength) {
        return { value: description, wasTruncated: false };
    }
    return {
        value: `${description.substring(0, maxLength - 3).trim()}...`,
        wasTruncated: true,
    };
}

/**
 * Extract argument hints from body if not in frontmatter
 */
export function inferArgumentHints(body: string): string | null {
    // Look for $ARGUMENTS or $1, $2 patterns
    const argMatch = body.match(/\$(ARGUMENTS|\d+)/);
    if (!argMatch) return null;

    const args = new Set<string>();
    const matches = body.matchAll(/\$(ARGUMENTS|\d+)/g);
    for (const match of matches) {
        if (match[1] === 'ARGUMENTS') {
            args.add('<args>');
        } else {
            args.add(`<arg${match[1]}>`);
        }
    }

    return args.size === 1 ? Array.from(args)[0] : Array.from(args).join(' ');
}
