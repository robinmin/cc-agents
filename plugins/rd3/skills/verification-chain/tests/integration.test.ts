import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setGlobalSilent } from '../../../scripts/logger';
import { runChain, resumeChain } from '../scripts/interpreter';
import type { ChainManifest } from '../scripts/types';

// @ts-expect-error - Bun provides __dirname in CommonJS-like contexts
const TEST_DIR = join(__dirname, 'integration-fixtures');

let chainIdCounter = 0;

beforeAll(() => {
    setGlobalSilent(true);
    mkdirSync(TEST_DIR, { recursive: true });
});

afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
});

beforeEach(() => {
    rmSync(join(TEST_DIR, 'cov'), { recursive: true, force: true });
});

function nextChainId(): string {
    return `integration-${++chainIdCounter}`;
}

// ============================================================
// Integration: Build Artifact Verification Chain
// ============================================================
describe('integration: build artifact verification', () => {
    test('full build chain: generate → verify → test', async () => {
        // Create test files
        writeFileSync(join(TEST_DIR, 'src.js'), 'const x = 1;');
        writeFileSync(join(TEST_DIR, 'spec.js'), 'describe("test", () => {});');

        const manifest: ChainManifest = {
            chain_id: nextChainId(),
            chain_name: 'Build and Verify',
            task_wbs: 'TASK-100',
            on_node_fail: 'halt',
            nodes: [
                {
                    name: 'build',
                    type: 'single',
                    maker: { command: 'cp src.js dist.js && cp spec.js spec-dist.js' },
                    checker: {
                        method: 'file-exists',
                        config: { paths: ['dist.js', 'spec-dist.js'] },
                    },
                },
                {
                    name: 'run-tests',
                    type: 'single',
                    maker: { command: 'echo "tests passed"' },
                    checker: {
                        method: 'cli',
                        config: { command: 'echo ok', exit_codes: [0] },
                    },
                },
                {
                    name: 'lint',
                    type: 'single',
                    maker: { command: 'grep -q "const" dist.js' },
                    checker: {
                        method: 'cli',
                        config: { command: 'grep -E "^const|^let|^var" dist.js', exit_codes: [0] },
                    },
                },
            ],
        };

        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('completed');
        expect(state.nodes[0].status).toBe('completed');
        expect(state.nodes[1].status).toBe('completed');
        expect(state.nodes[2].status).toBe('completed');
    });

    test('build fails at lint → chain stops', async () => {
        writeFileSync(join(TEST_DIR, 'bad.js'), 'x = 1;'); // no var/let/const

        const manifest: ChainManifest = {
            chain_id: nextChainId(),
            chain_name: 'Build with Lint',
            task_wbs: 'TASK-101',
            on_node_fail: 'halt',
            nodes: [
                {
                    name: 'build',
                    type: 'single',
                    maker: { command: 'cp bad.js dist.js' },
                    checker: {
                        method: 'file-exists',
                        config: { paths: ['dist.js'] },
                    },
                },
                {
                    name: 'lint',
                    type: 'single',
                    maker: { command: 'grep -E "^const|^let|^var" dist.js' },
                    checker: {
                        method: 'cli',
                        config: { command: 'grep -E "^const|^let|^var" dist.js', exit_codes: [0] },
                    },
                },
            ],
        };

        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('failed');
        expect(state.nodes[0].status).toBe('completed');
        expect(state.nodes[1].status).toBe('failed');
    });
});

// ============================================================
// Integration: Content Match Checker in Chain
// ============================================================
describe('integration: content match checks', () => {
    test('verify content exists and absent in same chain', async () => {
        writeFileSync(join(TEST_DIR, 'app.js'), 'const app = express();\nconsole.log("ready");\n');

        const manifest: ChainManifest = {
            chain_id: nextChainId(),
            chain_name: 'Content Verification',
            task_wbs: 'TASK-102',
            on_node_fail: 'halt',
            nodes: [
                {
                    name: 'has-exports',
                    type: 'single',
                    maker: { command: 'echo built' },
                    checker: {
                        method: 'content-match',
                        config: {
                            file: 'app.js',
                            pattern: 'module\\.exports',
                            must_exist: false,
                        },
                    },
                },
                {
                    name: 'has-constructor',
                    type: 'single',
                    maker: { command: 'echo built' },
                    checker: {
                        method: 'content-match',
                        config: {
                            file: 'app.js',
                            pattern: 'express\\(\\)',
                            must_exist: true,
                        },
                    },
                },
            ],
        };

        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('completed');
    });

    test('fails when prohibited content is found', async () => {
        writeFileSync(join(TEST_DIR, 'app.js'), 'const x = 1; debugger; console.log("test");');

        const manifest: ChainManifest = {
            chain_id: nextChainId(),
            chain_name: 'Content Scan',
            task_wbs: 'TASK-103',
            nodes: [
                {
                    name: 'no-debugger',
                    type: 'single',
                    maker: { command: 'echo built' },
                    checker: {
                        method: 'content-match',
                        config: {
                            file: 'app.js',
                            pattern: 'debugger;',
                            must_exist: false,
                        },
                    },
                },
            ],
        };

        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('failed');
        expect(state.nodes[0].checker_result).toBe('fail');
    });
});

