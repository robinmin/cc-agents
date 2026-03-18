#!/usr/bin/env bun
/**
 * Agent Adaptation Script for rd3:cc-agents
 *
 * Cross-platform agent adaptation orchestrator.
 * Converts agent definitions between platform formats via UAM
 * (Universal Agent Model) as the intermediary representation.
 *
 * Pipeline: sourceAdapter.parse() -> UAM -> targetAdapter.generate()
 *
 * Usage:
 *   bun adapt.ts <source-file> <source-platform> <target-platform> [options]
 *   bun adapt.ts <plugin> all [options]
 *
 * Arguments:
 *   source-file       Path to agent source file
 *   source-platform   Source platform: claude, gemini, opencode, codex, openclaw
 *   target-platform   Target platform: claude, gemini, opencode, codex, openclaw, antigravity, all
 *
 * Options:
 *   --output, -o      Output directory (default: same as source)
 *   --dry-run         Preview conversion without writing files
 *   --verbose         Show detailed output
 *   --help            Show this help message
 *
 * Examples:
 *   bun adapt.ts agent.md claude gemini
 *   bun adapt.ts agent.md claude all --output ./adapted/
 *   bun adapt.ts agent.toml codex claude --dry-run
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { COLORS, logger } from '../../../scripts/logger';

import { agentAdapterRegistry, createAgentAdapterContext } from './adapters';
import type { AgentPlatform, UniversalAgent } from './types';
import { ALL_AGENT_PLATFORMS, PLATFORM_DISPLAY_NAMES } from './types';

// ============================================================================
// Types
// ============================================================================

interface AdaptOptions {
    sourcePath: string;
    sourcePlatform: AgentPlatform;
    targetPlatforms: AgentPlatform[];
    outputDir: string;
    dryRun: boolean;
    verbose: boolean;
}

interface AdaptResult {
    sourcePlatform: AgentPlatform;
    targetPlatform: AgentPlatform;
    agentName: string;
    success: boolean;
    outputFiles: string[];
    droppedFields: string[];
    errors: string[];
    warnings: string[];
    /** Generated file contents keyed by path */
    files?: Record<string, string>;
}

// ============================================================================
// Configuration
// ============================================================================

const VALID_SOURCE_PLATFORMS: AgentPlatform[] = ['claude', 'gemini', 'opencode', 'codex', 'openclaw'];
// antigravity cannot be a source (no formal format to import)

// ============================================================================
// Argument Parsing
// ============================================================================

