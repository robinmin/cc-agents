import { describe, test, expect, beforeAll, afterEach, beforeEach } from 'bun:test';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setGlobalSilent } from '../../../scripts/logger';
import { closeStore } from '../scripts/store';

let TEST_DIR = '';
const CLI_PATH = resolve(__dirname, '../scripts/cli.ts');

let chainIdCounter = 0;

beforeAll(() => {
    setGlobalSilent(true);
});

beforeEach(() => {
    TEST_DIR = mkdtempSync(join(tmpdir(), 'verification-cli-'));
});

afterEach(() => {
    closeStore();
    delete process.env.COV_STORE_PATH;
    rmSync(TEST_DIR, { recursive: true, force: true });
    TEST_DIR = '';
});

function nextChainId(): string {
    return `cli-test-${++chainIdCounter}`;
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

interface SpawnResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}

/**
 * Run the CLI as a subprocess so that process.exit() calls are captured
 * rather than killing the test runner. Returns stdout, stderr, and exit code.
 */
async function runCli(args: string[], env?: Record<string, string>): Promise<SpawnResult> {
    const proc = Bun.spawn(['bun', 'run', CLI_PATH, ...args], {
        cwd: TEST_DIR,
        env: { ...process.env, COV_STATE_DIR: TEST_DIR, ...env },
        stdout: 'pipe',
        stderr: 'pipe',
    });

    // Wait for process to finish, then collect output
    const exitCode = await proc.exited;
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    return { stdout, stderr, exitCode };
}

interface CliOutput {
    ok: boolean;
    error?: string;
    details?: string;
    state?: Record<string, unknown> & { nodes: unknown[]; status: string; chain_id: string };
    chains?: Array<Record<string, unknown>>;
    count?: number;
}

/**
 * Parse JSON from CLI stdout. The CLI outputs one JSON blob per line.
 */
function parseJsonOutput(stdout: string): CliOutput {
    const trimmed = stdout.trim();
    if (!trimmed) {
        throw new Error('No JSON found in stdout');
    }
    return JSON.parse(trimmed) as CliOutput;
}

/**
 * Write a minimal valid manifest JSON file and return its path.
 */
function writeManifest(manifest: Record<string, unknown>): string {
    const path = join(TEST_DIR, 'manifest.json');
    writeFileSync(path, JSON.stringify(manifest, null, 2));
    return path;
}

/**
 * Create a minimal single-node manifest object.
 */
function makeManifest(chainId?: string): Record<string, unknown> {
    return {
        chain_id: chainId ?? nextChainId(),
        chain_name: 'CLI Test Chain',
        task_wbs: 'TASK-CLI',
        on_node_fail: 'halt',
        nodes: [
            {
                name: 'node1',
                type: 'single',
                maker: { command: 'echo hello' },
                checker: {
                    method: 'cli',
                    config: { command: 'echo ok', exit_codes: [0] },
                },
            },
        ],
    };
}

// ============================================================
// parseArgs (unit-level via CLI behavior)
// ============================================================
describe('CLI arg parsing', () => {
    test('unknown command returns error and exit 1', async () => {
        const result = await runCli(['bogus-command']);
        expect(result.exitCode).toBe(1);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(false);
        expect(json.error).toContain('Unknown command');
    });

    test('no command returns error and exit 1', async () => {
        const result = await runCli([]);
        expect(result.exitCode).toBe(1);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(false);
        expect(json.error).toContain('Unknown command');
    });
});

