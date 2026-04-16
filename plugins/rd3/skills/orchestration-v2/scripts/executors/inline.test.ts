/**
 * inline.ts tests
 *
 * Tests for InlineExecutor: in-process skill phase execution.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import type { ExecutionRequest } from '../model';
import { InlineExecutor, DEFAULT_INLINE_EXECUTOR, createInlineExecutor, type LocalEntryModule } from './inline';
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
        channel: 'inline',
        timeoutMs: 30_000,
        ...overrides,
    };
}

let tempDir: string;

function setupTempDir(): string {
    tempDir = mkdtempSync(join(tmpdir(), 'inline-executor-test-'));
    return tempDir;
}

function cleanupTempDir(): void {
    if (tempDir) {
        rmSync(tempDir, { recursive: true, force: true });
    }
}

/**
 * Create a dummy file at the expected entrypoint path.
 * Used for resolveLocalEntrypoint tests (file existence only, never imported).
 */
function createDummyEntry(skillBase: string, skillName: string): string {
    const dir = join(skillBase, skillName, 'scripts');
    mkdirSync(dir, { recursive: true });
    const filePath = join(dir, 'run.ts');
    writeFileSync(filePath, '// dummy\n');
    return filePath;
}

/**
 * Create a SKILL.md file at the skill root.
 */
function createSkillMd(skillBase: string, skillName: string, content = '# SKILL\n'): string {
    const dir = join(skillBase, skillName);
    mkdirSync(dir, { recursive: true });
    const filePath = join(dir, 'SKILL.md');
    writeFileSync(filePath, content);
    return filePath;
}

/**
 * Create a mock module loader that returns predefined modules based on skill name in path.
 * Avoids dynamic import() on temp .ts files which leak into V8 coverage reports.
 */
function mockModuleLoader(modules: Record<string, LocalEntryModule>): (entryPath: string) => Promise<LocalEntryModule> {
    return async (entryPath: string) => {
        for (const [skillName, mod] of Object.entries(modules)) {
            if (entryPath.includes(skillName)) return mod;
        }
        throw new Error(`No mock module for path: ${entryPath}`);
    };
}

// ─── Constructor & Identity ───────────────────────────────────────────────────

