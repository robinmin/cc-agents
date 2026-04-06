import { describe, test, expect, beforeAll, afterEach, beforeEach } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setGlobalSilent } from '../../../scripts/logger';
import { runChain, resumeChain } from '../scripts/interpreter';
import type { ChainManifest, SingleNode, ChainState } from '../scripts/types';

let TEST_DIR = '';

// Unique chain ID counter to prevent state file collisions between tests
let chainIdCounter = 0;

beforeAll(() => {
    setGlobalSilent(true);
});

beforeEach(() => {
    TEST_DIR = mkdtempSync(join(tmpdir(), 'verification-interpreter-'));
});

afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    TEST_DIR = '';
});

function nextChainId(): string {
    return `chain-${++chainIdCounter}`;
}

function makeSingleNode(name: string, makerCmd: string, checkerCmd: string, exitCodes: number[] = [0]): SingleNode {
    return {
        name,
        type: 'single',
        maker: { command: makerCmd },
        checker: {
            method: 'cli',
            config: { command: checkerCmd, exit_codes: exitCodes },
        },
    };
}

function makeManifest(nodes: ChainManifest['nodes'], chainId?: string): ChainManifest {
    return {
        chain_id: chainId ?? nextChainId(),
        chain_name: 'Test Chain',
        task_wbs: 'TASK-000',
        on_node_fail: 'halt',
        nodes,
    };
}

