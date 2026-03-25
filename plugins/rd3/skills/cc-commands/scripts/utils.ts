/**
 * Shared utilities for rd3:cc-commands scripts
 *
 * Provides frontmatter parsing, command parsing, and field validation
 * helpers used across scaffold, validate, evaluate, refine, and adapt.
 *
 * Key difference from cc-skills utils: Commands are single .md files
 * (not directories), so there is no resource discovery.
 */

import { basename } from 'node:path';
import { extractMarkdownHeadings, hasSecondPersonLanguage } from '../../../scripts/markdown-analysis';
import { parseMarkdownFrontmatter } from '../../../scripts/markdown-frontmatter';
import type { Command, CommandBodyAnalysis, CommandFrontmatter, CommandModel } from './types';

// Re-export constants for convenience
export {
    INVALID_COMMAND_FIELDS,
    VALID_COMMAND_FIELDS,
    VALID_MODELS,
} from './types';

// Re-export adapter utilities for convenience
export { inferArgumentHints } from './adapters/base';

// ============================================================================
// Types
// ============================================================================

export interface ParsedCommandFrontmatter {
    frontmatter: CommandFrontmatter | null;
    body: string;
    raw: string;
    /** Any fields present that are not in the valid set */
    unknownFields: string[];
    /** Any fields present that are in the invalid set */
    invalidFields: string[];
    /** YAML parse error, if any */
    parseError?: string;
}

// ============================================================================
// Frontmatter Parsing
// ============================================================================

/**
 * Parse YAML frontmatter from command markdown content.
 *
 * Returns the parsed frontmatter, body, raw content, and any
 * unknown/invalid fields detected.
 */
export function parseFrontmatter(content: string): ParsedCommandFrontmatter {
    const parsedResult = parseMarkdownFrontmatter(content, { trimBodyWithoutFrontmatter: true });
    const parsed = parsedResult.frontmatter;

    if (!parsed) {
        return {
            frontmatter: null,
            body: parsedResult.body,
            raw: parsedResult.raw,
            unknownFields: [],
            invalidFields: [],
            ...(parsedResult.parseError ? { parseError: parsedResult.parseError } : {}),
        };
    }

    const parsedRecord = parsed as Record<string, unknown>;

    // Separate valid, invalid, and unknown fields
    const validSet = new Set<string>([
        'description',
        'allowed-tools',
        'model',
        'argument-hint',
        'disable-model-invocation',
    ]);
    const invalidSet = new Set<string>([
        'name',
        'skills',
        'subagents',
        'version',
        'agent',
        'context',
        'user-invocable',
        'triggers',
        'license',
        'metadata',
        'examples',
        'arguments',
        'tools',
    ]);

    const unknownFields: string[] = [];
    const invalidFields: string[] = [];

    for (const key of Object.keys(parsedRecord)) {
        if (invalidSet.has(key)) {
            invalidFields.push(key);
        } else if (!validSet.has(key)) {
            unknownFields.push(key);
        }
    }

    // Extract only valid fields for the frontmatter object
    const frontmatter: CommandFrontmatter = {};
    if (parsedRecord.description !== undefined) frontmatter.description = parsedRecord.description as string;
    if (parsedRecord['allowed-tools'] !== undefined) {
        frontmatter['allowed-tools'] = parsedRecord['allowed-tools'] as string | string[];
    }
    if (parsedRecord.model !== undefined) frontmatter.model = parsedRecord.model as CommandModel;
    if (parsedRecord['argument-hint'] !== undefined) {
        frontmatter['argument-hint'] = parsedRecord['argument-hint'] as string;
    }
    if (parsedRecord['disable-model-invocation'] !== undefined) {
        frontmatter['disable-model-invocation'] = parsedRecord['disable-model-invocation'] as boolean;
    }

    return {
        frontmatter,
        body: parsedResult.body,
        raw: parsedResult.raw,
        unknownFields,
        invalidFields,
    };
}

// ============================================================================
// Command Parsing
// ============================================================================

/**
 * Parse a command from its file path and content.
 *
 * The command name is derived from the filename (without extension).
 */
export function parseCommand(filePath: string, content: string): Command {
    const parsed = parseFrontmatter(content);
    const filename = basename(filePath, '.md');

    return {
        frontmatter: parsed.frontmatter,
        body: parsed.body,
        raw: parsed.raw,
        path: filePath,
        filename,
    };
}

/**
 * Read and parse a command from disk.
 */
export async function readCommand(filePath: string): Promise<Command> {
    const file = Bun.file(filePath);
    const content = await file.text();
    return parseCommand(filePath, content);
}

// ============================================================================
// Body Analysis
// ============================================================================

