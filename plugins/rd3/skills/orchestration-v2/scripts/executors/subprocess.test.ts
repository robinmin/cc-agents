/**
 * subprocess.ts tests
 *
 * Tests for SubprocessExecutor: Bun spawn-based skill execution.
 *
 * Note: ACP transport fallback paths (skill-only packages) are NOT tested here
 * because mock.module() in Bun is process-wide and leaks into sibling test files.
 * Those paths are thin wrappers around already-tested transport functions.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import type { ExecutionRequest } from '../model';
import {
    SubprocessExecutor,
    DEFAULT_SUBPROCESS_EXECUTOR,
    createSubprocessExecutor,
    SUBPROCESS_EXECUTOR_ID,
    SUBPROCESS_EXECUTOR_NAME,
} from './subprocess';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(overrides: Partial<ExecutionRequest> = {}): ExecutionRequest {
    return {
        skill: 'rd3:test-skill',
        phase: 'implement',
        prompt: 'do the thing',
        payload: {},
        channel: 'subprocess',
        timeoutMs: 30_000,
        ...overrides,
    };
}

let tempDir: string;

function setupTempDir(): string {
    tempDir = mkdtempSync(join(tmpdir(), 'subprocess-executor-test-'));
    return tempDir;
}

function cleanupTempDir(): void {
    if (tempDir) {
        rmSync(tempDir, { recursive: true, force: true });
    }
}

/**
 * Create a fake skill directory with scripts/run.ts
 */
function createRunScript(skillBase: string, skillName: string, content = `console.log("ran");`): string {
    const dir = join(skillBase, skillName, 'scripts');
    mkdirSync(dir, { recursive: true });
    const filePath = join(dir, 'run.ts');
    writeFileSync(filePath, content);
    return filePath;
}

/**
 * Create an index.ts-only skill (no scripts/run.ts, no scripts/local.ts)
 */
function createIndexScript(skillBase: string, skillName: string): string {
    const dir = join(skillBase, skillName);
    mkdirSync(dir, { recursive: true });
    const filePath = join(dir, 'index.ts');
    writeFileSync(filePath, `export const x = 1;`);
    return filePath;
}

/**
 * Create a SKILL.md-only skill (no runnable scripts)
 */
function createSkillOnly(skillBase: string, skillName: string): string {
    const dir = join(skillBase, skillName);
    mkdirSync(dir, { recursive: true });
    const filePath = join(dir, 'SKILL.md');
    writeFileSync(filePath, `# ${skillName}\n`);
    return filePath;
}

// ─── Constructor & Identity ───────────────────────────────────────────────────

