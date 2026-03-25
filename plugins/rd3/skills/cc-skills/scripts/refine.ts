#!/usr/bin/env bun
/**
 * Skill Refinement Script for rd3:cc-skills
 *
 * Improves skills based on evaluation results with migration support
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { applyBestPracticeFixes, extractToReferences } from '../../../scripts/best-practice-fixes';
import { logger } from '../../../scripts/logger';
import { createAntigravityAdapter } from './adapters/antigravity';
import { createClaudeAdapter } from './adapters/claude';
import { createCodexAdapter } from './adapters/codex';
import { createOpenClawAdapter } from './adapters/openclaw';
import { createOpenCodeAdapter } from './adapters/opencode';
import type { IPlatformAdapter, Platform, ScaffoldOptions, SkillFrontmatter, SkillResources } from './types';
import { parseFrontmatter } from './utils';

// ============================================================================
// Migration Functions
// ============================================================================

interface MigrationResult {
    success: boolean;
    actions: string[];
    errors: string[];
    content?: string;
}

function migrateFromRd2(content: string): MigrationResult {
    const actions: string[] = [];
    const errors: string[] = [];
    let updated = content;

    // Add name field if missing
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (fmMatch) {
        let fmContent = fmMatch[1];

        // Check if name is missing
        if (!fmContent.includes('name:')) {
            // Extract directory name from content if possible
            const dirMatch = content.match(/#\s+([a-z0-9-]+)/i);
            if (dirMatch) {
                fmContent = `name: ${dirMatch[1]}\n${fmContent}`;
                actions.push('Added missing name field from directory');
            }
        }

        // Add metadata.platforms if missing
        if (!fmContent.includes('platforms:') && !fmContent.includes('metadata:')) {
            fmContent = fmContent.replace(
                /(description:.*\n)/,
                '$1metadata:\n  platforms: claude-code,codex,openclaw,opencode\n',
            );
            actions.push('Added metadata.platforms field');
        }

        // Add metadata.openclaw if missing
        if (!fmContent.includes('openclaw:')) {
            fmContent = fmContent.replace(/(metadata:\n)/, '$1  openclaw:\n    emoji: 🛠️\n');
            actions.push('Added metadata.openclaw with default emoji');
        }

        updated = content.replace(fmMatch[0], `---\n${fmContent.trimEnd()}\n---`);
    }

    // Add Platform Notes section if missing
    if (!content.includes('## Platform Notes')) {
        const platformNotes = `

## Platform Notes

### Claude Code
- Use \`!\`cmd\`\` for live command execution
- Use \`$ARGUMENTS\` or \`$1\`, \`$2\` etc. for parameter references
- Use \`context: fork\` for parallel task execution

### Codex / OpenClaw / OpenCode / Antigravity
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
    bestPractices?: boolean;
    platforms?: Platform[];
    dryRun?: boolean;
}

interface RefineReport {
    migrations: string[];
    bestPractices: string[];
    generations: string[];
    errors: string[];
}

function previewGeneratedCompanions(
    skillPath: string,
    platforms: Platform[],
    content: string,
    frontmatter: SkillFrontmatter,
): string[] {
    const previews: string[] = [];

    if (platforms.includes('claude') && !content.includes('### Claude Code')) {
        previews.push('Would add Claude Code platform notes to SKILL.md');
    }

    if (platforms.includes('codex') && !existsSync(join(skillPath, 'agents', 'openai.yaml'))) {
        previews.push('Would generate agents/openai.yaml');
    }

    const hasOpenClawMetadata =
        existsSync(join(skillPath, 'metadata.openclaw')) || Boolean(frontmatter.metadata?.openclaw);
    if (platforms.includes('openclaw') && !hasOpenClawMetadata) {
        previews.push('Would generate metadata.openclaw');
    }

    return previews;
}

async function refineSkill(
    skillPath: string,
    options: RefineOptions,
): Promise<{
    success: boolean;
    report: RefineReport;
}> {
    const resolvedPath = resolve(skillPath);
    const skillMdPath = join(resolvedPath, 'SKILL.md');

    if (!existsSync(skillMdPath)) {
        return {
            success: false,
            report: {
                migrations: [],
                bestPractices: [],
                generations: [],
                errors: ['SKILL.md not found'],
            },
        };
    }

    const migrations: string[] = [];
    const bestPractices: string[] = [];
    const generations: string[] = [];
    const errors: string[] = [];

    let content = readFileSync(skillMdPath, 'utf-8');
    let updated = false;

    // Run migration if requested
    if (options.migrate) {
        const migration = migrateFromRd2(content);
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

    // Run best practices auto-fix if requested (deterministic issues)
    if (options.bestPractices) {
        // Extract long content to references first (SKILL.md >= 500 lines)
        const extractResult = extractToReferences(resolvedPath, content, {
            writeFiles: !options.dryRun,
        });
        if (extractResult.actions.length > 0) {
            bestPractices.push(...extractResult.actions);
            if (extractResult.content !== content) {
                content = extractResult.content;
                updated = true;
            }
        }

        const bpResult = applyBestPracticeFixes(content, {
            entityLabel: 'This skill helps',
            removeCircularRefs: true,
            removeSlashRefs: true,
        });
        if (bpResult.actions.length > 0) {
            bestPractices.push(...bpResult.actions);
            if (bpResult.content !== content) {
                content = bpResult.content;
                updated = true;
            }
        }
    }

    // Generate platform companions
    const platforms = options.platforms || ['claude', 'codex', 'openclaw', 'opencode', 'antigravity'];

    const platformAdapters: Record<string, IPlatformAdapter> = {
        claude: createClaudeAdapter(),
        codex: createCodexAdapter(),
        openclaw: createOpenClawAdapter(),
        opencode: createOpenCodeAdapter(),
        antigravity: createAntigravityAdapter(),
    };

    // Parse actual frontmatter from SKILL.md content (once, outside the loop)
    const parsed = parseFrontmatter(content);
    const parsedFrontmatter = parsed.frontmatter || ({} as SkillFrontmatter);

    if (options.dryRun) {
        generations.push(...previewGeneratedCompanions(resolvedPath, platforms, content, parsedFrontmatter));
    } else {
        for (const platform of platforms) {
            try {
                const adapter = platformAdapters[platform];
                if (!adapter) {
                    errors.push(`Unknown platform: ${platform}`);
                    continue;
                }

                const scaffoldOptions: ScaffoldOptions = {
                    name: parsedFrontmatter.name || resolvedPath.split('/').pop() || 'unknown',
                    path: resolvedPath,
                };

                const context = {
                    skillPath: resolvedPath,
                    skillName: parsedFrontmatter.name || resolvedPath.split('/').pop() || 'unknown',
                    frontmatter: parsedFrontmatter,
                    body: parsed.body,
                    resources: {} as SkillResources,
                    options: scaffoldOptions,
                    outputPath: resolvedPath,
                    skill: {
                        frontmatter: parsedFrontmatter,
                        body: parsed.body,
                        raw: parsed.raw,
                        path: skillMdPath,
                        directory: resolvedPath,
                        resources: {} as SkillResources,
                    },
                };

                const result = await adapter.generateCompanions(context);
                if (result.messages?.length) {
                    generations.push(...result.messages);
                    updated = true;
                }
            } catch (e) {
                errors.push(`Failed to generate ${platform} companions: ${e}`);
            }
        }
    }

    // Write updated content if changed
    if (updated && !options.dryRun) {
        writeFileSync(skillMdPath, content, 'utf-8');
    }

    return {
        success: errors.length === 0,
        report: {
            migrations,
            bestPractices,
            generations,
            errors,
        },
    };
}

// ============================================================================
// CLI
// ============================================================================

function printUsage(): void {
    logger.log('Usage: refine.ts <skill-path> [options]');
    logger.log('');
    logger.log('Arguments:');
    logger.log('  <skill-path>          Path to skill directory');
    logger.log('');
    logger.log('Options:');
    logger.log('  --migrate             Enable rd2 to rd3 migration mode');
    logger.log('  --best-practices      Apply best practice auto-fixes (deterministic, default: true)');
    logger.log(
        '  --platform <name>     Target platform: claude, codex, openclaw, opencode, antigravity (default: all)',
    );
    logger.log('  --dry-run             Show what would be changed without making changes');
    logger.log('  --verbose, -v         Show detailed output');
    logger.log('  --help, -h            Show this help message');
}

function printReport(report: RefineReport, _verbose: boolean): void {
    if (report.migrations.length > 0) {
        logger.log('\n--- Migrations ---');
        for (const m of report.migrations) {
            logger.log(`  + ${m}`);
        }
    }

    if (report.bestPractices.length > 0) {
        logger.log('\n--- Best Practice Fixes ---');
        for (const bp of report.bestPractices) {
            logger.log(`  * ${bp}`);
        }
    }

    if (report.generations.length > 0) {
        logger.log('\n--- Generated Companions ---');
        for (const g of report.generations) {
            logger.success(`  ${g}`);
        }
    }

    if (report.errors.length > 0) {
        logger.log('\n--- Errors ---');
        for (const e of report.errors) {
            logger.fail(`  ${e}`);
        }
    }

    if (report.migrations.length === 0 && report.generations.length === 0 && report.errors.length === 0) {
        logger.log('\nNo changes needed');
    }
}

/**
 * Find project root by searching for package.json upward from the script location.
 * This ensures relative paths work regardless of where the user runs the script from.
 * Uses .git as the primary project marker (more reliable than package.json alone).
 */
