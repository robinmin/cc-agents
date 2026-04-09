/**
 * direct.ts tests
 *
 * Tests for the DirectExecutor adapter that executes skill scripts via Bun spawn.
 */

import { describe, it, expect, afterEach, beforeAll } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    DirectExecutor,
    DIRECT_ADAPTER_ID,
    DIRECT_ADAPTER_NAME,
    DEFAULT_DIRECT_EXECUTOR,
    createDirectExecutor,
} from './direct';
import type { ExecutionRequest } from '../model';
import { setGlobalSilent } from '../../../../scripts/logger';

// ─── Test Fixtures ────────────────────────────────────────────────────────────

const TEST_SKILL_BASE = resolve('/tmp/direct-test-skills');
const TEST_PROJECT_ROOT = '/tmp/direct-test-project';

beforeAll(() => {
    setGlobalSilent(true);
});

function createFixture(plugin: string, skill: string, files: Record<string, string>): void {
    const skillDir = resolve(TEST_SKILL_BASE, plugin, skill);
    mkdirSync(TEST_PROJECT_ROOT, { recursive: true });
    mkdirSync(skillDir, { recursive: true });
    mkdirSync(resolve(skillDir, 'scripts'), { recursive: true });

    for (const [path, content] of Object.entries(files)) {
        const fullPath = resolve(skillDir, path);
        mkdirSync(resolve(fullPath, '..'), { recursive: true });
        writeFileSync(fullPath, content);
    }
}

function removeFixtures(): void {
    rmSync(TEST_SKILL_BASE, { force: true, recursive: true });
    rmSync(TEST_PROJECT_ROOT, { force: true, recursive: true });
}

function makeReq(overrides: Partial<ExecutionRequest> = {}): ExecutionRequest {
    return {
        skill: 'rd3:test-skill',
        phase: 'implement',
        prompt: 'Test prompt',
        payload: {},
        channel: 'direct',
        timeoutMs: 5000,
        taskRef: '0369_test',
        ...overrides,
    };
}

// ─── Constructor & Static Properties ────────────────────────────────────────

describe('DirectExecutor constructor', () => {
    afterEach(() => removeFixtures());

    it('creates instance with default paths', () => {
        const executor = new DirectExecutor();
        expect(executor.id).toBe(DIRECT_ADAPTER_ID);
        expect(executor.name).toBe(DIRECT_ADAPTER_NAME);
        expect(executor.executionMode).toBe('stateless');
        expect(executor.capabilities.channels).toContain('direct');
    });

    it('creates instance with custom paths', () => {
        const executor = new DirectExecutor('/custom/skills', '/custom/root');
        expect(executor.id).toBe(DIRECT_ADAPTER_ID);
    });

    it('DEFAULT_DIRECT_EXECUTOR is a DirectExecutor instance', () => {
        expect(DEFAULT_DIRECT_EXECUTOR).toBeInstanceOf(DirectExecutor);
        expect(DEFAULT_DIRECT_EXECUTOR.id).toBe(DIRECT_ADAPTER_ID);
    });

    it('createDirectExecutor returns DirectExecutor instance', () => {
        const executor = createDirectExecutor();
        expect(executor).toBeInstanceOf(DirectExecutor);
    });
});

// ─── resolveSkillScript ──────────────────────────────────────────────────────

