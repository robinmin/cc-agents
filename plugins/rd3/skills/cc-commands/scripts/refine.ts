#!/usr/bin/env bun
/**
 * Command Refinement Script for rd3:cc-commands
 *
 * Improves commands based on validation results with migration support.
 * Key functions:
 * - Fix invalid frontmatter fields (remove, warn)
 * - Fix description length (truncate with warning)
 * - Convert second-person to imperative form
 * - Add missing argument-hint when $N detected
 * - Add Platform Notes section
 * - Migration mode for rd2 commands
 *
 * Usage:
 *   bun refine.ts <command-path> [options]
 *
 * Options:
 *   --migrate             Enable rd2 to rd3 migration mode
 *   --platform <name>     Target platform: claude, codex, gemini, openclaw, opencode, antigravity, all (default: all)
 *   --dry-run             Show what would be changed without making changes
 *   --verbose, -v         Show detailed output
 *   --help, -h            Show this help message
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import {
    convertToImperative,
    createAntigravityAdapter,
    createClaudeAdapter,
    createCodexAdapter,
    createCommandAdapterContext,
    createGeminiAdapter,
    createOpenClawAdapter,
    createOpenCodeAdapter,
} from './adapters';
import type { Command, CommandBodyAnalysis, CommandFrontmatter, CommandPlatform } from './types';
import { analyzeBody, inferArgumentHints, normalizeCommandName, parseFrontmatter, readCommand } from './utils';

// ============================================================================
// Logger
// ============================================================================

const COLORS = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
};

const logger = {
    info: (msg: string) => console.log(`${COLORS.cyan}[INFO]${COLORS.reset} ${msg}`),
    success: (msg: string) => console.log(`${COLORS.green}[OK]${COLORS.reset} ${msg}`),
    warning: (msg: string) => console.warn(`${COLORS.yellow}[WARN]${COLORS.reset} ${msg}`),
    error: (msg: string) => console.error(`${COLORS.red}[ERROR]${COLORS.reset} ${msg}`),
};

// ============================================================================
// Migration Functions
// ============================================================================

interface MigrationResult {
    success: boolean;
    actions: string[];
    errors: string[];
    content?: string;
}

/**
 * Migrate from rd2 command format to rd3
 */
function migrateFromRd2(content: string, commandName: string): MigrationResult {
    const actions: string[] = [];
    const errors: string[] = [];
    let updated = content;

    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);

    if (fmMatch) {
        let fmContent = fmMatch[1];

        // Check for rd2-specific fields that need removal
        const rd2Fields = ['name', 'agent', 'context', 'triggers', 'user-invocable', 'metadata'];
        for (const field of rd2Fields) {
            const fieldRegex = new RegExp(`^${field}:.*$`, 'm');
            if (fieldRegex.test(fmContent)) {
                fmContent = fmContent.replace(fieldRegex, '');
                actions.push(`Removed invalid rd2 field: ${field}`);
            }
        }

        // Ensure minimal 5-field schema exists
        if (!fmContent.includes('description:')) {
            // Use command name as description
            const desc = commandName.replace(/-/g, ' ');
            fmContent = `description: ${desc}\n${fmContent}`;
            actions.push('Added description field');
        }

        // Add disable-model-invocation for safety
        if (!fmContent.includes('disable-model-invocation:')) {
            fmContent += '\ndisable-model-invocation: true';
            actions.push('Added disable-model-invocation: true');
        }

        updated = content.replace(fmMatch[0], `---\n${fmContent.trim()}\n---`);
    }

    // Add Platform Notes section if missing
    if (!content.includes('## Platform Notes')) {
        const platformNotes = `

## Platform Notes

### Claude Code
- Use \`!\`cmd\`\` for live command execution
- Use \`$ARGUMENTS\` or \`$1\`, \`$2\` etc. for parameter references
- Use \`context: fork\` for parallel task execution

### Other Agents
- Run commands via Bash tool
- Arguments passed in chat context
`;

        updated = updated + platformNotes;
        actions.push('Added Platform Notes section');
    }

    return {
        success: errors.length === 0,
        actions,
        errors,
        content: updated,
    };
}

// ============================================================================
// Refinement Functions
// ============================================================================