// ============================================================
// cov run
// ============================================================
describe('cov run', () => {
    test('valid manifest → chain completes successfully', async () => {
        const manifestPath = writeManifest(makeManifest());
        const result = await runCli(['run', manifestPath]);

        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim().split('\n')).toHaveLength(1);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(true);
        expect(json.state).toBeDefined();
        expect(json.state?.status).toBe('completed');
        expect(json.state?.chain_id).toMatch(/^cli-test-/);
    });

    test('missing manifest path → error', async () => {
        const result = await runCli(['run']);
        expect(result.exitCode).toBe(1);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(false);
        expect(json.error).toContain('Usage: cov run');
    });

    test('non-existent manifest file → error', async () => {
        const result = await runCli(['run', '/no/such/file.json']);
        expect(result.exitCode).toBe(1);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(false);
        expect(json.error).toContain('Failed to read manifest');
    });

    test('invalid JSON in manifest → error', async () => {
        const badPath = join(TEST_DIR, 'bad.json');
        writeFileSync(badPath, '{ not valid json }}}');
        const result = await runCli(['run', badPath]);
        expect(result.exitCode).toBe(1);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(false);
        expect(json.error).toContain('Failed to read manifest');
    });

    test('chain that fails → returns error with exit 1', async () => {
        const manifest = {
            chain_id: nextChainId(),
            chain_name: 'Failing Chain',
            task_wbs: 'TASK-FAIL',
            on_node_fail: 'halt',
            nodes: [
                {
                    name: 'fail-node',
                    type: 'single',
                    maker: { command: 'echo making' },
                    checker: {
                        method: 'cli',
                        config: { command: 'exit 1', exit_codes: [0] },
                    },
                },
            ],
        };
        const manifestPath = writeManifest(manifest);
        const result = await runCli(['run', manifestPath]);
        expect(result.exitCode).toBe(1);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(false);
        expect(json.error).toContain('Chain execution failed');
    });

    test('chain with human checker → pauses and returns paused state', async () => {
        const manifest = {
            chain_id: nextChainId(),
            chain_name: 'Human Gate Chain',
            task_wbs: 'TASK-HUMAN',
            on_node_fail: 'halt',
            nodes: [
                {
                    name: 'human-node',
                    type: 'single',
                    maker: { command: 'echo ready' },
                    checker: {
                        method: 'human',
                        config: { prompt: 'Approve this?' },
                    },
                },
            ],
        };
        const manifestPath = writeManifest(manifest);
        const result = await runCli(['run', manifestPath]);

        expect(result.exitCode).toBe(0);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(true);
        expect(json.state?.status).toBe('paused');
        expect(json.state?.paused_node).toBe('human-node');
    });

    test('relative manifest path is resolved correctly', async () => {
        const subdir = join(TEST_DIR, 'sub');
        mkdirSync(subdir, { recursive: true });
        const manifestPath = join(subdir, 'manifest.json');
        writeFileSync(manifestPath, JSON.stringify(makeManifest(), null, 2));

        const result = await runCli(['run', manifestPath]);
        expect(result.exitCode).toBe(0);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(true);
        expect(json.state?.status).toBe('completed');
    });
});