describe('resolveSkillScript', () => {
    afterEach(() => removeFixtures());

    it('returns script path when scripts/run.ts exists', () => {
        createFixture('rd3', 'test-skill', {
            'scripts/run.ts': '#!/usr/bin/env bun\nconsole.log("ok");',
        });

        const executor = new DirectExecutor(TEST_SKILL_BASE, TEST_PROJECT_ROOT);
        const result = executor.resolveSkillScript('rd3:test-skill');

        expect(result).not.toBeNull();
        expect(result?.type).toBe('script');
        expect((result as { type: 'script'; path: string }).path).toContain('scripts/run.ts');
    });

    it('returns script path when only index.ts exists', () => {
        createFixture('rd3', 'test-skill', {
            'index.ts': 'console.log("ok");',
        });

        const executor = new DirectExecutor(TEST_SKILL_BASE, TEST_PROJECT_ROOT);
        const result = executor.resolveSkillScript('rd3:test-skill');

        expect(result).not.toBeNull();
        expect(result?.type).toBe('script');
        expect((result as { type: 'script'; path: string }).path).toContain('index.ts');
    });

    it('returns skill-only when only SKILL.md exists', () => {
        createFixture('rd3', 'test-skill', {
            'SKILL.md': '---\nname: test-skill\ndescription: Test\n---',
        });

        const executor = new DirectExecutor(TEST_SKILL_BASE, TEST_PROJECT_ROOT);
        const result = executor.resolveSkillScript('rd3:test-skill');

        expect(result).not.toBeNull();
        expect(result?.type).toBe('skill-only');
    });

    it('returns null for invalid skill ref (no colon)', () => {
        const executor = new DirectExecutor(TEST_SKILL_BASE, TEST_PROJECT_ROOT);
        const result = executor.resolveSkillScript('invalid-skill-ref');
        expect(result).toBeNull();
    });

    it('returns null for missing skill', () => {
        const executor = new DirectExecutor(TEST_SKILL_BASE, TEST_PROJECT_ROOT);
        const result = executor.resolveSkillScript('rd3:nonexistent');
        expect(result).toBeNull();
    });

    it('prefers scripts/run.ts over index.ts', () => {
        createFixture('rd3', 'test-skill', {
            'scripts/run.ts': '#!/usr/bin/env bun\nconsole.log("run");',
            'index.ts': 'console.log("index");',
        });

        const executor = new DirectExecutor(TEST_SKILL_BASE, TEST_PROJECT_ROOT);
        const result = executor.resolveSkillScript('rd3:test-skill');

        expect(result).not.toBeNull();
        expect(result?.type).toBe('script');
        expect((result as { type: 'script'; path: string }).path).toContain('scripts/run.ts');
    });
});

// ─── buildArgs ───────────────────────────────────────────────────────────────

describe('buildArgs', () => {
    afterEach(() => removeFixtures());

    it('returns empty array for minimal request', () => {
        const executor = new DirectExecutor();
        const result = executor.buildArgs({
            skill: 'rd3:test-skill',
            phase: '',
            prompt: '',
            payload: {},
            channel: 'direct',
            timeoutMs: 5000,
            taskRef: '',
        });
        expect(result).toEqual([]);
    });

    it('includes --task-ref when taskRef is present', () => {
        const executor = new DirectExecutor();
        const result = executor.buildArgs(makeReq({ taskRef: '0369' }));
        expect(result).toContain('--task-ref');
        expect(result).toContain('0369');
    });

    it('includes --phase when phase is present', () => {
        const executor = new DirectExecutor();
        const result = executor.buildArgs(makeReq({ phase: 'implement' }));
        expect(result).toContain('--phase');
        expect(result).toContain('implement');
    });

    it('includes --rework-iteration when reworkIteration is present', () => {
        const executor = new DirectExecutor();
        const result = executor.buildArgs(makeReq({ reworkIteration: 2 }));
        expect(result).toContain('--rework-iteration');
        expect(result).toContain('2');
    });

    it('includes payload entries as --key value pairs', () => {
        const executor = new DirectExecutor();
        const req = makeReq({ payload: { file: 'test.ts', verbose: true } });
        const result = executor.buildArgs(req);
        expect(result).toContain('--file');
        expect(result).toContain('test.ts');
        expect(result).toContain('--verbose');
        expect(result).toContain('true');
    });

    it('serializes non-string payload values as JSON', () => {
        const executor = new DirectExecutor();
        const req = makeReq({ payload: { count: 42, active: false } });
        const result = executor.buildArgs(req);
        expect(result).toContain('--count');
        expect(result).toContain('42');
        expect(result).toContain('--active');
        expect(result).toContain('false');
    });

    it('includes --feedback when feedback is present', () => {
        const executor = new DirectExecutor();
        const result = executor.buildArgs(makeReq({ feedback: 'Try harder' }));
        expect(result).toContain('--feedback');
        expect(result).toContain('Try harder');
    });

    it('skips null and undefined payload values', () => {
        const executor = new DirectExecutor();
        const req = makeReq({ payload: { present: 'yes', absent: null, alsoAbsent: undefined } });
        const result = executor.buildArgs(req);
        expect(result).toContain('--present');
        expect(result).toContain('yes');
        expect(result).not.toContain('--absent');
        expect(result).not.toContain('--alsoAbsent');
    });
});

