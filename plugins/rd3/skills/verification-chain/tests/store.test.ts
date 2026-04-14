/**
 * verification-chain — SQLite store persistence tests
 *
 * Tests all store functions using a temporary directory on disk.
 * Covers: openStore/closeStore, saveChain/loadChain round-trip,
 * loadChainById, listChains with/without task_wbs filter, concurrent access,
 * and pause/resume state round-trip.
 */

import { describe, test, expect, afterAll, afterEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
    openStore,
    closeStore,
    saveChain,
    loadChain,
    loadChainById,
    listChains,
    listNodeRecords,
    listEvidenceRecords,
    loadCheckpoint,
    resolveStorePath,
} from '../scripts/store';
import type { ChainState, NodeExecutionState, CheckerEvidence } from '../scripts/types';

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/** Temp directories created during this test run — cleaned up in afterAll. */
const tempDirs: string[] = [];

/** Create a fresh temp stateDir for a test. Tracked for cleanup. */
function makeStateDir(): string {
    const dir = mkdtempSync(join(tmpdir(), 'cov-store-test-'));
    tempDirs.push(dir);
    return dir;
}

function makeChainState(overrides: Partial<ChainState> = {}): ChainState {
    return {
        chain_id: 'test-chain-001',
        task_wbs: 'WBS.1.2.3',
        chain_name: 'Test Chain',
        status: 'running',
        current_node: 'node-1',
        nodes: [],
        created_at: '2026-04-13T10:00:00.000Z',
        updated_at: '2026-04-13T10:00:00.000Z',
        ...overrides,
    };
}

function makeNodeState(overrides: Partial<NodeExecutionState> = {}): NodeExecutionState {
    return {
        name: 'node-1',
        type: 'single',
        status: 'pending',
        maker_status: 'pending',
        checker_status: 'pending',
        evidence: [],
        ...overrides,
    };
}

function makeEvidence(overrides: Partial<CheckerEvidence> = {}): CheckerEvidence {
    return {
        method: 'cli',
        result: 'pass',
        timestamp: '2026-04-13T10:01:00.000Z',
        ...overrides,
    };
}

// ----------------------------------------------------------------
// Global lifecycle
// ----------------------------------------------------------------

afterAll(() => {
    closeStore();
    delete process.env.COV_STORE_PATH;
    for (const dir of tempDirs) {
        try {
            rmSync(dir, { recursive: true, force: true });
        } catch {
            /* ignore */
        }
    }
});

// ================================================================
// openStore / closeStore
// ================================================================