// ============================================================
// cov resume
// ============================================================
describe('cov resume', () => {
    test('missing chain-id → error', async () => {
        const result = await runCli(['resume']);
        expect(result.exitCode).toBe(1);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(false);
        expect(json.error).toContain('Usage: cov resume');
    });

    test('non-existent chain-id → error', async () => {
        const result = await runCli(['resume', 'non-existent-chain-xyz', '--manifest', '/no/such/manifest.json']);
        expect(result.exitCode).toBe(1);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(false);
        expect(json.error).toContain('Failed to load manifest');
    });

    test('resume a paused chain with --response flag', async () => {
        // First, run a chain that pauses at a human checker
        const chainId = nextChainId();
        const manifest = {
            chain_id: chainId,
            chain_name: 'Resume Test Chain',
            task_wbs: 'TASK-RESUME',
            on_node_fail: 'halt',
            nodes: [
                {
                    name: 'human-approve',
                    type: 'single',
                    maker: { command: 'echo ready' },
                    checker: {
                        method: 'human',
                        config: { prompt: 'Do you approve?' },
                    },
                },
                {
                    name: 'post-approval',
                    type: 'single',
                    maker: { command: 'echo done' },
                    checker: {
                        method: 'cli',
                        config: { command: 'echo ok' },
                    },
                },
            ],
        };

        // Run to create paused state
        const runResult = await runCli(['run', writeManifest(manifest)]);
        expect(runResult.exitCode).toBe(0);
        const runJson = parseJsonOutput(runResult.stdout);
        expect(runJson.state?.status).toBe('paused');

        // Now resume with a response
        const manifestPath = writeManifest(manifest);
        const resumeResult = await runCli(['resume', chainId, '--manifest', manifestPath, '--response', 'approve']);
        expect(resumeResult.exitCode).toBe(0);
        const resumeJson = parseJsonOutput(resumeResult.stdout);
        expect(resumeJson.ok).toBe(true);
        expect(resumeJson.state?.status).toBe('completed');
    });

    test('resume a chain that is not paused → error', async () => {
        // First, run a chain that completes immediately
        const chainId = nextChainId();
        const manifest = makeManifest(chainId);
        const runResult = await runCli(['run', writeManifest(manifest)]);
        expect(runResult.exitCode).toBe(0);

        // Trying to resume a completed chain should fail
        const manifestPath = writeManifest(manifest);
        const resumeResult = await runCli(['resume', chainId, '--manifest', manifestPath]);
        expect(resumeResult.exitCode).toBe(1);
        const json = parseJsonOutput(resumeResult.stdout);
        expect(json.ok).toBe(false);
        expect(json.error).toContain('Resume failed');
    });

    test('resume rejects ambiguous chain_id without --task', async () => {
        const chainId = 'shared-resume-chain';
        const manifestA = makeManifest(chainId);
        const manifestB = makeManifest(chainId);
        manifestA.task_wbs = 'TASK-A';
        manifestB.task_wbs = 'TASK-B';
        manifestA.nodes = [
            {
                name: 'human-a',
                type: 'single',
                maker: { command: 'echo ready-a' },
                checker: { method: 'human', config: { prompt: 'Approve A?' } },
            },
        ];
        manifestB.nodes = [
            {
                name: 'human-b',
                type: 'single',
                maker: { command: 'echo ready-b' },
                checker: { method: 'human', config: { prompt: 'Approve B?' } },
            },
        ];

        await runCli(['run', writeManifest(manifestA)]);
        const manifestBPath = join(TEST_DIR, 'manifest-b.json');
        writeFileSync(manifestBPath, JSON.stringify(manifestB, null, 2));
        await runCli(['run', manifestBPath]);

        const result = await runCli(['resume', chainId]);
        expect(result.exitCode).toBe(1);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(false);
        expect(String(json.details)).toContain('Multiple chains found');
    });

    test('resume uses --task to disambiguate matching chain_id values', async () => {
        const chainId = 'shared-resume-task-chain';
        const manifestA = {
            chain_id: chainId,
            chain_name: 'Shared Resume A',
            task_wbs: 'TASK-A',
            on_node_fail: 'halt',
            nodes: [
                {
                    name: 'human-a',
                    type: 'single',
                    maker: { command: 'echo ready-a' },
                    checker: { method: 'human', config: { prompt: 'Approve A?' } },
                },
                {
                    name: 'done-a',
                    type: 'single',
                    maker: { command: 'echo done-a' },
                    checker: { method: 'cli', config: { command: 'echo ok' } },
                },
            ],
        };
        const manifestB = {
            chain_id: chainId,
            chain_name: 'Shared Resume B',
            task_wbs: 'TASK-B',
            on_node_fail: 'halt',
            nodes: [
                {
                    name: 'human-b',
                    type: 'single',
                    maker: { command: 'echo ready-b' },
                    checker: { method: 'human', config: { prompt: 'Approve B?' } },
                },
            ],
        };

        const manifestAPath = writeManifest(manifestA);
        await runCli(['run', manifestAPath]);
        const manifestBPath = join(TEST_DIR, 'manifest-b.json');
        writeFileSync(manifestBPath, JSON.stringify(manifestB, null, 2));
        await runCli(['run', manifestBPath]);

        const result = await runCli(['resume', chainId, '--task', 'TASK-A', '--response', 'approve']);
        expect(result.exitCode).toBe(0);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(true);
        expect(json.state?.status).toBe('completed');
        expect((json.state as Record<string, unknown>)?.task_wbs).toBe('TASK-A');
    });

    test('resume with --manifest falls back to JSON state when SQLite state is missing', async () => {
        const chainId = nextChainId();
        const manifest = {
            chain_id: chainId,
            chain_name: 'JSON Resume Fallback',
            task_wbs: 'TASK-JSON-RESUME',
            on_node_fail: 'halt',
            nodes: [
                {
                    name: 'human-node',
                    type: 'single',
                    maker: { command: 'echo ready' },
                    checker: { method: 'human', config: { prompt: 'Approve?' } },
                },
                {
                    name: 'post-node',
                    type: 'single',
                    maker: { command: 'echo done' },
                    checker: { method: 'cli', config: { command: 'echo ok' } },
                },
            ],
        };

        const manifestPath = writeManifest(manifest);
        const runResult = await runCli(['run', manifestPath]);
        expect(runResult.exitCode).toBe(0);

        unlinkSync(join(TEST_DIR, 'cov', 'cov-store.db'));

        const resumeResult = await runCli(['resume', chainId, '--manifest', manifestPath, '--response', 'approve']);
        expect(resumeResult.exitCode).toBe(0);
        const json = parseJsonOutput(resumeResult.stdout);
        expect(json.ok).toBe(true);
        expect(json.state?.status).toBe('completed');
    });
});