describe('InlineExecutor', () => {
    describe('constructor and identity', () => {
        it('has correct id, name, channels, and maxConcurrency', () => {
            const exec = new InlineExecutor();
            expect(exec.id).toBe('inline');
            expect(exec.name).toBe('Inline Executor (in-process)');
            expect(exec.channels).toEqual(['inline']);
            expect(exec.maxConcurrency).toBe(1);
        });

        it('uses default skillBaseDir when none provided', () => {
            const exec = new InlineExecutor();
            // The default should resolve to plugins/rd3/skills under cwd
            expect(exec.skillBaseDir).toContain('plugins');
        });

        it('uses custom skillBaseDir when provided', () => {
            const customDir = '/tmp/custom-skills';
            const exec = new InlineExecutor(customDir);
            expect(exec.skillBaseDir).toBe(customDir);
        });
    });

    describe('DEFAULT_INLINE_EXECUTOR', () => {
        it('is an InlineExecutor instance', () => {
            expect(DEFAULT_INLINE_EXECUTOR).toBeInstanceOf(InlineExecutor);
        });

        it("has id 'inline'", () => {
            expect(DEFAULT_INLINE_EXECUTOR.id).toBe('inline');
        });
    });

    describe('createInlineExecutor factory', () => {
        it('creates an InlineExecutor without arguments', () => {
            const exec = createInlineExecutor();
            expect(exec).toBeInstanceOf(InlineExecutor);
            expect(exec.id).toBe('inline');
        });

        it('creates an InlineExecutor with custom skillBaseDir', () => {
            const dir = '/opt/skills';
            const exec = createInlineExecutor(dir);
            expect(exec).toBeInstanceOf(InlineExecutor);
            expect((exec as InlineExecutor).skillBaseDir).toBe(dir);
        });
    });

    // ─── resolveLocalEntrypoint ────────────────────────────────────────────

    describe('resolveLocalEntrypoint', () => {
        beforeEach(() => setupTempDir());
        afterEach(() => cleanupTempDir());

        it('returns null for invalid skill ref (no colon)', () => {
            const exec = new InlineExecutor(tempDir);
            expect(exec.resolveLocalEntrypoint('invalid-ref')).toBeNull();
        });

        it('returns null for empty skill ref', () => {
            const exec = new InlineExecutor(tempDir);
            expect(exec.resolveLocalEntrypoint('')).toBeNull();
        });

        it('returns null when no entrypoint files exist', () => {
            const exec = new InlineExecutor(tempDir);
            expect(exec.resolveLocalEntrypoint('rd3:missing')).toBeNull();
        });

        it('resolves scripts/run.ts when it exists', () => {
            const exec = new InlineExecutor(tempDir);
            const created = createDummyEntry(tempDir, 'my-skill');
            const resolved = exec.resolveLocalEntrypoint('rd3:my-skill');
            expect(resolved).toBe(created);
        });

        it('handles multi-segment plugin names', () => {
            const exec = new InlineExecutor(tempDir);
            const dir = join(tempDir, 'complex-skill', 'scripts');
            mkdirSync(dir, { recursive: true });
            const filePath = join(dir, 'run.ts');
            writeFileSync(filePath, `export const x = 1;`);

            const resolved = exec.resolveLocalEntrypoint('my-plugin:complex-skill');
            expect(resolved).toBe(filePath);
        });
    });

    // ─── hasSkillMd ─────────────────────────────────────────────────────────

    describe('hasSkillMd', () => {
        beforeEach(() => setupTempDir());
        afterEach(() => cleanupTempDir());

        it('returns false when SKILL.md does not exist', () => {
            const exec = new InlineExecutor(tempDir);
            expect(exec.hasSkillMd('rd3:no-skill-md')).toBe(false);
        });

        it('returns false for invalid skill ref', () => {
            const exec = new InlineExecutor(tempDir);
            expect(exec.hasSkillMd('invalid-ref')).toBe(false);
            expect(exec.hasSkillMd('')).toBe(false);
        });

        it('returns true when SKILL.md exists at skill root', () => {
            const exec = new InlineExecutor(tempDir);
            createSkillMd(tempDir, 'with-skill-md');
            expect(exec.hasSkillMd('rd3:with-skill-md')).toBe(true);
        });
    });

    // ─── execute ───────────────────────────────────────────────────────────
    // Note: execute tests use mockModuleLoader to avoid dynamic import() on temp .ts
    // files, which would leak into V8 coverage reports (coverageExclude is broken
    // in Bun 1.3.11 for files outside project root). resolveLocalEntrypoint still
    // uses real filesystem — dummy files provide path resolution without import.

    describe('execute', () => {
        beforeEach(() => setupTempDir());
        afterEach(() => cleanupTempDir());

        it('returns failure when no local entrypoint exists', async () => {
            const exec = new InlineExecutor(tempDir);
            const req = makeRequest({ skill: 'rd3:no-entry' });
            const result = await exec.execute(req);

            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(1);
            expect(result.stderr).toContain('does not expose a local in-process entrypoint');
            expect(result.timedOut).toBe(false);
            expect(result.durationMs).toBeGreaterThanOrEqual(0);
        });

        it('falls back to ACP when no script but SKILL.md exists', async () => {
            // Create SKILL.md but no script entry point
            createSkillMd(tempDir, 'skill-only-pkg');

            const exec = new InlineExecutor(tempDir);
            const req = makeRequest({ skill: 'rd3:skill-only-pkg' });
            const result = await exec.execute(req);

            // Should NOT return the "does not expose a local in-process entrypoint" error
            // Instead it attempts ACP fallback (which may succeed or fail depending on acpx availability)
            // The key is it doesn't immediately fail with the no-entrypoint error
            if (!result.success) {
                // If it fails via ACP fallback, error should mention ACP, not "local entrypoint"
                expect(result.stderr).not.toContain('does not expose a local in-process entrypoint');
            }
        });

        it('returns failure when entrypoint has no valid handler export', async () => {
            createDummyEntry(tempDir, 'bad-export');
            const loader = mockModuleLoader({ 'bad-export': {} });
            const exec = new InlineExecutor(tempDir, loader);

            const req = makeRequest({ skill: 'rd3:bad-export' });
            const result = await exec.execute(req);

            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(1);
            expect(result.stderr).toContain('must export');
            expect(result.stderr).toContain('runLocalPhase');
            expect(result.stderr).toContain('executeLocal');
        });

        it('executes runLocalPhase handler and returns success', async () => {
            createDummyEntry(tempDir, 'good-skill');
            const loader = mockModuleLoader({
                'good-skill': {
                    runLocalPhase: async () => ({
                        success: true as const,
                        exitCode: 0,
                        durationMs: 42,
                        timedOut: false,
                        stdout: 'ran',
                    }),
                },
            });
            const exec = new InlineExecutor(tempDir, loader);

            const req = makeRequest({ skill: 'rd3:good-skill' });
            const result = await exec.execute(req);

            expect(result.success).toBe(true);
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toBe('ran');
            expect(result.durationMs).toBeGreaterThanOrEqual(0);
        });

        it('executes executeLocal handler when runLocalPhase is absent', async () => {
            createDummyEntry(tempDir, 'alt-skill');
            const loader = mockModuleLoader({
                'alt-skill': {
                    executeLocal: async () => ({
                        success: true as const,
                        exitCode: 0,
                        durationMs: 50,
                        timedOut: false,
                        stdout: 'executed',
                    }),
                },
            });
            const exec = new InlineExecutor(tempDir, loader);

            const req = makeRequest({ skill: 'rd3:alt-skill' });
            const result = await exec.execute(req);

            expect(result.success).toBe(true);
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toBe('executed');
        });

        it('executes default export handler when others are absent', async () => {
            createDummyEntry(tempDir, 'default-skill');
            const loader = mockModuleLoader({
                'default-skill': {
                    default: async () => ({
                        success: true as const,
                        exitCode: 0,
                        durationMs: 60,
                        timedOut: false,
                        stdout: 'default-ran',
                    }),
                },
            });
            const exec = new InlineExecutor(tempDir, loader);

            const req = makeRequest({ skill: 'rd3:default-skill' });
            const result = await exec.execute(req);

            expect(result.success).toBe(true);
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toBe('default-ran');
        });

        it('catches exceptions from handler and returns failure', async () => {
            createDummyEntry(tempDir, 'thrower');
            const loader = mockModuleLoader({
                thrower: {
                    runLocalPhase: async () => {
                        throw new Error('boom');
                    },
                },
            });
            const exec = new InlineExecutor(tempDir, loader);

            const req = makeRequest({ skill: 'rd3:thrower' });
            const result = await exec.execute(req);

            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(1);
            expect(result.stderr).toBe('boom');
            expect(result.timedOut).toBe(false);
        });

        it('catches non-Error throws and stringifies them', async () => {
            createDummyEntry(tempDir, 'str-thrower');
            const loader = mockModuleLoader({
                'str-thrower': {
                    runLocalPhase: async () => {
                        throw 'string error';
                    },
                },
            });
            const exec = new InlineExecutor(tempDir, loader);

            const req = makeRequest({ skill: 'rd3:str-thrower' });
            const result = await exec.execute(req);

            expect(result.success).toBe(false);
            expect(result.stderr).toBe('string error');
        });

        it('preserves durationMs from handler when provided', async () => {
            createDummyEntry(tempDir, 'dur-skill');
            const loader = mockModuleLoader({
                'dur-skill': {
                    runLocalPhase: async () => ({
                        success: true as const,
                        exitCode: 0,
                        durationMs: 42,
                        timedOut: false,
                        stdout: 'ran',
                    }),
                },
            });
            const exec = new InlineExecutor(tempDir, loader);

            const req = makeRequest({ skill: 'rd3:dur-skill' });
            const result = await exec.execute(req);

            // The handler returns durationMs: 42
            expect(result.durationMs).toBe(42);
        });
    });

    describe('execute with default module loader', () => {
        // NOTE: We set up a temp skill directory so resolveLocalEntrypoint succeeds,
        // but we use a custom module loader that intercepts the import call.
        // This avoids dynamic import() on temp .ts files which leak into V8 coverage
        // reports. coverageExclude in bunfig.toml is not effective in Bun 1.3.11.
        beforeEach(() => setupTempDir());
        afterEach(() => cleanupTempDir());

        it('calls module loader with resolved entry path and propagates result', async () => {
            let capturedPath: string | null = null;
            const loader: (entryPath: string) => Promise<LocalEntryModule> = async (entryPath) => {
                capturedPath = entryPath;
                return {
                    runLocalPhase: async () => ({
                        success: true,
                        exitCode: 0,
                        durationMs: 1,
                        timedOut: false,
                        stdout: 'mocked',
                    }),
                };
            };

            // Create the skill dir so resolveLocalEntrypoint finds the entry point
            createDummyEntry(tempDir, 'test-skill');

            const exec = new InlineExecutor(tempDir, loader);
            const req = makeRequest({ skill: 'rd3:test-skill' });
            const result = await exec.execute(req);

            expect(capturedPath).not.toBeNull();
            expect(result.success).toBe(true);
            expect(result.stdout).toBe('mocked');
        });

        it('returns failure when module loader throws', async () => {
            const loader: (entryPath: string) => Promise<LocalEntryModule> = async () => {
                throw new Error('Module load failed');
            };

            // Create the skill dir so resolveLocalEntrypoint succeeds (returns a path)
            createDummyEntry(tempDir, 'test-skill');

            const exec = new InlineExecutor(tempDir, loader);
            const req = makeRequest({ skill: 'rd3:test-skill' });
            const result = await exec.execute(req);

            expect(result.success).toBe(false);
            expect(result.stderr).toContain('Module load failed');
        });
    });

    // ─── defaultModuleLoader (real import via project fixture) ──────────────
    // Exercises the real defaultModuleLoader (dynamic import) by pointing at a
    // fixture file inside the project tree. Project-relative imports don't leak
    // into V8 coverage because they're already tracked. Temp-dir imports DO leak
    // (coverageExclude doesn't apply to worker-spawned modules).

    describe('defaultModuleLoader via project fixture', () => {
        it('loads a real project-relative module via dynamic import', async () => {
            // tests/fixtures/inline-test-skill/scripts/run.ts exports runLocalPhase
            const fixtureBase = join(import.meta.dir, '..', '..', 'tests', 'fixtures');
            const exec = new InlineExecutor(fixtureBase); // no mock loader → uses defaultModuleLoader
            const req = makeRequest({ skill: 'rd3:inline-test-skill' });
            const result = await exec.execute(req);

            expect(result.success).toBe(true);
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toBe('fixture-ok');
        });
    });

    // ─── healthCheck ───────────────────────────────────────────────────────

    describe('healthCheck', () => {
        it('always returns healthy', async () => {
            const exec = new InlineExecutor();
            const health = await exec.healthCheck();
            expect(health.healthy).toBe(true);
            expect(health.lastChecked).toBeInstanceOf(Date);
        });
    });

    // ─── dispose ───────────────────────────────────────────────────────────

    describe('dispose', () => {
        it('completes without error', async () => {
            const exec = new InlineExecutor();
            expect(exec.dispose()).resolves.toBeUndefined();
        });
    });
});