function findProjectRoot(): string {
    const scriptDir = dirname(fileURLToPath(import.meta.url));
    let dir = scriptDir;
    while (dir !== resolve(dir, '..')) {
        // .git indicates a real project root (cache dirs don't have .git)
        if (existsSync(join(dir, '.git'))) {
            return dir;
        }
        dir = resolve(dir, '..');
    }
    // Fallback: find package.json while skipping cache directories
    dir = scriptDir;
    while (dir !== resolve(dir, '..')) {
        if (existsSync(join(dir, 'package.json'))) {
            // Skip cache directories - they have 'cache' in their path
            const pathParts = dir.split('/');
            const hasCacheDir = pathParts.includes('cache');
            if (!hasCacheDir) {
                return dir;
            }
        }
        dir = resolve(dir, '..');
    }
    return scriptDir; // Final fallback to script directory
}

function parseCliArgs(): {
    path: string;
    options: {
        migrate: boolean;
        bestPractices: boolean;
        platforms: Platform[];
        dryRun: boolean;
        verbose: boolean;
    };
} {
    const args = parseArgs({
        args: process.argv.slice(2),
        allowPositionals: true,
        options: {
            migrate: { type: 'boolean', default: false },
            'best-practices': { type: 'boolean', default: true },
            platform: { type: 'string', default: 'all' },
            'dry-run': { type: 'boolean', default: false },
            verbose: { type: 'boolean', short: 'v', default: false },
            help: { type: 'boolean', short: 'h', default: false },
        },
    });

    if (args.values.help) {
        printUsage();
        process.exit(0);
    }

    const rawPath = args.positionals?.[0];

    if (!rawPath) {
        logger.error('Error: Missing required argument <skill-path>');
        printUsage();
        process.exit(1);
    }

    // Resolve relative paths against project root, not CWD
    // This allows running from any directory (e.g., cd into cc-skills cache)
    const projectRoot = findProjectRoot();
    let path = rawPath.startsWith('/') ? rawPath : resolve(projectRoot, rawPath);

    // If resolved path doesn't exist, search upward from script location to find valid path
    // This handles cases where script is run from a cache installation
    if (!rawPath.startsWith('/') && !existsSync(join(path, 'SKILL.md'))) {
        // Search upward from script location for a directory containing the skill
        const scriptDir = dirname(fileURLToPath(import.meta.url));
        let searchDir = scriptDir;
        while (searchDir !== resolve(searchDir, '..')) {
            const candidatePath = join(searchDir, rawPath);
            if (existsSync(join(candidatePath, 'SKILL.md'))) {
                path = candidatePath;
                break;
            }
            searchDir = resolve(searchDir, '..');
        }
    }

    const validPlatforms = ['all', 'claude', 'codex', 'openclaw', 'opencode', 'antigravity'];
    const platformArg = (args.values.platform as string) || 'all';

    if (!validPlatforms.includes(platformArg)) {
        logger.error(`Error: Invalid platform '${platformArg}'`);
        process.exit(1);
    }

    const platforms =
        platformArg === 'all' ? ['claude', 'codex', 'openclaw', 'opencode', 'antigravity'] : [platformArg];

    return {
        path,
        options: {
            migrate: args.values.migrate as boolean,
            bestPractices: args.values['best-practices'] as boolean,
            platforms: platforms as Platform[],
            dryRun: args.values['dry-run'] as boolean,
            verbose: args.values.verbose as boolean,
        },
    };
}

async function main() {
    const { path: skillPath, options } = parseCliArgs();

    logger.info(`Refining skill at: ${skillPath}`);
    logger.info(`Migrate: ${options.migrate}, BestPractices: ${options.bestPractices}`);
    logger.info(`Platforms: ${options.platforms.join(', ')}`);
    if (options.dryRun) {
        logger.info('Dry run mode - no changes will be made');
    }

    const result = await refineSkill(skillPath, options);

    if (result.success) {
        logger.success('\nRefinement completed');
    } else {
        logger.fail('\nRefinement failed');
    }

    printReport(result.report, options.verbose);

    process.exit(result.success ? 0 : 1);
}

main();
