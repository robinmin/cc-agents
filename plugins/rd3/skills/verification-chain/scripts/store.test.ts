/**
 * Unit tests for store.ts — SQLite-backed chain state store
 */

import { afterAll, afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ChainState, ChainManifest } from './types';
import {
    closeStore,
    findChainsById,
    listChains,
    loadChain,
    loadChainById,
    loadManifest,
    loadManifestById,
    openStore,
    resolveStorePath,
    saveChain,
} from './store';

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

let stateDir: string;

/** Create a fresh temp directory for each test. */
function freshDir(): string {
    const dir = join(tmpdir(), `cov-store-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    return dir;
}

/** Build a minimal valid ChainState. */
function makeState(overrides: Partial<ChainState> = {}): ChainState {
    return {
        chain_id: 'chain-1',
        task_wbs: '0001',
        chain_name: 'Test Chain',
        status: 'running',
        current_node: 'node-1',
        nodes: [],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        ...overrides,
    };
}

/** Build a minimal valid ChainManifest. */
function makeManifest(overrides: Partial<ChainManifest> = {}): ChainManifest {
    return {
        chain_id: 'chain-1',
        chain_name: 'Test Chain',
        task_wbs: '0001',
        nodes: [],
        ...overrides,
    };
}

/** Assert non-null and return typed value. */
function unwrap<T>(value: T | null, _label: string): T {
    expect(value).not.toBeNull();
    return value as T;
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe('store.ts', () => {
    beforeEach(() => {
        stateDir = freshDir();
    });

    afterEach(() => {
        closeStore();
        delete process.env.COV_STORE_PATH;
        delete process.env.COV_STORE_TABLE;
        if (existsSync(stateDir)) {
            rmSync(stateDir, { recursive: true, force: true });
        }
    });

    afterAll(() => {
        closeStore();
    });

    // ------------------------------------------------------------
    // openStore / closeStore
    // ------------------------------------------------------------
    describe('openStore', () => {
        test('creates the database file and cov/ directory', () => {
            const db = openStore(stateDir);
            expect(db).toBeDefined();
            expect(existsSync(resolveStorePath(stateDir))).toBe(true);
        });

        test('returns the same instance on repeated calls with same path', () => {
            const a = openStore(stateDir);
            const b = openStore(stateDir);
            expect(a).toBe(b);
        });

        test('re-opens database when path changes', () => {
            const a = openStore(stateDir);
            const dir2 = freshDir();
            try {
                const b = openStore(dir2);
                expect(a).not.toBe(b);
            } finally {
                closeStore();
                if (existsSync(dir2)) rmSync(dir2, { recursive: true, force: true });
            }
        });

        test('a failed path switch does not poison later reopen attempts', () => {
            const original = openStore(stateDir);
            const invalidPathDir = freshDir();
            mkdirSync(invalidPathDir, { recursive: true });

            process.env.COV_STORE_PATH = invalidPathDir;
            expect(() => openStore(stateDir)).toThrow('Failed to open chain store');

            delete process.env.COV_STORE_PATH;
            const reopened = openStore(stateDir);
            expect(reopened).toBeDefined();
            expect(reopened).not.toBe(original);
            expect(() =>
                saveChain(stateDir, makeState({ chain_id: 'after-failed-switch', task_wbs: '0009' })),
            ).not.toThrow();

            rmSync(invalidPathDir, { recursive: true, force: true });
        });
    });

    describe('resolveStorePath', () => {
        test('uses the default cov/cov-store.db path when no env override is set', () => {
            delete process.env.COV_STORE_PATH;
            expect(resolveStorePath(stateDir)).toBe(join(stateDir, 'cov', 'cov-store.db'));
        });

        test('uses a stateDir-relative path when COV_STORE_PATH is relative', () => {
            process.env.COV_STORE_PATH = 'shared/cov.sqlite';
            expect(resolveStorePath(stateDir)).toBe(join(stateDir, 'shared', 'cov.sqlite'));
            delete process.env.COV_STORE_PATH;
        });

        test('uses the configured absolute path when COV_STORE_PATH is absolute', () => {
            const absolutePath = join(tmpdir(), `cov-store-absolute-${Date.now()}.sqlite`);
            process.env.COV_STORE_PATH = absolutePath;
            expect(resolveStorePath(stateDir)).toBe(absolutePath);
            delete process.env.COV_STORE_PATH;
        });

        test('rejects an invalid COV_STORE_TABLE identifier', () => {
            process.env.COV_STORE_TABLE = 'bad-table-name';
            expect(() => openStore(stateDir)).toThrow('Invalid COV_STORE_TABLE');
        });
    });

    describe('closeStore', () => {
        test('clears internal references so next openStore creates a fresh connection', () => {
            openStore(stateDir);
            closeStore();
            // After close, a new call should still work
            const db = openStore(stateDir);
            expect(db).toBeDefined();
        });
    });

    // ------------------------------------------------------------
    // saveChain / loadChain
    // ------------------------------------------------------------
    describe('saveChain + loadChain', () => {
        test('round-trips a ChainState through SQLite', () => {
            const state = makeState();
            saveChain(stateDir, state);

            const loaded = unwrap(loadChain(stateDir, 'chain-1', '0001'), 'chain-1/0001');
            expect(loaded.chain_id).toBe('chain-1');
            expect(loaded.task_wbs).toBe('0001');
            expect(loaded.status).toBe('running');
            expect(loaded.nodes).toEqual([]);
        });

        test('returns null for non-existent chain', () => {
            const result = loadChain(stateDir, 'no-such', '0001');
            expect(result).toBeNull();
        });

        test('upserts on conflict (same chain_id + task_wbs)', () => {
            const state1 = makeState({ status: 'running' });
            saveChain(stateDir, state1);

            const state2 = makeState({ status: 'completed' });
            saveChain(stateDir, state2);

            const loaded = unwrap(loadChain(stateDir, 'chain-1', '0001'), 'chain-1/0001');
            expect(loaded.status).toBe('completed');
        });

        test('preserves complex node structures', () => {
            const state = makeState({
                nodes: [
                    {
                        name: 'node-1',
                        type: 'single',
                        status: 'completed',
                        maker_status: 'completed',
                        checker_status: 'completed',
                        checker_result: 'pass',
                        evidence: [
                            {
                                method: 'cli',
                                result: 'pass',
                                timestamp: '2026-01-01T00:01:00Z',
                                cli_output: 'OK',
                                cli_exit_code: 0,
                            },
                        ],
                        started_at: '2026-01-01T00:00:00Z',
                        completed_at: '2026-01-01T00:01:00Z',
                    },
                ],
            });
            saveChain(stateDir, state);

            const loaded = unwrap(loadChain(stateDir, 'chain-1', '0001'), 'chain-1/0001');
            expect(loaded.nodes).toHaveLength(1);
            expect(loaded.nodes[0].name).toBe('node-1');
            expect(loaded.nodes[0].evidence).toHaveLength(1);
            expect(loaded.nodes[0].evidence[0].cli_output).toBe('OK');
        });

        test('stores multiple chains independently', () => {
            const s1 = makeState({ chain_id: 'chain-A', task_wbs: '0001' });
            const s2 = makeState({ chain_id: 'chain-B', task_wbs: '0002', status: 'failed' });
            saveChain(stateDir, s1);
            saveChain(stateDir, s2);

            const a = unwrap(loadChain(stateDir, 'chain-A', '0001'), 'chain-A');
            const b = unwrap(loadChain(stateDir, 'chain-B', '0002'), 'chain-B');
            expect(a.status).toBe('running');
            expect(b.status).toBe('failed');
        });

        test('same chain_id with different task_wbs are separate rows', () => {
            const s1 = makeState({ task_wbs: '0001', status: 'running' });
            const s2 = makeState({ task_wbs: '0002', status: 'completed' });
            saveChain(stateDir, s1);
            saveChain(stateDir, s2);

            const r1 = unwrap(loadChain(stateDir, 'chain-1', '0001'), '0001');
            const r2 = unwrap(loadChain(stateDir, 'chain-1', '0002'), '0002');
            expect(r1.status).toBe('running');
            expect(r2.status).toBe('completed');
        });

        test('different COV_STORE_TABLE values isolate records in the same SQLite file', () => {
            const sharedDbPath = join(tmpdir(), `cov-shared-${Date.now()}.sqlite`);
            process.env.COV_STORE_PATH = sharedDbPath;

            process.env.COV_STORE_TABLE = 'chain_state_alpha';
            saveChain(stateDir, makeState({ chain_id: 'shared', task_wbs: '0001', status: 'running' }));

            closeStore();
            process.env.COV_STORE_TABLE = 'chain_state_beta';
            saveChain(stateDir, makeState({ chain_id: 'shared', task_wbs: '0001', status: 'completed' }));

            closeStore();
            process.env.COV_STORE_TABLE = 'chain_state_alpha';
            expect(loadChain(stateDir, 'shared', '0001')?.status).toBe('running');
            expect(listChains(stateDir)).toHaveLength(1);

            closeStore();
            process.env.COV_STORE_TABLE = 'chain_state_beta';
            expect(loadChain(stateDir, 'shared', '0001')?.status).toBe('completed');
            expect(listChains(stateDir)).toHaveLength(1);

            rmSync(sharedDbPath, { force: true });
            delete process.env.COV_STORE_TABLE;
            delete process.env.COV_STORE_PATH;
        });

        test('switching COV_STORE_TABLE reopens the cached store for the new namespace', () => {
            const sharedDbPath = join(tmpdir(), `cov-shared-switch-${Date.now()}.sqlite`);
            process.env.COV_STORE_PATH = sharedDbPath;

            process.env.COV_STORE_TABLE = 'chain_state_one';
            const first = openStore(stateDir);
            saveChain(stateDir, makeState({ chain_id: 'shared', task_wbs: '0001', status: 'running' }));

            process.env.COV_STORE_TABLE = 'chain_state_two';
            const second = openStore(stateDir);
            expect(second).not.toBe(first);
            expect(() =>
                saveChain(stateDir, makeState({ chain_id: 'shared', task_wbs: '0001', status: 'completed' })),
            ).not.toThrow();
            expect(loadChain(stateDir, 'shared', '0001')?.status).toBe('completed');

            rmSync(sharedDbPath, { force: true });
            delete process.env.COV_STORE_TABLE;
            delete process.env.COV_STORE_PATH;
        });
    });

    // ------------------------------------------------------------
    // loadChainById
    // ------------------------------------------------------------
    describe('loadChainById', () => {
        test('returns most recently updated state for a given chain_id', () => {
            const older = makeState({ updated_at: '2026-01-01T00:00:00Z', status: 'running' });
            const newer = makeState({ task_wbs: '0002', updated_at: '2026-01-02T00:00:00Z', status: 'completed' });
            saveChain(stateDir, older);
            saveChain(stateDir, newer);

            const loaded = unwrap(loadChainById(stateDir, 'chain-1'), 'chain-1');
            expect(loaded.status).toBe('completed');
        });

        test('returns null when no matching chain_id exists', () => {
            expect(loadChainById(stateDir, 'nope')).toBeNull();
        });

        test('returns the single row when only one exists', () => {
            const state = makeState({ chain_id: 'unique-chain' });
            saveChain(stateDir, state);

            const loaded = unwrap(loadChainById(stateDir, 'unique-chain'), 'unique-chain');
            expect(loaded.chain_id).toBe('unique-chain');
        });

        test('findChainsById returns all rows for the shared chain_id', () => {
            saveChain(stateDir, makeState({ chain_id: 'shared-chain', task_wbs: '0001' }));
            saveChain(stateDir, makeState({ chain_id: 'shared-chain', task_wbs: '0002' }));

            const loaded = findChainsById(stateDir, 'shared-chain');
            expect(loaded).toHaveLength(2);
            expect(loaded.map((chain) => chain.task_wbs).sort()).toEqual(['0001', '0002']);
        });
    });

    // ------------------------------------------------------------
    // manifest persistence
    // ------------------------------------------------------------
    describe('manifest via saveChain + loadManifestById', () => {
        test('persists and retrieves manifest', () => {
            const state = makeState();
            const manifest = makeManifest({
                nodes: [
                    {
                        name: 'node-1',
                        type: 'single',
                        maker: { command: 'echo hi' },
                        checker: { method: 'cli', config: { command: 'true' } },
                    },
                ],
            });
            saveChain(stateDir, state, manifest);

            const loaded = unwrap(loadManifestById(stateDir, 'chain-1'), 'manifest');
            expect(loaded.nodes).toHaveLength(1);
            expect(loaded.nodes[0].name).toBe('node-1');
        });

        test('returns null when manifest was not saved', () => {
            const state = makeState();
            saveChain(stateDir, state);
            expect(loadManifestById(stateDir, 'chain-1')).toBeNull();
        });

        test('returns null for non-existent chain_id', () => {
            expect(loadManifestById(stateDir, 'nope')).toBeNull();
        });

        test('upsert preserves existing manifest when new one is omitted', () => {
            const state = makeState();
            const manifest = makeManifest({ chain_name: 'First' });
            saveChain(stateDir, state, manifest);

            // Save again without manifest — COALESCE keeps the old one
            const state2 = makeState({ status: 'completed', updated_at: '2026-01-02T00:00:00Z' });
            saveChain(stateDir, state2);

            const loaded = unwrap(loadManifestById(stateDir, 'chain-1'), 'manifest');
            expect(loaded.chain_name).toBe('First');
        });

        test('upsert replaces manifest when a new one is provided', () => {
            const state = makeState();
            saveChain(stateDir, state, makeManifest({ chain_name: 'Old' }));

            const state2 = makeState({ status: 'completed', updated_at: '2026-01-02T00:00:00Z' });
            saveChain(stateDir, state2, makeManifest({ chain_name: 'New' }));

            const loaded = unwrap(loadManifestById(stateDir, 'chain-1'), 'manifest');
            expect(loaded.chain_name).toBe('New');
        });

        test('loadManifest returns the manifest for the exact task_wbs key', () => {
            saveChain(
                stateDir,
                makeState({ chain_id: 'shared-chain', task_wbs: '0001' }),
                makeManifest({ task_wbs: '0001' }),
            );
            saveChain(
                stateDir,
                makeState({ chain_id: 'shared-chain', task_wbs: '0002' }),
                makeManifest({ task_wbs: '0002' }),
            );

            const loaded = unwrap(loadManifest(stateDir, 'shared-chain', '0002'), 'manifest');
            expect(loaded.task_wbs).toBe('0002');
        });
    });

    // ------------------------------------------------------------
    // listChains
    // ------------------------------------------------------------
    describe('listChains', () => {
        test('returns empty array when no chains exist', () => {
            expect(listChains(stateDir)).toEqual([]);
        });

        test('returns all chains ordered by updated_at desc', () => {
            const s1 = makeState({ chain_id: 'c1', updated_at: '2026-01-01T00:00:00Z' });
            const s2 = makeState({ chain_id: 'c2', updated_at: '2026-01-03T00:00:00Z' });
            const s3 = makeState({ chain_id: 'c3', updated_at: '2026-01-02T00:00:00Z' });
            saveChain(stateDir, s1);
            saveChain(stateDir, s2);
            saveChain(stateDir, s3);

            const list = listChains(stateDir);
            expect(list).toHaveLength(3);
            expect(list[0].chain_id).toBe('c2');
            expect(list[1].chain_id).toBe('c3');
            expect(list[2].chain_id).toBe('c1');
        });

        test('filters by task_wbs when provided', () => {
            const s1 = makeState({ chain_id: 'c1', task_wbs: '0001' });
            const s2 = makeState({ chain_id: 'c2', task_wbs: '0002' });
            const s3 = makeState({ chain_id: 'c3', task_wbs: '0001' });
            saveChain(stateDir, s1);
            saveChain(stateDir, s2);
            saveChain(stateDir, s3);

            const list = listChains(stateDir, '0001');
            expect(list).toHaveLength(2);
            expect(list.every((c) => c.task_wbs === '0001')).toBe(true);
        });

        test('returns all when task_wbs is undefined', () => {
            saveChain(stateDir, makeState({ chain_id: 'c1' }));
            saveChain(stateDir, makeState({ chain_id: 'c2' }));

            expect(listChains(stateDir)).toHaveLength(2);
        });

        test('returns empty array when filter matches nothing', () => {
            saveChain(stateDir, makeState({ task_wbs: '0001' }));
            expect(listChains(stateDir, '9999')).toEqual([]);
        });
    });
});
