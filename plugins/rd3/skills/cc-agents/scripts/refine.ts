#!/usr/bin/env bun
/**
 * Agent Refinement Script for rd3:cc-agents
 *
 * Improves agents based on evaluation results with migration support
 */

import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { applyBestPracticeFixes } from '../../../scripts/best-practice-fixes';
import { logger } from '../../../scripts/logger';
import { evaluateAgent } from './evaluate';
import type { AgentRefineOptions, AgentRefineResult } from './types';
import { readAgent } from './utils';

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
            const dirMatch = content.match(/#\s+([a-z0-9-]+)/i);
            if (dirMatch) {
                fmContent = `name: ${dirMatch[1]}\n${fmContent}`;
                actions.push('Added missing name field from heading');
            }
        }

        // Add tools field if missing
        if (!fmContent.includes('tools:')) {
            fmContent = fmContent.replace(/(description:.*\n)/, '$1tools: []\n');
            actions.push('Added empty tools field');
        }

        updated = content.replace(fmMatch[0], `---\n${fmContent}\n---`);
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

async function refineAgent(agentPath: string, options: AgentRefineOptions): Promise<AgentRefineResult> {
    const resolvedPath = resolve(agentPath);
    const agent = await readAgent(resolvedPath);

    if (!agent) {
        return {
            success: false,
            agentPath: resolvedPath,
            changes: [],
            companions: [],
            errors: ['Agent file not found or invalid'],
            warnings: [],
        };
    }

    const changes: string[] = [];
    const companions: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    let content = agent.raw;
    let updated = false;

    // Run evaluation first if requested
    if (options.fromEval) {
        try {
            const evalResult = await evaluateAgent(resolvedPath, 'full');
            if (!evalResult.passed) {
                warnings.push(`Agent scored ${evalResult.percentage}% - below pass threshold`);
                // Add dimension-specific improvement suggestions
                for (const dim of evalResult.dimensions) {
                    if (dim.score < 50) {
                        warnings.push(
                            `Low score (${dim.score}%) in ${dim.displayName}: ${dim.recommendations.join('; ')}`,
                        );
                    }
                }
            }
        } catch (e) {
            errors.push(`Evaluation failed: ${e}`);
        }
    }

    // Run migration if requested
    if (options.migrate) {
        const migration = migrateFromRd2(content);
        if (migration.actions.length > 0) {
            changes.push(...migration.actions);
            if (migration.content) {
                content = migration.content;
            }
            updated = true;
        }
        if (migration.errors.length > 0) {
            errors.push(...migration.errors);
        }
    }

    // Run best practices auto-fix
    if (options.migrate || options.fromEval) {
        const bpResult = applyBestPracticeFixes(content, { entityLabel: 'This agent helps' });
        if (bpResult.actions.length > 0) {
            changes.push(...bpResult.actions);
            if (bpResult.content !== content) {
                content = bpResult.content;
                updated = true;
            }
        }
    }

    // Write updated content
    if (updated && !options.output) {
        await Bun.write(resolvedPath, content);
    } else if (updated && options.output) {
        await Bun.write(options.output, content);
    }

    return {
        success: errors.length === 0,
        agentPath: options.output || resolvedPath,
        changes,
        companions,
        errors,
        warnings,
    };
}

// ============================================================================
// CLI
// ============================================================================

function printUsage(): void {
    console.log('Usage: refine.ts <agent-path> [options]');
    console.log('');
    console.log('Arguments:');
    console.log('  <agent-path>        Path to agent .md file');
    console.log('');
    console.log('Options:');
    console.log('  --eval, -e          Run evaluation before refinement');
    console.log('  --migrate           Enable rd2 to rd3 migration mode');
    console.log('  --best-practices    Apply best practice auto-fixes');
    console.log('  --output, -o        Output path (default: in-place)');
    console.log('  --dry-run           Show what would be changed');
    console.log('  --verbose, -v       Show detailed output');
    console.log('  --help, -h          Show this help message');
}

function parseCliArgs(): {
    path: string;
    options: AgentRefineOptions;
    dryRun: boolean;
    verbose: boolean;
} {
    const args = parseArgs({
        args: process.argv.slice(2),
        allowPositionals: true,
        options: {
            eval: { type: 'boolean', short: 'e', default: false },
            migrate: { type: 'boolean', default: false },
            'best-practices': { type: 'boolean', default: false },
            output: { type: 'string', short: 'o', default: '' },
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
        logger.error('Error: Missing required argument <agent-path>');
        printUsage();
        process.exit(1);
    }

    const hasRefineOptions = args.values.migrate || args.values['best-practices'];
    const fromEval = args.values.eval || hasRefineOptions;

    const options: AgentRefineOptions = {
        agentPath: path,
        migrate: args.values.migrate as boolean,
    };

    if (fromEval) {
        options.fromEval = path;
    }
    if (args.values.output) {
        options.output = args.values.output as string;
    }

    return {
        path,
        options,
        dryRun: args.values['dry-run'] as boolean,
        verbose: args.values.verbose as boolean,
    };
}

async function main() {
    const { path: agentPath, options, dryRun, verbose } = parseCliArgs();

    logger.info(`Refining agent at: ${agentPath}`);
    logger.info(`Options: migrate=${options.migrate}, fromEval=${!!options.fromEval}`);

    if (dryRun) {
        logger.info('Dry run mode - no changes will be made');
    }

    const result = await refineAgent(agentPath, options);

    if (result.success) {
        logger.success('Refinement completed');
    } else {
        logger.error('Refinement completed with errors');
    }

    if (result.changes.length > 0) {
        console.log('\n--- Changes ---');
        for (const change of result.changes) {
            console.log(`  + ${change}`);
        }
    }

    if (result.warnings.length > 0) {
        console.log('\n--- Warnings ---');
        for (const warning of result.warnings) {
            console.log(`  ⚠ ${warning}`);
        }
    }

    if (result.errors.length > 0) {
        console.log('\n--- Errors ---');
        for (const error of result.errors) {
            console.log(`  ✗ ${error}`);
        }
    }

    if (result.changes.length === 0 && result.errors.length === 0) {
        console.log('\nNo changes needed');
    }

    process.exit(result.success ? 0 : 1);
}

if (import.meta.main) {
    main().catch((e) => {
        logger.error(`Fatal error: ${e}`);
        process.exit(1);
    });
}

export { refineAgent, type AgentRefineOptions, type AgentRefineResult };
