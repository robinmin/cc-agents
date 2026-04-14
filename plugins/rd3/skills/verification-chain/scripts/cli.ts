#!/usr/bin/env bun
/**
 * verification-chain — CLI entrypoint
 *
 * Commands:
 *   cov run    <manifest.json>            — Execute a chain from a manifest file
 *   cov resume <chain-id> [--task WBS] [--response T]
 *                                        — Resume a paused chain (optionally with human response)
 *   cov show   <chain-id> [--task WBS]   — Display the current state of a chain
 *   cov list   [--task <wbs>]             — List chains, optionally filtered by task_wbs
 *
 * All output is structured JSON written to stdout.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { ChainManifest, ChainState } from './types';
import { runChain, resumeChain } from './interpreter';
import { closeStore, findChainsById, listChains, loadChain, loadManifest } from './store';
import { enableLogger, logger } from '../../../scripts/logger';

// The CLI contract is machine-readable stdout only. Suppress logger console output
// while preserving file logging when configured.
enableLogger(false, true);

// ----------------------------------------------------------------
// Arg parsing helpers
// ----------------------------------------------------------------

interface ParsedArgs {
    command: string;
    positional: string[];
    flags: Record<string, string>;
}

function parseArgs(argv: string[]): ParsedArgs {
    // argv[0] = bun, argv[1] = cli.ts, argv[2] = command, argv[3..] = args
    const raw = argv.slice(2);
    const command = raw[0] ?? '';
    const positional: string[] = [];
    const flags: Record<string, string> = {};

    let i = 1; // start after command
    while (i < raw.length) {
        const token = raw[i];
        if (token.startsWith('--')) {
            const key = token.slice(2);
            const next = raw[i + 1];
            if (next !== undefined && !next.startsWith('--')) {
                flags[key] = next;
                i += 2;
            } else {
                flags[key] = 'true';
                i += 1;
            }
        } else {
            positional.push(token);
            i += 1;
        }
    }

    return { command, positional, flags };
}

// ----------------------------------------------------------------
// JSON output helper
// ----------------------------------------------------------------

function outputJson(data: unknown): void {
    process.stdout.write(`${JSON.stringify(data)}\n`);
}

function outputError(message: string, details?: unknown): void {
    const payload: Record<string, unknown> = { ok: false, error: message };
    if (details !== undefined) {
        payload.details = details;
    }
    process.stdout.write(`${JSON.stringify(payload)}\n`);
}

// ----------------------------------------------------------------
// Default state directory resolution
// ----------------------------------------------------------------

function defaultStateDir(): string {
    return process.env.COV_STATE_DIR ?? 'docs/.workflow-runs';
}

function stateFilePath(stateDir: string, chainId: string, taskWbs: string): string {
    return join(stateDir, 'cov', `${chainId}-${taskWbs}-cov-state.json`);
}

function loadJsonState(stateDir: string, chainId: string, taskWbs: string): ChainState | null {
    const filePath = stateFilePath(stateDir, chainId, taskWbs);
    if (!existsSync(filePath)) {
        return null;
    }

    try {
        const raw = readFileSync(filePath, 'utf-8');
        return JSON.parse(raw) as ChainState;
    } catch {
        return null;
    }
}

function tryReadJsonState(path: string): ChainState | null {
    try {
        return JSON.parse(readFileSync(path, 'utf-8')) as ChainState;
    } catch {
        return null;
    }
}

function findJsonChainsById(stateDir: string, chainId: string): ChainState[] {
    const covDir = join(stateDir, 'cov');
    if (!existsSync(covDir)) {
        return [];
    }

    const filenames = readdirSync(covDir).filter(
        (name) => name.startsWith(`${chainId}-`) && name.endsWith('-cov-state.json'),
    );

    return filenames
        .map((name) => tryReadJsonState(join(covDir, name)))
        .filter((state): state is ChainState => state !== null)
        .filter((state) => state.chain_id === chainId)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

function listJsonChains(stateDir: string, taskWbs?: string): ChainState[] {
    const covDir = join(stateDir, 'cov');
    if (!existsSync(covDir)) {
        return [];
    }

    return readdirSync(covDir)
        .filter((name) => name.endsWith('-cov-state.json'))
        .map((name) => tryReadJsonState(join(covDir, name)))
        .filter((state): state is ChainState => state !== null)
        .filter((state) => (taskWbs ? state.task_wbs === taskWbs : true))
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

function dedupeChains(chains: ChainState[]): ChainState[] {
    const byTask = new Map<string, ChainState>();
    for (const chain of chains) {
        const key = `${chain.chain_id}::${chain.task_wbs}`;
        const existing = byTask.get(key);
        if (!existing || chain.updated_at.localeCompare(existing.updated_at) > 0) {
            byTask.set(key, chain);
        }
    }
    return [...byTask.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

function resolveChainState(stateDir: string, chainId: string, taskWbs?: string): ChainState | null {
    let storeError: Error | null = null;

    if (taskWbs) {
        let stored: ChainState | null = null;
        try {
            stored = loadChain(stateDir, chainId, taskWbs);
        } catch (err) {
            storeError = err instanceof Error ? err : new Error(String(err));
        }

        const jsonState = loadJsonState(stateDir, chainId, taskWbs);
        const merged = dedupeChains([...(stored ? [stored] : []), ...(jsonState ? [jsonState] : [])]);
        if (merged.length > 0) {
            return merged[0];
        }

        if (storeError) {
            throw storeError;
        }

        return null;
    }

    let storedChains: ChainState[] = [];
    try {
        storedChains = findChainsById(stateDir, chainId);
    } catch (err) {
        storeError = err instanceof Error ? err : new Error(String(err));
    }

    const matches = dedupeChains([...storedChains, ...findJsonChainsById(stateDir, chainId)]);
    if (matches.length === 1) {
        return matches[0];
    }

    if (matches.length > 1) {
        throw new Error(`Multiple chains found for id '${chainId}'. Rerun with --task <task_wbs>.`);
    }

    if (storeError) {
        throw storeError;
    }

    return null;
}

function resolveManifestTaskWbs(chainId: string, manifest: ChainManifest, taskWbsFlag?: string): string {
    if (manifest.chain_id !== chainId) {
        throw new Error(`Chain ID mismatch: manifest has '${manifest.chain_id}' but got '${chainId}'`);
    }

    if (taskWbsFlag && taskWbsFlag !== manifest.task_wbs) {
        throw new Error(`Task WBS mismatch: manifest has '${manifest.task_wbs}' but got '${taskWbsFlag}'`);
    }

    return manifest.task_wbs;
}

// ----------------------------------------------------------------
// Command: run
// ----------------------------------------------------------------

async function cmdRun(positional: string[], _flags: Record<string, string>): Promise<void> {
    const manifestPath = positional[0];
    if (!manifestPath) {
        outputError('Usage: cov run <manifest.json>');
        process.exit(1);
    }

    const resolvedPath = resolve(manifestPath);
    let manifest: ChainManifest;
    try {
        const raw = readFileSync(resolvedPath, 'utf-8');
        manifest = JSON.parse(raw) as ChainManifest;
    } catch (err) {
        outputError(`Failed to read manifest: ${resolvedPath}`, err instanceof Error ? err.message : err);
        process.exit(1);
    }

    logger.info(`Running chain ${manifest.chain_id} (${manifest.chain_name})`);

    try {
        const state = await runChain({
            manifest,
            stateDir: defaultStateDir(),
            onNodeStart: (node) => logger.debug(`Node started: ${node.name}`),
            onNodeComplete: (node, ns) => logger.debug(`Node ${node.name} → ${ns.status}`),
            onChainComplete: (s) => logger.info(`Chain completed: ${s.chain_id}`),
            onChainFail: (s, reason) => logger.error(`Chain failed: ${s.chain_id} — ${reason}`),
        });

        if (state.status === 'failed') {
            outputJson({ ok: false, error: `Chain execution failed: ${manifest.chain_id}`, state });
            closeStore();
            process.exit(1);
        }

        outputJson({ ok: true, state });
        closeStore();
        process.exit(0);
    } catch (err) {
        outputError(`Chain execution failed: ${manifest.chain_id}`, err instanceof Error ? err.message : err);
        closeStore();
        process.exit(1);
    }
}

// ----------------------------------------------------------------
// Command: resume
// ----------------------------------------------------------------

async function cmdResume(positional: string[], flags: Record<string, string>): Promise<void> {
    const chainId = positional[0];
    const manifestPath = flags.manifest;
    const taskWbsFlag = flags.task;
    if (!chainId) {
        outputError(
            'Usage: cov resume <chain-id> [--task <task_wbs>] [--manifest <manifest.json>] [--response <text>]',
        );
        process.exit(1);
    }

    const stateDir = defaultStateDir();
    let manifest: ChainManifest | null = null;
    let taskWbs = taskWbsFlag;
    if (manifestPath) {
        const resolvedPath = resolve(manifestPath);
        try {
            const raw = readFileSync(resolvedPath, 'utf-8');
            manifest = JSON.parse(raw) as ChainManifest;
        } catch (err) {
            outputError(`Failed to load manifest: ${resolvedPath}`, err instanceof Error ? err.message : String(err));
            process.exit(1);
        }

        try {
            taskWbs = resolveManifestTaskWbs(chainId, manifest, taskWbsFlag);
        } catch (err) {
            outputError(`Resume failed for chain ${chainId}`, err instanceof Error ? err.message : String(err));
            process.exit(1);
        }
    }

    let existingState: ChainState | null;
    try {
        existingState = resolveChainState(stateDir, chainId, taskWbs);
    } catch (err) {
        outputError(`Resume failed for chain ${chainId}`, err instanceof Error ? err.message : String(err));
        process.exit(1);
    }

    if (!existingState) {
        outputError(`Resume failed for chain ${chainId}`, `No chain found with id: ${chainId}`);
        process.exit(1);
    }

    taskWbs = existingState.task_wbs;

    if (!manifest) {
        try {
            manifest = loadManifest(stateDir, chainId, taskWbs);
        } catch (err) {
            outputError(`Resume failed for chain ${chainId}`, err instanceof Error ? err.message : String(err));
            process.exit(1);
        }

        if (!manifest) {
            outputError(
                `Resume failed for chain ${chainId}`,
                `No manifest found in store for task_wbs '${taskWbs}'; rerun with --manifest <manifest.json>`,
            );
            process.exit(1);
        }
    }

    const humanResponse = flags.response;
    logger.info(`Resuming chain ${chainId}`);

    try {
        const state = await resumeChain({
            manifest,
            stateDir,
            humanResponse,
            onNodeStart: (node) => logger.debug(`Node started: ${node.name}`),
            onNodeComplete: (node, ns) => logger.debug(`Node ${node.name} → ${ns.status}`),
            onChainComplete: (s) => logger.info(`Chain completed: ${s.chain_id}`),
            onChainFail: (s, reason) => logger.error(`Chain failed: ${s.chain_id} — ${reason}`),
        });

        if (state.status === 'failed') {
            outputJson({ ok: false, error: `Resume resulted in failure: ${chainId}`, state });
            closeStore();
            process.exit(1);
        }

        outputJson({ ok: true, state });
        closeStore();
        process.exit(0);
    } catch (err) {
        outputError(`Resume failed for chain ${chainId}`, err instanceof Error ? err.message : err);
        closeStore();
        process.exit(1);
    }
}

// ----------------------------------------------------------------
// Command: show
// ----------------------------------------------------------------

function cmdShow(positional: string[], flags: Record<string, string>): void {
    const chainId = positional[0];
    const taskWbs = flags.task;
    if (!chainId) {
        outputError('Usage: cov show <chain-id> [--task <task_wbs>]');
        process.exit(1);
    }

    logger.debug(`Looking up chain ${chainId}`);

    let state: ChainState | null;
    try {
        state = resolveChainState(defaultStateDir(), chainId, taskWbs);
    } catch (err) {
        outputError(`Show failed for chain ${chainId}`, err instanceof Error ? err.message : String(err));
        process.exit(1);
    }

    if (!state) {
        outputError(`No chain found with id: ${chainId}`);
        process.exit(1);
    }

    outputJson({ ok: true, state });
    process.exit(0);
}

// ----------------------------------------------------------------
// Command: list
// ----------------------------------------------------------------

function cmdList(flags: Record<string, string>): void {
    const taskWbs = flags.task;
    const stateDir = defaultStateDir();

    logger.debug('Listing chains');

    const hasExplicitStorePath = Boolean(process.env.COV_STORE_PATH?.trim());
    try {
        const chains = dedupeChains([...listChains(stateDir, taskWbs), ...listJsonChains(stateDir, taskWbs)]);
        const summary = chains.map((s) => ({
            chain_id: s.chain_id,
            chain_name: s.chain_name,
            task_wbs: s.task_wbs,
            status: s.status,
            current_node: s.current_node,
            updated_at: s.updated_at,
            paused_node: s.paused_node ?? null,
        }));

        outputJson({ ok: true, chains: summary, count: summary.length });
        process.exit(0);
    } catch (err) {
        if (!hasExplicitStorePath) {
            const fallbackChains = listJsonChains(stateDir, taskWbs);
            if (fallbackChains.length > 0) {
                const summary = fallbackChains.map((s) => ({
                    chain_id: s.chain_id,
                    chain_name: s.chain_name,
                    task_wbs: s.task_wbs,
                    status: s.status,
                    current_node: s.current_node,
                    updated_at: s.updated_at,
                    paused_node: s.paused_node ?? null,
                }));

                outputJson({ ok: true, chains: summary, count: summary.length });
                process.exit(0);
            }
        }

        outputError('List failed', err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}

// ----------------------------------------------------------------
// Main
// ----------------------------------------------------------------

async function main(): Promise<void> {
    const { command, positional, flags } = parseArgs(process.argv);

    switch (command) {
        case 'run':
            await cmdRun(positional, flags);
            break;
        case 'resume':
            await cmdResume(positional, flags);
            break;
        case 'show':
        case 'inspect':
            cmdShow(positional, flags);
            break;
        case 'list':
        case 'results':
            cmdList(flags);
            break;
        default:
            outputError(`Unknown command: "${command}"`, 'Available commands: run, resume, show, inspect, list, results');
            process.exit(1);
    }
}

main().catch((err) => {
    outputError('Unhandled error', err instanceof Error ? err.message : err);
    process.exit(1);
});
