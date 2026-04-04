import { afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setGlobalSilent } from '../../../scripts/logger';
import {
    getWorkflowRunsRoot,
    getOrchestrationRunDir,
    getOrchestrationRunArtifactsDir,
    getRunIdFromStatePath,
    getOrchestrationArtifactsRootFromStatePath,
    findOrchestrationStatePath,
    getLockPath,
    createRunLock,
    releaseRunLock,
    isRunLocked,
} from '../scripts/state-paths';

beforeAll(() => {
    setGlobalSilent(true);
});

const tempDirs: string[] = [];

afterEach(() => {
    while (tempDirs.length > 0) {
        rmSync(tempDirs.pop() as string, { recursive: true, force: true });
    }
});

function createTempDir(prefix: string): string {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
}

describe('sanitizeTaskRef (via getOrchestrationRunDir)', () => {
    test('replaces non-word characters with underscores', () => {
        const stateDir = createTempDir('sp-sanitize-');
        const result = getOrchestrationRunDir('task with spaces', stateDir);
        expect(result).toContain('task_with_spaces');
    });

    test('preserves dots and hyphens', () => {
        const stateDir = createTempDir('sp-sanitize-');
        const result = getOrchestrationRunDir('my-task.v2', stateDir);
        expect(result).toContain('my-task.v2');
    });
});

describe('extractTaskFolderName (via getOrchestrationRunDir)', () => {
    test('uses WBS number from .md filename', () => {
        const stateDir = createTempDir('sp-extract-');
        const result = getOrchestrationRunDir('0292_Some_Task.md', stateDir);
        expect(result).toContain('0292');
        expect(result).not.toContain('Some');
    });

    test('uses full stem when no WBS number prefix', () => {
        const stateDir = createTempDir('sp-extract-');
        const result = getOrchestrationRunDir('my-task.md', stateDir);
        expect(result).toContain('my-task');
    });

    test('passes through non-.md refs sanitized', () => {
        const stateDir = createTempDir('sp-extract-');
        const result = getOrchestrationRunDir('just-a-ref', stateDir);
        expect(result).toContain('just-a-ref');
    });
});

describe('getWorkflowRunsRoot', () => {
    test('returns expected path structure', () => {
        const result = getWorkflowRunsRoot('/project');
        expect(result).toBe(join('/project', 'docs', '.workflow-runs', 'rd3-orchestration-dev'));
    });

    test('defaults to current directory', () => {
        const result = getWorkflowRunsRoot();
        expect(result).toBe(join('.', 'docs', '.workflow-runs', 'rd3-orchestration-dev'));
    });
});

describe('getOrchestrationRunDir', () => {
    test('returns path under workflow runs root', () => {
        const stateDir = createTempDir('sp-run-');
        const result = getOrchestrationRunDir('0292_Task.md', stateDir);
        const expected = join(stateDir, 'docs', '.workflow-runs', 'rd3-orchestration-dev', '0292');
        expect(result).toBe(expected);
    });

    test('handles numeric-only ref', () => {
        const stateDir = createTempDir('sp-run-');
        const result = getOrchestrationRunDir('0292', stateDir);
        expect(result).toContain('0292');
    });
});

describe('getOrchestrationRunArtifactsDir', () => {
    test('returns artifacts dir under run dir', () => {
        const stateDir = createTempDir('sp-art-');
        const result = getOrchestrationRunArtifactsDir('0292_Task.md', 'run-001', stateDir);
        const expected = join(stateDir, 'docs', '.workflow-runs', 'rd3-orchestration-dev', '0292', 'run-001');
        expect(result).toBe(expected);
    });
});

describe('getRunIdFromStatePath', () => {
    test('extracts run ID by stripping .json extension', () => {
        expect(getRunIdFromStatePath('/some/path/run-001.json')).toBe('run-001');
    });

    test('handles filenames with multiple dots', () => {
        expect(getRunIdFromStatePath('/path/to/my.run.v2.json')).toBe('my.run.v2');
    });

    test('returns full basename when no .json extension', () => {
        expect(getRunIdFromStatePath('/path/to/state-file')).toBe('state-file');
    });
});

describe('getOrchestrationArtifactsRootFromStatePath', () => {
    test('returns sibling directory named after run ID', () => {
        const statePath = '/project/docs/.workflow-runs/rd3-orchestration-dev/0292/run-001.json';
        const result = getOrchestrationArtifactsRootFromStatePath(statePath);
        expect(result).toBe('/project/docs/.workflow-runs/rd3-orchestration-dev/0292/run-001');
    });
});

