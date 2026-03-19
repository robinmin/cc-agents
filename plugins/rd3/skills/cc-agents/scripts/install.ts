#!/usr/bin/env bun
/**
 * Agent Install Script for rd3:cc-agents
 *
 * Converts agent definitions from any supported platform format and
 * installs them to the target platform's agent directory.
 *
 * Uses the existing adapt pipeline: sourceAdapter.parse() -> UAM -> targetAdapter.generate()
 * then copies the output to the platform-specific install directory.
 *
 * Supported install targets and their directories:
 *   codex:    .codex/agents/ (project) or ~/.codex/agents/ (global)
 *   claude:   .claude/agents/ (project) or ~/.claude/agents/ (global)
 *   gemini:   .gemini/agents/ (project) or ~/.gemini/agents/ (global)
 *
 * Usage:
 *   bun install.ts <source> --target <platform> [options]
 *
 * Arguments:
 *   source            Path to agent file or directory of agent files
 *
 * Options:
 *   --target, -t      Target platform: codex, claude, gemini (required)
 *   --global, -g      Install to user-level directory (default: project-level)
 *   --source-platform Auto-detected, or override: claude, gemini, opencode, codex, openclaw
 *   --dry-run         Preview without writing files
 *   --verbose         Show detailed output
 *   --help            Show this help message
 *
 * Examples:
 *   bun install.ts agent.md --target codex
 *   bun install.ts ./agents/ --target codex
 *   bun install.ts agent.md --target codex --global
 *   bun install.ts agent.md --target codex --dry-run
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { parseArgs } from 'node:util';
import { COLORS, logger } from '../../../scripts/logger';

import { adaptAgent } from './adapt';
import type { AgentPlatform } from './types';
import { PLATFORM_DISPLAY_NAMES } from './types';

// ============================================================================
// Types
// ============================================================================

interface InstallOptions {
    sources: string[];
    targetPlatform: AgentPlatform;
    sourcePlatform?: AgentPlatform;
    global: boolean;
    dryRun: boolean;
    verbose: boolean;
}

interface InstallResult {
    source: string;
    agentName: string;
    success: boolean;
    installedPath: string;
    errors: string[];
    warnings: string[];
}

// ============================================================================
// Constants
// ============================================================================

/** Platform-specific agent directories */
const PLATFORM_DIRS: Record<string, { project: string; global: string }> = {
    codex: { project: '.codex/agents', global: join(homedir(), '.codex', 'agents') },
    claude: { project: '.claude/agents', global: join(homedir(), '.claude', 'agents') },
    gemini: { project: '.gemini/agents', global: join(homedir(), '.gemini', 'agents') },
};

/** File extensions to look for when scanning directories */
const AGENT_EXTENSIONS = ['.md', '.toml', '.json', '.yaml', '.yml'];

const VALID_INSTALL_TARGETS: AgentPlatform[] = ['codex', 'claude', 'gemini'];

// ============================================================================
// Argument Parsing
// ============================================================================

function parseCliArgs(): InstallOptions {
    const args = parseArgs({
        args: process.argv.slice(2),
        allowPositionals: true,
        options: {
            target: { type: 'string', short: 't' },
            'source-platform': { type: 'string' },
            global: { type: 'boolean', short: 'g', default: false },
            'dry-run': { type: 'boolean', default: false },
            verbose: { type: 'boolean', default: false },
            help: { type: 'boolean', default: false },
        },
    });

    if (args.values.help) {
        printUsage();
        process.exit(0);
    }

    const pos = args.positionals || [];

    if (pos.length < 1) {
        logger.error('Source file or directory is required');
        printUsage();
        process.exit(1);
    }

    if (!args.values.target) {
        logger.error('--target platform is required');
        printUsage();
        process.exit(1);
    }

    const targetPlatform = args.values.target as AgentPlatform;
    if (!VALID_INSTALL_TARGETS.includes(targetPlatform)) {
        logger.error(`Invalid target platform: ${targetPlatform}`);
        console.log(`   Valid targets: ${VALID_INSTALL_TARGETS.join(', ')}`);
        process.exit(1);
    }

    // Resolve source(s)
    const sourcePath = resolve(pos[0]);
    let sources: string[];

    if (statSync(sourcePath).isDirectory()) {
        sources = readdirSync(sourcePath)
            .filter((f) => AGENT_EXTENSIONS.includes(extname(f)))
            .map((f) => join(sourcePath, f));
    } else {
        sources = [sourcePath];
    }

    return {
        sources,
        targetPlatform,
        sourcePlatform: args.values['source-platform'] as AgentPlatform | undefined,
        global: args.values.global as boolean,
        dryRun: args.values['dry-run'] as boolean,
        verbose: args.values.verbose as boolean,
    };
}