// ============================================================
// Integration: Parallel Group + Compound Checker
// ============================================================
describe('integration: parallel group with compound checker', () => {
    test('parallel group with compound AND check', async () => {
        writeFileSync(join(TEST_DIR, 'a.txt'), 'content');
        writeFileSync(join(TEST_DIR, 'b.txt'), 'content');

        const manifest: ChainManifest = {
            chain_id: nextChainId(),
            chain_name: 'Parallel Build',
            task_wbs: 'TASK-104',
            on_node_fail: 'halt',
            nodes: [
                {
                    name: 'generate-both',
                    type: 'parallel-group',
                    convergence: 'all',
                    children: [
                        { name: 'gen-a', maker: { command: 'sleep 0.01 && echo a > gen-a.txt' } },
                        { name: 'gen-b', maker: { command: 'sleep 0.01 && echo b > gen-b.txt' } },
                    ],
                    checker: {
                        method: 'compound',
                        config: {
                            operator: 'and',
                            checks: [
                                { method: 'file-exists', config: { paths: ['gen-a.txt'] } },
                                { method: 'file-exists', config: { paths: ['gen-b.txt'] } },
                            ],
                        },
                    },
                },
            ],
        };

        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('completed');
        expect(state.nodes[0].parallel_children?.['gen-a'].maker_result).toBe('pass');
        expect(state.nodes[0].parallel_children?.['gen-b'].maker_result).toBe('pass');
    });
});

// ============================================================
// Integration: Human Gate Full Workflow
// ============================================================
describe('integration: human gate full workflow', () => {
    test('approve → chain continues and completes', async () => {
        const manifest: ChainManifest = {
            chain_id: nextChainId(),
            chain_name: 'Human Gate Chain',
            task_wbs: 'TASK-105',
            on_node_fail: 'halt',
            nodes: [
                {
                    name: 'setup',
                    type: 'single',
                    maker: { command: 'echo setup done' },
                    checker: {
                        method: 'cli',
                        config: { command: 'echo ok', exit_codes: [0] },
                    },
                },
                {
                    name: 'review',
                    type: 'single',
                    maker: { command: 'echo ready for review' },
                    checker: {
                        method: 'human',
                        config: {
                            prompt: 'Do you approve this change?',
                            choices: ['approve', 'reject', 'request_changes'],
                        },
                    },
                },
                {
                    name: 'finalize',
                    type: 'single',
                    maker: { command: 'echo finalized' },
                    checker: {
                        method: 'cli',
                        config: { command: 'echo ok', exit_codes: [0] },
                    },
                },
            ],
        };

        const state1 = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state1.status).toBe('paused');
        expect(state1.paused_node).toBe('review');
        expect(state1.nodes[0].status).toBe('completed'); // setup completed

        const state2 = await resumeChain({
            manifest,
            stateDir: TEST_DIR,
            humanResponse: 'approve',
        });
        expect(state2.status).toBe('completed');
        expect(state2.nodes[0].status).toBe('completed');
        expect(state2.nodes[1].checker_result).toBe('pass'); // human checker passed
        expect(state2.nodes[2].status).toBe('completed'); // finalize ran
    });

    test('reject → chain fails', async () => {
        const manifest: ChainManifest = {
            chain_id: nextChainId(),
            chain_name: 'Human Gate Chain',
            task_wbs: 'TASK-106',
            on_node_fail: 'halt',
            nodes: [
                {
                    name: 'setup',
                    type: 'single',
                    maker: { command: 'echo setup done' },
                    checker: {
                        method: 'cli',
                        config: { command: 'echo ok', exit_codes: [0] },
                    },
                },
                {
                    name: 'review',
                    type: 'single',
                    maker: { command: 'echo ready for review' },
                    checker: {
                        method: 'human',
                        config: {
                            prompt: 'Do you approve this change?',
                            choices: ['approve', 'reject'],
                        },
                        on_fail: 'halt',
                    },
                },
            ],
        };

        const state1 = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state1.status).toBe('paused');

        const state2 = await resumeChain({
            manifest,
            stateDir: TEST_DIR,
            humanResponse: 'reject',
        });
        expect(state2.status).toBe('failed');
        expect(state2.nodes[1].checker_result).toBe('fail');
    });
});

// ============================================================
// Integration: End-to-End Multi-Stage Pipeline
// ============================================================
describe('integration: multi-stage pipeline', () => {
    test('4-stage pipeline with skip on failure', async () => {
        writeFileSync(join(TEST_DIR, 'src.ts'), 'const x: number = 1;');

        const manifest: ChainManifest = {
            chain_id: nextChainId(),
            chain_name: 'TypeScript Pipeline',
            task_wbs: 'TASK-107',
            on_node_fail: 'skip',
            nodes: [
                {
                    name: 'compile',
                    type: 'single',
                    maker: { command: 'cp src.ts dist.ts' },
                    checker: {
                        method: 'cli',
                        config: { command: 'echo compiled', exit_codes: [0] },
                    },
                },
                {
                    name: 'lint',
                    type: 'single',
                    maker: { command: 'exit 1' }, // lint fails
                    checker: {
                        method: 'cli',
                        config: { command: 'echo linted', exit_codes: [0] },
                        on_fail: 'skip',
                    },
                },
                {
                    name: 'test',
                    type: 'single',
                    maker: { command: 'echo "all tests pass"' },
                    checker: {
                        method: 'cli',
                        config: { command: 'echo ok', exit_codes: [0] },
                    },
                },
                {
                    name: 'package',
                    type: 'single',
                    maker: { command: 'echo packaged' },
                    checker: {
                        method: 'cli',
                        config: { command: 'echo ok', exit_codes: [0] },
                    },
                },
            ],
        };

        const state = await runChain({ manifest, stateDir: TEST_DIR });
        expect(state.status).toBe('completed');
        expect(state.nodes[0].status).toBe('completed'); // compile
        expect(state.nodes[1].status).toBe('skipped'); // lint skipped due to on_fail:skip
        expect(state.nodes[2].status).toBe('completed'); // test
        expect(state.nodes[3].status).toBe('completed'); // package
    });
});
