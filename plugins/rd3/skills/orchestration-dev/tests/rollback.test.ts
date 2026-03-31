import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, test } from 'bun:test';
import {
    captureSnapshot,
    executeUndo,
    finalizeSnapshot,
    main as rollbackMain,
    restoreSnapshot,
} from '../scripts/rollback';
import type { RollbackSnapshot } from '../scripts/model';
import { getOrchestrationStatePath } from '../scripts/runtime';

function createTempDir(prefix: string): string {
    const dir = join(process.env.TMPDIR ?? '/tmp', `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    mkdirSync(dir, { recursive: true });
    return dir;
}

function initGitRepo(dir: string): void {
    const runGit = (...args: string[]) => {
        const result = Bun.spawnSync({
            cmd: ['git', ...args],
            cwd: dir,
            stdout: 'pipe',
            stderr: 'pipe',
        });
        expect(result.exitCode).toBe(0);
    };

    runGit('init');
    runGit('config', 'user.email', 'test@test.com');
    runGit('config', 'user.name', 'Test');
    writeFileSync(join(dir, 'initial.txt'), 'initial content');
    runGit('add', '.');
    runGit('commit', '-m', 'initial');
}

function writeCanonicalState(dir: string, taskRef: string, state: unknown, runId = 'test-run'): string {
    const statePath = getOrchestrationStatePath(taskRef, dir, runId);
    mkdirSync(dirname(statePath), { recursive: true });
    writeFileSync(statePath, JSON.stringify(state), 'utf-8');
    return statePath;
}

describe('rollback', () => {
    const tempDirs: string[] = [];

    afterEach(() => {
        for (const dir of tempDirs) {
            try {
                rmSync(dir, { recursive: true, force: true });
            } catch {
                // ignore cleanup errors
            }
        }
        tempDirs.length = 0;
    });

    function trackDir(dir: string): string {
        tempDirs.push(dir);
        return dir;
    }

    describe('captureSnapshot', () => {
        test('captures current file list and git HEAD', () => {
            const dir = trackDir(createTempDir('rollback-snapshot'));
            initGitRepo(dir);

            const snapshot = captureSnapshot(dir, 5);

            expect(snapshot.phase).toBe(5);
            expect(snapshot.files_before).toContain('initial.txt');
            expect(snapshot.git_head_before).toMatch(/^[0-9a-f]{40}$/);
            expect(snapshot.files_after).toEqual([]);
            expect(snapshot.created_at).toBeTruthy();
        });
    });

    describe('finalizeSnapshot', () => {
        test('captures files_after after changes', () => {
            const dir = trackDir(createTempDir('rollback-finalize'));
            initGitRepo(dir);

            const snapshot = captureSnapshot(dir, 5);
            writeFileSync(join(dir, 'new-file.txt'), 'new content');

            const finalized = finalizeSnapshot(dir, snapshot);

            expect(finalized.files_after).toContain('initial.txt');
            expect(finalized.files_after).toContain('new-file.txt');
            expect(finalized.files_before).not.toContain('new-file.txt');
        });
    });

    describe('restoreSnapshot', () => {
        test('removes new files created during phase', () => {
            const dir = trackDir(createTempDir('rollback-restore-new'));
            initGitRepo(dir);

            const snapshot = captureSnapshot(dir, 5);
            writeFileSync(join(dir, 'created-by-phase.txt'), 'phase output');

            const finalized = finalizeSnapshot(dir, snapshot);
            const result = restoreSnapshot(dir, finalized);

            expect(result.removed).toContain('created-by-phase.txt');
            expect(result.errors).toHaveLength(0);
        });

        test('restores modified tracked files', () => {
            const dir = trackDir(createTempDir('rollback-restore-mod'));
            initGitRepo(dir);
            writeFileSync(join(dir, 'phase-owned.txt'), 'clean content');
            Bun.spawnSync({ cmd: ['git', 'add', '.'], cwd: dir });
            Bun.spawnSync({ cmd: ['git', 'commit', '-m', 'add phase-owned'], cwd: dir });

            const snapshot = captureSnapshot(dir, 5);
            writeFileSync(join(dir, 'phase-owned.txt'), 'modified content');

            const finalized = finalizeSnapshot(dir, snapshot);
            const result = restoreSnapshot(dir, finalized);

            expect(result.restored).toContain('phase-owned.txt');
        });

        test('does not reset files that already had uncommitted edits before the phase', () => {
            const dir = trackDir(createTempDir('rollback-restore-dirty'));
            initGitRepo(dir);
            writeFileSync(join(dir, 'phase-owned.txt'), 'clean content');
            Bun.spawnSync({ cmd: ['git', 'add', '.'], cwd: dir });
            Bun.spawnSync({ cmd: ['git', 'commit', '-m', 'add phase-owned'], cwd: dir });

            writeFileSync(join(dir, 'initial.txt'), 'user draft before snapshot');
            const snapshot = captureSnapshot(dir, 5);

            writeFileSync(join(dir, 'initial.txt'), 'user draft before snapshot plus phase edits');
            writeFileSync(join(dir, 'phase-owned.txt'), 'phase-only changes');

            const finalized = finalizeSnapshot(dir, snapshot);
            const result = restoreSnapshot(dir, finalized);

            expect(result.restored).toContain('phase-owned.txt');
            expect(result.restored).not.toContain('initial.txt');
            expect(readFileSync(join(dir, 'initial.txt'), 'utf-8')).toBe('user draft before snapshot plus phase edits');
        });
    });

    describe('executeUndo', () => {
        test('reports errors when no orchestration state exists', () => {
            const dir = trackDir(createTempDir('rollback-undo-nostate'));

            const result = executeUndo({ task_ref: '0292', phase: 5, dry_run: false }, dir);

            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.state_cleared).toBe(false);
        });

        test('dry run reports files but does not modify state', () => {
            const dir = trackDir(createTempDir('rollback-undo-dryrun'));
            initGitRepo(dir);

            const snapshot: RollbackSnapshot = {
                phase: 5,
                files_before: ['initial.txt'],
                files_after: ['initial.txt', 'new-file.txt'],
                git_head_before: 'abc123',
                created_at: new Date().toISOString(),
            };

            const state = {
                phases: [
                    {
                        number: 5,
                        status: 'completed',
                        rollback_snapshot: snapshot,
                    },
                ],
            };

            writeCanonicalState(dir, '0292', state);

            const result = executeUndo({ task_ref: '0292', phase: 5, dry_run: true }, dir);

            expect(result.dry_run).toBe(true);
            expect(result.state_cleared).toBe(false);
        });

        test('reports error when phase is not completed', () => {
            const dir = trackDir(createTempDir('rollback-undo-notdone'));

            const state = {
                phases: [{ number: 5, status: 'running' }],
            };

            writeCanonicalState(dir, '0292', state);

            const result = executeUndo({ task_ref: '0292', phase: 5, dry_run: false }, dir);

            expect(result.errors).toContain(
                'Phase 5 is not completed (status: running). Can only undo completed phases.',
            );
        });

        test('reports error when phase is not found in state', () => {
            const dir = trackDir(createTempDir('rollback-undo-nophase'));
            initGitRepo(dir);

            const state = {
                phases: [{ number: 5, status: 'completed' }],
            };

            writeCanonicalState(dir, '0292', state);

            const result = executeUndo({ task_ref: '0292', phase: 7, dry_run: false }, dir);

            expect(result.errors).toContain('Phase 7 not found in orchestration state');
        });

        test('reports error when no rollback snapshot exists', () => {
            const dir = trackDir(createTempDir('rollback-undo-nosnap'));
            initGitRepo(dir);

            const state = {
                phases: [{ number: 5, status: 'completed' }],
            };

            writeCanonicalState(dir, '0292', state);

            const result = executeUndo({ task_ref: '0292', phase: 5, dry_run: false }, dir);

            expect(result.errors).toContain('No rollback snapshot found for phase 5. Cannot undo without a snapshot.');
        });

        test('performs full undo and clears phase state', () => {
            const dir = trackDir(createTempDir('rollback-undo-full'));
            initGitRepo(dir);

            const snapshot: RollbackSnapshot = {
                phase: 5,
                files_before: ['initial.txt'],
                files_after: ['initial.txt'],
                git_head_before: 'abc123',
                created_at: new Date().toISOString(),
            };

            const state = {
                phases: [
                    {
                        number: 5,
                        status: 'completed',
                        completed_at: new Date().toISOString(),
                        result: { status: 'completed' },
                        rollback_snapshot: snapshot,
                    },
                ],
            };

            const statePath = writeCanonicalState(dir, '0292', state);

            const result = executeUndo({ task_ref: '0292', phase: 5, dry_run: false }, dir);

            expect(result.state_cleared).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.phases_cleared).toEqual([5]);

            // Verify state was cleared
            const updatedState = JSON.parse(readFileSync(statePath, 'utf-8'));
            expect(updatedState.phases[0].status).toBe('pending');
            expect(updatedState.phases[0].completed_at).toBeUndefined();
            expect(updatedState.phases[0].result).toBeUndefined();
            expect(updatedState.phases[0].rollback_snapshot).toBeUndefined();
        });

        test('clears error field when present during undo', () => {
            const dir = trackDir(createTempDir('rollback-undo-error'));
            initGitRepo(dir);

            const snapshot: RollbackSnapshot = {
                phase: 5,
                files_before: ['initial.txt'],
                files_after: ['initial.txt'],
                git_head_before: 'abc123',
                created_at: new Date().toISOString(),
            };

            const state = {
                phases: [
                    {
                        number: 5,
                        status: 'completed',
                        completed_at: new Date().toISOString(),
                        error: 'some previous error',
                        rollback_snapshot: snapshot,
                    },
                ],
            };

            const statePath = writeCanonicalState(dir, '0292', state);

            const result = executeUndo({ task_ref: '0292', phase: 5, dry_run: false }, dir);

            expect(result.state_cleared).toBe(true);
            const updatedState = JSON.parse(readFileSync(statePath, 'utf-8'));
            expect(updatedState.phases[0].error).toBeUndefined();
        });

        test('clears completed downstream phases when undoing an earlier phase', () => {
            const dir = trackDir(createTempDir('rollback-undo-downstream'));
            initGitRepo(dir);

            const snapshot: RollbackSnapshot = {
                phase: 5,
                files_before: ['initial.txt'],
                files_after: ['initial.txt'],
                git_head_before: 'abc123',
                created_at: new Date().toISOString(),
            };

            const state = {
                phases: [
                    {
                        number: 5,
                        status: 'completed',
                        completed_at: new Date().toISOString(),
                        result: { status: 'completed', phase: 5 },
                        rollback_snapshot: snapshot,
                    },
                    {
                        number: 6,
                        status: 'completed',
                        completed_at: new Date().toISOString(),
                        result: { status: 'completed', phase: 6 },
                    },
                    {
                        number: 7,
                        status: 'completed',
                        completed_at: new Date().toISOString(),
                        result: { status: 'completed', phase: 7 },
                    },
                    {
                        number: 8,
                        status: 'pending',
                    },
                ],
            };

            const statePath = writeCanonicalState(dir, '0292', state);

            const result = executeUndo({ task_ref: '0292', phase: 5, dry_run: false }, dir);

            expect(result.state_cleared).toBe(true);
            expect(result.phases_cleared).toEqual([5, 6, 7]);
            const updatedState = JSON.parse(readFileSync(statePath, 'utf-8'));
            expect(updatedState.phases[0].status).toBe('pending');
            expect(updatedState.phases[1].status).toBe('pending');
            expect(updatedState.phases[2].status).toBe('pending');
            expect(updatedState.phases[1].result).toBeUndefined();
            expect(updatedState.phases[2].result).toBeUndefined();
        });
    });

    describe('main', () => {
        const originalExit = process.exit;
        const originalCwd = process.cwd();

        afterEach(() => {
            process.exit = originalExit;
            process.chdir(originalCwd);
        });

        test('exits with usage error when no arguments', async () => {
            expect(await rollbackMain([])).toBe(1);
        });

        test('exits with usage error when --undo is missing', async () => {
            expect(await rollbackMain(['0292'])).toBe(1);
        });

        test('exits with error for invalid phase 0', async () => {
            expect(await rollbackMain(['--undo', '0292', '0'])).toBe(1);
        });

        test('exits with error for phase > 9', async () => {
            expect(await rollbackMain(['--undo', '0292', '11'])).toBe(1);
        });

        test('exits with error when no state file exists', async () => {
            const dir = trackDir(createTempDir('rollback-main-nostate'));
            process.chdir(dir);
            expect(await rollbackMain(['--undo', '0292', '5'])).toBe(1);
        });
    });
});
