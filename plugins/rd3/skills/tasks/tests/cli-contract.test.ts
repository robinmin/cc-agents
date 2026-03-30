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

async function runCliAsync(cwd: string, args: string[]) {
    const child = Bun.spawn({
        cmd: ['bun', scriptPath, ...args],
        cwd,
        env: {
            ...process.env,
            CLAUDE_PLUGIN_ROOT: repoRoot,
        },
        stdout: 'pipe',
        stderr: 'pipe',
    });

    const [exitCode, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
    ]);

    return {
        exitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
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

    test('create preserves rich decomposition fields passed on the CLI', () => {
        expect(runCli(tempDir, ['init']).exitCode).toBe(0);

        const result = runCli(tempDir, [
            'create',
            'Rich CLI Contract',
            '--background',
            'Why this work exists.',
            '--requirements',
            '- Requirement 1\n- Requirement 2',
            '--solution',
            'Implement the documented handoff path.',
            '--priority',
            'high',
            '--estimated-hours',
            '5',
            '--dependencies',
            '0001,0002',
            '--tags',
            'planning,workflow-core',
            '--json',
        ]);
        expect(result.exitCode).toBe(0);

        const payload = JSON.parse(result.stdout) as {
            ok: boolean;
            data: { wbs: string; path: string };
        };
        expect(payload.ok).toBe(true);

        const content = readFileSync(payload.data.path, 'utf-8');
        expect(content).toContain('description: Rich CLI Contract');
        expect(content).toContain('priority: "high"');
        expect(content).toContain('estimated_hours: 5');
        expect(content).toContain('dependencies: ["0001","0002"]');
        expect(content).toContain('tags: ["planning","workflow-core"]');
        expect(content).toContain('### Background\n\nWhy this work exists.');
        expect(content).toContain('### Solution\n\nImplement the documented handoff path.');
    });

    test('create accepts profile and update can modify it as a frontmatter field', () => {
        expect(runCli(tempDir, ['init']).exitCode).toBe(0);

        const createResult = runCli(tempDir, ['create', 'Profiled Task', '--profile', 'simple', '--json']);
        expect(createResult.exitCode).toBe(0);

        const createPayload = JSON.parse(createResult.stdout) as {
            ok: boolean;
            data: { path: string };
        };
        expect(createPayload.ok).toBe(true);

        let content = readFileSync(createPayload.data.path, 'utf-8');
        expect(content).toContain('profile: "simple"');

        const updateResult = runCli(tempDir, ['update', '0001', '--field', 'profile', '--value', 'research', '--json']);
        expect(updateResult.exitCode).toBe(0);

        const updatePayload = JSON.parse(updateResult.stdout) as {
            ok: boolean;
            data: { action: string; newValue: string };
        };
        expect(updatePayload.ok).toBe(true);
        expect(updatePayload.data.action).toBe('field');
        expect(updatePayload.data.newValue).toBe('research');

        content = readFileSync(createPayload.data.path, 'utf-8');
        expect(content).toContain('profile: "research"');
    });

    test('update phase modifies the indented impl_progress frontmatter block', () => {
        expect(runCli(tempDir, ['init']).exitCode).toBe(0);
        expect(runCli(tempDir, ['create', 'Phase Update']).exitCode).toBe(0);

        const result = runCli(tempDir, [
            'update',
            '0001',
            '--phase',
            'planning',
            '--phase-status',
            'completed',
            '--json',
        ]);
        expect(result.exitCode).toBe(0);

        const payload = JSON.parse(result.stdout) as {
            ok: boolean;
            data: { action: string; newValue: string };
        };
        expect(payload.ok).toBe(true);
        expect(payload.data.action).toBe('phase');
        expect(payload.data.newValue).toBe('completed');

        const taskPath = join(tempDir, 'docs/tasks/0001_Phase_Update.md');
        const content = readFileSync(taskPath, 'utf-8');
        expect(content).toContain('impl_progress:');
        expect(content).toContain('  planning: completed');
    });

    test('update --section can modify the first markdown section', () => {
        expect(runCli(tempDir, ['init']).exitCode).toBe(0);
        expect(runCli(tempDir, ['create', 'Background Update']).exitCode).toBe(0);

        const sectionFile = join(tempDir, 'background.md');
        writeFileSync(sectionFile, 'Updated background content.\n');

        const result = runCli(tempDir, [
            'update',
            '0001',
            '--section',
            'Background',
            '--from-file',
            sectionFile,
            '--json',
        ]);
        expect(result.exitCode).toBe(0);

        const payload = JSON.parse(result.stdout) as {
            ok: boolean;
            data: { action: string; newValue: string };
        };
        expect(payload.ok).toBe(true);
        expect(payload.data.action).toBe('section');
        expect(payload.data.newValue).toBe('Background');

        const taskPath = join(tempDir, 'docs/tasks/0001_Background_Update.md');
        const content = readFileSync(taskPath, 'utf-8');
        expect(content).toContain('### Background\n\nUpdated background content.');
    });

    test('update accepts lowercase statuses and emits JSON on dry run', () => {
        expect(runCli(tempDir, ['init']).exitCode).toBe(0);
        expect(runCli(tempDir, ['create', 'Status Parse']).exitCode).toBe(0);

        // Pre-populate sections required for WIP transition (Background + Requirements)
        const taskPath = join(tempDir, 'docs/tasks/0001_Status_Parse.md');
        const taskContent = readFileSync(taskPath, 'utf-8')
            .replace('### Background\n\n', '### Background\n\nWe need this feature.\n')
            .replace('### Requirements\n\n', '### Requirements\n\nImplement the feature.\n');
        writeFileSync(taskPath, taskContent);

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

    test('batch-create can extract task definitions from an agent TASKS footer', () => {
        expect(runCli(tempDir, ['init']).exitCode).toBe(0);

        const agentOutput = join(tempDir, 'analysis.md');
        writeFileSync(
            agentOutput,
            [
                '# Analysis',
                '',
                'Some planning notes.',
                '',
                '<!-- TASKS:',
                JSON.stringify(
                    [
                        {
                            name: 'Agent Footer One',
                            background: 'Created from agent output.',
                            requirements: 'Must preserve structured footer fields.',
                            solution: 'Parse the footer and create the task.',
                            priority: 'medium',
                            estimated_hours: 3,
                            dependencies: ['0007'],
                            tags: ['agent-output'],
                        },
                    ],
                    null,
                    2,
                ),
                '-->',
            ].join('\n'),
        );

        const result = runCli(tempDir, ['batch-create', '--from-agent-output', agentOutput, '--json']);
        expect(result.exitCode).toBe(0);

        const payload = JSON.parse(result.stdout) as {
            ok: boolean;
            data: { created: string[]; errors: string[] };
        };
        expect(payload.ok).toBe(true);
        expect(payload.data.created).toEqual(['0001']);
        expect(payload.data.errors).toEqual([]);

        const content = readFileSync(join(tempDir, 'docs/tasks/0001_Agent_Footer_One.md'), 'utf-8');
        expect(content).toContain('priority: "medium"');
        expect(content).toContain('estimated_hours: 3');
        expect(content).toContain('dependencies: ["0007"]');
        expect(content).toContain('tags: ["agent-output"]');
        expect(content).toContain('### Solution\n\nParse the footer and create the task.');
    });

    test('concurrent create commands allocate unique WBS numbers', async () => {
        expect(runCli(tempDir, ['init']).exitCode).toBe(0);

        const results = await Promise.all(
            Array.from({ length: 4 }, (_, index) =>
                runCliAsync(tempDir, ['create', `Concurrent ${index + 1}`, '--json']),
            ),
        );

        for (const result of results) {
            expect(result.exitCode).toBe(0);
        }

        const payloads = results.map(
            (result) =>
                JSON.parse(result.stdout) as {
                    ok: boolean;
                    data: { wbs: string; path: string };
                },
        );

        const wbsValues = payloads.map((payload) => payload.data.wbs).sort();
        expect(new Set(wbsValues).size).toBe(4);
        expect(wbsValues).toEqual(['0001', '0002', '0003', '0004']);

        for (const payload of payloads) {
            expect(payload.ok).toBe(true);
            const content = readFileSync(payload.data.path, 'utf-8');
            expect(content).toContain(`## ${payload.data.wbs}.`);
        }
    });

    test('list human output renders a grouped kanban-style board', () => {
        expect(runCli(tempDir, ['init']).exitCode).toBe(0);
        expect(runCli(tempDir, ['create', 'Backlog Task']).exitCode).toBe(0);
        expect(runCli(tempDir, ['create', 'Done Task']).exitCode).toBe(0);

        // Pre-populate all sections required for Done transition
        const doneTaskPath = join(tempDir, 'docs/tasks/0002_Done_Task.md');
        const doneTaskContent = readFileSync(doneTaskPath, 'utf-8')
            .replace('### Background\n\n', '### Background\n\nDone task background.\n')
            .replace('### Requirements\n\n', '### Requirements\n\nDone task requirements.\n')
            .replace('### Q&A\n\n', '### Q&A\n\nDone task clarifications.\n')
            .replace('### Design\n\n', '### Design\n\nDone task design.\n')
            .replace('### Solution\n\n', '### Solution\n\nDone task solution.\n')
            .replace('### Plan\n\n', '### Plan\n\n- [x] Done task plan step 1\n');
        writeFileSync(doneTaskPath, doneTaskContent);

        expect(runCli(tempDir, ['update', '0002', 'done']).exitCode).toBe(0);

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
