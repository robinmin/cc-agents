#!/usr/bin/env bun
/**
 * Skill Packaging Script for rd3:cc-skills
 *
 * Packages skills for distribution with platform-specific companions
 */

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
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
    const copyMissingEntries = (srcDir: string, destDir: string, prefix: string): void => {
        mkdirSync(destDir, { recursive: true });

        for (const entry of readdirSync(srcDir)) {
            const srcEntry = join(srcDir, entry);
            const destEntry = join(destDir, entry);
            const relativePath = `${prefix}/${entry}`;
            const stat = statSync(srcEntry);

            if (stat.isDirectory()) {
                copyMissingEntries(srcEntry, destEntry, relativePath);
                continue;
            }

            if (!existsSync(destEntry)) {
                cpSync(srcEntry, destEntry);
                createdFiles.push(relativePath);
            }
        }
    };

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
    const resourceDirs = ['scripts', 'references', 'assets'];
    const companionFiles = ['metadata.openclaw', 'metadata.codex', 'metadata.opencode'];

    // Copy directories
    for (const dir of companionDirs) {
        const srcDir = join(resolvedSkillPath, dir);
        if (existsSync(srcDir)) {
            const destDir = join(resolvedOutputPath, dir);
            copyMissingEntries(srcDir, destDir, dir);
        }
    }

    for (const dir of resourceDirs) {
        const srcDir = join(resolvedSkillPath, dir);
        if (existsSync(srcDir)) {
            const destDir = join(resolvedOutputPath, dir);
            copyMissingEntries(srcDir, destDir, dir);
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
    logger.log('Usage: package.ts <skill-path> [options]');
    logger.log('');
    logger.log('Arguments:');
    logger.log('  <skill-path>          Path to skill directory');
    logger.log('');
    logger.log('Options:');
    logger.log('  --output, -o          Output directory (default: ./dist)');
    logger.log(
        '  --platform <name>     Target platform: claude, codex, openclaw, opencode, antigravity (default: all)',
    );
    logger.log('  --no-source          Exclude SKILL.md from package');
    logger.log('  --json               Output results as JSON');
    logger.log('  --help, -h           Show this help message');
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

    logger.info(`Packaging skill at: ${skillPath}`);
    logger.info(`Output: ${options.output}`);
    logger.info(`Platforms: ${options.platforms.join(', ')}`);

    const result = await packageSkill({
        skillPath,
        outputPath: options.output,
        platforms: options.platforms,
        includeSource: options.includeSource,
    });

    if (options.json) {
        logger.log(JSON.stringify(result, null, 2));
    } else {
        if (result.success) {
            logger.success('\nPackaging decision: PASS');
        } else {
            logger.fail('\nPackaging decision: BLOCK');
        }
        logger.log(`Output: ${result.outputPath}`);
        logger.log(`Size: ${(result.size / 1024).toFixed(2)} KB`);

        if (result.errors.length > 0) {
            logger.log('\n--- BLOCK Findings ---');
            for (const e of result.errors) {
                logger.fail(`  ${e}`);
            }
        }
    }

    process.exit(result.success ? 0 : 1);
}

if (import.meta.main) {
    main();
}
