#!/usr/bin/env bun
/**
 * ftree — Feature Tree CLI
 *
 * Single source of truth for product/project scope with hierarchical features,
 * status state machine, WBS linking, and agent-optimized context output.
 *
 * Usage: ftree <command> [options]
 */

import { parseCli, type CliSpec } from '../../../scripts/libs/cli-args';
import type { FeatureStatus, InitOptions, AddOptions, LinkOptions, LsOptions } from './types';
import { init } from './commands/init';
import { add } from './commands/add';
import { link } from './commands/link';
import { ls } from './commands/ls';
import { logger } from '../../../scripts/logger';

// ─── Subcommand specs ──────────────────────────────────────────────────────

const INIT_SPEC: CliSpec = {
    name: 'ftree init',
    description: 'Initialize a feature tree database. Creates docs/.ftree/db.sqlite if it does not exist.',
    options: {
        db: {
            type: 'string',
        },
        template: {
            type: 'string',
        },
    },
    examples: ['ftree init', 'ftree init --template web-app', 'ftree init --db /tmp/ftree.db'],
};

const ADD_SPEC: CliSpec = {
    name: 'ftree add',
    description: 'Add a new feature to the tree (core operation 1). Outputs the new feature ID to STDOUT.',
    allowPositionals: true,
    options: {
        title: {
            type: 'string',
        },
        parent: {
            type: 'string',
            short: 'p',
        },
        status: {
            type: 'string',
            short: 's',
        },
        metadata: {
            type: 'string',
            short: 'm',
        },
        db: {
            type: 'string',
        },
    },
    examples: [
        'ftree add --title "User Authentication"',
        'ftree add --title "OAuth2" --parent f1abc2',
        'ftree add --title "API Gateway" --status executing',
    ],
};

const LINK_SPEC: CliSpec = {
    name: 'ftree link',
    description: 'Link a feature to WBS task IDs (core operation 2). Idempotent — safe to call multiple times.',
    allowPositionals: true,
    options: {
        wbs: {
            type: 'string',
            short: 'w',
        },
        db: {
            type: 'string',
        },
    },
    examples: ['ftree link f1abc2 --wbs 001,002', 'ftree link f1abc2 --wbs 003'],
};

const LS_SPEC: CliSpec = {
    name: 'ftree ls',
    description: 'List features in a tree view (human-readable) or as JSON.',
    options: {
        root: {
            type: 'string',
            short: 'r',
        },
        depth: {
            type: 'string',
            short: 'd',
        },
        status: {
            type: 'string',
            short: 's',
        },
        json: {
            type: 'boolean',
            short: 'j',
        },
        db: {
            type: 'string',
        },
    },
    examples: [
        'ftree ls',
        'ftree ls --root f1abc2',
        'ftree ls --depth 2',
        'ftree ls --json',
        'ftree ls --status executing',
    ],
};

// ─── Main entry point ──────────────────────────────────────────────────────

/**
 * Parse --wbs comma-separated string into array.
 */
function parseWbsIds(wbs: string | string[]): string[] {
    if (Array.isArray(wbs)) {
        return wbs.flatMap((w) =>
            w
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
        );
    }
    return wbs
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

/**
 * Main CLI entry point.
 * Routes subcommands to their handlers.
 *
 * @param argv - Command line arguments (defaults to process.argv.slice(2))
 */
export async function ftree(argv: string[] = process.argv.slice(2)): Promise<number> {
    if (argv.length === 0) {
        logger.log(`ftree — Feature Tree CLI`);
        logger.log('');
        logger.log('Commands:');
        logger.log('  init    Initialize a feature tree database');
        logger.log('  add     Add a new feature');
        logger.log('  link    Link a feature to WBS IDs');
        logger.log('  ls      List features');
        logger.log('');
        logger.log('Run "ftree <command> --help" for more information.');
        return 0;
    }

    const subcommand = argv[0];

    switch (subcommand) {
        case 'init': {
            const parsed = parseCli(INIT_SPEC, argv.slice(1));
            const options: InitOptions = {
                db: parsed.values.db as string | undefined,
                template: parsed.values.template as string | undefined,
            };
            return await init(options);
        }

        case 'add': {
            const parsed = parseCli(ADD_SPEC, argv.slice(1));

            // Check for --title positional or option
            const title = parsed.values.title as string | undefined;
            const positionals = parsed.positionals;

            if (!title && positionals.length === 0) {
                logger.error('Error: --title is required');
                return 1;
            }

            const options: AddOptions = {
                title: title ?? positionals[0],
                parent: parsed.values.parent as string | undefined,
                status: parsed.values.status as FeatureStatus | undefined,
                metadata: parsed.values.metadata as string | undefined,
                db: parsed.values.db as string | undefined,
            };
            return await add(options);
        }

        case 'link': {
            const parsed = parseCli(LINK_SPEC, argv.slice(1));

            // Get feature ID from positionals (required)
            const positionals = parsed.positionals;
            if (positionals.length === 0) {
                logger.error('Error: feature ID is required');
                return 1;
            }

            const wbsRaw = parsed.values.wbs;
            if (!wbsRaw) {
                logger.error('Error: --wbs is required');
                return 1;
            }

            const options: LinkOptions = {
                featureId: positionals[0],
                wbsIds: parseWbsIds(wbsRaw as string),
                db: parsed.values.db as string | undefined,
            };
            return await link(options);
        }

        case 'ls': {
            const parsed = parseCli(LS_SPEC, argv.slice(1));

            const depthVal = parsed.values.depth;
            const options: LsOptions = {
                root: parsed.values.root as string | undefined,
                depth: depthVal !== undefined ? parseInt(depthVal as string, 10) : undefined,
                status: parsed.values.status as FeatureStatus | undefined,
                json: parsed.values.json as boolean | undefined,
                db: parsed.values.db as string | undefined,
            };
            return await ls(options);
        }

        case '--help':
        case '-h':
        case 'help': {
            logger.log(`ftree — Feature Tree CLI

Usage: ftree <command> [options]

Commands:
  init    Initialize a feature tree database
  add     Add a new feature
  link    Link a feature to WBS IDs
  ls      List features

Run "ftree <command> --help" for more information.
`);
            return 0;
        }

        default: {
            logger.error(`Unknown command "${subcommand}". Run "ftree --help" for usage.`);
            return 1;
        }
    }
}

// ─── Direct execution ──────────────────────────────────────────────────────

// Run main if executed directly
if (import.meta.main) {
    const exitCode = await ftree();
    process.exit(exitCode);
}