describe('findOrchestrationStatePath', () => {
    test('returns null when run directory does not exist', () => {
        const stateDir = createTempDir('sp-find-');
        const result = findOrchestrationStatePath('0292', stateDir);
        expect(result).toBeNull();
    });

    test('returns null when run directory exists but has no JSON files', () => {
        const stateDir = createTempDir('sp-find-');
        const runDir = getOrchestrationRunDir('0292', stateDir);
        mkdirSync(runDir, { recursive: true });
        const result = findOrchestrationStatePath('0292', stateDir);
        expect(result).toBeNull();
    });

    test('returns latest JSON file when multiple exist', () => {
        const stateDir = createTempDir('sp-find-');
        const runDir = getOrchestrationRunDir('0292', stateDir);
        mkdirSync(runDir, { recursive: true });
        writeFileSync(join(runDir, 'run-001.json'), '{}');
        writeFileSync(join(runDir, 'run-002.json'), '{}');
        writeFileSync(join(runDir, 'run-003.json'), '{}');
        const result = findOrchestrationStatePath('0292', stateDir);
        expect(result).toBe(join(runDir, 'run-003.json'));
    });

    test('ignores non-JSON files', () => {
        const stateDir = createTempDir('sp-find-');
        const runDir = getOrchestrationRunDir('0292', stateDir);
        mkdirSync(runDir, { recursive: true });
        writeFileSync(join(runDir, 'notes.txt'), 'hello');
        writeFileSync(join(runDir, 'data.csv'), 'a,b');
        const result = findOrchestrationStatePath('0292', stateDir);
        expect(result).toBeNull();
    });

    test('handles .md task ref by extracting WBS', () => {
        const stateDir = createTempDir('sp-find-');
        const runDir = getOrchestrationRunDir('0292_Some_Task.md', stateDir);
        mkdirSync(runDir, { recursive: true });
        writeFileSync(join(runDir, 'run-001.json'), '{}');
        const result = findOrchestrationStatePath('0292_Some_Task.md', stateDir);
        expect(result).toBe(join(runDir, 'run-001.json'));
    });

    test('returns single JSON file path', () => {
        const stateDir = createTempDir('sp-find-');
        const runDir = getOrchestrationRunDir('my-task', stateDir);
        mkdirSync(runDir, { recursive: true });
        writeFileSync(join(runDir, 'abc.json'), '{"status":"done"}');
        const result = findOrchestrationStatePath('my-task', stateDir);
        expect(result).toBe(join(runDir, 'abc.json'));
    });

    test('sorts by created_at timestamp, newest last', () => {
        const stateDir = createTempDir('sp-find-ts-');
        const runDir = getOrchestrationRunDir('0292', stateDir);
        mkdirSync(runDir, { recursive: true });
        // Write files with different created_at timestamps
        writeFileSync(join(runDir, 'run-old.json'), JSON.stringify({ created_at: '2026-01-01T10:00:00Z' }));
        writeFileSync(join(runDir, 'run-new.json'), JSON.stringify({ created_at: '2026-06-15T10:00:00Z' }));
        writeFileSync(join(runDir, 'run-mid.json'), JSON.stringify({ created_at: '2026-03-01T10:00:00Z' }));
        const result = findOrchestrationStatePath('0292', stateDir);
        expect(result).toBe(join(runDir, 'run-new.json'));
    });

    test('handles JSON files without created_at by sorting empty strings first', () => {
        const stateDir = createTempDir('sp-find-no-ts-');
        const runDir = getOrchestrationRunDir('0292', stateDir);
        mkdirSync(runDir, { recursive: true });
        writeFileSync(join(runDir, 'run-no-ts.json'), '{}');
        writeFileSync(join(runDir, 'run-with-ts.json'), JSON.stringify({ created_at: '2026-06-01T10:00:00Z' }));
        const result = findOrchestrationStatePath('0292', stateDir);
        // The one with timestamp sorts after empty string
        expect(result).toBe(join(runDir, 'run-with-ts.json'));
    });

    test('handles malformed JSON files gracefully', () => {
        const stateDir = createTempDir('sp-find-bad-');
        const runDir = getOrchestrationRunDir('0292', stateDir);
        mkdirSync(runDir, { recursive: true });
        writeFileSync(join(runDir, 'bad.json'), 'NOT VALID JSON {{{');
        writeFileSync(join(runDir, 'good.json'), JSON.stringify({ created_at: '2026-06-01T10:00:00Z' }));
        const result = findOrchestrationStatePath('0292', stateDir);
        // bad.json gets createdAt='', good.json gets a real timestamp → good sorts last
        expect(result).toBe(join(runDir, 'good.json'));
    });

    test('all malformed JSON files — returns one of them as fallback', () => {
        const stateDir = createTempDir('sp-find-allbad-');
        const runDir = getOrchestrationRunDir('0292', stateDir);
        mkdirSync(runDir, { recursive: true });
        writeFileSync(join(runDir, 'aaa.json'), 'BROKEN');
        writeFileSync(join(runDir, 'zzz.json'), 'ALSO BROKEN');
        // Both get createdAt='', sort is stable by insertion order
        const result = findOrchestrationStatePath('0292', stateDir);
        expect(result).not.toBeNull();
        expect(result?.endsWith('.json')).toBe(true);
    });
});

