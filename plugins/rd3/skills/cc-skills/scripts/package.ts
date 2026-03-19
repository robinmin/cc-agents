#!/usr/bin/env bun
/**
 * Skill Packaging Script for rd3:cc-skills
 *
 * Packages skills for distribution with platform-specific companions
 */

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { logger } from '../../../scripts/logger';
import { createAntigravityAdapter } from './adapters/antigravity';
import { createClaudeAdapter } from './adapters/claude';
import { createCodexAdapter } from './adapters/codex';
import { createOpenClawAdapter } from './adapters/openclaw';
import { createOpenCodeAdapter } from './adapters/opencode';
import type { PackageOptions, PackageResult, Platform } from './types';

// ============================================================================
// Packaging Functions
// ============================================================================

async function packageSkill(options: PackageOptions): Promise<PackageResult> {
    const { skillPath, outputPath, platforms, includeSource = true } = options;

    const errors: string[] = [];

    // Resolve paths
    const resolvedSkillPath = resolve(skillPath);
    const resolvedOutputPath = resolve(outputPath);

    // Check if skill exists
    const skillMdPath = join(resolvedSkillPath, 'SKILL.md');
    if (!existsSync(skillMdPath)) {
        return {
            success: false,
            outputPath: resolvedOutputPath,
            size: 0,
            platforms,
            errors: ['SKILL.md not found'],
        };
    }

    // Create output directory
    if (!existsSync(resolvedOutputPath)) {
        mkdirSync(resolvedOutputPath, { recursive: true });
    }

    const createdFiles: string[] = [];
    const sourceContent = readFileSync(skillMdPath, 'utf-8');
    const fmMatch = sourceContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) {
        return {
            success: false,
            outputPath: resolvedOutputPath,
            size: 0,
            platforms,
            errors: ['No frontmatter in SKILL.md'],
        };
    }

    const YAML = await import('yaml');
    const frontmatter = YAML.parse(fmMatch[1]);
    const body = sourceContent.slice(fmMatch[0].length).trim();
    const outputSkillMdPath = join(resolvedOutputPath, 'SKILL.md');

    // Generate companions against the packaged copy so the source tree is never mutated.
    writeFileSync(outputSkillMdPath, sourceContent, 'utf-8');
    if (includeSource) {
        createdFiles.push('SKILL.md');
    }

    const platformAdapters = {
        claude: createClaudeAdapter(),
        codex: createCodexAdapter(),
        openclaw: createOpenClawAdapter(),
        opencode: createOpenCodeAdapter(),
        antigravity: createAntigravityAdapter(),
    };

    for (const platform of platforms) {
        const adapter = platformAdapters[platform];
        if (!adapter) {
            errors.push(`Unknown platform: ${platform}`);
            continue;
        }

        try {
            // Create context for adapter
            const scaffoldOptions = {
                name: resolvedSkillPath.split('/').pop() || 'unknown',
                path: resolvedOutputPath,
            };

            const context = {
                skillPath: resolvedOutputPath,
                skillName: resolvedSkillPath.split('/').pop() || 'unknown',
                frontmatter,
                body,
                resources: {},
                options: scaffoldOptions,
                outputPath: resolvedOutputPath,
                skill: {
                    frontmatter,
                    body,
                    raw: sourceContent,
                    path: outputSkillMdPath,
                    directory: resolvedOutputPath,
                    resources: {},
                },
            };

            const result = await adapter.generateCompanions(context);

            if (result.errors.length > 0) {
                errors.push(...result.errors.map((e) => `${platform}: ${e}`));
            }

            if (result.messages?.length) {
                createdFiles.push(...result.messages);
            }
        } catch (e) {
            errors.push(`Failed to generate ${platform} companions: ${e}`);
        }
    }

    if (!includeSource && existsSync(outputSkillMdPath)) {
        unlinkSync(outputSkillMdPath);
    }

    // Copy existing companions from source into the package when they were not regenerated.
    const companionDirs = ['agents'];
    const companionFiles = ['metadata.openclaw', 'metadata.codex', 'metadata.opencode'];

    // Copy directories
    for (const dir of companionDirs) {
        const srcDir = join(resolvedSkillPath, dir);
        if (existsSync(srcDir)) {
            const destDir = join(resolvedOutputPath, dir);
            mkdirSync(destDir, { recursive: true });
            const files = readdirSync(srcDir);
            for (const file of files) {
                const srcFile = join(srcDir, file);
                const destFile = join(destDir, file);
                if (statSync(srcFile).isFile() && !existsSync(destFile)) {
                    cpSync(srcFile, destFile);
                    createdFiles.push(`${dir}/${file}`);
                }
            }
        }
    }

    // Copy individual companion files
    for (const file of companionFiles) {
        const srcFile = join(resolvedSkillPath, file);
        const destFile = join(resolvedOutputPath, file);
        if (existsSync(srcFile) && !existsSync(destFile)) {
            cpSync(srcFile, destFile);
            createdFiles.push(file);
        }
    }

    // Calculate size (recursive to include all subdirectories)
    let totalSize = 0;
    function calculateDirSize(dirPath: string): void {
        const entries = readdirSync(dirPath);
        for (const entry of entries) {
            const entryPath = join(dirPath, entry);
            const stat = statSync(entryPath);
            if (stat.isFile()) {
                totalSize += stat.size;
            } else if (stat.isDirectory()) {
                calculateDirSize(entryPath);
            }
        }
    }
    if (existsSync(resolvedOutputPath)) {
        calculateDirSize(resolvedOutputPath);
    }

    return {
        success: errors.length === 0,
        outputPath: resolvedOutputPath,
        size: totalSize,
        platforms,
        errors,
    };
}

