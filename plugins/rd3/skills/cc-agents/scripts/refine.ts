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
import {
    CODEX_AGENT_DESCRIPTION_MAX_LENGTH,
    replaceDescriptionInMarkdownFrontmatter,
    truncateAgentDescriptionForCodex,
} from './description-constraints';
import { evaluateAgent } from './evaluate';
import type { AgentRefineOptions, AgentRefineResult } from './types';
import { parseFrontmatter, readAgent } from './utils';

// ============================================================================
// Migration Functions
// ============================================================================

interface MigrationResult {
    success: boolean;
    actions: string[];
    errors: string[];
    content?: string;
}

interface RefineDependencies {
    readAgent: typeof readAgent;
    evaluateAgent: typeof evaluateAgent;
    migrateFromRd2: typeof migrateFromRd2;
    applyBestPracticeFixes: typeof applyBestPracticeFixes;
    parseFrontmatter: typeof parseFrontmatter;
    writeFile: typeof Bun.write;
}

export function migrateFromRd2(content: string): MigrationResult {
    const actions: string[] = [];
    const errors: string[] = [];
    let updated = content;

    // Add name field if missing
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (fmMatch) {
        let fmContent = fmMatch[1];

        // Check if name is missing (skip for command files - they use argument-hint not name)
        // Command files have argument-hint in frontmatter, agent files do not
        if (!fmContent.includes('name:') && !fmContent.includes('argument-hint:')) {
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

const defaultRefineDependencies: RefineDependencies = {
    readAgent,
    evaluateAgent,
    migrateFromRd2,
    applyBestPracticeFixes,
    parseFrontmatter,
    writeFile: Bun.write.bind(Bun),
};

// ============================================================================
// Refinement Functions
// ============================================================================

export async function refineAgentWithDeps(
    agentPath: string,
    options: AgentRefineOptions,
    deps: RefineDependencies = defaultRefineDependencies,
): Promise<AgentRefineResult> {
    const resolvedPath = resolve(agentPath);
    const agent = await deps.readAgent(resolvedPath);

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
            const evalResult = await deps.evaluateAgent(resolvedPath, 'full');
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
        const migration = deps.migrateFromRd2(content);
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
        const bpResult = deps.applyBestPracticeFixes(content, { entityLabel: 'This agent helps' });
        if (bpResult.actions.length > 0) {
            changes.push(...bpResult.actions);
            if (bpResult.content !== content) {
                content = bpResult.content;
                updated = true;
            }
        }
    }

    const reparsed = deps.parseFrontmatter(content);
    const frontmatter = reparsed.frontmatter;
    if (frontmatter?.description && typeof frontmatter.description === 'string') {
        const constrained = truncateAgentDescriptionForCodex(frontmatter.description);
        if (constrained.truncated) {
            content = replaceDescriptionInMarkdownFrontmatter(content, constrained.value);
            updated = true;
            changes.push(
                `Truncated description from ${constrained.originalLength} to ${CODEX_AGENT_DESCRIPTION_MAX_LENGTH} characters for Codex compatibility`,
            );
            if (constrained.preservedExample) {
                changes.push('Preserved at least one <example> block while trimming the description');
            } else {
                warnings.push(
                    'Description exceeded the hard limit so severely that example preservation was not possible',
                );
            }
        }
    }

    // Write updated content
    if (updated && !options.output) {
        await deps.writeFile(resolvedPath, content);
    } else if (updated && options.output) {
        await deps.writeFile(options.output, content);
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

export async function refineAgent(agentPath: string, options: AgentRefineOptions): Promise<AgentRefineResult> {
    return refineAgentWithDeps(agentPath, options);
}

// ============================================================================
// CLI
// ============================================================================

export function printUsage(): void {
    logger.log('Usage: refine.ts <agent-path> [options]');
    logger.log('');
    logger.log('Arguments:');
    logger.log('  <agent-path>        Path to agent .md file');
    logger.log('');
    logger.log('Options:');
    logger.log('  --eval, -e          Run evaluation before refinement');
    logger.log('  --migrate           Enable rd2 to rd3 migration mode');
    logger.log('  --best-practices    Apply best practice auto-fixes');
    logger.log('  --output, -o        Output path (default: in-place)');
    logger.log('  --dry-run           Show what would be changed');
    logger.log('  --verbose, -v       Show detailed output');
    logger.log('  --help, -h          Show this help message');
}

export function parseCliArgs(argv: string[] = process.argv.slice(2)): {
    path: string;
    options: AgentRefineOptions;
    dryRun: boolean;
    verbose: boolean;
} {
    const args = parseArgs({
        args: argv,
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

export async function main() {
    const { path: agentPath, options, dryRun, verbose: _verbose } = parseCliArgs();

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
        logger.log('\n--- Changes ---');
        for (const change of result.changes) {
            logger.log(`  + ${change}`);
        }
    }

    if (result.warnings.length > 0) {
        logger.log('\n--- Warnings ---');
        for (const warning of result.warnings) {
            logger.log(`  ⚠ ${warning}`);
        }
    }

    if (result.errors.length > 0) {
        logger.log('\n--- Errors ---');
        for (const error of result.errors) {
            logger.log(`  ✗ ${error}`);
        }
    }

    if (result.changes.length === 0 && result.errors.length === 0) {
        logger.log('\nNo changes needed');
    }

    process.exit(result.success ? 0 : 1);
}

export function handleFatalRefineError(error: unknown): never {
    logger.error(`Fatal error: ${error}`);
    process.exit(1);
}

if (import.meta.main) {
    main().catch(handleFatalRefineError);
}

export type { AgentRefineOptions, AgentRefineResult };
