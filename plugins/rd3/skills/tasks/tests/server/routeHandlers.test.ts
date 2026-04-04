import { describe, expect, it, beforeEach, afterEach, spyOn } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { EventBroadcaster } from '../../scripts/server/sse';
import type { Broadcaster } from '../../scripts/server/types';
import {
    healthHandler,
    listTasksHandler,
    createTaskHandler,
    showTaskHandler,
    updateTaskHandler,
    deleteTaskHandler,
    putArtifactHandler,
    getArtifactsHandler,
    treeHandler,
    checkHandler,
    batchCreateHandler,
    refreshHandler,
    getConfigHandler,
    updateConfigHandler,
    eventsHandler,
    getTemplateHandler,
    taskActionHandler,
} from '../../scripts/server/routeHandlers';
import { setGlobalSilent } from '../../../../scripts/logger';

const noopBroadcaster: Broadcaster = {
    broadcast() {},
};

function writeConfig(tempDir: string, folder = 'docs/tasks'): void {
    mkdirSync(join(tempDir, 'docs', '.tasks'), { recursive: true });
    mkdirSync(join(tempDir, folder), { recursive: true });
    writeFileSync(
        join(tempDir, 'docs', '.tasks', 'config.jsonc'),
        JSON.stringify({
            $schema_version: 1,
            active_folder: folder,
            folders: { [folder]: { base_counter: 0 } },
        }),
    );
}

function writeTask(tempDir: string, wbs: string, status = 'Backlog', folder = 'docs/tasks'): void {
    writeFileSync(
        join(tempDir, folder, `${wbs}_Test.md`),
        `---
wbs: "${wbs}"
name: "Test"
status: ${status}
type: task
created_at: 2026-01-01T00:00:00Z
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---
### Background
This is a test background content.
### Requirements
This is a test requirements content.
### Design
This is a test design content.
### Solution
This is a test solution content.
### Plan
This is a test plan content.
### Q&A
This is a test Q&A content.
`,
    );
}