// ============================================================
// cov show
// ============================================================
describe('cov show', () => {
    test('missing chain-id → error', async () => {
        const result = await runCli(['show']);
        expect(result.exitCode).toBe(1);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(false);
        expect(json.error).toContain('Usage: cov show');
    });

    test('non-existent chain-id → error', async () => {
        const result = await runCli(['show', 'no-such-chain']);
        expect(result.exitCode).toBe(1);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(false);
        expect(json.error).toContain('No chain found');
    });

    test('show existing chain → returns state', async () => {
        // First create a chain
        const chainId = nextChainId();
        const manifest = makeManifest(chainId);
        const runResult = await runCli(['run', writeManifest(manifest)]);
        expect(runResult.exitCode).toBe(0);

        // Now show it
        const showResult = await runCli(['show', chainId]);
        expect(showResult.exitCode).toBe(0);
        const json = parseJsonOutput(showResult.stdout);
        expect(json.ok).toBe(true);
        expect(json.state).toBeDefined();
        expect(json.state?.chain_id).toBe(chainId);
        expect(json.state?.status).toBe('completed');
        expect(json.state?.chain_name).toBe('CLI Test Chain');
    });

    test('show preserves node execution details', async () => {
        const chainId = nextChainId();
        const manifest = makeManifest(chainId);
        await runCli(['run', writeManifest(manifest)]);

        const showResult = await runCli(['show', chainId]);
        const json = parseJsonOutput(showResult.stdout);
        expect(json.state?.nodes).toBeDefined();
        expect(json.state?.nodes.length).toBe(1);
        expect((json.state?.nodes as Record<string, unknown>[])[0].name).toBe('node1');
        expect((json.state?.nodes as Record<string, unknown>[])[0].status).toBe('completed');
    });

    test('inspect alias returns the same chain state payload', async () => {
        const chainId = nextChainId();
        const manifest = makeManifest(chainId);
        await runCli(['run', writeManifest(manifest)]);

        const result = await runCli(['inspect', chainId]);
        expect(result.exitCode).toBe(0);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(true);
        expect(json.state?.chain_id).toBe(chainId);
        expect(json.state?.status).toBe('completed');
    });

    test('show rejects ambiguous chain_id without --task', async () => {
        const chainId = 'shared-show-chain';
        const manifestA = makeManifest(chainId);
        const manifestB = makeManifest(chainId);
        manifestA.task_wbs = 'TASK-A';
        manifestB.task_wbs = 'TASK-B';

        await runCli(['run', writeManifest(manifestA)]);
        const manifestBPath = join(TEST_DIR, 'show-b.json');
        writeFileSync(manifestBPath, JSON.stringify(manifestB, null, 2));
        await runCli(['run', manifestBPath]);

        const result = await runCli(['show', chainId]);
        expect(result.exitCode).toBe(1);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(false);
        expect(String(json.details)).toContain('Multiple chains found');
    });

    test('show uses --task to disambiguate matching chain_id values', async () => {
        const chainId = 'shared-show-task-chain';
        const manifestA = makeManifest(chainId);
        const manifestB = makeManifest(chainId);
        manifestA.task_wbs = 'TASK-A';
        manifestB.task_wbs = 'TASK-B';

        await runCli(['run', writeManifest(manifestA)]);
        const manifestBPath = join(TEST_DIR, 'show-task-b.json');
        writeFileSync(manifestBPath, JSON.stringify(manifestB, null, 2));
        await runCli(['run', manifestBPath]);

        const result = await runCli(['show', chainId, '--task', 'TASK-A']);
        expect(result.exitCode).toBe(0);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(true);
        expect((json.state as Record<string, unknown>)?.task_wbs).toBe('TASK-A');
    });

    test('show falls back to JSON state when SQLite state is missing', async () => {
        const chainId = nextChainId();
        const manifest = makeManifest(chainId);
        const runResult = await runCli(['run', writeManifest(manifest)]);
        expect(runResult.exitCode).toBe(0);

        unlinkSync(join(TEST_DIR, 'cov', 'cov-store.db'));

        const showResult = await runCli(['show', chainId, '--task', 'TASK-CLI']);
        expect(showResult.exitCode).toBe(0);
        const json = parseJsonOutput(showResult.stdout);
        expect(json.ok).toBe(true);
        expect(json.state?.chain_id).toBe(chainId);
    });

    test('show ignores unrelated malformed legacy JSON files', async () => {
        const chainId = nextChainId();
        const manifest = makeManifest(chainId);
        await runCli(['run', writeManifest(manifest)]);
        writeFileSync(join(TEST_DIR, 'cov', 'broken-task-cov-state.json'), '{not-json');

        const showResult = await runCli(['show', chainId, '--task', 'TASK-CLI']);
        expect(showResult.exitCode).toBe(0);
        const json = parseJsonOutput(showResult.stdout);
        expect(json.ok).toBe(true);
        expect(json.state?.chain_id).toBe(chainId);
    });

    test('show prefers the freshest state when JSON is newer than SQLite', async () => {
        const chainId = nextChainId();
        const manifest = makeManifest(chainId);
        await runCli(['run', writeManifest(manifest)]);

        const statePath = join(TEST_DIR, 'cov', `${chainId}-TASK-CLI-cov-state.json`);
        const state = JSON.parse(readFileSync(statePath, 'utf-8')) as Record<string, unknown>;
        state.status = 'paused';
        state.current_node = 'node1';
        state.updated_at = '9999-12-31T23:59:59.999Z';
        writeFileSync(statePath, JSON.stringify(state, null, 2));

        const showResult = await runCli(['show', chainId, '--task', 'TASK-CLI']);
        expect(showResult.exitCode).toBe(0);
        const json = parseJsonOutput(showResult.stdout);
        expect(json.ok).toBe(true);
        expect(json.state?.status).toBe('paused');
        expect((json.state as Record<string, unknown>)?.current_node).toBe('node1');
    });
});