describe('getLockPath', () => {
    test('returns .run.lock path inside run dir', () => {
        const result = getLockPath('/project/runs/0292');
        expect(result).toBe(join('/project/runs/0292', '.run.lock'));
    });
});

describe('createRunLock', () => {
    test('creates lock file with current PID and returns path', () => {
        const dir = createTempDir('sp-lock-create-');
        const result = createRunLock(dir);
        expect(result).toBe(join(dir, '.run.lock'));
        expect(existsSync(join(dir, '.run.lock'))).toBe(true);
        const content = readFileSync(join(dir, '.run.lock'), 'utf-8');
        expect(content).toBe(String(process.pid));
    });

    test('returns null when lock exists and process is still running', () => {
        const dir = createTempDir('sp-lock-busy-');
        // Write a lock with the current process PID (which is definitely running)
        writeFileSync(join(dir, '.run.lock'), String(process.pid), 'utf-8');
        const result = createRunLock(dir);
        expect(result).toBeNull();
    });

    test('overwrites stale lock when process is no longer running', () => {
        const dir = createTempDir('sp-lock-stale-');
        // Write a lock with a PID that definitely doesn't exist (99999999)
        writeFileSync(join(dir, '.run.lock'), '99999999', 'utf-8');
        const result = createRunLock(dir);
        expect(result).toBe(join(dir, '.run.lock'));
        const content = readFileSync(join(dir, '.run.lock'), 'utf-8');
        expect(content).toBe(String(process.pid));
    });

    test('overwrites corrupt lock file (non-numeric content)', () => {
        const dir = createTempDir('sp-lock-corrupt-');
        writeFileSync(join(dir, '.run.lock'), 'not-a-number', 'utf-8');
        const result = createRunLock(dir);
        expect(result).toBe(join(dir, '.run.lock'));
        const content = readFileSync(join(dir, '.run.lock'), 'utf-8');
        expect(content).toBe(String(process.pid));
    });

    test('overwrites empty lock file', () => {
        const dir = createTempDir('sp-lock-empty-');
        writeFileSync(join(dir, '.run.lock'), '', 'utf-8');
        const result = createRunLock(dir);
        expect(result).toBe(join(dir, '.run.lock'));
    });
});

describe('releaseRunLock', () => {
    test('removes lock file if it exists', () => {
        const dir = createTempDir('sp-lock-release-');
        writeFileSync(join(dir, '.run.lock'), String(process.pid), 'utf-8');
        expect(existsSync(join(dir, '.run.lock'))).toBe(true);
        releaseRunLock(dir);
        expect(existsSync(join(dir, '.run.lock'))).toBe(false);
    });

    test('does nothing when lock file does not exist', () => {
        const dir = createTempDir('sp-lock-release-no-');
        expect(existsSync(join(dir, '.run.lock'))).toBe(false);
        // Should not throw
        releaseRunLock(dir);
        expect(existsSync(join(dir, '.run.lock'))).toBe(false);
    });
});

describe('isRunLocked', () => {
    test('returns false when no lock file exists', () => {
        const dir = createTempDir('sp-lock-check-');
        expect(isRunLocked(dir)).toBe(false);
    });

    test('returns true when lock file has active PID', () => {
        const dir = createTempDir('sp-lock-active-');
        writeFileSync(join(dir, '.run.lock'), String(process.pid), 'utf-8');
        expect(isRunLocked(dir)).toBe(true);
    });

    test('returns false when lock file has stale PID (dead process)', () => {
        const dir = createTempDir('sp-lock-stale-');
        writeFileSync(join(dir, '.run.lock'), '99999999', 'utf-8');
        expect(isRunLocked(dir)).toBe(false);
    });

    test('returns false when lock file has non-numeric content', () => {
        const dir = createTempDir('sp-lock-nonum-');
        writeFileSync(join(dir, '.run.lock'), 'garbage', 'utf-8');
        expect(isRunLocked(dir)).toBe(false);
    });

    test('returns false when lock file is empty', () => {
        const dir = createTempDir('sp-lock-emptychk-');
        writeFileSync(join(dir, '.run.lock'), '', 'utf-8');
        expect(isRunLocked(dir)).toBe(false);
    });
});

describe('lock lifecycle', () => {
    test('full create → check → release → check cycle', () => {
        const dir = createTempDir('sp-lock-lifecycle-');
        // Initially unlocked
        expect(isRunLocked(dir)).toBe(false);

        // Create lock
        const lockPath = createRunLock(dir);
        expect(lockPath).toBe(join(dir, '.run.lock'));
        expect(isRunLocked(dir)).toBe(true);

        // Second lock attempt fails (same PID = active)
        expect(createRunLock(dir)).toBeNull();

        // Release
        releaseRunLock(dir);
        expect(isRunLocked(dir)).toBe(false);

        // Can create again after release
        const lockPath2 = createRunLock(dir);
        expect(lockPath2).toBe(join(dir, '.run.lock'));
        expect(isRunLocked(dir)).toBe(true);

        // Cleanup
        releaseRunLock(dir);
    });
});