interface RefineOptions {
    migrate?: boolean;
    platforms?: CommandPlatform[];
    dryRun?: boolean;
    verbose?: boolean;
    fromEval?: string;
}

interface RefineReport {
    migrations: string[];
    generations: string[];
    errors: string[];
    warnings: string[];
}

interface RefineResult {
    success: boolean;
    report: RefineReport;
}

/**
 * Refine a single command
 */
async function refineCommand(commandPath: string, options: RefineOptions): Promise<RefineResult> {
    const resolvedPath = resolve(commandPath);

    if (!existsSync(resolvedPath)) {
        return {
            success: false,
            report: {
                migrations: [],
                generations: [],
                errors: ['Command file not found'],
                warnings: [],
            },
        };
    }

    const command = await readCommand(resolvedPath);
    const migrations: string[] = [];
    const generations: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    let content = command.raw;
    let updated = false;

    // Run migration if requested
    if (options.migrate) {
        const migration = migrateFromRd2(content, command.filename);
        if (migration.actions.length > 0) {
            migrations.push(...migration.actions);
            if (migration.content) {
                content = migration.content;
            }
            updated = true;
        }
        if (migration.errors.length > 0) {
            errors.push(...migration.errors);
        }
    }

    // Fix description length
    const parsed = parseFrontmatter(content);
    if (parsed.frontmatter?.description && parsed.frontmatter.description.length > 60) {
        const truncated = `${parsed.frontmatter.description.substring(0, 57)}...`;
        content = content.replace(/^description:.*$/m, `description: ${truncated}`);
        migrations.push('Truncated description to 60 characters');
        updated = true;
    }

    // Fix second-person language
    const body = parsed.body;
    const analysis = analyzeBody(body);
    if (analysis.hasSecondPerson) {
        const imperativeBody = convertToImperative(body);
        if (imperativeBody !== body) {
            content = content.replace(body, imperativeBody);
            migrations.push('Converted second-person to imperative form');
            updated = true;
        }
    }

    // Add missing argument-hint
    const hasArgRefs = /\$(\d+|ARGUMENTS)/.test(body);
    if (hasArgRefs && !parsed.frontmatter?.['argument-hint']) {
        const inferredHint = inferArgumentHints(body);
        if (inferredHint) {
            content = content.replace(/\n---(?!\n*---)/, `\nargument-hint: ${inferredHint}\n---`);
            migrations.push(`Added argument-hint: ${inferredHint}`);
            updated = true;
        }
    }

    // Add Platform Notes section if missing and not migrated
    if (!options.migrate && !content.includes('## Platform Notes')) {
        const platformNotes = `

## Platform Notes

### Claude Code
- Use \`!\`cmd\`\` for live command execution
- Use \`$ARGUMENTS\` or \`$1\`, \`$2\` etc. for parameter references

### Codex / OpenClaw / OpenCode / Antigravity
- Run commands via Bash tool
- Arguments passed in chat context
`;

        content = content + platformNotes;
        migrations.push('Added Platform Notes section');
        updated = true;
    }

    // Generate platform companions
    const platforms = options.platforms || ['claude', 'codex', 'gemini', 'openclaw', 'opencode', 'antigravity'];

    const adapters = {
        claude: createClaudeAdapter(),
        codex: createCodexAdapter(),
        gemini: createGeminiAdapter(),
        openclaw: createOpenClawAdapter(),
        opencode: createOpenCodeAdapter(),
        antigravity: createAntigravityAdapter(),
    };

    const context = createCommandAdapterContext(
        { ...command, raw: content },
        resolvedPath.replace('.md', ''),
        analysis,
    );

    for (const platform of platforms) {
        try {
            const adapter = adapters[platform];
            if (!adapter) {
                errors.push(`Unknown platform: ${platform}`);
                continue;
            }

            const result = await adapter.generateCompanions(context);
            if (result.companions && result.companions.length > 0) {
                generations.push(...result.companions);
                updated = true;
            }
            if (result.warnings) {
                warnings.push(...result.warnings);
            }
        } catch (e) {
            errors.push(`Failed to generate ${platform} companions: ${e}`);
        }
    }

    // Write updated content if changed
    if (updated && !options.dryRun) {
        writeFileSync(resolvedPath, content, 'utf-8');
    }

    return {
        success: errors.length === 0,
        report: {
            migrations,
            generations,
            errors,
            warnings,
        },
    };
}