describe('routeHandlers tests', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `tasks-server-test-${Date.now()}`);
    const folder = 'docs/tasks';
    let spawnSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
        writeConfig(tempDir, folder);
        setGlobalSilent(true);
        spawnSpy = spyOn(Bun, 'spawn').mockImplementation(
            () =>
                ({
                    pid: 123,
                    exitCode: Promise.resolve(0),
                }) as unknown as ReturnType<typeof Bun.spawn>,
        );
    });

    afterEach(() => {
        setGlobalSilent(false);
        rmSync(tempDir, { recursive: true, force: true });
        spawnSpy.mockRestore();
    });

    // --- Helpers ---
    async function getJson(res: Response): Promise<Record<string, unknown>> {
        return (await res.json()) as Record<string, unknown>;
    }

    it('healthHandler returns uptime', async () => {
        const res = await healthHandler(tempDir, new Request('http://localhost/health'), {}, noopBroadcaster);
        expect(res.status).toBe(200);
        const body = await getJson(res);
        expect(body.ok).toBe(true);
    });

    describe('listTasksHandler', () => {
        it('returns task list', async () => {
            writeTask(tempDir, '0001');
            const res = await listTasksHandler(tempDir, new Request('http://localhost/tasks'), {}, noopBroadcaster);
            const body = await getJson(res);
            expect(body.ok).toBe(true);
            expect(Array.isArray(body.data)).toBe(true);
        });

        it('filters by status', async () => {
            writeTask(tempDir, '0001', 'Done');
            const res = await listTasksHandler(
                tempDir,
                new Request('http://localhost/tasks?status=done'),
                {},
                noopBroadcaster,
            );
            expect((await getJson(res)).ok).toBe(true);
        });

        it('rejects invalid status', async () => {
            const res = await listTasksHandler(
                tempDir,
                new Request('http://localhost/tasks?status=invalid'),
                {},
                noopBroadcaster,
            );
            expect(res.status).toBe(400);
        });

        it('returns err on internal error', async () => {
            // Remove the Tasks root logic handles internal task errors gracefully.
            // We'll rename the folder to force a failure.
            rmSync(join(tempDir, folder), { recursive: true });
            const res = await listTasksHandler(tempDir, new Request('http://localhost/tasks'), {}, noopBroadcaster);
            const body = await getJson(res);
            expect(body.ok).toBe(false);
        });
    });

    describe('createTaskHandler', () => {
        it('creates a task', async () => {
            const bc = new EventBroadcaster();
            let events = 0;
            bc.broadcast = () => {
                events++;
            };

            const req = new Request('http://localhost/tasks', {
                method: 'POST',
                body: JSON.stringify({ name: 'Hello', background: 'bg' }),
            });
            const res = await createTaskHandler(tempDir, req, {}, bc);
            const body = await getJson(res);
            expect(body.ok).toBe(true);
            expect(events).toBe(1);
        });

        it('rejects invalid json', async () => {
            const req = new Request('http://localhost/tasks', { method: 'POST', body: 'not-json' });
            const res = await createTaskHandler(tempDir, req, {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);
        });

        it('rejects missing name', async () => {
            const req = new Request('http://localhost/tasks', { method: 'POST', body: JSON.stringify({}) });
            const res = await createTaskHandler(tempDir, req, {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);
        });

        it('rejects folders that are not configured', async () => {
            const req = new Request('http://localhost/tasks', {
                method: 'POST',
                body: JSON.stringify({ name: 'Hello', folder: 'docs/unconfigured' }),
            });
            const res = await createTaskHandler(tempDir, req, {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);
        });

        it('returns format errors from createTask', async () => {
            // force error e.g. folder unwritable
            chmodSync(join(tempDir, folder), 0o444);
            const req = new Request('http://localhost/tasks', {
                method: 'POST',
                body: JSON.stringify({ name: 'Fail' }),
            });
            const res = await createTaskHandler(tempDir, req, {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);
            chmodSync(join(tempDir, folder), 0o755);
        });

        it('creates a task with raw content', async () => {
            const req = new Request('http://localhost/tasks', {
                method: 'POST',
                body: JSON.stringify({
                    name: 'RawContent',
                    content: '---\nwbs: "0005"\nname: "RawContent"\n---\n### Background\nRaw Bg',
                }),
            });
            const res = await createTaskHandler(tempDir, req, {}, noopBroadcaster);
            const body = await getJson(res);
            expect(body.ok).toBe(true);
        });
    });

    describe('showTaskHandler & getArtifactsHandler & tree & check', () => {
        it('returns task info', async () => {
            writeTask(tempDir, '0123');
            let res = await showTaskHandler(
                tempDir,
                new Request('http://localhost/tasks/0123'),
                { wbs: '0123' },
                noopBroadcaster,
            );
            expect((await getJson(res)).ok).toBe(true);

            res = await getArtifactsHandler(
                tempDir,
                new Request('http://local/tasks/0123/artifacts'),
                { wbs: '0123' },
                noopBroadcaster,
            );
            expect((await getJson(res)).ok).toBe(true);

            res = await treeHandler(
                tempDir,
                new Request('http://local/tasks/0123/tree'),
                { wbs: '0123' },
                noopBroadcaster,
            );
            expect((await getJson(res)).ok).toBe(true);

            res = await checkHandler(
                tempDir,
                new Request('http://local/tasks/0123/check'),
                { wbs: '0123' },
                noopBroadcaster,
            );
            expect((await getJson(res)).ok).toBe(true);
        });

        it('returns errors when missing wbs param or not found', async () => {
            let res = await showTaskHandler(tempDir, new Request('http://loc'), {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);
            res = await showTaskHandler(tempDir, new Request('http://loc'), { wbs: '9999' }, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);

            res = await getArtifactsHandler(tempDir, new Request('http://loc'), {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);
            res = await getArtifactsHandler(tempDir, new Request('http://loc'), { wbs: '9999' }, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);

            res = await treeHandler(tempDir, new Request('http://loc'), {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);

            res = await checkHandler(tempDir, new Request('http://loc'), {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);
            res = await checkHandler(tempDir, new Request('http://loc'), { wbs: '9999' }, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);
        });
    });

    describe('updateTaskHandler', () => {
        beforeEach(() => writeTask(tempDir, '0001'));

        it('missing wbs parameter', async () => {
            const res = await updateTaskHandler(tempDir, new Request('http://loc'), {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);
        });

        it('invalid body', async () => {
            const res = await updateTaskHandler(
                tempDir,
                new Request('http://loc', { body: 'xx' }),
                { wbs: '0001' },
                noopBroadcaster,
            );
            expect((await getJson(res)).ok).toBe(false);
        });

        it('no operation specified', async () => {
            const res = await updateTaskHandler(
                tempDir,
                new Request('http://loc', { method: 'POST', body: JSON.stringify({}) }),
                { wbs: '0001' },
                noopBroadcaster,
            );
            expect((await getJson(res)).ok).toBe(false);
        });

        it('updates status', async () => {
            const bc = new EventBroadcaster();
            let events = 0;
            bc.broadcast = () => {
                events++;
            };
            const req = new Request('http://loc', { method: 'POST', body: JSON.stringify({ status: 'WIP' }) });
            const res = await updateTaskHandler(tempDir, req, { wbs: '0001' }, bc);
            expect((await getJson(res)).ok).toBe(true);
            expect(events).toBe(1);
        });

        it('updates status deleted -> Canceled', async () => {
            const req = new Request('http://loc', {
                method: 'POST',
                body: JSON.stringify({ status: 'deleted', force: true }),
            });
            const res = await updateTaskHandler(tempDir, req, { wbs: '0001' }, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(true);
        });

        it('rejects invalid status', async () => {
            const req = new Request('http://loc', { method: 'POST', body: JSON.stringify({ status: 'xxx' }) });
            const res = await updateTaskHandler(tempDir, req, { wbs: '0001' }, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);
        });

        it('handles status update errors', async () => {
            // Create a task with missing required sections so Done guard rejects it
            const taskPath = join(tempDir, folder, '0002_Empty.md');
            writeFileSync(
                taskPath,
                `---
wbs: "0002"
name: "Empty"
status: Backlog
type: task
created_at: 2026-01-01T00:00:00Z
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---
### Background
[TODO]
### Requirements
[TODO]
### Design
[TODO]
### Solution
[TODO]
### Plan
[TODO]
`,
            );
            const req = new Request('http://loc', { method: 'POST', body: JSON.stringify({ status: 'Done' }) });
            const res = await updateTaskHandler(tempDir, req, { wbs: '0002' }, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);
        });

        it('updates section with inline content', async () => {
            const req = new Request('http://loc', {
                method: 'POST',
                body: JSON.stringify({ section: 'Q&A', content: 'test' }),
            });
            const res = await updateTaskHandler(tempDir, req, { wbs: '0001' }, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(true);
        });

        it('updates section with fromFile', async () => {
            const file = join(tempDir, 'file.md');
            writeFileSync(file, 'test2');
            const req = new Request('http://loc', {
                method: 'POST',
                body: JSON.stringify({ section: 'Q&A', fromFile: file }),
            });
            const res = await updateTaskHandler(tempDir, req, { wbs: '0001' }, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(true);
        });

        it('updates phase', async () => {
            const req = new Request('http://loc', {
                method: 'POST',
                body: JSON.stringify({ phase: 'implementation', phaseStatus: 'complete' }),
            });
            const res = await updateTaskHandler(tempDir, req, { wbs: '0001' }, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(true);
        });

        it('updates field', async () => {
            const req = new Request('http://loc', {
                method: 'POST',
                body: JSON.stringify({ field: 'profile', value: 'standard' }),
            });
            const res = await updateTaskHandler(tempDir, req, { wbs: '0001' }, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(true);
        });

        it('updates body', async () => {
            const req = new Request('http://loc', {
                method: 'POST',
                body: JSON.stringify({ body: '---\nwbs: "0001"\nname: "Test"\n---\nNew Body' }),
            });
            const res = await updateTaskHandler(tempDir, req, { wbs: '0001' }, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(true);
        });
    });

    describe('deleteTaskHandler', () => {
        it('deletes a task', async () => {
            writeTask(tempDir, '0001');
            const res = await deleteTaskHandler(tempDir, new Request('http://loc'), { wbs: '0001' }, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(true);
        });

        it('requires wbs', async () => {
            const res = await deleteTaskHandler(tempDir, new Request('http://loc'), {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);
        });

        it('handles err if task not found', async () => {
            const res = await deleteTaskHandler(tempDir, new Request('http://loc'), { wbs: '9999' }, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);
        });
    });

    describe('putArtifactHandler', () => {
        it('requires wbs', async () => {
            const res = await putArtifactHandler(tempDir, new Request('http://loc'), {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);
        });

        it('requires multipart content type', async () => {
            const req = new Request('http://loc', { headers: { 'content-type': 'application/json' } });
            const res = await putArtifactHandler(tempDir, req, { wbs: '0001' }, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);
        });

        it('rejects multipart without file field', async () => {
            const formData = new FormData();
            formData.append('name', 'foo.md');
            const req = new Request('http://loc', { method: 'POST', body: formData });
            const res = await putArtifactHandler(tempDir, req, { wbs: '0001' }, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);
        });

        it('processes multipart upload', async () => {
            writeTask(tempDir, '0001');
            const events: Array<Record<string, unknown>> = [];
            const bc: Broadcaster = {
                broadcast(event) {
                    events.push(event as unknown as Record<string, unknown>);
                },
            };
            const formData = new FormData();
            formData.append('file', new File(['hello'], 'test.txt'));
            const req = new Request('http://loc', { method: 'POST', body: formData });
            const res = await putArtifactHandler(tempDir, req, { wbs: '0001' }, bc);
            expect((await getJson(res)).ok).toBe(true);
            expect(events).toHaveLength(1);
            expect(events[0]).toMatchObject({ type: 'updated', wbs: '0001', status: 'Backlog' });
        });

        it('rejects artifact names that are paths', async () => {
            writeTask(tempDir, '0001');
            const formData = new FormData();
            formData.append('file', new File(['hello'], 'test.txt'));
            formData.append('name', '../escape.txt');
            const req = new Request('http://loc', { method: 'POST', body: formData });
            const res = await putArtifactHandler(tempDir, req, { wbs: '0001' }, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);
        });
    });

    describe('batchCreateHandler', () => {
        it('creates multiple tasks', async () => {
            const bc = new EventBroadcaster();
            let events = 0;
            bc.broadcast = () => {
                events++;
            };
            const req = new Request('http://loc', {
                method: 'POST',
                body: JSON.stringify({ items: [{ name: 'A' }, { name: 'B' }] }),
            });
            const res = await batchCreateHandler(tempDir, req, {}, bc);
            expect((await getJson(res)).ok).toBe(true);
            expect(events).toBeGreaterThan(0);
        });

        it('rejects without items', async () => {
            const req = new Request('http://loc', { method: 'POST', body: JSON.stringify({}) });
            const res = await batchCreateHandler(tempDir, req, {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);
        });

        it('rejects items with unconfigured folders', async () => {
            const req = new Request('http://loc', {
                method: 'POST',
                body: JSON.stringify({ items: [{ name: 'A', folder: 'docs/outside' }] }),
            });
            const res = await batchCreateHandler(tempDir, req, {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);
        });

        it('rejects on internal batch failure', async () => {
            chmodSync(join(tempDir, folder), 0o555);
            const req = new Request('http://loc', { method: 'POST', body: JSON.stringify({ items: [{ name: 'A' }] }) });
            const res = await batchCreateHandler(tempDir, req, {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);
            chmodSync(join(tempDir, folder), 0o755);
        });
    });

    describe('refreshHandler', () => {
        it('refreshes', async () => {
            const res = await refreshHandler(tempDir, new Request('http://loc'), {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(true);
        });
    });

    describe('config handlers', () => {
        it('getConfigHandler returns config', async () => {
            const res = await getConfigHandler(tempDir, new Request('http://loc'), {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(true);
        });

        it('updateConfigHandler requires action', async () => {
            const req = new Request('http://loc', { method: 'POST', body: JSON.stringify({}) });
            const res = await updateConfigHandler(tempDir, req, {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);
        });

        it('updateConfigHandler set-active', async () => {
            const req = new Request('http://loc', {
                method: 'POST',
                body: JSON.stringify({ action: 'set-active', folder: folder }),
            });
            let res = await updateConfigHandler(tempDir, req, {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(true);

            const req2 = new Request('http://loc', { method: 'POST', body: JSON.stringify({ action: 'set-active' }) });
            res = await updateConfigHandler(tempDir, req2, {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);

            // fail set-active on missing folder
            const req3 = new Request('http://loc', {
                method: 'POST',
                body: JSON.stringify({ action: 'set-active', folder: 'does_not_exist' }),
            });
            res = await updateConfigHandler(tempDir, req3, {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);
        });

        it('updateConfigHandler add-folder', async () => {
            const req = new Request('http://loc', {
                method: 'POST',
                body: JSON.stringify({ action: 'add-folder', folder: 'newf', baseCounter: 100 }),
            });
            let res = await updateConfigHandler(tempDir, req, {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(true);

            const req2 = new Request('http://loc', { method: 'POST', body: JSON.stringify({ action: 'add-folder' }) });
            res = await updateConfigHandler(tempDir, req2, {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);

            const req3 = new Request('http://loc', {
                method: 'POST',
                body: JSON.stringify({ action: 'add-folder', folder: 'f' }),
            });
            res = await updateConfigHandler(tempDir, req3, {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false); // missing baseCounter

            // Fail add folder already exists
            const req4 = new Request('http://loc', {
                method: 'POST',
                body: JSON.stringify({ action: 'add-folder', folder, baseCounter: 100 }),
            });
            res = await updateConfigHandler(tempDir, req4, {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);

            const req5 = new Request('http://loc', {
                method: 'POST',
                body: JSON.stringify({ action: 'add-folder', folder: '../escape', baseCounter: 100 }),
            });
            res = await updateConfigHandler(tempDir, req5, {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);
        });

        it('updateConfigHandler unknown action', async () => {
            const req = new Request('http://loc', { method: 'POST', body: JSON.stringify({ action: 'unknown' }) });
            const res = await updateConfigHandler(tempDir, req, {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);
        });
    });

    describe('eventsHandler', () => {
        it('returns sse error if broadcaster not EventBroadcaster', async () => {
            const res = await eventsHandler(tempDir, new Request('http://loc'), {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);
        });

        it('returns sse stream', async () => {
            const bc = new EventBroadcaster();
            const res = await eventsHandler(tempDir, new Request('http://loc?status=Backlog'), {}, bc);
            expect(res.status).toBe(200);
            expect(res.headers.get('Content-Type')).toContain('text/event-stream');
            bc.closeAll();
        });

        it('rejects invalid status filters', async () => {
            const bc = new EventBroadcaster();
            const res = await eventsHandler(tempDir, new Request('http://loc?status=wat'), {}, bc);
            expect((await getJson(res)).ok).toBe(false);
            bc.closeAll();
        });
    });

    describe('getTemplateHandler', () => {
        it('returns standard template', async () => {
            const res = await getTemplateHandler(tempDir, new Request('http://loc'), {}, noopBroadcaster);
            const body = await getJson(res);
            expect(body.ok).toBe(true);
            const data = body.data as { template: string };
            expect(typeof data.template).toBe('string');
        });
    });

    describe('taskActionHandler', () => {
        beforeEach(() => writeTask(tempDir, '0001'));

        it('delegates action to channel via orchestrator', async () => {
            const bc = new EventBroadcaster();
            let events = 0;
            bc.broadcast = () => {
                events++;
            };
            const req = new Request('http://loc', {
                method: 'POST',
                body: JSON.stringify({ action: 'refine', channel: 'claude' }),
            });
            const res = await taskActionHandler(tempDir, req, { wbs: '0001' }, bc);
            const body = await getJson(res);
            expect(body.ok).toBe(true);
            expect(events).toBe(1);
            const data = body.data as { command: string };
            expect(data.command).toContain('orchestrator run 0001 --preset refine --channel claude');
        });

        it('supports codex channel via orchestrator', async () => {
            const req = new Request('http://loc', {
                method: 'POST',
                body: JSON.stringify({ action: 'plan', channel: 'codex' }),
            });
            const res = await taskActionHandler(tempDir, req, { wbs: '0001' }, noopBroadcaster);
            const body = await getJson(res);
            expect(body.ok).toBe(true);
            const data = body.data as { command: string };
            expect(data.command).toContain('orchestrator run 0001 --preset plan --channel codex');
        });

        it('rejects missing wbs', async () => {
            const req = new Request('http://loc', {
                method: 'POST',
                body: JSON.stringify({ action: 'refine', channel: 'claude' }),
            });
            const res = await taskActionHandler(tempDir, req, {}, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);
        });

        it('rejects missing action or channel', async () => {
            const req = new Request('http://loc', { method: 'POST', body: JSON.stringify({ action: 'refine' }) });
            const res = await taskActionHandler(tempDir, req, { wbs: '0001' }, noopBroadcaster);
            expect((await getJson(res)).ok).toBe(false);
        });
    });
});