// ============================================================
// cov list
// ============================================================
describe('cov list', () => {
    test('empty state dir → returns empty list', async () => {
        const result = await runCli(['list']);
        expect(result.exitCode).toBe(0);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(true);
        expect(json.chains).toEqual([]);
        expect(json.count).toBe(0);
    });

    test('after running chains → lists them', async () => {
        const id1 = nextChainId();
        const id2 = nextChainId();

        await runCli(['run', writeManifest(makeManifest(id1))]);
        await runCli(['run', writeManifest(makeManifest(id2))]);

        const result = await runCli(['list']);
        expect(result.exitCode).toBe(0);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(true);
        expect(json.count).toBe(2);
        expect(json.chains?.map((c: Record<string, unknown>) => c.chain_id)).toContain(id1);
        expect(json.chains?.map((c: Record<string, unknown>) => c.chain_id)).toContain(id2);
    });

    test('list summary includes expected fields', async () => {
        const chainId = nextChainId();
        await runCli(['run', writeManifest(makeManifest(chainId))]);

        const result = await runCli(['list']);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(true);
        expect(json.count).toBe(1);

        const chain = json.chains?.[0];
        expect(chain).toBeDefined();
        if (!chain) return;
        expect(chain.chain_id).toBe(chainId);
        expect(chain.chain_name).toBe('CLI Test Chain');
        expect(chain.task_wbs).toBe('TASK-CLI');
        expect(chain.status).toBe('completed');
        expect(chain.current_node).toBeDefined();
        expect(chain.updated_at).toBeDefined();
    });

    test('results alias returns the same chain summary payload as list', async () => {
        const chainId = nextChainId();
        await runCli(['run', writeManifest(makeManifest(chainId))]);

        const result = await runCli(['results']);
        expect(result.exitCode).toBe(0);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(true);
        expect(json.count).toBe(1);
        expect(json.chains?.[0].chain_id).toBe(chainId);
    });

    test('--task filter returns only matching chains', async () => {
        const id1 = nextChainId();
        const id2 = nextChainId();

        // Create manifest with a different task_wbs
        const manifestA = makeManifest(id1);
        const manifestB = makeManifest(id2);
        manifestB.task_wbs = 'TASK-OTHER';

        await runCli(['run', writeManifest(manifestA)]);
        await runCli(['run', writeManifest(manifestB)]);

        // Filter by TASK-CLI
        const resultA = await runCli(['list', '--task', 'TASK-CLI']);
        const jsonA = parseJsonOutput(resultA.stdout);
        expect(jsonA.ok).toBe(true);
        expect(jsonA.count).toBe(1);
        expect(jsonA.chains?.[0].chain_id).toBe(id1);

        // Filter by TASK-OTHER
        const resultB = await runCli(['list', '--task', 'TASK-OTHER']);
        const jsonB = parseJsonOutput(resultB.stdout);
        expect(jsonB.ok).toBe(true);
        expect(jsonB.count).toBe(1);
        expect(jsonB.chains?.[0].chain_id).toBe(id2);

        // No filter → both
        const resultAll = await runCli(['list']);
        const jsonAll = parseJsonOutput(resultAll.stdout);
        expect(jsonAll.count).toBe(2);
    });

    test('--task with no matches returns empty list', async () => {
        const chainId = nextChainId();
        await runCli(['run', writeManifest(makeManifest(chainId))]);

        const result = await runCli(['list', '--task', 'NONEXISTENT-TASK']);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(true);
        expect(json.count).toBe(0);
        expect(json.chains).toEqual([]);
    });

    test('falls back to JSON state files when the default SQLite store has no data', async () => {
        const chainId = nextChainId();
        const runResult = await runCli(['run', writeManifest(makeManifest(chainId))]);
        expect(runResult.exitCode).toBe(0);

        unlinkSync(join(TEST_DIR, 'cov', 'cov-store.db'));

        const result = await runCli(['list']);
        expect(result.exitCode).toBe(0);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(true);
        expect(json.count).toBe(1);
        expect(json.chains?.[0].chain_id).toBe(chainId);
    });

    test('list ignores malformed legacy JSON files', async () => {
        const chainId = nextChainId();
        const runResult = await runCli(['run', writeManifest(makeManifest(chainId))]);
        expect(runResult.exitCode).toBe(0);
        unlinkSync(join(TEST_DIR, 'cov', 'cov-store.db'));
        writeFileSync(join(TEST_DIR, 'cov', 'broken-task-cov-state.json'), '{not-json');

        const result = await runCli(['list']);
        expect(result.exitCode).toBe(0);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(true);
        expect(json.count).toBe(1);
        expect(json.chains?.[0].chain_id).toBe(chainId);
    });

    test('fails loudly when the configured store cannot be opened', async () => {
        const result = await runCli(['list'], { COV_STORE_PATH: TEST_DIR });
        expect(result.exitCode).toBe(1);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(false);
        expect(json.error).toBe('List failed');
        expect(String(json.details)).toContain('Failed to open chain store');
    });
});

