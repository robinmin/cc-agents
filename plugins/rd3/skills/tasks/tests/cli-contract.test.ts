import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dir, '../../../../..');
const scriptPath = join(repoRoot, 'plugins/rd3/skills/tasks/scripts/tasks.ts');

function runCli(cwd: string, args: string[]) {
    const result = Bun.spawnSync({
        cmd: ['bun', scriptPath, ...args],
        cwd,
        env: {
            ...process.env,
            CLAUDE_PLUGIN_ROOT: repoRoot,
        },
    });

    return {
        exitCode: result.exitCode,
        stdout: new TextDecoder().decode(result.stdout).trim(),
        stderr: new TextDecoder().decode(result.stderr).trim(),
    };
}

describe('tasks CLI contracts', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `tasks-cli-contract-test-${Date.now()}`);

    beforeEach(() => {
        mkdirSync(join(tempDir, 'docs'), { recursive: true });
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    test('create --json returns parseable output', () => {
        expect(runCli(tempDir, ['init']).exitCode).toBe(0);

        const result = runCli(tempDir, ['create', 'JSON Contract', '--json']);
        expect(result.exitCode).toBe(0);

        const payload = JSON.parse(result.stdout) as {
            ok: boolean;
            data: { wbs: string; path: string };
        };
        expect(payload.ok).toBe(true);
        expect(payload.data.wbs).toBe('0001');

        const content = readFileSync(payload.data.path, 'utf-8');
        expect(content).toContain('name: JSON Contract');
        expect(content).not.toContain('{ {');
    });

    test('update accepts lowercase statuses and emits JSON on dry run', () => {
        expect(runCli(tempDir, ['init']).exitCode).toBe(0);
        expect(runCli(tempDir, ['create', 'Status Parse']).exitCode).toBe(0);

        const result = runCli(tempDir, ['update', '0001', 'wip', '--dry-run', '--json']);
        expect(result.exitCode).toBe(0);

        const payload = JSON.parse(result.stdout) as {
            ok: boolean;
            data: { action: string; dryRun: boolean; newValue: string };
        };
        expect(payload.ok).toBe(true);
        expect(payload.data.action).toBe('status');
        expect(payload.data.dryRun).toBe(true);
        expect(payload.data.newValue).toBe('WIP');
    });

    test('check --json returns non-zero exit for warning-only tasks', () => {
        expect(runCli(tempDir, ['init']).exitCode).toBe(0);
        expect(runCli(tempDir, ['create', 'Needs Content']).exitCode).toBe(0);

        const taskPath = join(tempDir, 'docs/tasks/0001_Needs_Content.md');
        const taskContent = readFileSync(taskPath, 'utf-8').replace('status: Backlog', 'status: WIP');
        writeFileSync(taskPath, taskContent);

        const result = runCli(tempDir, ['check', '0001', '--json']);
        expect(result.exitCode).toBe(1);

        const payload = JSON.parse(result.stdout) as {
            ok: boolean;
            data: { valid: boolean; issues: string[] };
        };
        expect(payload.ok).toBe(true);
        expect(payload.data.valid).toBe(false);
        expect(payload.data.issues.some((issue) => issue.includes('[WARN]'))).toBe(true);
    });

    test('get --json returns file paths and artifact-type filtering works', () => {
        expect(runCli(tempDir, ['init']).exitCode).toBe(0);
        expect(runCli(tempDir, ['create', 'Artifact Task']).exitCode).toBe(0);

        const sourcePath = join(tempDir, 'design.png');
        writeFileSync(sourcePath, 'png-bytes');

        expect(runCli(tempDir, ['put', '0001', sourcePath, '--json']).exitCode).toBe(0);

        const allArtifacts = runCli(tempDir, ['get', '0001', '--json']);
        expect(allArtifacts.exitCode).toBe(0);
        const allPayload = JSON.parse(allArtifacts.stdout) as { ok: boolean; data: string[] };
        expect(allPayload.ok).toBe(true);
        expect(allPayload.data).toContain('docs/tasks/0001/design.png');

        const imageArtifacts = runCli(tempDir, ['get', '0001', '--artifact-type', 'image', '--json']);
        expect(imageArtifacts.exitCode).toBe(0);
        const filteredPayload = JSON.parse(imageArtifacts.stdout) as { ok: boolean; data: string[] };
        expect(filteredPayload.ok).toBe(true);
        expect(filteredPayload.data).toEqual(['docs/tasks/0001/design.png']);
    });

    test('batch-create human output includes TASKS footer', () => {
        expect(runCli(tempDir, ['init']).exitCode).toBe(0);

        const batchFile = join(tempDir, 'batch.json');
        writeFileSync(batchFile, JSON.stringify([{ name: 'One' }, { name: 'Two' }]));

        const result = runCli(tempDir, ['batch-create', '--from-json', batchFile]);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('<!-- TASKS:');
    });

    test('list human output renders a grouped kanban-style board', () => {
        expect(runCli(tempDir, ['init']).exitCode).toBe(0);
        expect(runCli(tempDir, ['create', 'Backlog Task']).exitCode).toBe(0);
        expect(runCli(tempDir, ['create', 'Done Task']).exitCode).toBe(0);
        expect(runCli(tempDir, ['update', '0002', 'done', '--force']).exitCode).toBe(0);

        const result = runCli(tempDir, ['list']);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('# Kanban Board - Primary');
        expect(result.stdout).toContain('## 🔴 Backlog');
        expect(result.stdout).toContain('_Queued work that is not ready to start yet. 1 task._');
        expect(result.stdout).toContain('[ ] 0001_Backlog_Task');
        expect(result.stdout).toContain('## 🟢 Done');
        expect(result.stdout).toContain('_Completed work. 1 task._');
        expect(result.stdout).toContain('[✓] 0002_Done_Task');
        expect(result.stdout).not.toContain('Tasks in docs/tasks');
        expect(result.stdout).not.toContain('[Done] 0002 Done Task');
    });

    test('list --all includes tasks from every configured folder while default stays focused', () => {
        expect(runCli(tempDir, ['init']).exitCode).toBe(0);
        expect(runCli(tempDir, ['create', 'Current Phase Task']).exitCode).toBe(0);
        expect(runCli(tempDir, ['create', 'Legacy Phase Task', '--folder', 'docs/prompts']).exitCode).toBe(0);

        const focused = runCli(tempDir, ['list']);
        expect(focused.exitCode).toBe(0);
        expect(focused.stdout).toContain('# Kanban Board - Primary');
        expect(focused.stdout).toContain('[ ] 0001_Current_Phase_Task');
        expect(focused.stdout).not.toContain('Legacy_Phase_Task');
        expect(focused.stdout).not.toContain('# Kanban Board - Legacy');

        const allFolders = runCli(tempDir, ['list', '--all']);
        expect(allFolders.exitCode).toBe(0);
        expect(allFolders.stdout).toContain('# Kanban Board - Primary');
        expect(allFolders.stdout).toContain('# Kanban Board - Legacy');
        expect(allFolders.stdout).toContain('[ ] 0001_Current_Phase_Task');
        expect(allFolders.stdout).toContain('[ ] 0002_Legacy_Phase_Task');
    });
});
