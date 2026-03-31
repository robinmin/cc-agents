import { afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
        const expected = join(
            stateDir,
            'docs',
            '.workflow-runs',
            'rd3-orchestration-dev',
            '0292',
            'run-001',
        );
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
});