// ============================================================================
// CLI
// ============================================================================

function printUsage(): void {
    console.log('Usage: package.ts <skill-path> [options]');
    console.log('');
    console.log('Arguments:');
    console.log('  <skill-path>          Path to skill directory');
    console.log('');
    console.log('Options:');
    console.log('  --output, -o          Output directory (default: ./dist)');
    console.log(
        '  --platform <name>     Target platform: claude, codex, openclaw, opencode, antigravity (default: all)',
    );
    console.log('  --no-source          Exclude SKILL.md from package');
    console.log('  --json               Output results as JSON');
    console.log('  --help, -h           Show this help message');
}

function parseCliArgs(): {
    skillPath: string;
    options: {
        output: string;
        platforms: Platform[];
        includeSource: boolean;
        json: boolean;
    };
} {
    const args = parseArgs({
        args: process.argv.slice(2),
        allowPositionals: true,
        options: {
            output: { type: 'string', short: 'o', default: './dist' },
            platform: { type: 'string', default: 'all' },
            'no-source': { type: 'boolean', default: false },
            json: { type: 'boolean', default: false },
            help: { type: 'boolean', short: 'h', default: false },
        },
    });

    if (args.values.help) {
        printUsage();
        process.exit(0);
    }

    const path = args.positionals?.[0];

    if (!path) {
        logger.error('Error: Missing required argument <skill-path>');
        printUsage();
        process.exit(1);
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
        skillPath: path,
        options: {
            output: args.values.output as string,
            platforms: platforms as Platform[],
            includeSource: !args.values['no-source'],
            json: args.values.json as boolean,
        },
    };
}

async function main() {
    const { skillPath, options } = parseCliArgs();

    console.log(`[INFO] Packaging skill at: ${skillPath}`);
    console.log(`[INFO] Output: ${options.output}`);
    console.log(`[INFO] Platforms: ${options.platforms.join(', ')}`);

    const result = await packageSkill({
        skillPath,
        outputPath: options.output,
        platforms: options.platforms,
        includeSource: options.includeSource,
    });

    if (options.json) {
        console.log(JSON.stringify(result, null, 2));
    } else {
        if (result.success) {
            console.log('\n✓ Packaging completed');
        } else {
            console.log('\n✗ Packaging failed');
        }
        console.log(`Output: ${result.outputPath}`);
        console.log(`Size: ${(result.size / 1024).toFixed(2)} KB`);

        if (result.errors.length > 0) {
            console.log('\n--- Errors ---');
            for (const e of result.errors) {
                console.log(`  ✗ ${e}`);
            }
        }
    }

    process.exit(result.success ? 0 : 1);
}

if (import.meta.main) {
    main();
}