function parseCliArgs(): AdaptOptions {
    const args = parseArgs({
        args: process.argv.slice(2),
        allowPositionals: true,
        options: {
            output: { type: 'string', short: 'o' },
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

    if (pos.length < 2) {
        logger.error('Source file and platform are required');
        printUsage();
        process.exit(1);
    }

    const sourcePath = resolve(pos[0]);
    const sourcePlatform = pos[1] as AgentPlatform;

    // Parse target: positional[2] or default to 'all'
    const targetArg = pos[2] || 'all';
    let targetPlatforms: AgentPlatform[];

    if (targetArg === 'all') {
        // All platforms except the source
        targetPlatforms = ALL_AGENT_PLATFORMS.filter((p) => p !== sourcePlatform);
    } else {
        targetPlatforms = targetArg.split(',') as AgentPlatform[];
    }

    const outputDir = args.values.output ? resolve(args.values.output as string) : dirname(sourcePath);
    const dryRun = args.values['dry-run'] as boolean;
    const verbose = args.values.verbose as boolean;

    return { sourcePath, sourcePlatform, targetPlatforms, outputDir, dryRun, verbose };
}

function printUsage(): void {
    console.log(`${COLORS.cyan}adapt.ts${COLORS.reset} - Cross-Platform Agent Adaptation\n`);
    console.log(`${COLORS.green}USAGE:${COLORS.reset}`);
    console.log('    bun adapt.ts <source-file> <source-platform> [target-platform] [options]\n');
    console.log(`${COLORS.green}ARGUMENTS:${COLORS.reset}`);
    console.log('    source-file       Path to agent source file');
    console.log(`    source-platform   Source: ${VALID_SOURCE_PLATFORMS.join(', ')}`);
    console.log(`    target-platform   Target: ${ALL_AGENT_PLATFORMS.join(', ')}, all (default: all)\n`);
    console.log(`${COLORS.green}OPTIONS:${COLORS.reset}`);
    console.log('    --output, -o      Output directory (default: same as source)');
    console.log('    --dry-run         Preview without writing files');
    console.log('    --verbose         Show detailed output');
    console.log('    --help            Show this help message\n');
    console.log(`${COLORS.green}EXAMPLES:${COLORS.reset}`);
    console.log('    bun adapt.ts agent.md claude gemini');
    console.log('    bun adapt.ts agent.md claude all --output ./adapted/');
    console.log('    bun adapt.ts agent.toml codex claude --dry-run');
}

// ============================================================================
// Validation
// ============================================================================

function validateOptions(options: AdaptOptions): void {
    // Validate source file exists
    if (!existsSync(options.sourcePath)) {
        logger.error(`Source file not found: ${options.sourcePath}`);
        process.exit(1);
    }

    // Validate source platform
    if (!VALID_SOURCE_PLATFORMS.includes(options.sourcePlatform)) {
        logger.error(`Invalid source platform: ${options.sourcePlatform}`);
        console.log(`   Valid sources: ${VALID_SOURCE_PLATFORMS.join(', ')}`);
        console.log('   Note: antigravity cannot be a source (no formal format to import)');
        process.exit(1);
    }

    // Validate target platforms
    for (const target of options.targetPlatforms) {
        if (!ALL_AGENT_PLATFORMS.includes(target)) {
            logger.error(`Invalid target platform: ${target}`);
            console.log(`   Valid targets: ${ALL_AGENT_PLATFORMS.join(', ')}`);
            process.exit(1);
        }
    }

    // Validate adapters are available
    if (!agentAdapterRegistry.has(options.sourcePlatform)) {
        logger.error(`No adapter registered for source platform: ${options.sourcePlatform}`);
        process.exit(1);
    }

    for (const target of options.targetPlatforms) {
        if (!agentAdapterRegistry.has(target)) {
            logger.error(`No adapter registered for target platform: ${target}`);
            process.exit(1);
        }
    }
}

// ============================================================================
// Adaptation Pipeline
// ============================================================================

/**
 * Adapt a single agent from source platform to target platform.
 *
 * Pipeline: sourceAdapter.parse() -> UAM -> targetAdapter.generate()
 */
async function adaptAgent(
    sourceContent: string,
    sourcePath: string,
    sourcePlatform: AgentPlatform,
    targetPlatform: AgentPlatform,
    outputDir: string,
): Promise<AdaptResult> {
    const result: AdaptResult = {
        sourcePlatform,
        targetPlatform,
        agentName: '',
        success: false,
        outputFiles: [],
        droppedFields: [],
        errors: [],
        warnings: [],
    };

    // Step 1: Parse source into UAM
    const sourceAdapter = agentAdapterRegistry.get(sourcePlatform);
    const parseResult = await sourceAdapter.parse(sourceContent, sourcePath);

    if (!parseResult.success || !parseResult.agent) {
        result.errors.push(...parseResult.errors);
        result.warnings.push(...parseResult.warnings);
        return result;
    }

    result.warnings.push(...parseResult.warnings);
    const uam: UniversalAgent = parseResult.agent;
    result.agentName = uam.name;

    // Step 2: Detect features on source for loss reporting
    const sourceFeatures = sourceAdapter.detectFeatures(uam);

    // Step 3: Validate UAM for target platform
    const targetAdapter = agentAdapterRegistry.get(targetPlatform);
    const validationResult = await targetAdapter.validate(uam);

    result.warnings.push(...validationResult.warnings);
    if (validationResult.messages) {
        // Messages are informational, add as warnings for visibility
        for (const msg of validationResult.messages) {
            result.warnings.push(`[info] ${msg}`);
        }
    }

    if (!validationResult.success) {
        result.errors.push(...validationResult.errors);
        return result;
    }

    // Step 4: Generate target format from UAM
    const context = createAgentAdapterContext(uam, outputDir, targetPlatform);
    const generateResult = await targetAdapter.generate(uam, context);

    if (!generateResult.success) {
        result.errors.push(...generateResult.errors);
        result.warnings.push(...generateResult.warnings);
        return result;
    }

    result.warnings.push(...generateResult.warnings);
    if (generateResult.messages) {
        for (const msg of generateResult.messages) {
            result.warnings.push(`[info] ${msg}`);
        }
    }

    // Step 5: Detect loss -- features in source not in target
    const targetFeatures = targetAdapter.detectFeatures(uam);
    const lostFeatures = sourceFeatures.filter((f) => !targetFeatures.includes(f));
    if (lostFeatures.length > 0) {
        result.droppedFields = lostFeatures;
    }

    // Collect output files and their content
    if (generateResult.files) {
        result.outputFiles = Object.keys(generateResult.files);
        result.files = generateResult.files;
    } else if (generateResult.companions.length > 0) {
        result.outputFiles = generateResult.companions;
    }

    result.success = true;
    return result;
}

/**
 * Adapt a single source file to multiple target platforms.
 */
async function adaptToAll(
    sourcePath: string,
    sourcePlatform: AgentPlatform,
    targetPlatforms: AgentPlatform[],
    outputDir: string,
    dryRun: boolean,
    verbose: boolean,
): Promise<AdaptResult[]> {
    const sourceContent = readFileSync(sourcePath, 'utf-8');
    const results: AdaptResult[] = [];

    for (const targetPlatform of targetPlatforms) {
        if (targetPlatform === sourcePlatform) {
            if (verbose) {
                logger.info(`  Skipping ${PLATFORM_DISPLAY_NAMES[targetPlatform]} (same as source)`);
            }
            continue;
        }

        const result = await adaptAgent(sourceContent, sourcePath, sourcePlatform, targetPlatform, outputDir);
        results.push(result);

        // Write files if not dry run — use already-generated content from adaptAgent
        if (result.success && !dryRun && result.files) {
            for (const [filePath, content] of Object.entries(result.files)) {
                const dir = dirname(filePath);
                if (!existsSync(dir)) {
                    mkdirSync(dir, { recursive: true });
                }
                writeFileSync(filePath, content, 'utf-8');
            }
        }
    }

    return results;
}

// ============================================================================
// Reporting
// ============================================================================

function printResults(results: AdaptResult[], dryRun: boolean): void {
    console.log('');
    console.log(`${COLORS.cyan}Adaptation Results${COLORS.reset}`);
    console.log('='.repeat(60));

    let successCount = 0;
    let failCount = 0;

    for (const result of results) {
        const targetName = PLATFORM_DISPLAY_NAMES[result.targetPlatform];
        const status = result.success ? `${COLORS.green}OK${COLORS.reset}` : `${COLORS.red}FAIL${COLORS.reset}`;

        console.log('');
        console.log(`  ${targetName}: ${status}`);

        if (result.success) {
            successCount++;

            if (result.outputFiles.length > 0) {
                for (const file of result.outputFiles) {
                    const prefix = dryRun ? '[WOULD CREATE]' : '[CREATED]';
                    console.log(`    ${prefix} ${basename(file)}`);
                }
            }

            if (result.droppedFields.length > 0) {
                console.log(`    ${COLORS.yellow}Lost features: ${result.droppedFields.join(', ')}${COLORS.reset}`);
            }
        } else {
            failCount++;
            for (const error of result.errors) {
                console.log(`    ${COLORS.red}ERROR: ${error}${COLORS.reset}`);
            }
        }

        // Show warnings (non-info)
        const realWarnings = result.warnings.filter((w) => !w.startsWith('[info]'));
        if (realWarnings.length > 0) {
            for (const warning of realWarnings) {
                console.log(`    ${COLORS.yellow}WARN: ${warning}${COLORS.reset}`);
            }
        }
    }

    console.log('');
    console.log('-'.repeat(60));
    console.log(
        `  Total: ${results.length} | ` +
            `${COLORS.green}Success: ${successCount}${COLORS.reset} | ` +
            `${COLORS.red}Failed: ${failCount}${COLORS.reset}`,
    );
    console.log('');
}

// ============================================================================
// Main
// ============================================================================

async function main() {
    const options = parseCliArgs();
    validateOptions(options);

    console.log(`${COLORS.magenta}╔════════════════════════════════════════════════════════════╗${COLORS.reset}`);
    console.log(
        `${COLORS.magenta}║${COLORS.reset}    ${COLORS.cyan}adapt.ts${COLORS.reset} - Cross-Platform Agent Adaptation      ${COLORS.magenta}║${COLORS.reset}`,
    );
    console.log(`${COLORS.magenta}╚════════════════════════════════════════════════════════════╝${COLORS.reset}\n`);

    const sourceName = basename(options.sourcePath);
    const sourceDisplayName = PLATFORM_DISPLAY_NAMES[options.sourcePlatform];
    const targetNames = options.targetPlatforms.map((p) => PLATFORM_DISPLAY_NAMES[p]).join(', ');

    console.log(`Source: ${sourceName} (${sourceDisplayName})`);
    console.log(`Targets: ${targetNames}`);
    console.log(`Output: ${options.outputDir}`);
    console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'APPLY'}`);

    // Ensure output directory exists
    if (!options.dryRun && !existsSync(options.outputDir)) {
        mkdirSync(options.outputDir, { recursive: true });
    }

    // Run adaptation
    const results = await adaptToAll(
        options.sourcePath,
        options.sourcePlatform,
        options.targetPlatforms,
        options.outputDir,
        options.dryRun,
        options.verbose,
    );

    // Print results
    printResults(results, options.dryRun);

    // Exit with error code if any failed
    const hasFailures = results.some((r) => !r.success);
    if (hasFailures) {
        process.exit(1);
    }

    logger.success('Adaptation complete!');
}

if (import.meta.main) {
    main();
}

// ============================================================================
// Exported API (for programmatic use)
// ============================================================================

export { adaptAgent, adaptToAll };
export type { AdaptOptions, AdaptResult };