describe('openStore / closeStore', () => {
    afterEach(() => {
        closeStore();
        delete process.env.COV_STORE_PATH;
    });

    test('openStore creates the database file without error', () => {
        const stateDir = makeStateDir();
        expect(() => openStore(stateDir)).not.toThrow();
    });

    test('openStore returns the same DB handle when called with the same stateDir', () => {
        const stateDir = makeStateDir();
        const db1 = openStore(stateDir);
        const db2 = openStore(stateDir);
        expect(db2).toBe(db1);
    });

    test('closeStore closes the handle and next openStore reconnects', () => {
        const stateDir = makeStateDir();
        const db1 = openStore(stateDir);
        closeStore();
        const db2 = openStore(stateDir);
        // Different object identity — a new connection was opened
        expect(db2).not.toBe(db1);
    });

    test('closeStore is idempotent — calling twice does not throw', () => {
        const stateDir = makeStateDir();
        openStore(stateDir);
        closeStore();
        expect(() => closeStore()).not.toThrow();
    });

    test('resolveStorePath defaults to stateDir/cov/cov-store.db', () => {
        const stateDir = makeStateDir();
        expect(resolveStorePath(stateDir)).toBe(join(stateDir, 'cov', 'cov-store.db'));
    });

    test('resolveStorePath honors relative COV_STORE_PATH', () => {
        const stateDir = makeStateDir();
        process.env.COV_STORE_PATH = 'shared/cov.sqlite';
        expect(resolveStorePath(stateDir)).toBe(join(stateDir, 'shared', 'cov.sqlite'));
    });

    test('resolveStorePath honors absolute COV_STORE_PATH', () => {
        const stateDir = makeStateDir();
        const absolutePath = join(tmpdir(), `cov-store-test-${Date.now()}.sqlite`);
        process.env.COV_STORE_PATH = absolutePath;
        expect(resolveStorePath(stateDir)).toBe(absolutePath);
    });

    test('COV_STORE_TABLE defines a namespaced set of normalized record tables', () => {
        const stateDir = makeStateDir();
        process.env.COV_STORE_TABLE = 'cov_runtime';

        try {
            const db = openStore(stateDir);
            const tables = db
                .query(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`)
                .all() as Array<{ name: string }>;

            expect(tables.map((row) => row.name)).toEqual(
                expect.arrayContaining([
                    'cov_runtime',
                    'cov_runtime_nodes',
                    'cov_runtime_evidence',
                    'cov_runtime_checkpoints',
                ]),
            );
        } finally {
            delete process.env.COV_STORE_TABLE;
            closeStore();
        }
    });
});

// ================================================================
// saveChain / loadChain round-trip
// ================================================================

describe('saveChain / loadChain', () => {
    test('round-trips a minimal chain state', () => {
        const stateDir = makeStateDir();
        try {
            const state = makeChainState();
            saveChain(stateDir, state);

            const loaded = loadChain(stateDir, state.chain_id, state.task_wbs);
            expect(loaded).not.toBeNull();
            expect(loaded?.chain_id).toBe(state.chain_id);
            expect(loaded?.task_wbs).toBe(state.task_wbs);
            expect(loaded?.chain_name).toBe(state.chain_name);
            expect(loaded?.status).toBe(state.status);
            expect(loaded?.current_node).toBe(state.current_node);
            expect(loaded?.created_at).toBe(state.created_at);
            expect(loaded?.updated_at).toBe(state.updated_at);
        } finally {
            closeStore();
        }
    });

    test('round-trips chain state with nodes', () => {
        const stateDir = makeStateDir();
        try {
            const nodes: NodeExecutionState[] = [
                makeNodeState({
                    name: 'node-1',
                    status: 'completed',
                    maker_status: 'completed',
                    checker_status: 'completed',
                }),
                makeNodeState({
                    name: 'node-2',
                    status: 'pending',
                    maker_status: 'pending',
                    checker_status: 'pending',
                }),
            ];
            const state = makeChainState({ nodes });
            saveChain(stateDir, state);

            const loaded = loadChain(stateDir, state.chain_id, state.task_wbs);
            expect(loaded?.nodes).toHaveLength(2);
            expect(loaded?.nodes[0].name).toBe('node-1');
            expect(loaded?.nodes[0].status).toBe('completed');
            expect(loaded?.nodes[1].name).toBe('node-2');
        } finally {
            closeStore();
        }
    });

    test('round-trips node with evidence array', () => {
        const stateDir = makeStateDir();
        try {
            const evidence: CheckerEvidence = makeEvidence({
                method: 'cli',
                result: 'pass',
                cli_output: 'All tests passed',
                cli_exit_code: 0,
            });
            const nodes: NodeExecutionState[] = [makeNodeState({ name: 'node-1', evidence: [evidence] })];
            const state = makeChainState({ nodes });
            saveChain(stateDir, state);

            const loaded = loadChain(stateDir, state.chain_id, state.task_wbs);
            expect(loaded?.nodes[0].evidence).toHaveLength(1);
            expect(loaded?.nodes[0].evidence[0].method).toBe('cli');
            expect(loaded?.nodes[0].evidence[0].cli_output).toBe('All tests passed');
            expect(loaded?.nodes[0].evidence[0].cli_exit_code).toBe(0);
        } finally {
            closeStore();
        }
    });

    test('round-trips node with parallel_children', () => {
        const stateDir = makeStateDir();
        try {
            const nodes: NodeExecutionState[] = [
                makeNodeState({
                    name: 'parallel-1',
                    type: 'parallel-group',
                    parallel_children: {
                        'child-a': { maker_status: 'completed', maker_result: 'pass' },
                        'child-b': { maker_status: 'failed', maker_result: 'fail', error: 'boom' },
                    },
                }),
            ];
            const state = makeChainState({ nodes });
            saveChain(stateDir, state);

            const loaded = loadChain(stateDir, state.chain_id, state.task_wbs);
            expect(loaded?.nodes[0].parallel_children).toBeDefined();
            expect(loaded?.nodes[0].parallel_children?.['child-a'].maker_status).toBe('completed');
            expect(loaded?.nodes[0].parallel_children?.['child-b'].error).toBe('boom');
        } finally {
            closeStore();
        }
    });

    test('round-trips global_retry field', () => {
        const stateDir = makeStateDir();
        try {
            const state = makeChainState({
                global_retry: { remaining: 2, total: 3 },
            });
            saveChain(stateDir, state);

            const loaded = loadChain(stateDir, state.chain_id, state.task_wbs);
            expect(loaded?.global_retry).toEqual({ remaining: 2, total: 3 });
        } finally {
            closeStore();
        }
    });

    test('persists normalized chain, node, evidence, and checkpoint records atomically', () => {
        const stateDir = makeStateDir();

        try {
            const firstEvidence = makeEvidence({
                method: 'cli',
                result: 'pass',
                cli_output: 'ok',
                cli_exit_code: 0,
            });
            const secondEvidence = makeEvidence({
                method: 'content-match',
                result: 'paused',
                content_match_found: true,
            });
            const state = makeChainState({
                status: 'paused',
                paused_node: 'node-2',
                paused_at: '2026-04-13T10:05:00.000Z',
                paused_response: 'approve',
                nodes: [
                    makeNodeState({
                        name: 'node-1',
                        status: 'completed',
                        maker_status: 'completed',
                        checker_status: 'completed',
                        checker_result: 'pass',
                        evidence: [firstEvidence],
                    }),
                    makeNodeState({
                        name: 'node-2',
                        status: 'running',
                        maker_status: 'completed',
                        checker_status: 'paused',
                        checker_result: 'paused',
                        evidence: [secondEvidence],
                    }),
                ],
            });

            saveChain(stateDir, state);

            const db = openStore(stateDir);
            const chainRow = db
                .query(
                    `SELECT chain_name, status, current_node, paused_node, paused_response
                     FROM "chain_state"
                     WHERE chain_id = ? AND task_wbs = ?`,
                )
                .get(state.chain_id, state.task_wbs) as
                | {
                      chain_name: string;
                      status: string;
                      current_node: string;
                      paused_node: string | null;
                      paused_response: string | null;
                  }
                | null;
            expect(chainRow).not.toBeNull();
            expect(chainRow?.status).toBe('paused');
            expect(chainRow?.paused_node).toBe('node-2');
            expect(chainRow?.paused_response).toBe('approve');

            const nodeRows = db
                .query(
                    `SELECT node_name, ordinal, status, maker_status, checker_status, checker_result
                     FROM "chain_state_nodes"
                     WHERE chain_id = ? AND task_wbs = ?
                     ORDER BY ordinal`,
                )
                .all(state.chain_id, state.task_wbs) as Array<{
                node_name: string;
                ordinal: number;
                status: string;
                maker_status: string;
                checker_status: string;
                checker_result: string | null;
            }>;
            expect(nodeRows).toHaveLength(2);
            expect(nodeRows[0]).toMatchObject({
                node_name: 'node-1',
                ordinal: 0,
                status: 'completed',
                maker_status: 'completed',
                checker_status: 'completed',
                checker_result: 'pass',
            });
            expect(nodeRows[1]).toMatchObject({
                node_name: 'node-2',
                ordinal: 1,
                status: 'running',
                maker_status: 'completed',
                checker_status: 'paused',
                checker_result: 'paused',
            });

            const evidenceRows = db
                .query(
                    `SELECT node_name, evidence_index, method, result
                     FROM "chain_state_evidence"
                     WHERE chain_id = ? AND task_wbs = ?
                     ORDER BY node_name, evidence_index`,
                )
                .all(state.chain_id, state.task_wbs) as Array<{
                node_name: string;
                evidence_index: number;
                method: string;
                result: string;
            }>;
            expect(evidenceRows).toEqual([
                { node_name: 'node-1', evidence_index: 0, method: 'cli', result: 'pass' },
                { node_name: 'node-2', evidence_index: 0, method: 'content-match', result: 'paused' },
            ]);

            const checkpointRow = db
                .query(
                    `SELECT status, paused_node, paused_at, paused_response
                     FROM "chain_state_checkpoints"
                     WHERE chain_id = ? AND task_wbs = ?`,
                )
                .get(state.chain_id, state.task_wbs) as
                | {
                      status: string;
                      paused_node: string | null;
                      paused_at: string | null;
                      paused_response: string | null;
                  }
                | null;
            expect(checkpointRow).toEqual({
                status: 'paused',
                paused_node: 'node-2',
                paused_at: '2026-04-13T10:05:00.000Z',
                paused_response: 'approve',
            });
        } finally {
            closeStore();
        }
    });

    test('loads normalized node, evidence, and checkpoint records through exported helpers', () => {
        const stateDir = makeStateDir();

        try {
            const state = makeChainState({
                status: 'paused',
                paused_node: 'node-1',
                paused_at: '2026-04-13T10:06:00.000Z',
                paused_response: 'approve',
                nodes: [
                    makeNodeState({
                        name: 'node-1',
                        status: 'running',
                        maker_status: 'completed',
                        checker_status: 'paused',
                        checker_result: 'paused',
                        evidence: [
                            makeEvidence({
                                method: 'human',
                                result: 'paused',
                                human_response: 'approve',
                            }),
                        ],
                    }),
                ],
            });

            saveChain(stateDir, state);

            const nodeRecords = listNodeRecords(stateDir, state.chain_id, state.task_wbs);
            expect(nodeRecords).toHaveLength(1);
            expect(nodeRecords[0].node_name).toBe('node-1');
            expect(nodeRecords[0].checker_result).toBe('paused');

            const evidenceRecords = listEvidenceRecords(stateDir, state.chain_id, state.task_wbs);
            expect(evidenceRecords).toHaveLength(1);
            expect(evidenceRecords[0].method).toBe('human');
            expect(evidenceRecords[0].result).toBe('paused');

            const checkpoint = loadCheckpoint(stateDir, state.chain_id, state.task_wbs);
            expect(checkpoint).not.toBeNull();
            expect(checkpoint?.status).toBe('paused');
            expect(checkpoint?.paused_response).toBe('approve');
        } finally {
            closeStore();
        }
    });

    test('returns null for non-existent chain', () => {
        const stateDir = makeStateDir();
        try {
            const loaded = loadChain(stateDir, 'does-not-exist', 'WBS.999');
            expect(loaded).toBeNull();
        } finally {
            closeStore();
        }
    });

    test('overwrites existing chain on re-save (upsert)', () => {
        const stateDir = makeStateDir();
        try {
            const state = makeChainState({ status: 'running' });
            saveChain(stateDir, state);

            const updated = makeChainState({ status: 'completed' });
            saveChain(stateDir, updated);

            const loaded = loadChain(stateDir, state.chain_id, state.task_wbs);
            expect(loaded?.status).toBe('completed');
        } finally {
            closeStore();
        }
    });

    test('round-trips all evidence method types', () => {
        const stateDir = makeStateDir();
        try {
            const cliEvidence = makeEvidence({
                method: 'cli',
                result: 'pass',
                cli_output: 'ok',
                cli_exit_code: 0,
            });
            const llmEvidence = makeEvidence({
                method: 'llm',
                result: 'pass',
                llm_results: [{ item: 'check 1', passed: true, reason: 'looks good' }],
            });
            const humanEvidence = makeEvidence({
                method: 'human',
                result: 'pass',
                human_response: 'approve',
            });
            const fileEvidence = makeEvidence({
                method: 'file-exists',
                result: 'pass',
                file_paths_found: ['/a/b.txt', '/c/d.txt'],
            });
            const contentEvidence = makeEvidence({
                method: 'content-match',
                result: 'pass',
                content_match_found: true,
            });
            const compoundEvidence = makeEvidence({
                method: 'compound',
                result: 'pass',
                compound_results: [
                    { sub_check: 'sub-1', result: 'pass' },
                    { sub_check: 'sub-2', result: 'fail' },
                ],
            });
            const nodes: NodeExecutionState[] = [
                makeNodeState({
                    name: 'all-methods-node',
                    evidence: [
                        cliEvidence,
                        llmEvidence,
                        humanEvidence,
                        fileEvidence,
                        contentEvidence,
                        compoundEvidence,
                    ],
                }),
            ];
            const state = makeChainState({ nodes });
            saveChain(stateDir, state);

            const loaded = loadChain(stateDir, state.chain_id, state.task_wbs);
            const ev = loaded?.nodes[0]?.evidence;
            expect(ev).toBeDefined();
            if (!ev) return;

            expect(ev[0].cli_output).toBe('ok');
            expect(ev[1].llm_results).toEqual([{ item: 'check 1', passed: true, reason: 'looks good' }]);
            expect(ev[2].human_response).toBe('approve');
            expect(ev[3].file_paths_found).toEqual(['/a/b.txt', '/c/d.txt']);
            expect(ev[4].content_match_found).toBe(true);
            expect(ev[5].compound_results).toHaveLength(2);
        } finally {
            closeStore();
        }
    });

    test('round-trips evidence with error field', () => {
        const stateDir = makeStateDir();
        try {
            const evidence = makeEvidence({ result: 'fail', error: 'command timed out' });
            const nodes = [makeNodeState({ name: 'err-node', evidence: [evidence] })];
            const state = makeChainState({ nodes });
            saveChain(stateDir, state);

            const loaded = loadChain(stateDir, state.chain_id, state.task_wbs);
            expect(loaded?.nodes[0].evidence[0].error).toBe('command timed out');
        } finally {
            closeStore();
        }
    });
});

// ================================================================
// loadChainById
// ================================================================

describe('loadChainById', () => {
    test('loads chain by chain_id alone (any task_wbs)', () => {
        const stateDir = makeStateDir();
        try {
            const state = makeChainState({ chain_id: 'cid-1', task_wbs: 'WBS.1' });
            saveChain(stateDir, state);

            const loaded = loadChainById(stateDir, 'cid-1');
            expect(loaded).not.toBeNull();
            expect(loaded?.chain_id).toBe('cid-1');
            expect(loaded?.task_wbs).toBe('WBS.1');
        } finally {
            closeStore();
        }
    });

    test('returns the most-recently updated match when multiple rows share the same chain_id', () => {
        const stateDir = makeStateDir();
        try {
            // Same chain_id, different task_wbs values and updated_at timestamps
            saveChain(
                stateDir,
                makeChainState({
                    chain_id: 'shared-id',
                    task_wbs: 'WBS.1',
                    status: 'running',
                    updated_at: '2026-04-13T09:00:00.000Z',
                }),
            );
            saveChain(
                stateDir,
                makeChainState({
                    chain_id: 'shared-id',
                    task_wbs: 'WBS.2',
                    status: 'completed',
                    updated_at: '2026-04-13T10:00:00.000Z',
                }),
            );

            const loaded = loadChainById(stateDir, 'shared-id');
            expect(loaded).not.toBeNull();
            // Should return the most recently updated one (WBS.2)
            expect(loaded?.task_wbs).toBe('WBS.2');
            expect(loaded?.status).toBe('completed');
        } finally {
            closeStore();
        }
    });

    test('returns null for non-existent chain_id', () => {
        const stateDir = makeStateDir();
        try {
            const loaded = loadChainById(stateDir, 'ghost-id');
            expect(loaded).toBeNull();
        } finally {
            closeStore();
        }
    });
});

// ================================================================
// listChains
// ================================================================

describe('listChains', () => {
    test('returns empty array when no chains exist', () => {
        const stateDir = makeStateDir();
        try {
            const chains = listChains(stateDir);
            expect(chains).toEqual([]);
        } finally {
            closeStore();
        }
    });

    test('returns all saved chains', () => {
        const stateDir = makeStateDir();
        try {
            saveChain(stateDir, makeChainState({ chain_id: 'c1', task_wbs: 'WBS.1', chain_name: 'Chain 1' }));
            saveChain(stateDir, makeChainState({ chain_id: 'c2', task_wbs: 'WBS.2', chain_name: 'Chain 2' }));
            saveChain(stateDir, makeChainState({ chain_id: 'c3', task_wbs: 'WBS.1', chain_name: 'Chain 3' }));

            const chains = listChains(stateDir);
            expect(chains).toHaveLength(3);
            const ids = chains.map((c) => c.chain_id).sort();
            expect(ids).toEqual(['c1', 'c2', 'c3']);
        } finally {
            closeStore();
        }
    });

    test('filters by task_wbs', () => {
        const stateDir = makeStateDir();
        try {
            saveChain(stateDir, makeChainState({ chain_id: 'c1', task_wbs: 'WBS.1' }));
            saveChain(stateDir, makeChainState({ chain_id: 'c2', task_wbs: 'WBS.2' }));
            saveChain(stateDir, makeChainState({ chain_id: 'c3', task_wbs: 'WBS.1' }));

            const filtered = listChains(stateDir, 'WBS.1');
            expect(filtered).toHaveLength(2);
            const ids = filtered.map((c) => c.chain_id).sort();
            expect(ids).toEqual(['c1', 'c3']);
        } finally {
            closeStore();
        }
    });

    test('returns empty array for non-matching task_wbs', () => {
        const stateDir = makeStateDir();
        try {
            saveChain(stateDir, makeChainState({ chain_id: 'c1', task_wbs: 'WBS.1' }));
            const filtered = listChains(stateDir, 'WBS.999');
            expect(filtered).toEqual([]);
        } finally {
            closeStore();
        }
    });

    test('returns full ChainState objects with nodes', () => {
        const stateDir = makeStateDir();
        try {
            const state = makeChainState({
                chain_id: 'c1',
                nodes: [makeNodeState({ name: 'n1' }), makeNodeState({ name: 'n2' })],
            });
            saveChain(stateDir, state);

            const chains = listChains(stateDir);
            expect(chains).toHaveLength(1);
            expect(chains[0].nodes).toHaveLength(2);
        } finally {
            closeStore();
        }
    });
});

// ================================================================
// Concurrent access
// ================================================================

describe('concurrent access', () => {
    test('multiple saves to different chains do not conflict', () => {
        const stateDir = makeStateDir();
        try {
            const s1 = makeChainState({ chain_id: 'concurrent-1', task_wbs: 'WBS.1', status: 'running' });
            const s2 = makeChainState({ chain_id: 'concurrent-2', task_wbs: 'WBS.2', status: 'running' });

            saveChain(stateDir, s1);
            saveChain(stateDir, s2);

            // Update both
            saveChain(stateDir, makeChainState({ chain_id: 'concurrent-1', task_wbs: 'WBS.1', status: 'completed' }));
            saveChain(stateDir, makeChainState({ chain_id: 'concurrent-2', task_wbs: 'WBS.2', status: 'failed' }));

            const l1 = loadChain(stateDir, 'concurrent-1', 'WBS.1');
            const l2 = loadChain(stateDir, 'concurrent-2', 'WBS.2');

            expect(l1?.status).toBe('completed');
            expect(l2?.status).toBe('failed');
        } finally {
            closeStore();
        }
    });

    test('rapid updates to the same chain preserve last write', () => {
        const stateDir = makeStateDir();
        try {
            const chainId = 'rapid-chain';
            const taskWbs = 'WBS.1';
            for (let i = 0; i < 20; i++) {
                saveChain(
                    stateDir,
                    makeChainState({
                        chain_id: chainId,
                        task_wbs: taskWbs,
                        current_node: `node-${i}`,
                        updated_at: `2026-04-13T10:${String(i).padStart(2, '0')}:00.000Z`,
                    }),
                );
            }

            const loaded = loadChain(stateDir, chainId, taskWbs);
            expect(loaded?.current_node).toBe('node-19');
        } finally {
            closeStore();
        }
    });
});

// ================================================================
// Pause / resume state round-trip
// ================================================================

describe('pause/resume state round-trip', () => {
    test('round-trips paused state with paused_at, paused_node, paused_response', () => {
        const stateDir = makeStateDir();
        try {
            const pausedState = makeChainState({
                status: 'paused',
                paused_at: '2026-04-13T11:00:00.000Z',
                paused_node: 'human-gate',
            });
            saveChain(stateDir, pausedState);

            const loaded = loadChain(stateDir, pausedState.chain_id, pausedState.task_wbs);
            expect(loaded?.status).toBe('paused');
            expect(loaded?.paused_at).toBe('2026-04-13T11:00:00.000Z');
            expect(loaded?.paused_node).toBe('human-gate');
            expect(loaded?.paused_response).toBeUndefined();
        } finally {
            closeStore();
        }
    });

    test('round-trips resumed state — clears pause fields, updates status', () => {
        const stateDir = makeStateDir();
        try {
            // First save paused state
            const pausedState = makeChainState({
                status: 'paused',
                paused_at: '2026-04-13T11:00:00.000Z',
                paused_node: 'human-gate',
                nodes: [
                    makeNodeState({
                        name: 'human-gate',
                        status: 'running',
                        maker_status: 'completed',
                        checker_status: 'paused',
                        checker_result: 'paused',
                        evidence: [makeEvidence({ method: 'human', result: 'paused' })],
                    }),
                ],
            });
            saveChain(stateDir, pausedState);

            // Now simulate resume: clear pause fields, set status back to running
            const resumedState = makeChainState({
                status: 'running',
                paused_response: 'approve',
                nodes: [
                    makeNodeState({
                        name: 'human-gate',
                        status: 'completed',
                        maker_status: 'completed',
                        checker_status: 'completed',
                        checker_result: 'pass',
                        evidence: [
                            makeEvidence({ method: 'human', result: 'paused' }),
                            makeEvidence({ method: 'human', result: 'pass', human_response: 'approve' }),
                        ],
                    }),
                ],
                updated_at: '2026-04-13T11:05:00.000Z',
            });
            saveChain(stateDir, resumedState);

            const loaded = loadChain(stateDir, resumedState.chain_id, resumedState.task_wbs);
            expect(loaded?.status).toBe('running');
            expect(loaded?.paused_at).toBeUndefined();
            expect(loaded?.paused_node).toBeUndefined();
            expect(loaded?.paused_response).toBe('approve');
            expect(loaded?.updated_at).toBe('2026-04-13T11:05:00.000Z');

            // Check node state
            expect(loaded?.nodes[0].checker_status).toBe('completed');
            expect(loaded?.nodes[0].checker_result).toBe('pass');
            expect(loaded?.nodes[0].evidence).toHaveLength(2);
            expect(loaded?.nodes[0].evidence[1].human_response).toBe('approve');
        } finally {
            closeStore();
        }
    });

    test('can list paused chains and filter them', () => {
        const stateDir = makeStateDir();
        try {
            saveChain(
                stateDir,
                makeChainState({ chain_id: 'c1', task_wbs: 'WBS.1', status: 'paused', paused_node: 'gate-1' }),
            );
            saveChain(stateDir, makeChainState({ chain_id: 'c2', task_wbs: 'WBS.1', status: 'running' }));
            saveChain(
                stateDir,
                makeChainState({ chain_id: 'c3', task_wbs: 'WBS.2', status: 'paused', paused_node: 'gate-2' }),
            );

            const all = listChains(stateDir);
            expect(all).toHaveLength(3);

            const paused = all.filter((c) => c.status === 'paused');
            expect(paused).toHaveLength(2);

            const wbs1 = listChains(stateDir, 'WBS.1');
            const wbs1Paused = wbs1.filter((c) => c.status === 'paused');
            expect(wbs1Paused).toHaveLength(1);
            expect(wbs1Paused[0].chain_id).toBe('c1');
        } finally {
            closeStore();
        }
    });

    test('full pause-resume-complete lifecycle', () => {
        const stateDir = makeStateDir();
        try {
            const chainId = 'lifecycle-chain';
            const taskWbs = 'WBS.1.2.3';

            // Step 1: Start chain
            const runningState = makeChainState({
                chain_id: chainId,
                task_wbs: taskWbs,
                status: 'running',
                current_node: 'node-1',
                nodes: [
                    makeNodeState({
                        name: 'node-1',
                        status: 'running',
                        maker_status: 'completed',
                        checker_status: 'running',
                    }),
                ],
            });
            saveChain(stateDir, runningState);

            // Step 2: Pause at human gate
            const pausedState = makeChainState({
                chain_id: chainId,
                task_wbs: taskWbs,
                status: 'paused',
                paused_at: '2026-04-13T12:00:00.000Z',
                paused_node: 'node-1',
                nodes: [
                    makeNodeState({
                        name: 'node-1',
                        status: 'running',
                        maker_status: 'completed',
                        checker_status: 'paused',
                        checker_result: 'paused',
                    }),
                ],
            });
            saveChain(stateDir, pausedState);

            // Step 3: Resume with human response
            const resumedState = makeChainState({
                chain_id: chainId,
                task_wbs: taskWbs,
                status: 'running',
                paused_response: 'approve',
                nodes: [
                    makeNodeState({
                        name: 'node-1',
                        status: 'completed',
                        maker_status: 'completed',
                        checker_status: 'completed',
                        checker_result: 'pass',
                    }),
                ],
                updated_at: '2026-04-13T12:05:00.000Z',
            });
            saveChain(stateDir, resumedState);

            // Step 4: Complete
            const completedState = makeChainState({
                chain_id: chainId,
                task_wbs: taskWbs,
                status: 'completed',
                current_node: 'node-1',
                nodes: [
                    makeNodeState({
                        name: 'node-1',
                        status: 'completed',
                        maker_status: 'completed',
                        checker_status: 'completed',
                        checker_result: 'pass',
                        started_at: '2026-04-13T12:00:00.000Z',
                        completed_at: '2026-04-13T12:05:00.000Z',
                    }),
                ],
                updated_at: '2026-04-13T12:05:00.000Z',
            });
            saveChain(stateDir, completedState);

            // Verify final state
            const loaded = loadChain(stateDir, chainId, taskWbs);
            expect(loaded?.status).toBe('completed');
            expect(loaded?.paused_at).toBeUndefined();
            expect(loaded?.paused_node).toBeUndefined();
            expect(loaded?.nodes[0].completed_at).toBe('2026-04-13T12:05:00.000Z');
        } finally {
            closeStore();
        }
    });
});

// ================================================================
// Node with optional fields
// ================================================================

describe('node optional fields', () => {
    test('round-trips node with maker_output and maker_error', () => {
        const stateDir = makeStateDir();
        try {
            const nodes = [
                makeNodeState({
                    name: 'build-node',
                    maker_output: 'Build succeeded with 3 warnings',
                    started_at: '2026-04-13T09:00:00.000Z',
                    completed_at: '2026-04-13T09:01:00.000Z',
                }),
            ];
            const state = makeChainState({ nodes });
            saveChain(stateDir, state);

            const loaded = loadChain(stateDir, state.chain_id, state.task_wbs);
            expect(loaded?.nodes[0].maker_output).toBe('Build succeeded with 3 warnings');
            expect(loaded?.nodes[0].started_at).toBe('2026-04-13T09:00:00.000Z');
            expect(loaded?.nodes[0].completed_at).toBe('2026-04-13T09:01:00.000Z');
        } finally {
            closeStore();
        }
    });

    test('round-trips node with checker_result field', () => {
        const stateDir = makeStateDir();
        try {
            const nodes = [
                makeNodeState({
                    name: 'check-node',
                    checker_result: 'fail',
                }),
            ];
            const state = makeChainState({ nodes });
            saveChain(stateDir, state);

            const loaded = loadChain(stateDir, state.chain_id, state.task_wbs);
            expect(loaded?.nodes[0].checker_result).toBe('fail');
        } finally {
            closeStore();
        }
    });
});