// ─── execute (skill not found) ──────────────────────────────────────────────

describe('execute', () => {
    afterEach(() => removeFixtures());

    it('returns failure when skill not found', async () => {
        const executor = new DirectExecutor(TEST_SKILL_BASE, TEST_PROJECT_ROOT);
        const result = await executor.execute(makeReq({ skill: 'rd3:nonexistent' }));

        expect(result.success).toBe(false);
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('Skill not found');
        expect(result.stderr).toContain('nonexistent');
    });

    it('returns failure for invalid skill ref format', async () => {
        const executor = new DirectExecutor(TEST_SKILL_BASE, TEST_PROJECT_ROOT);
        const result = await executor.execute(makeReq({ skill: 'invalid' }));

        expect(result.success).toBe(false);
        expect(result.exitCode).toBe(1);
    });

    it('executes scripts/run.ts and captures stdout with task and phase args', async () => {
        createFixture('rd3', 'test-skill', {
            'scripts/run.ts': `
                process.stdout.write(JSON.stringify({
                    args: process.argv.slice(2),
                    executor: process.env.ORCH_EXECUTOR,
                    phase: process.env.ORCH_PHASE,
                }));
            `,
        });

        const executor = new DirectExecutor(TEST_SKILL_BASE, TEST_PROJECT_ROOT);
        const result = await executor.execute(
            makeReq({
                phase: 'test',
                payload: { mode: 'focused' },
                taskRef: '0369',
            }),
        );

        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
        expect(result.timedOut).toBe(false);
        expect(result.durationMs).toBeGreaterThanOrEqual(0);

        const parsed = JSON.parse(result.stdout ?? '') as {
            args: string[];
            executor: string;
            phase: string;
        };
        expect(parsed.args).toEqual(['--task-ref', '0369', '--phase', 'test', '--mode', 'focused']);
        expect(parsed.executor).toBe(DIRECT_ADAPTER_ID);
        expect(parsed.phase).toBe('test');
    });

    it('returns stderr and non-zero exit code when the script fails', async () => {
        createFixture('rd3', 'test-skill', {
            'scripts/run.ts': `
                process.stderr.write("script failed");
                process.exit(7);
            `,
        });

        const executor = new DirectExecutor(TEST_SKILL_BASE, TEST_PROJECT_ROOT);
        const result = await executor.execute(makeReq());

        expect(result.success).toBe(false);
        expect(result.exitCode).toBe(7);
        expect(result.timedOut).toBe(false);
        expect(result.stderr).toContain('script failed');
    });

    it('marks execution as timed out and returns timeout diagnostics', async () => {
        createFixture('rd3', 'test-skill', {
            'scripts/run.ts': `
                await Bun.sleep(200);
                process.stdout.write("too late");
            `,
        });

        const executor = new DirectExecutor(TEST_SKILL_BASE, TEST_PROJECT_ROOT);
        const result = await executor.execute(makeReq({ timeoutMs: 50 }));

        expect(result.success).toBe(false);
        expect(result.exitCode).toBe(124);
        expect(result.timedOut).toBe(true);
        expect(result.stderr).toContain('[TIMEOUT] Execution exceeded 50ms');
    });

    it('tolerates stream read failures when collecting subprocess output', async () => {
        createFixture('rd3', 'test-skill', {
            'scripts/run.ts': `
                process.stdout.write("ok");
                process.stderr.write("warn");
            `,
        });

        const originalText = Response.prototype.text;
        Response.prototype.text = function text(this: Response): Promise<string> {
            return Promise.reject(new Error('stream read failed'));
        };

        try {
            const executor = new DirectExecutor(TEST_SKILL_BASE, TEST_PROJECT_ROOT);
            const result = await executor.execute(makeReq());

            expect(result.success).toBe(true);
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toBe('');
            expect(result.stderr).toBe('');
        } finally {
            Response.prototype.text = originalText;
        }
    });
});