// ============================================================
// JSON output format
// ============================================================
describe('JSON output format', () => {
    test('stdout is JSON-only for successful commands', async () => {
        const manifestPath = writeManifest(makeManifest());
        const result = await runCli(['run', manifestPath]);

        expect(result.exitCode).toBe(0);
        expect(() => JSON.parse(result.stdout.trim())).not.toThrow();
        expect(result.stdout.trim().split('\n')).toHaveLength(1);
    });

    test('success output has ok=true and state field', async () => {
        const manifestPath = writeManifest(makeManifest());
        const result = await runCli(['run', manifestPath]);
        expect(result.exitCode).toBe(0);

        const json = parseJsonOutput(result.stdout);
        expect(json).toHaveProperty('ok', true);
        expect(json).toHaveProperty('state');
        expect(json.state).toHaveProperty('chain_id');
        expect(json.state).toHaveProperty('status');
        expect(json.state).toHaveProperty('nodes');
        expect(json.state).toHaveProperty('created_at');
        expect(json.state).toHaveProperty('updated_at');
    });

    test('error output has ok=false and error field', async () => {
        const result = await runCli(['run']);
        expect(result.exitCode).toBe(1);

        const json = parseJsonOutput(result.stdout);
        expect(json).toHaveProperty('ok', false);
        expect(json).toHaveProperty('error');
        expect(typeof json.error).toBe('string');
    });

    test('error output includes details when available', async () => {
        const result = await runCli(['run', '/no/such/file.json']);
        expect(result.exitCode).toBe(1);

        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(false);
        expect(json.details).toBeDefined();
    });
});