/** Patterns for detecting pseudocode constructs */
const PSEUDOCODE_PATTERNS: Record<string, RegExp> = {
    'Task()': /\bTask\s*\(/,
    'Skill()': /\bSkill\s*\(/,
    'SlashCommand()': /\bSlashCommand\s*\(/,
    'AskUserQuestion()': /\bAskUserQuestion\s*\(/,
};

/** Pattern for argument references */
const ARGUMENT_REF_PATTERN = /\$(?:ARGUMENTS|\d+|@\$\d+)/g;

/** Pattern for CLAUDE_PLUGIN_ROOT usage */
const PLUGIN_ROOT_PATTERN = /\$\{?CLAUDE_PLUGIN_ROOT\}?/;

/**
 * Analyze the body content of a command.
 */
export function analyzeBody(body: string): CommandBodyAnalysis {
    const lines = body.split('\n');

    // Detect pseudocode constructs
    const pseudocodeConstructs: string[] = [];
    for (const [name, pattern] of Object.entries(PSEUDOCODE_PATTERNS)) {
        if (pattern.test(body)) {
            pseudocodeConstructs.push(name);
        }
    }

    // Detect argument references
    const argumentRefs: string[] = [];
    const argMatches = body.matchAll(ARGUMENT_REF_PATTERN);
    for (const match of argMatches) {
        if (!argumentRefs.includes(match[0])) {
            argumentRefs.push(match[0]);
        }
    }

    const sections = extractMarkdownHeadings(body, 3);

    // Detect second-person language (ignore code blocks and comments)
    const hasSecondPerson = hasSecondPersonLanguage(lines);

    return {
        lineCount: lines.length,
        hasPseudocode: pseudocodeConstructs.length > 0,
        pseudocodeConstructs,
        argumentRefs,
        usesPluginRoot: PLUGIN_ROOT_PATTERN.test(body),
        hasSecondPerson,
        sections,
    };
}

// ============================================================================
// Field Validation Helpers
// ============================================================================

/**
 * Validate the `model` field value.
 */
export function isValidModel(value: unknown): value is CommandModel {
    return typeof value === 'string' && ['sonnet', 'opus', 'haiku'].includes(value);
}

/**
 * Validate the `allowed-tools` field format.
 * Accepts: string, string[], or comma-separated string.
 */
export function isValidAllowedTools(value: unknown): boolean {
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.every((v) => typeof v === 'string' && v.trim().length > 0);
    return false;
}

/**
 * Validate the `description` field.
 * Returns warnings/errors about length and content.
 */
export function validateDescription(description: string): {
    valid: boolean;
    issues: string[];
} {
    const issues: string[] = [];

    if (description.length > 60) {
        issues.push(`Description is ${description.length} chars (recommended max: 60)`);
    }

    if (description.length === 0) {
        issues.push('Description is empty');
    }

    if (!/^[A-Z]/.test(description) && !/^[a-z]/.test(description)) {
        issues.push('Description should start with a letter');
    }

    // Check for "This command" anti-pattern
    if (/^this\s+command/i.test(description)) {
        issues.push('Description should not start with "This command" -- start with a verb');
    }

    return { valid: issues.length === 0, issues };
}

/**
 * Check if argument-hint is consistent with body argument usage.
 * Returns warnings about mismatches.
 */
export function checkArgumentConsistency(
    argumentHint: string | undefined,
    bodyAnalysis: CommandBodyAnalysis,
): string[] {
    const issues: string[] = [];

    if (bodyAnalysis.argumentRefs.length > 0 && !argumentHint) {
        issues.push(
            `Body uses argument references (${bodyAnalysis.argumentRefs.join(', ')}) but no argument-hint is defined`,
        );
    }

    if (argumentHint && bodyAnalysis.argumentRefs.length === 0) {
        issues.push(`argument-hint "${argumentHint}" is defined but no argument references found in body`);
    }

    return issues;
}

// ============================================================================
// Name Normalization
// ============================================================================

/**
 * Normalize a command name to hyphen-case.
 * Converts camelCase, PascalCase, snake_case to hyphen-case.
 */
export function normalizeCommandName(name: string): string {
    return name
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[_\s]+/g, '-')
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Detect naming convention: noun-verb (grouped) or verb-noun (simple).
 */
export function detectNamingPattern(name: string): 'noun-verb' | 'verb-noun' | 'unknown' {
    const parts = name.split('-');
    if (parts.length < 2) return 'unknown';

    // Common verbs that appear in command names
    const verbs = new Set([
        'add',
        'create',
        'generate',
        'make',
        'build',
        'init',
        'delete',
        'remove',
        'drop',
        'clear',
        'clean',
        'update',
        'edit',
        'modify',
        'change',
        'set',
        'get',
        'list',
        'show',
        'view',
        'find',
        'search',
        'run',
        'start',
        'stop',
        'restart',
        'execute',
        'test',
        'check',
        'validate',
        'verify',
        'evaluate',
        'deploy',
        'publish',
        'release',
        'ship',
        'review',
        'refine',
        'improve',
        'optimize',
        'migrate',
        'convert',
        'transform',
        'adapt',
    ]);

    const firstPart = parts[0];
    const lastPart = parts[parts.length - 1];

    if (verbs.has(lastPart)) return 'noun-verb';
    if (verbs.has(firstPart)) return 'verb-noun';
    return 'unknown';
}