function printUsage(): void {
    console.log(`${COLORS.cyan}install.ts${COLORS.reset} - Agent Installation Tool\n`);
    console.log(`${COLORS.green}USAGE:${COLORS.reset}`);
    console.log('    bun install.ts <source> --target <platform> [options]\n');
    console.log(`${COLORS.green}ARGUMENTS:${COLORS.reset}`);
    console.log('    source            Path to agent file or directory\n');
    console.log(`${COLORS.green}OPTIONS:${COLORS.reset}`);
    console.log(`    --target, -t      Target: ${VALID_INSTALL_TARGETS.join(', ')} (required)`);
    console.log('    --source-platform Override auto-detected source platform');
    console.log('    --global, -g      Install to user-level directory');
    console.log('    --dry-run         Preview without writing files');
    console.log('    --verbose         Show detailed output');
    console.log('    --help            Show this help message\n');
    console.log(`${COLORS.green}INSTALL DIRECTORIES:${COLORS.reset}`);
    for (const [platform, dirs] of Object.entries(PLATFORM_DIRS)) {
        console.log(`    ${platform}:  ${dirs.project} (project) | ${dirs.global} (global)`);
    }
    console.log(`\n${COLORS.green}EXAMPLES:${COLORS.reset}`);
    console.log('    bun install.ts agent.md --target codex');
    console.log('    bun install.ts ./agents/ --target codex --global');
    console.log('    bun install.ts agent.md --target codex --dry-run');
}

// ============================================================================
// Platform Detection
// ============================================================================

/**
 * Auto-detect source platform from file extension and content.
 */
function detectSourcePlatform(filePath: string): AgentPlatform {
    const ext = extname(filePath).toLowerCase();

    if (ext === '.toml') return 'codex';
    if (ext === '.json') {
        // Could be OpenCode or OpenClaw — check content
        const content = readFileSync(filePath, 'utf-8').trim();
        if (content.includes('"agents"') && content.includes('"list"')) return 'openclaw';
        return 'opencode';
    }
    if (ext === '.md') {
        // Could be Claude, Gemini, or OpenCode — check frontmatter
        const content = readFileSync(filePath, 'utf-8');
        if (content.includes('max_turns:') || content.includes('kind:')) return 'gemini';
        if (content.includes('steps:') || content.includes('hidden:')) return 'opencode';
        return 'claude'; // Default for .md files
    }

    return 'claude'; // Default fallback
}

// ============================================================================
// Installation
// ============================================================================

/**
 * Install a single agent to the target platform directory.
 */