// ─── healthCheck ─────────────────────────────────────────────────────────────

describe('healthCheck', () => {
    afterEach(() => removeFixtures());

    it('returns healthy when bun is available', async () => {
        const executor = new DirectExecutor();
        const result = await executor.healthCheck();

        expect(result.healthy).toBe(true);
        expect(result.lastChecked).toBeInstanceOf(Date);
    });
});

// ─── dispose ────────────────────────────────────────────────────────────────

describe('dispose', () => {
    afterEach(() => removeFixtures());

    it('is a no-op that resolves successfully', async () => {
        const executor = new DirectExecutor();
        expect(executor.dispose()).resolves.toBeUndefined();
    });
});

// ─── Capabilities ────────────────────────────────────────────────────────────

describe('capabilities', () => {
    afterEach(() => removeFixtures());

    it('reports correct capability flags', () => {
        const executor = new DirectExecutor();
        expect(executor.capabilities.parallel).toBe(false);
        expect(executor.capabilities.streaming).toBe(false);
        expect(executor.capabilities.structuredOutput).toBe(false);
        expect(executor.capabilities.maxConcurrency).toBe(1);
    });

    it('channels includes id and direct', () => {
        const executor = new DirectExecutor();
        expect(executor.capabilities.channels).toContain(DIRECT_ADAPTER_ID);
        expect(executor.capabilities.channels).toContain('direct');
    });
});

// ─── Adapter Interface ──────────────────────────────────────────────────────

describe('PhaseExecutorAdapter interface', () => {
    afterEach(() => removeFixtures());

    it('implements PhaseExecutorAdapter contract', () => {
        const executor = new DirectExecutor();
        expect(typeof executor.execute).toBe('function');
        expect(typeof executor.healthCheck).toBe('function');
        expect(typeof executor.dispose).toBe('function');
        expect(typeof executor.id).toBe('string');
        expect(typeof executor.name).toBe('string');
        expect(typeof executor.executionMode).toBe('string');
        expect(typeof executor.capabilities).toBe('object');
    });
});

// ─── execute (executeSkillOnly path via SKILL.md only) ───────────────────────

describe('execute with SKILL-only package', () => {
    afterEach(() => removeFixtures());

    it('falls back to ACP transport for SKILL-only packages', async () => {
        // Create a SKILL-only package (no scripts/run.ts, only SKILL.md)
        createFixture('rd3', 'test-skill', {
            'SKILL.md': '---\nname: test-skill\ndescription: Test skill\n---\n\n# Test',
        });

        const executor = new DirectExecutor(TEST_SKILL_BASE, TEST_PROJECT_ROOT);
        // This will call ACP transport; it may succeed or fail depending on acpx availability
        // but it should NOT throw — it should return a result
        const result = await executor.execute(makeReq({ skill: 'rd3:test-skill' }));

        // Result should have all required fields regardless of ACP availability
        expect(typeof result.success).toBe('boolean');
        expect(typeof result.exitCode).toBe('number');
        expect(typeof result.durationMs).toBe('number');
        expect(typeof result.timedOut).toBe('boolean');
    }, 30000);
});