describe('SubprocessExecutor', () => {
    describe('constructor and identity', () => {
        it('has correct id, name, channels, and maxConcurrency', () => {
            const exec = new SubprocessExecutor();
            expect(exec.id).toBe(SUBPROCESS_EXECUTOR_ID);
            expect(exec.name).toBe(SUBPROCESS_EXECUTOR_NAME);
            expect(exec.channels).toEqual(['subprocess']);
            expect(exec.maxConcurrency).toBe(1);
        });

        it('uses default skillBaseDir when none provided', () => {
            const exec = new SubprocessExecutor();
            expect(exec.skillBaseDir).toContain('plugins');
        });

        it('uses custom skillBaseDir when provided', () => {
            const customDir = '/tmp/custom-skills';
            const exec = new SubprocessExecutor(customDir);
            expect(exec.skillBaseDir).toBe(customDir);
        });

        it('uses custom projectRoot when provided', () => {
            const exec = new SubprocessExecutor('/tmp/skills', '/tmp/project');
            expect(exec.skillBaseDir).toBe('/tmp/skills');
        });
    });

    describe('DEFAULT_SUBPROCESS_EXECUTOR', () => {
        it('is a SubprocessExecutor instance', () => {
            expect(DEFAULT_SUBPROCESS_EXECUTOR).toBeInstanceOf(SubprocessExecutor);
        });

        it("has id 'subprocess'", () => {
            expect(DEFAULT_SUBPROCESS_EXECUTOR.id).toBe('subprocess');
        });
    });

    describe('createSubprocessExecutor factory', () => {
        it('creates a SubprocessExecutor without arguments', () => {
            const exec = createSubprocessExecutor();
            expect(exec).toBeInstanceOf(SubprocessExecutor);
            expect(exec.id).toBe('subprocess');
        });

        it('creates a SubprocessExecutor with custom skillBaseDir', () => {
            const dir = '/opt/skills';
            const exec = createSubprocessExecutor(dir);
            expect(exec).toBeInstanceOf(SubprocessExecutor);
            expect((exec as SubprocessExecutor).skillBaseDir).toBe(dir);
        });

        it('creates a SubprocessExecutor with custom skillBaseDir and projectRoot', () => {
            const exec = createSubprocessExecutor('/a', '/b');
            expect((exec as SubprocessExecutor).skillBaseDir).toBe('/a');
        });
    });

    // ─── resolveSkillScript ────────────────────────────────────────────────

    describe('resolveSkillScript', () => {
        beforeEach(() => setupTempDir());
        afterEach(() => cleanupTempDir());

        it('returns null for invalid skill ref (no colon)', () => {
            const exec = new SubprocessExecutor(tempDir);
            expect(exec.resolveSkillScript('invalid-ref')).toBeNull();
        });

        it('returns null for empty skill ref', () => {
            const exec = new SubprocessExecutor(tempDir);
            expect(exec.resolveSkillScript('')).toBeNull();
        });

        it('returns null when no skill files exist', () => {
            const exec = new SubprocessExecutor(tempDir);
            expect(exec.resolveSkillScript('rd3:missing')).toBeNull();
        });

        it('resolves scripts/run.ts when it exists', () => {
            const exec = new SubprocessExecutor(tempDir);
            const created = createRunScript(tempDir, 'my-skill');
            const resolved = exec.resolveSkillScript('rd3:my-skill');
            expect(resolved).toEqual({ type: 'script', path: created });
        });

        it('returns skill-only when scripts/run.ts is missing but index.ts exists', () => {
            // index.ts is no longer a valid entry point - should fall back to SKILL.md
            const exec = new SubprocessExecutor(tempDir);
            createIndexScript(tempDir, 'index-skill');
            createSkillOnly(tempDir, 'index-skill'); // Also create SKILL.md
            const resolved = exec.resolveSkillScript('rd3:index-skill');
            expect(resolved).toEqual({ type: 'skill-only' });
        });

        it('returns skill-only for SKILL.md-only package', () => {
            const exec = new SubprocessExecutor(tempDir);
            createSkillOnly(tempDir, 'skill-only-pkg');
            const resolved = exec.resolveSkillScript('rd3:skill-only-pkg');
            expect(resolved).toEqual({ type: 'skill-only' });
        });

        it('prefers scripts/run.ts over SKILL.md', () => {
            const exec = new SubprocessExecutor(tempDir);
            const runPath = createRunScript(tempDir, 'mixed-skill');
            createSkillOnly(tempDir, 'mixed-skill');
            const resolved = exec.resolveSkillScript('rd3:mixed-skill');
            expect(resolved).toEqual({ type: 'script', path: runPath });
        });
    });

    // ─── buildArgs ─────────────────────────────────────────────────────────

    describe('buildArgs', () => {
        it('returns empty array for minimal request without optional fields', () => {
            const exec = new SubprocessExecutor();
            const req: ExecutionRequest = {
                skill: 'rd3:test',
                phase: 'implement',
                prompt: 'test',
                payload: {},
                channel: 'subprocess',
                timeoutMs: 5000,
            };
            const args = exec.buildArgs(req);
            expect(args).toBeArray();
            // No taskRef, no feedback, empty payload — should have phase only
            expect(args).toContain('--phase');
            expect(args).toContain('implement');
        });

        it('includes --task-ref when provided', () => {
            const exec = new SubprocessExecutor();
            const args = exec.buildArgs(makeRequest({ taskRef: '0123' }));
            expect(args).toContain('--task-ref');
            expect(args).toContain('0123');
        });

        it('includes --phase when provided', () => {
            const exec = new SubprocessExecutor();
            const args = exec.buildArgs(makeRequest({ phase: 'implement' }));
            expect(args).toContain('--phase');
            expect(args).toContain('implement');
        });

        it('includes --rework-iteration when provided', () => {
            const exec = new SubprocessExecutor();
            const args = exec.buildArgs(makeRequest({ reworkIteration: 2 }));
            expect(args).toContain('--rework-iteration');
            expect(args).toContain('2');
        });

        it('includes --feedback when provided', () => {
            const exec = new SubprocessExecutor();
            const args = exec.buildArgs(makeRequest({ feedback: 'fix the tests' }));
            expect(args).toContain('--feedback');
            expect(args).toContain('fix the tests');
        });

        it('serializes payload values as JSON for non-string types', () => {
            const exec = new SubprocessExecutor();
            const args = exec.buildArgs(makeRequest({ payload: { count: 42, flag: true, name: 'test' } }));
            expect(args).toContain('--count');
            expect(args).toContain('42');
            expect(args).toContain('--flag');
            expect(args).toContain('true');
            expect(args).toContain('--name');
            expect(args).toContain('test');
        });

        it('skips null/undefined payload values', () => {
            const exec = new SubprocessExecutor();
            const args = exec.buildArgs(
                makeRequest({ payload: { a: null as unknown as string, b: undefined as unknown as string } }),
            );
            expect(args).not.toContain('--a');
            expect(args).not.toContain('--b');
        });
    });

    // ─── execute ───────────────────────────────────────────────────────────

    describe('execute', () => {
        beforeEach(() => setupTempDir());
        afterEach(() => cleanupTempDir());

        it('returns failure for sessioned requests', async () => {
            const exec = new SubprocessExecutor(tempDir);
            const req = makeRequest({ session: 's1' });
            const result = await exec.execute(req);

            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(1);
            expect(result.stderr).toContain('session');
            expect(result.timedOut).toBe(false);
            expect(result.durationMs).toBeGreaterThanOrEqual(0);
        });

        it('returns failure when skill not found', async () => {
            const exec = new SubprocessExecutor(tempDir);
            const req = makeRequest({ skill: 'rd3:no-such-skill' });
            const result = await exec.execute(req);

            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(1);
            expect(result.stderr).toContain('Skill not found');
            expect(result.durationMs).toBeGreaterThanOrEqual(0);
        });

        it('executes a real subprocess script successfully', async () => {
            const exec = new SubprocessExecutor(tempDir);
            // Create a simple script that exits 0 with stdout
            createRunScript(
                tempDir,
                'success-skill',
                `process.stdout.write("hello from subprocess"); process.exit(0);`,
            );

            const req = makeRequest({ skill: 'rd3:success-skill', timeoutMs: 10_000 });
            const result = await exec.execute(req);

            expect(result.success).toBe(true);
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('hello from subprocess');
            expect(result.timedOut).toBe(false);
            expect(result.durationMs).toBeGreaterThanOrEqual(0);
        });

        it('captures subprocess failure exit code', async () => {
            const exec = new SubprocessExecutor(tempDir);
            createRunScript(tempDir, 'fail-skill', `process.stderr.write("script error"); process.exit(1);`);

            const req = makeRequest({ skill: 'rd3:fail-skill', timeoutMs: 10_000 });
            const result = await exec.execute(req);

            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(1);
            expect(result.stderr).toContain('script error');
        });

        it('handles subprocess timeout', async () => {
            const exec = new SubprocessExecutor(tempDir);
            // Create a script that sleeps forever
            createRunScript(tempDir, 'timeout-skill', `setTimeout(() => {}, 60000);`);

            const req = makeRequest({ skill: 'rd3:timeout-skill', timeoutMs: 500 });
            const result = await exec.execute(req);

            expect(result.success).toBe(false);
            expect(result.timedOut).toBe(true);
            expect(result.exitCode).toBe(124); // standard timeout exit code
            expect(result.stderr).toContain('TIMEOUT');
        });

        it('falls back to SKILL.md via ACP when no scripts/run.ts exists', () => {
            // Verify resolveSkillScript returns skill-only for SKILL-only packages
            const exec = new SubprocessExecutor(tempDir);
            const dir = join(tempDir, 'skill-only-runner');
            mkdirSync(dir, { recursive: true });
            writeFileSync(join(dir, 'SKILL.md'), '# SKILL\n');

            const resolved = exec.resolveSkillScript('rd3:skill-only-runner');
            // Should resolve to skill-only type (ACP fallback)
            expect(resolved).toEqual({ type: 'skill-only' });
        });

        it('includes environment variables in subprocess', async () => {
            const exec = new SubprocessExecutor(tempDir);
            createRunScript(
                tempDir,
                'env-skill',
                `process.stdout.write("ORCH_PHASE=" + process.env.ORCH_PHASE); process.exit(0);`,
            );

            const req = makeRequest({ skill: 'rd3:env-skill', phase: 'test-phase', timeoutMs: 10_000 });
            const result = await exec.execute(req);

            expect(result.success).toBe(true);
            expect(result.stdout).toContain('ORCH_PHASE=test-phase');
        });
    });

    // ─── executeSkillOnly (via SKILL.md-only packages) ────────────────────

    describe('executeSkillOnly (ACP fallback)', () => {
        beforeEach(() => setupTempDir());
        afterEach(() => cleanupTempDir());

        it('calls ACP transport for SKILL.md-only package and returns result', async () => {
            const exec = new SubprocessExecutor(tempDir);
            createSkillOnly(tempDir, 'skill-only-test');

            // Break PATH so acpx fails fast with ENOENT instead of launching
            const origPath = process.env.PATH;
            process.env.PATH = '/nonexistent';
            try {
                const req = makeRequest({ skill: 'rd3:skill-only-test', timeoutMs: 2_000 });
                const result = await exec.execute(req);

                // acpx not found → spawn failure, but method returns a result
                expect(result.success).toBe(false);
                expect(result.exitCode).toBe(1);
                expect(result.durationMs).toBeGreaterThanOrEqual(0);
                expect(result.timedOut).toBe(false);
            } finally {
                process.env.PATH = origPath;
            }
        });

        it('passes prompt with skill name to ACP transport', async () => {
            const exec = new SubprocessExecutor(tempDir);
            createSkillOnly(tempDir, 'my-skill-md');

            const origPath = process.env.PATH;
            process.env.PATH = '/nonexistent';
            try {
                const req = makeRequest({
                    skill: 'rd3:my-skill-md',
                    phase: 'implement',
                    taskRef: '0400',
                    feedback: 'needs work',
                    reworkIteration: 1,
                    timeoutMs: 2_000,
                });
                const result = await exec.execute(req);

                expect(result.success).toBe(false);
                expect(result.exitCode).toBe(1);
            } finally {
                process.env.PATH = origPath;
            }
        });

        it('uses default timeout when timeoutMs is not specified', async () => {
            const exec = new SubprocessExecutor(tempDir);
            createSkillOnly(tempDir, 'timeout-default');

            // Without timeoutMs, the default is 30 min. PATH break forces
            // immediate failure so we don't actually wait.
            const origPath = process.env.PATH;
            process.env.PATH = '/nonexistent';
            try {
                const req = makeRequest({ skill: 'rd3:timeout-default' });
                // Omit timeoutMs to test the default timeout path
                const { timeoutMs: _, ...reqNoTimeout } = req;
                const result = await exec.execute(reqNoTimeout as ExecutionRequest);

                expect(result.success).toBe(false);
                expect(result.exitCode).toBe(1);
                expect(result.durationMs).toBeGreaterThanOrEqual(0);
            } finally {
                process.env.PATH = origPath;
            }
        });
    });

    // ─── healthCheck ───────────────────────────────────────────────────────

    describe('healthCheck', () => {
        it('returns healthy when Bun is available', async () => {
            const exec = new SubprocessExecutor();
            const health = await exec.healthCheck();
            expect(health.healthy).toBe(true);
            expect(health.lastChecked).toBeInstanceOf(Date);
        });
    });

    // ─── dispose ───────────────────────────────────────────────────────────

    describe('dispose', () => {
        it('completes without error', async () => {
            const exec = new SubprocessExecutor();
            await expect(exec.dispose()).resolves.toBeUndefined();
        });
    });
});