async function installAgent(
    sourcePath: string,
    targetPlatform: AgentPlatform,
    installDir: string,
    sourcePlatform?: AgentPlatform,
    dryRun = false,
): Promise<InstallResult> {
    const result: InstallResult = {
        source: basename(sourcePath),
        agentName: '',
        success: false,
        installedPath: '',
        errors: [],
        warnings: [],
    };

    // Detect source platform
    const detectedPlatform = sourcePlatform || detectSourcePlatform(sourcePath);

    // Same platform — just copy
    if (detectedPlatform === targetPlatform) {
        const destPath = join(installDir, basename(sourcePath));
        result.agentName = basename(sourcePath, extname(sourcePath));
        result.installedPath = destPath;

        if (!dryRun) {
            if (!existsSync(installDir)) {
                mkdirSync(installDir, { recursive: true });
            }
            const content = readFileSync(sourcePath, 'utf-8');
            writeFileSync(destPath, content, 'utf-8');
        }

        result.success = true;
        return result;
    }

    // Cross-platform: use adapt pipeline
    const sourceContent = readFileSync(sourcePath, 'utf-8');
    const adaptResult = await adaptAgent(sourceContent, sourcePath, detectedPlatform, targetPlatform, installDir);

    result.agentName = adaptResult.agentName || basename(sourcePath, extname(sourcePath));
    result.warnings.push(...adaptResult.warnings.filter((w) => !w.startsWith('[info]')));

    if (!adaptResult.success) {
        result.errors.push(...adaptResult.errors);
        return result;
    }

    // Write files
    if (adaptResult.files && !dryRun) {
        if (!existsSync(installDir)) {
            mkdirSync(installDir, { recursive: true });
        }
        for (const [filePath, content] of Object.entries(adaptResult.files)) {
            // Remap to install directory
            const destPath = join(installDir, basename(filePath));
            writeFileSync(destPath, content, 'utf-8');
            result.installedPath = destPath;
        }
    } else if (adaptResult.outputFiles.length > 0) {
        result.installedPath = join(installDir, basename(adaptResult.outputFiles[0]));
    }

    result.success = true;
    return result;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
    const options = parseCliArgs();

    console.log(`${COLORS.magenta}╔════════════════════════════════════════════════════════════╗${COLORS.reset}`);
    console.log(
        `${COLORS.magenta}║${COLORS.reset}    ${COLORS.cyan}install.ts${COLORS.reset} - Agent Installation Tool              ${COLORS.magenta}║${COLORS.reset}`,
    );
    console.log(`${COLORS.magenta}╚════════════════════════════════════════════════════════════╝${COLORS.reset}\n`);

    const targetName = PLATFORM_DISPLAY_NAMES[options.targetPlatform];
    const dirs = PLATFORM_DIRS[options.targetPlatform];
    const installDir = options.global ? dirs.global : dirs.project;

    console.log(`Target: ${targetName}`);
    console.log(`Install dir: ${installDir}`);
    console.log(`Sources: ${options.sources.length} file(s)`);
    console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'INSTALL'}`);
    console.log(`Scope: ${options.global ? 'GLOBAL (user-level)' : 'PROJECT (local)'}`);
    console.log('');

    const results: InstallResult[] = [];

    for (const source of options.sources) {
        if (!existsSync(source)) {
            logger.error(`Source not found: ${source}`);
            continue;
        }

        const result = await installAgent(
            source,
            options.targetPlatform,
            installDir,
            options.sourcePlatform,
            options.dryRun,
        );
        results.push(result);

        const status = result.success ? `${COLORS.green}OK${COLORS.reset}` : `${COLORS.red}FAIL${COLORS.reset}`;
        const action = options.dryRun ? 'WOULD INSTALL' : 'INSTALLED';

        console.log(`  ${status} ${result.source} -> ${result.agentName}`);

        if (result.success && result.installedPath) {
            console.log(`       [${action}] ${result.installedPath}`);
        }

        for (const error of result.errors) {
            console.log(`       ${COLORS.red}ERROR: ${error}${COLORS.reset}`);
        }

        for (const warning of result.warnings) {
            if (options.verbose) {
                console.log(`       ${COLORS.yellow}WARN: ${warning}${COLORS.reset}`);
            }
        }
    }

    // Summary
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log('');
    console.log('-'.repeat(60));
    console.log(
        `  Total: ${results.length} | ` +
            `${COLORS.green}Success: ${successCount}${COLORS.reset} | ` +
            `${COLORS.red}Failed: ${failCount}${COLORS.reset}`,
    );
    console.log('');

    if (failCount > 0) {
        process.exit(1);
    }

    logger.success('Installation complete!');
}

if (import.meta.main) {
    main();
}

// ============================================================================
// Exported API (for programmatic use)
// ============================================================================

export { detectSourcePlatform, installAgent };
export type { InstallOptions, InstallResult };