// ============================================================================
// Helper: Second-Person to Imperative
// ============================================================================

// ============================================================================
// CLI
// ============================================================================

function printUsage(): void {
    console.log('Usage: refine.ts <command-path> [options]');
    console.log('');
    console.log('Arguments:');
    console.log('  <command-path>        Path to command .md file');
    console.log('');
    console.log('Options:');
    console.log('  --migrate             Enable rd2 to rd3 migration mode');
    console.log(
        '  --platform <name>     Target platform: claude, codex, gemini, openclaw, opencode, antigravity (default: all)',
    );
    console.log('  --dry-run             Show what would be changed without making changes');
    console.log('  --verbose, -v         Show detailed output');
    console.log('  --help, -h            Show this help message');
}

function printReport(report: RefineReport, verbose: boolean): void {
    if (report.migrations.length > 0) {
        console.log('\n--- Migrations / Fixes ---');
        for (const m of report.migrations) {
            console.log(`  + ${m}`);
        }
    }

    if (report.generations.length > 0) {
        console.log('\n--- Generated Companions ---');
        for (const g of report.generations) {
            console.log(`  + ${g}`);
        }
    }

    if (report.warnings.length > 0 && verbose) {
        console.log('\n--- Warnings ---');
        for (const w of report.warnings) {
            console.log(`  ! ${w}`);
        }
    }

    if (report.errors.length > 0) {
        console.log('\n--- Errors ---');
        for (const e of report.errors) {
            console.log(`  X ${e}`);
        }
    }

    if (report.migrations.length === 0 && report.generations.length === 0 && report.errors.length === 0) {
        console.log('\nNo changes needed');
    }
}

function parseCliArgs(): {
    path: string;
    options: RefineOptions;
} {
    const args = parseArgs({
        args: process.argv.slice(2),
        allowPositionals: true,
        options: {
            migrate: { type: 'boolean', default: false },
            platform: { type: 'string', default: 'all' },
            'dry-run': { type: 'boolean', default: false },
            verbose: { type: 'boolean', short: 'v', default: false },
            'from-eval': { type: 'string' },
            help: { type: 'boolean', short: 'h', default: false },
        },
    });

    if (args.values.help) {
        printUsage();
        process.exit(0);
    }

    const path = args.positionals?.[0];

    if (!path) {
        console.error('Error: Missing required argument <command-path>');
        printUsage();
        process.exit(1);
    }

    const validPlatforms = ['all', 'claude', 'codex', 'gemini', 'openclaw', 'opencode', 'antigravity'];
    const platformArg = (args.values.platform as string) || 'all';

    if (!validPlatforms.includes(platformArg)) {
        console.error(`Error: Invalid platform '${platformArg}'`);
        process.exit(1);
    }

    const platforms =
        platformArg === 'all' ? ['claude', 'codex', 'gemini', 'openclaw', 'opencode', 'antigravity'] : [platformArg];

    const fromEvalPath = args.values['from-eval'] as string | undefined;

    const options: RefineOptions = {
        migrate: args.values.migrate as boolean,
        platforms: platforms as CommandPlatform[],
        dryRun: args.values['dry-run'] as boolean,
        verbose: args.values.verbose as boolean,
    };
    if (fromEvalPath) {
        options.fromEval = fromEvalPath;
    }

    return {
        path,
        options,
    };
}

// ============================================================================
// Main
// ============================================================================

async function main() {
    const { path: commandPath, options } = parseCliArgs();

    logger.info(`Refining command at: ${commandPath}`);
    logger.info(`Migrate: ${options.migrate}, Platforms: ${(options.platforms || []).join(', ')}`);
    if (options.dryRun) {
        logger.info('Dry run mode - no changes will be made');
    }

    const result = await refineCommand(commandPath, options);

    if (result.success) {
        logger.success('Refinement completed');
    } else {
        logger.error('Refinement completed with errors');
    }

    printReport(result.report, options.verbose || false);

    process.exit(result.success ? 0 : 1);
}

main();