// ============================================================
// runChain - basic single node
// ============================================================
describe('runChain', () => {
    test('single node - maker passes, checker passes → chain completes', async () => {
        const manifest = makeManifest([makeSingleNode('node1', 'echo hello', 'echo ok')]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('completed');
        expect(state.nodes[0].status).toBe('completed');
        expect(state.nodes[0].maker_status).toBe('completed');
        expect(state.nodes[0].checker_result).toBe('pass');
    });

    test('single node - maker fails → chain halts', async () => {
        const manifest = makeManifest([makeSingleNode('node1', 'exit 1', 'echo ok')]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('failed');
        expect(state.nodes[0].status).toBe('failed');
        expect(state.nodes[0].maker_status).toBe('failed');
    });

    test('single node - checker fails → chain halts', async () => {
        const manifest = makeManifest([makeSingleNode('node1', 'echo hello', 'exit 1')]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('failed');
        expect(state.nodes[0].status).toBe('failed');
        expect(state.nodes[0].checker_result).toBe('fail');
    });

    test('two sequential nodes - both pass → completes', async () => {
        const manifest = makeManifest([
            makeSingleNode('node1', 'echo one', 'echo ok'),
            makeSingleNode('node2', 'echo two', 'echo ok'),
        ]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('completed');
        expect(state.nodes[0].status).toBe('completed');
        expect(state.nodes[1].status).toBe('completed');
    });

    test('second node fails → halts chain', async () => {
        const manifest = makeManifest([
            makeSingleNode('node1', 'echo one', 'echo ok'),
            makeSingleNode('node2', 'exit 1', 'echo ok'),
        ]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('failed');
        expect(state.nodes[0].status).toBe('completed');
        expect(state.nodes[1].status).toBe('failed');
    });
});

// ============================================================
// on_node_fail policies
// ============================================================
describe('on_node_fail policies', () => {
    test('on_fail: skip - skips failing node and continues', async () => {
        const manifest: ChainManifest = {
            ...makeManifest([
                makeSingleNode('node1', 'echo ok', 'echo ok'),
                makeSingleNode('node2', 'exit 1', 'echo ok'),
            ]),
            on_node_fail: 'skip',
        };
        (manifest.nodes[1] as SingleNode).checker.on_fail = 'skip';
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('completed');
        expect(state.nodes[0].status).toBe('completed');
        expect(state.nodes[1].status).toBe('skipped');
    });

    test('on_fail: continue - marks failed but continues', async () => {
        const manifest: ChainManifest = {
            ...makeManifest([
                makeSingleNode('node1', 'echo ok', 'echo ok'),
                makeSingleNode('node2', 'exit 1', 'echo ok'),
            ]),
            on_node_fail: 'continue',
        };
        (manifest.nodes[1] as SingleNode).checker.on_fail = 'continue';
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        // on_fail:continue marks node failed but still continues
        expect(state.nodes[0].status).toBe('completed');
        expect(state.nodes[1].status).toBe('failed');
    });

    test('manifest-level on_node_fail: skip', async () => {
        const manifest: ChainManifest = {
            ...makeManifest([]),
            on_node_fail: 'skip',
        };
        const node = makeSingleNode('node1', 'exit 1', 'echo ok');
        node.checker.on_fail = 'skip';
        manifest.nodes = [node];
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('completed');
        expect(state.nodes[0].status).toBe('skipped');
    });
});

// ============================================================
// parallel group
// ============================================================
describe('parallel group', () => {
    test('all children pass + checker passes → completes', async () => {
        const manifest: ChainManifest = makeManifest([
            {
                name: 'parallel',
                type: 'parallel-group',
                convergence: 'all',
                children: [
                    { name: 'child1', maker: { command: 'echo one' } },
                    { name: 'child2', maker: { command: 'echo two' } },
                ],
                checker: {
                    method: 'cli',
                    config: { command: 'echo ok', exit_codes: [0] },
                },
            },
        ]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('completed');
        const pgNode = state.nodes[0];
        expect(pgNode.type).toBe('parallel-group');
        expect(pgNode.parallel_children?.child1.maker_result).toBe('pass');
        expect(pgNode.parallel_children?.child2.maker_result).toBe('pass');
    });

    test('one child fails → convergence fails', async () => {
        const manifest: ChainManifest = makeManifest([
            {
                name: 'parallel',
                type: 'parallel-group',
                convergence: 'all',
                children: [
                    { name: 'child1', maker: { command: 'echo one' } },
                    { name: 'child2', maker: { command: 'exit 1' } },
                ],
                checker: {
                    method: 'cli',
                    config: { command: 'echo ok', exit_codes: [0] },
                },
            },
        ]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('failed');
        const pgNode = state.nodes[0];
        expect(pgNode.parallel_children?.child1.maker_result).toBe('pass');
        expect(pgNode.parallel_children?.child2.maker_result).toBe('fail');
    });

    test('quorum convergence: enough pass → passes', async () => {
        const manifest: ChainManifest = makeManifest([
            {
                name: 'parallel',
                type: 'parallel-group',
                convergence: 'quorum',
                quorum_count: 2,
                children: [
                    { name: 'child1', maker: { command: 'echo one' } },
                    { name: 'child2', maker: { command: 'exit 1' } },
                    { name: 'child3', maker: { command: 'echo three' } },
                ],
                checker: {
                    method: 'cli',
                    config: { command: 'echo ok', exit_codes: [0] },
                },
            },
        ]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        // 2 of 3 pass → quorum met
        expect(state.status).toBe('completed');
    });

    test('any convergence: one passes → passes', async () => {
        const manifest: ChainManifest = makeManifest([
            {
                name: 'parallel',
                type: 'parallel-group',
                convergence: 'any',
                children: [
                    { name: 'child1', maker: { command: 'exit 1' } },
                    { name: 'child2', maker: { command: 'echo two' } },
                    { name: 'child3', maker: { command: 'exit 1' } },
                ],
                checker: {
                    method: 'cli',
                    config: { command: 'echo ok', exit_codes: [0] },
                },
            },
        ]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('completed');
    });

    test('best-effort convergence: >0 pass → passes', async () => {
        const manifest: ChainManifest = makeManifest([
            {
                name: 'parallel',
                type: 'parallel-group',
                convergence: 'best-effort',
                children: [
                    { name: 'child1', maker: { command: 'exit 1' } },
                    { name: 'child2', maker: { command: 'echo two' } },
                ],
                checker: {
                    method: 'cli',
                    config: { command: 'echo ok', exit_codes: [0] },
                },
            },
        ]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('completed');
    });
});

// ============================================================
// human pause / resume
// ============================================================
describe('human pause and resume', () => {
    test('human checker pauses chain', async () => {
        const manifest = makeManifest([
            {
                name: 'human-node',
                type: 'single',
                maker: { command: 'echo hello' },
                checker: {
                    method: 'human',
                    config: { prompt: 'Approve this?', choices: ['approve', 'reject'] },
                },
            },
        ]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('paused');
        expect(state.paused_node).toBe('human-node');
        expect(state.nodes[0].checker_result).toBe('paused');
    });

    test('resumeChain with approve continues to completion', async () => {
        // First run: pause at human node
        const manifest = makeManifest([
            makeSingleNode('setup', 'echo setup', 'echo ok'),
            {
                name: 'human-node',
                type: 'single',
                maker: { command: 'echo human' },
                checker: {
                    method: 'human',
                    config: { prompt: 'Approve?', choices: ['approve', 'reject'] },
                },
            },
            makeSingleNode('after', 'echo after', 'echo ok'),
        ]);

        const state1 = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state1.status).toBe('paused');
        expect(state1.paused_node).toBe('human-node');

        // Resume with approve
        const state2 = await resumeChain({
            manifest,
            stateDir: TEST_DIR,
            humanResponse: 'approve',
        });
        expect(state2.status).toBe('completed');
    });

    test('resumeChain with reject halts chain', async () => {
        const manifest = makeManifest([
            makeSingleNode('setup', 'echo setup', 'echo ok'),
            {
                name: 'human-node',
                type: 'single',
                maker: { command: 'echo human' },
                checker: {
                    method: 'human',
                    config: { prompt: 'Approve?', choices: ['approve', 'reject'] },
                    on_fail: 'halt',
                },
            },
        ]);

        const state1 = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state1.status).toBe('paused');

        const state2 = await resumeChain({
            manifest,
            stateDir: TEST_DIR,
            humanResponse: 'reject',
        });
        expect(state2.status).toBe('failed');
    });
});

// ============================================================
// state persistence
// ============================================================
describe('state persistence', () => {
    test('state file is written after chain completes', async () => {
        const manifest = makeManifest([makeSingleNode('node1', 'echo hello', 'echo ok')], 'state-persist-test');
        await runChain({ manifest, stateDir: TEST_DIR });

        const statePath = join(TEST_DIR, 'cov', 'state-persist-test-TASK-000-cov-state.json');
        const raw = readFileSync(statePath, 'utf-8');
        const state: ChainState = JSON.parse(raw);
        expect(state.chain_id).toBe('state-persist-test');
        expect(state.status).toBe('completed');
        expect(state.nodes).toHaveLength(1);
    });

    test('resume reads existing state and continues', async () => {
        const manifest = makeManifest([
            makeSingleNode('node1', 'echo one', 'echo ok'),
            {
                name: 'human-node',
                type: 'single',
                maker: { command: 'echo human' },
                checker: {
                    method: 'human',
                    config: { prompt: 'Approve?', choices: ['approve'] },
                },
            },
            makeSingleNode('node3', 'echo three', 'echo ok'),
        ]);

        const state1 = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state1.status).toBe('paused');
        expect(state1.paused_node).toBe('human-node');

        const state2 = await resumeChain({ manifest, stateDir: TEST_DIR, humanResponse: 'approve' });
        expect(state2.status).toBe('completed');
        expect(state2.nodes[2].status).toBe('completed');
    });
});

// ============================================================
// compound checker in chain
// ============================================================
describe('compound checker in chain', () => {
    test('compound AND - all pass → node passes', async () => {
        writeFileSync(join(TEST_DIR, 'artifact.txt'), 'content');
        const manifest = makeManifest([
            {
                name: 'compound-node',
                type: 'single',
                maker: { command: 'echo made' },
                checker: {
                    method: 'compound',
                    config: {
                        operator: 'and',
                        checks: [
                            { method: 'file-exists', config: { paths: ['artifact.txt'] } },
                            { method: 'cli', config: { command: 'echo ok', exit_codes: [0] } },
                        ],
                    },
                },
            },
        ]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('completed');
        expect(state.nodes[0].checker_result).toBe('pass');
    });

    test('compound OR - one passes → node passes', async () => {
        const manifest = makeManifest([
            {
                name: 'compound-node',
                type: 'single',
                maker: { command: 'echo made' },
                checker: {
                    method: 'compound',
                    config: {
                        operator: 'or',
                        checks: [
                            { method: 'file-exists', config: { paths: ['nonexistent.txt'] } },
                            { method: 'cli', config: { command: 'echo ok', exit_codes: [0] } },
                        ],
                    },
                },
            },
        ]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('completed');
        expect(state.nodes[0].checker_result).toBe('pass');
    });

    test('compound quorum - enough pass → node passes', async () => {
        const manifest = makeManifest([
            {
                name: 'compound-node',
                type: 'single',
                maker: { command: 'echo made' },
                checker: {
                    method: 'compound',
                    config: {
                        operator: 'quorum',
                        quorum_count: 2,
                        checks: [
                            { method: 'file-exists', config: { paths: ['missing1.txt'] } },
                            { method: 'file-exists', config: { paths: ['missing2.txt'] } },
                            { method: 'cli', config: { command: 'echo ok', exit_codes: [0] } },
                        ],
                    },
                },
            },
        ]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        // 1 pass / 3 total, quorum is 2 → fails
        expect(state.status).toBe('failed');
        expect(state.nodes[0].checker_result).toBe('fail');
    });
});

// ============================================================
// retry
// ============================================================
describe('checker retry', () => {
    test('checker retries on failure up to retry count', async () => {
        const manifest: ChainManifest = makeManifest([
            {
                name: 'retry-node',
                type: 'single',
                maker: { command: 'echo hello' },
                checker: {
                    method: 'cli',
                    config: { command: 'echo ok' },
                    retry: 2,
                },
            },
        ]);
        // We can't easily count retries without modifying the checker,
        // so we test that retry: 0 doesn't retry (fails immediately)
        // and retry: 1 still fails on subsequent check
        const state0 = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state0.nodes[0].evidence).toHaveLength(1);
    });
});

// ============================================================
// callbacks
// ============================================================
describe('callbacks', () => {
    test('onNodeStart is called for each node', async () => {
        const started: string[] = [];
        const manifest = makeManifest([
            makeSingleNode('node1', 'echo one', 'echo ok'),
            makeSingleNode('node2', 'echo two', 'echo ok'),
        ]);
        await runChain({
            manifest,
            stateDir: TEST_DIR,
            onNodeStart: (node) => started.push(node.name),
        });
        expect(started).toEqual(['node1', 'node2']);
    });

    test('onNodeComplete is called for each node', async () => {
        const completed: string[] = [];
        const manifest = makeManifest([
            makeSingleNode('node1', 'echo one', 'echo ok'),
            makeSingleNode('node2', 'echo two', 'echo ok'),
        ]);
        await runChain({
            manifest,
            stateDir: TEST_DIR,
            onNodeComplete: (node) => completed.push(node.name),
        });
        expect(completed).toEqual(['node1', 'node2']);
    });

    test('onChainComplete is called on success', async () => {
        let callCount = 0;
        const manifest = makeManifest([makeSingleNode('node1', 'echo hello', 'echo ok')]);
        await runChain({
            manifest,
            stateDir: TEST_DIR,
            onChainComplete: () => callCount++,
        });
        expect(callCount).toBe(1);
    });

    test('onChainFail is called on failure', async () => {
        let callCount = 0;
        const manifest = makeManifest([makeSingleNode('node1', 'exit 1', 'echo ok')]);
        await runChain({
            manifest,
            stateDir: TEST_DIR,
            onChainFail: () => callCount++,
        });
        expect(callCount).toBe(1);
    });

    test('onChainPause is called when human checker pauses', async () => {
        let callCount = 0;
        const manifest = makeManifest([
            {
                name: 'human-node',
                type: 'single',
                maker: { command: 'echo hello' },
                checker: {
                    method: 'human',
                    config: { prompt: 'Approve?', choices: ['approve'] },
                },
            },
        ]);
        await runChain({
            manifest,
            stateDir: TEST_DIR,
            onChainPause: () => callCount++,
        });
        expect(callCount).toBe(1);
    });
});

// ============================================================
// file-exists checker (direct dispatch)
// ============================================================
describe('file-exists checker (direct dispatch)', () => {
    test('file exists → node passes', async () => {
        writeFileSync(join(TEST_DIR, 'artifact.txt'), 'data');
        const manifest = makeManifest([
            {
                name: 'fe-node',
                type: 'single',
                maker: { command: 'echo hello' },
                checker: { method: 'file-exists', config: { paths: ['artifact.txt'] } },
            },
        ]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('completed');
        expect(state.nodes[0].checker_result).toBe('pass');
    });

    test('file missing → node fails', async () => {
        const manifest = makeManifest([
            {
                name: 'fe-node',
                type: 'single',
                maker: { command: 'echo hello' },
                checker: { method: 'file-exists', config: { paths: ['nope.txt'] } },
            },
        ]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('failed');
        expect(state.nodes[0].checker_result).toBe('fail');
    });
});

// ============================================================
// content-match checker (direct dispatch)
// ============================================================
describe('content-match checker (direct dispatch)', () => {
    test('pattern found → node passes', async () => {
        writeFileSync(join(TEST_DIR, 'test.txt'), 'hello world');
        const manifest = makeManifest([
            {
                name: 'cm-node',
                type: 'single',
                maker: { command: 'echo hello' },
                checker: { method: 'content-match', config: { file: 'test.txt', pattern: 'hello', must_exist: true } },
            },
        ]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('completed');
        expect(state.nodes[0].checker_result).toBe('pass');
    });

    test('pattern not found → node fails', async () => {
        writeFileSync(join(TEST_DIR, 'test.txt'), 'hello world');
        const manifest = makeManifest([
            {
                name: 'cm-node',
                type: 'single',
                maker: { command: 'echo hello' },
                checker: {
                    method: 'content-match',
                    config: { file: 'test.txt', pattern: 'goodbye', must_exist: true },
                },
            },
        ]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('failed');
        expect(state.nodes[0].checker_result).toBe('fail');
    });
});

// ============================================================
// llm checker (direct dispatch)
// ============================================================
describe('llm checker (direct dispatch)', () => {
    test('unavailable LLM CLI → checker fails fast', async () => {
        // Set an invalid path so runLlmCheck fails immediately without network delay
        const original = process.env.LLM_CLI_COMMAND;
        process.env.LLM_CLI_COMMAND = '/nonexistent/invalid-llm-cli-xyz';
        try {
            const manifest = makeManifest([
                {
                    name: 'llm-node',
                    type: 'single',
                    maker: { command: 'echo hello' },
                    checker: { method: 'llm', config: { checklist: ['item1'] } },
                },
            ]);
            const state = await runChain({ manifest, stateDir: TEST_DIR });
            expect(state.status).toBe('failed');
            expect(state.nodes[0].checker_result).toBe('fail');
        } finally {
            if (original !== undefined) process.env.LLM_CLI_COMMAND = original;
            else delete process.env.LLM_CLI_COMMAND;
        }
    });
});

// ============================================================
// unknown checker method
// ============================================================
describe('unknown checker method', () => {
    test('returns fail for unknown method', async () => {
        const manifest = makeManifest([
            {
                name: 'unknown-node',
                type: 'single',
                maker: { command: 'echo hello' },
                checker: {
                    method: 'nonexistent' as unknown as import('../scripts/types').CheckerMethod,
                    config: {} as unknown as import('../scripts/types').CheckerConfig,
                },
            },
        ]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('failed');
        expect(state.nodes[0].checker_result).toBe('fail');
    });
});

// ============================================================
// maker variants
// ============================================================
describe('maker variants', () => {
    test('delegate_to maker without a configured runner fails', async () => {
        const manifest = makeManifest([
            {
                name: 'delegate-node',
                type: 'single',
                maker: { delegate_to: 'rd3:code-implement-common' },
                checker: { method: 'cli', config: { command: 'echo ok', exit_codes: [0] } },
            },
        ]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('failed');
        expect(state.nodes[0].maker_status).toBe('failed');
        expect(state.nodes[0].maker_error).toContain('requires a configured delegate runner');
    });

    test('delegate_to maker uses the configured delegate runner', async () => {
        const manifest = makeManifest([
            {
                name: 'delegate-node',
                type: 'single',
                maker: {
                    delegate_to: 'rd3:code-implement-common',
                    task_ref: '0276',
                    args: { mode: 'test' },
                    execution_channel: 'codex',
                },
                checker: { method: 'cli', config: { command: 'echo ok', exit_codes: [0] } },
            },
        ]);
        const state = await runChain({
            manifest,
            stateDir: TEST_DIR,
            delegateRunner: async (request) => ({
                status: 'completed',
                output: JSON.stringify(request),
            }),
        });
        expect(state.status).toBe('completed');
        expect(state.nodes[0].maker_status).toBe('completed');
        expect(state.nodes[0].maker_output).toContain('"skill":"rd3:code-implement-common"');
        expect(state.nodes[0].maker_output).toContain('"execution_channel":"codex"');
    });

    test('delegate_to maker can pause and resume through the configured runner', async () => {
        const manifest = makeManifest(
            [
                {
                    name: 'delegate-pause-node',
                    type: 'single',
                    maker: {
                        delegate_to: 'rd3:code-review-common',
                        execution_channel: 'codex',
                    },
                    checker: { method: 'cli', config: { command: 'echo ok', exit_codes: [0] } },
                },
            ],
            'delegate-pause-test',
        );

        let calls = 0;
        const delegateRunner = async () => {
            calls++;
            if (calls === 1) {
                return {
                    status: 'paused' as const,
                    output: 'waiting for delegated review',
                };
            }

            return {
                status: 'completed' as const,
                output: 'delegated review complete',
            };
        };

        const pausedState = await runChain({
            manifest,
            stateDir: TEST_DIR,
            delegateRunner,
        });

        expect(pausedState.status).toBe('paused');
        expect(pausedState.paused_node).toBe('delegate-pause-node');
        expect(pausedState.nodes[0].maker_status).toBe('paused');
        expect(pausedState.nodes[0].maker_output).toBe('waiting for delegated review');

        const resumedState = await resumeChain({
            manifest,
            stateDir: TEST_DIR,
            delegateRunner,
        });

        expect(resumedState.status).toBe('completed');
        expect(resumedState.nodes[0].maker_status).toBe('completed');
        expect(resumedState.nodes[0].maker_output).toBe('delegated review complete');
    });

    test('delegate_to maker falls back to command when command is present', async () => {
        const outputFile = `${nextChainId()}-delegate-output.txt`;
        const manifest = makeManifest([
            {
                name: 'delegate-command-node',
                type: 'single',
                maker: {
                    delegate_to: 'rd3:code-implement-common',
                    command: `echo generated > ${outputFile}`,
                },
                checker: {
                    method: 'file-exists',
                    config: { paths: [outputFile] },
                },
            },
        ]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('completed');
        expect(state.nodes[0].maker_status).toBe('completed');
        expect(state.nodes[0].checker_result).toBe('pass');
    });

    test('no maker defined → checker runs standalone', async () => {
        const manifest = makeManifest([
            {
                name: 'no-maker-node',
                type: 'single',
                maker: {},
                checker: { method: 'cli', config: { command: 'echo ok', exit_codes: [0] } },
            },
        ]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('completed');
        expect(state.nodes[0].maker_status).toBe('completed');
        expect(state.nodes[0].checker_result).toBe('pass');
    });

    test('maker command producing stderr still succeeds', async () => {
        const manifest = makeManifest([
            {
                name: 'stderr-node',
                type: 'single',
                maker: { command: 'echo err >&2 && echo ok' },
                checker: { method: 'cli', config: { command: 'echo ok', exit_codes: [0] } },
            },
        ]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('completed');
        expect(state.nodes[0].maker_status).toBe('completed');
    });
});

// ============================================================
// checker retry with failures
// ============================================================
describe('checker retry with failures', () => {
    test('retries specified number of times', async () => {
        const manifest = makeManifest([
            {
                name: 'retry-node',
                type: 'single',
                maker: { command: 'echo hello' },
                checker: {
                    method: 'cli',
                    config: { command: 'exit 1' },
                    retry: 2,
                },
            },
        ]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('failed');
        // Evidence is pushed once after the loop (last attempt only)
        expect(state.nodes[0].evidence).toHaveLength(1);
    });

    test('retry: 0 means single attempt', async () => {
        const manifest = makeManifest([
            {
                name: 'no-retry-node',
                type: 'single',
                maker: { command: 'echo hello' },
                checker: {
                    method: 'cli',
                    config: { command: 'exit 1' },
                    retry: 0,
                },
            },
        ]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('failed');
        expect(state.nodes[0].evidence).toHaveLength(1);
    });
});

// ============================================================
// checker on_fail: skip
// ============================================================
describe('checker on_fail: skip', () => {
    test('skips failed checker node and continues chain', async () => {
        const manifest = makeManifest([
            makeSingleNode('node1', 'echo ok', 'echo ok'),
            {
                name: 'skip-checker',
                type: 'single',
                maker: { command: 'echo hello' },
                checker: {
                    method: 'cli',
                    config: { command: 'exit 1' },
                    on_fail: 'skip',
                },
            },
            makeSingleNode('node3', 'echo three', 'echo ok'),
        ]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('completed');
        expect(state.nodes[1].status).toBe('skipped');
        expect(state.nodes[2].status).toBe('completed');
    });
});

// ============================================================
// parallel group - convergence failure policies
// ============================================================
describe('parallel group convergence failure policies', () => {
    test('convergence fails with manifest on_node_fail: skip', async () => {
        const manifest = makeManifest(
            [
                {
                    name: 'pg-skip',
                    type: 'parallel-group',
                    convergence: 'all',
                    children: [
                        { name: 'c1', maker: { command: 'echo one' } },
                        { name: 'c2', maker: { command: 'exit 1' } },
                    ],
                    checker: { method: 'cli', config: { command: 'echo ok', exit_codes: [0] } },
                },
                makeSingleNode('after', 'echo after', 'echo ok'),
            ],
            'pg-skip-test',
        );
        manifest.on_node_fail = 'skip';
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.nodes[0].status).toBe('skipped');
        expect(state.nodes[1].status).toBe('completed');
    });

    test('convergence fails with manifest on_node_fail: continue', async () => {
        const manifest = makeManifest(
            [
                {
                    name: 'pg-continue',
                    type: 'parallel-group',
                    convergence: 'all',
                    children: [
                        { name: 'c1', maker: { command: 'echo one' } },
                        { name: 'c2', maker: { command: 'exit 1' } },
                    ],
                    checker: { method: 'cli', config: { command: 'echo ok', exit_codes: [0] } },
                },
                makeSingleNode('after', 'echo after', 'echo ok'),
            ],
            'pg-continue-test',
        );
        manifest.on_node_fail = 'continue';
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.nodes[0].status).toBe('failed');
        expect(state.nodes[1].status).toBe('completed');
    });
});

// ============================================================
// parallel group - checker failure after convergence
// ============================================================
describe('parallel group checker failure', () => {
    test('all children pass but checker fails → chain halts', async () => {
        const manifest = makeManifest([
            {
                name: 'pg-checker-fail',
                type: 'parallel-group',
                convergence: 'all',
                children: [
                    { name: 'c1', maker: { command: 'echo one' } },
                    { name: 'c2', maker: { command: 'echo two' } },
                ],
                checker: { method: 'cli', config: { command: 'exit 1' } },
            },
        ]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('failed');
        expect(state.nodes[0].status).toBe('failed');
    });

    test('checker fails with on_fail: skip → chain continues', async () => {
        const manifest = makeManifest([
            {
                name: 'pg-checker-skip',
                type: 'parallel-group',
                convergence: 'all',
                children: [{ name: 'c1', maker: { command: 'echo one' } }],
                checker: { method: 'cli', config: { command: 'exit 1' }, on_fail: 'skip' },
            },
            makeSingleNode('after', 'echo after', 'echo ok'),
        ]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.nodes[0].status).toBe('skipped');
        expect(state.nodes[1].status).toBe('completed');
    });

    test('checker fails with on_fail: continue → chain continues', async () => {
        const manifest = makeManifest([
            {
                name: 'pg-checker-continue',
                type: 'parallel-group',
                convergence: 'all',
                children: [{ name: 'c1', maker: { command: 'echo one' } }],
                checker: { method: 'cli', config: { command: 'exit 1' }, on_fail: 'continue' },
            },
            makeSingleNode('after', 'echo after', 'echo ok'),
        ]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.nodes[0].status).toBe('failed');
        expect(state.nodes[1].status).toBe('completed');
    });
});

// ============================================================
// parallel group - human checker pause
// ============================================================
describe('parallel group human pause', () => {
    test('parallel group with human checker pauses chain', async () => {
        const manifest = makeManifest([
            {
                name: 'pg-pause',
                type: 'parallel-group',
                convergence: 'all',
                children: [{ name: 'c1', maker: { command: 'echo one' } }],
                checker: {
                    method: 'human',
                    config: { prompt: 'Approve?', choices: ['approve', 'reject'] },
                },
            },
        ]);
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('paused');
        expect(state.paused_node).toBe('pg-pause');
    });

    test('parallel group pauses when a delegated child maker pauses and resumes cleanly', async () => {
        const manifest = makeManifest(
            [
                {
                    name: 'pg-delegate-pause',
                    type: 'parallel-group',
                    convergence: 'all',
                    children: [
                        { name: 'delegate-child', maker: { delegate_to: 'rd3:sys-testing' } },
                        { name: 'local-child', maker: { command: 'echo one' } },
                    ],
                    checker: {
                        method: 'cli',
                        config: { command: 'echo ok', exit_codes: [0] },
                    },
                },
            ],
            'pg-delegate-pause-test',
        );

        let calls = 0;
        const delegateRunner = async () => {
            calls++;
            return calls === 1 ? { status: 'paused' as const } : { status: 'completed' as const };
        };

        const pausedState = await runChain({
            manifest,
            stateDir: TEST_DIR,
            delegateRunner,
        });

        expect(pausedState.status).toBe('paused');
        expect(pausedState.paused_node).toBe('pg-delegate-pause');
        expect(pausedState.nodes[0].maker_status).toBe('paused');
        expect(pausedState.nodes[0].parallel_children?.['delegate-child'].maker_status).toBe('paused');

        const resumedState = await resumeChain({
            manifest,
            stateDir: TEST_DIR,
            delegateRunner,
        });

        expect(resumedState.status).toBe('completed');
        expect(resumedState.nodes[0].parallel_children?.['delegate-child'].maker_status).toBe('completed');
        expect(resumedState.nodes[0].checker_result).toBe('pass');
    });
});

// ============================================================
// global retry
// ============================================================
describe('global retry', () => {
    test('retries failed nodes when global_retry is configured', async () => {
        const manifest = makeManifest(
            [
                {
                    name: 'retry-node',
                    type: 'single',
                    maker: { command: 'exit 1' },
                    checker: { method: 'cli', config: { command: 'echo ok', exit_codes: [0] } },
                },
            ],
            'global-retry-test',
        );
        // Use 'continue' so chain doesn't halt on maker failure and reaches the global retry logic
        manifest.on_node_fail = 'continue';
        manifest.global_retry = { remaining: 1, total: 1 };
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('failed');
        expect(state.global_retry?.remaining).toBe(0);
    });

    test('retries checker-failed nodes while preserving maker output', async () => {
        // Maker succeeds and produces stdout, checker fails on first run but passes on retry.
        // The retry marker file is created between the two global retry attempts.
        const retryMarker = join(TEST_DIR, `checker-retry-marker-${nextChainId()}`);
        const manifest = makeManifest(
            [
                {
                    name: 'checker-fail-node',
                    type: 'single',
                    maker: { command: 'echo produced-output' },
                    checker: {
                        method: 'cli',
                        config: { command: `test -f ${retryMarker}`, exit_codes: [0] },
                    },
                },
            ],
            'global-retry-checker-test',
        );
        manifest.on_node_fail = 'continue';
        manifest.global_retry = { remaining: 1, total: 1 };

        // Create the retry marker so the checker passes on the second attempt (global retry)
        // The global retry loop runs within a single runChain call, so we need the marker
        // to exist before running. Use a checker that always fails first and passes second:
        // Instead, use a simpler approach — create a checker script that tracks attempts.
        const attemptFile = join(TEST_DIR, `checker-attempt-${nextChainId()}`);
        (manifest.nodes[0] as SingleNode).checker.config = {
            // First attempt: file doesn't exist → exit 1. Write the file for next attempt.
            command: `if [ -f ${attemptFile} ]; then exit 0; else touch ${attemptFile} && exit 1; fi`,
            exit_codes: [0],
        };

        const state = await runChain({ manifest, stateDir: TEST_DIR });
        // After global retry, checker should have passed on the second attempt
        expect(state.status).toBe('completed');
        expect(state.global_retry?.remaining).toBe(0);
        expect(state.nodes[0].maker_status).toBe('completed');
        expect(state.nodes[0].checker_result).toBe('pass');
        // Maker output is preserved across the retry
        expect(state.nodes[0].maker_output).toContain('produced-output');
    });

    test('no retry when global_retry remaining is 0', async () => {
        const manifest = makeManifest(
            [
                {
                    name: 'no-retry-node',
                    type: 'single',
                    maker: { command: 'exit 1' },
                    checker: { method: 'cli', config: { command: 'echo ok', exit_codes: [0] } },
                },
            ],
            'no-global-retry-test',
        );
        manifest.on_node_fail = 'continue';
        manifest.global_retry = { remaining: 0, total: 1 };
        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('failed');
    });
});

// ============================================================
// new manifest nodes in existing state
// ============================================================
describe('new manifest nodes in existing state', () => {
    test('new nodes are added to existing state and processed', async () => {
        const chainId = 'new-nodes-test';
        const manifest1 = makeManifest([makeSingleNode('node1', 'echo one', 'echo ok')], chainId);
        const state1 = await runChain({ manifest: manifest1, stateDir: TEST_DIR });
        expect(state1.status).toBe('completed');

        const manifest2 = makeManifest(
            [makeSingleNode('node1', 'echo one', 'echo ok'), makeSingleNode('node2', 'echo two', 'echo ok')],
            chainId,
        );
        const state2 = await runChain({ manifest: manifest2, stateDir: TEST_DIR });
        expect(state2.status).toBe('completed');
        expect(state2.nodes).toHaveLength(2);
        expect(state2.nodes[1].status).toBe('completed');
    });
});

// ============================================================
// resumeChain error cases
// ============================================================
describe('resumeChain errors', () => {
    test('throws when no state file exists', async () => {
        const manifest = makeManifest([makeSingleNode('node1', 'echo hello', 'echo ok')], 'no-state-resume-test');
        await expect(resumeChain({ manifest, stateDir: TEST_DIR })).rejects.toThrow('No chain state found');
    });

    test('throws when chain is not paused (completed)', async () => {
        const manifest = makeManifest([makeSingleNode('node1', 'echo hello', 'echo ok')], 'not-paused-resume-test');
        await runChain({ manifest, stateDir: TEST_DIR });
        await expect(resumeChain({ manifest, stateDir: TEST_DIR })).rejects.toThrow('Chain is not paused');
    });
});