// ============================================================
// Multi-node chain via CLI
// ============================================================
describe('multi-node chain via CLI', () => {
    test('sequential nodes all pass → completed', async () => {
        const manifest = {
            chain_id: nextChainId(),
            chain_name: 'Multi Node CLI',
            task_wbs: 'TASK-MULTI',
            on_node_fail: 'halt',
            nodes: [
                {
                    name: 'step1',
                    type: 'single',
                    maker: { command: 'echo step1' },
                    checker: {
                        method: 'cli',
                        config: { command: 'echo ok' },
                    },
                },
                {
                    name: 'step2',
                    type: 'single',
                    maker: { command: 'echo step2' },
                    checker: {
                        method: 'cli',
                        config: { command: 'echo ok' },
                    },
                },
            ],
        };

        const result = await runCli(['run', writeManifest(manifest)]);
        expect(result.exitCode).toBe(0);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(true);
        expect(json.state?.status).toBe('completed');
        expect((json.state?.nodes as unknown[]).length).toBe(2);
        expect((json.state?.nodes as Record<string, unknown>[]).every((n) => n.status === 'completed')).toBe(true);
    });

    test('halt on first failure → stops chain', async () => {
        const manifest = {
            chain_id: nextChainId(),
            chain_name: 'Halt On Fail',
            task_wbs: 'TASK-HALT',
            on_node_fail: 'halt',
            nodes: [
                {
                    name: 'bad-node',
                    type: 'single',
                    maker: { command: 'echo fail-maker' },
                    checker: {
                        method: 'cli',
                        config: { command: 'exit 1', exit_codes: [0] },
                    },
                },
                {
                    name: 'should-not-run',
                    type: 'single',
                    maker: { command: 'echo should-not-run' },
                    checker: {
                        method: 'cli',
                        config: { command: 'echo ok' },
                    },
                },
            ],
        };

        const result = await runCli(['run', writeManifest(manifest)]);
        expect(result.exitCode).toBe(1);
        const json = parseJsonOutput(result.stdout);
        expect(json.ok).toBe(false);
    });
});

// ============================================================
// Environment variable handling
// ============================================================
describe('COV_STATE_DIR env var', () => {
    test('uses COV_STATE_DIR for state storage', async () => {
        const customDir = mkdtempSync(join(tmpdir(), 'verification-cli-env-'));
        try {
            const chainId = nextChainId();
            const manifest = makeManifest(chainId);
            const manifestPath = join(customDir, 'manifest.json');
            writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

            const result = await runCli(['run', manifestPath], { COV_STATE_DIR: customDir });
            expect(result.exitCode).toBe(0);
            const json = parseJsonOutput(result.stdout);
            expect(json.ok).toBe(true);
            expect(json.state?.status).toBe('completed');
        } finally {
            rmSync(customDir, { recursive: true, force: true });
        }
    });
});

describe('COV_STORE_PATH env var', () => {
    test('uses COV_STORE_PATH for SQLite storage', async () => {
        const customDir = mkdtempSync(join(tmpdir(), 'verification-cli-store-'));
        try {
            const chainId = nextChainId();
            const manifest = makeManifest(chainId);
            const manifestPath = join(customDir, 'manifest.json');
            const storePath = join('shared', 'cov.sqlite');
            writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

            const result = await runCli(['run', manifestPath], {
                COV_STATE_DIR: customDir,
                COV_STORE_PATH: storePath,
            });

            expect(result.exitCode).toBe(0);
            const json = parseJsonOutput(result.stdout);
            expect(json.ok).toBe(true);
            expect(existsSync(join(customDir, storePath))).toBe(true);
        } finally {
            rmSync(customDir, { recursive: true, force: true });
        }
    });

    test('run fails when the configured SQLite store path cannot be opened', async () => {
        const customDir = mkdtempSync(join(tmpdir(), 'verification-cli-store-fail-'));
        try {
            const manifestPath = join(customDir, 'manifest.json');
            const manifest = makeManifest(nextChainId());
            writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

            const result = await runCli(['run', manifestPath], {
                COV_STATE_DIR: customDir,
                COV_STORE_PATH: customDir,
            });

            expect(result.exitCode).toBe(1);
            const json = parseJsonOutput(result.stdout);
            expect(json.ok).toBe(false);
            expect(json.error).toContain('Chain execution failed');
            expect(String(json.details)).toContain('Failed to open chain store');
        } finally {
            rmSync(customDir, { recursive: true, force: true });
        }
    });
});
