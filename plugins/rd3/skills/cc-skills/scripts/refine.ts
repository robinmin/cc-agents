#!/usr/bin/env bun
/**
 * Skill Refinement Script for rd3:cc-skills
 *
 * Improves skills based on evaluation results with migration support
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
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

        updated = content.replace(fmMatch[0], `---\n${fmContent}---`);
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
    platforms?: Platform[];
    dryRun?: boolean;
}

interface RefineReport {
    migrations: string[];
    generations: string[];
    errors: string[];
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
                generations: [],
                errors: ['SKILL.md not found'],
            },
        };
    }

    const migrations: string[] = [];
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

    // Write updated content if changed
    if (updated && !options.dryRun) {
        writeFileSync(skillMdPath, content, 'utf-8');
    }

    return {
        success: errors.length === 0,
        report: {
            migrations,
            generations,
            errors,
        },
    };
}

// ============================================================================
// CLI
// ============================================================================

function printUsage(): void {
    console.log('Usage: refine.ts <skill-path> [options]');
    console.log('');
    console.log('Arguments:');
    console.log('  <skill-path>          Path to skill directory');
    console.log('');
    console.log('Options:');
    console.log('  --migrate             Enable rd2 to rd3 migration mode');
    console.log(
        '  --platform <name>     Target platform: claude, codex, openclaw, opencode, antigravity (default: all)',
    );
    console.log('  --dry-run             Show what would be changed without making changes');
    console.log('  --verbose, -v         Show detailed output');
    console.log('  --help, -h            Show this help message');
}

function printReport(report: RefineReport, _verbose: boolean): void {
    if (report.migrations.length > 0) {
        console.log('\n--- Migrations ---');
        for (const m of report.migrations) {
            console.log(`  + ${m}`);
        }
    }

    if (report.generations.length > 0) {
        console.log('\n--- Generated Companions ---');
        for (const g of report.generations) {
            console.log(`  ✓ ${g}`);
        }
    }

    if (report.errors.length > 0) {
        console.log('\n--- Errors ---');
        for (const e of report.errors) {
            console.log(`  ✗ ${e}`);
        }
    }

    if (report.migrations.length === 0 && report.generations.length === 0 && report.errors.length === 0) {
        console.log('\nNo changes needed');
    }
}

function parseCliArgs(): {
    path: string;
    options: {
        migrate: boolean;
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

    const path = args.positionals?.[0];

    if (!path) {
        console.error('Error: Missing required argument <skill-path>');
        printUsage();
        process.exit(1);
    }

    const validPlatforms = ['all', 'claude', 'codex', 'openclaw', 'opencode', 'antigravity'];
    const platformArg = (args.values.platform as string) || 'all';

    if (!validPlatforms.includes(platformArg)) {
        console.error(`Error: Invalid platform '${platformArg}'`);
        process.exit(1);
    }

    const platforms =
        platformArg === 'all' ? ['claude', 'codex', 'openclaw', 'opencode', 'antigravity'] : [platformArg];

    return {
        path,
        options: {
            migrate: args.values.migrate as boolean,
            platforms: platforms as Platform[],
            dryRun: args.values['dry-run'] as boolean,
            verbose: args.values.verbose as boolean,
        },
    };
}

async function main() {
    const { path: skillPath, options } = parseCliArgs();

    console.log(`[INFO] Refining skill at: ${skillPath}`);
    console.log(`[INFO] Migrate: ${options.migrate}, Platforms: ${options.platforms.join(', ')}`);
    if (options.dryRun) {
        console.log('[INFO] Dry run mode - no changes will be made');
    }

    const result = await refineSkill(skillPath, options);

    if (result.success) {
        console.log('\n✓ Refinement completed');
    } else {
        console.log('\n✗ Refinement failed');
    }

    printReport(result.report, options.verbose);

    process.exit(result.success ? 0 : 1);
}

main();
