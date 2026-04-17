import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `tasks-server-integration-${Date.now()}`);

describe('server integration', () => {
    beforeAll(() => {
        // Set up temp project with config so handlers resolve correctly
        mkdirSync(join(tempDir, 'docs', '.tasks'), { recursive: true });
        mkdirSync(join(tempDir, 'docs', 'tasks'), { recursive: true });
        writeFileSync(
            join(tempDir, 'docs', '.tasks', 'config.jsonc'),
            JSON.stringify(
                {
                    $schema_version: 1,
                    active_folder: 'docs/tasks',
                    folders: { 'docs/tasks': { base_counter: 300 } },
                },
                null,
                2,
            ),
        );
    });

    afterAll(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    it('handles OPTIONS CORS preflight', async () => {
        const { createRequestHandler } = await import('../../scripts/server/router');
        const { EventBroadcaster } = await import('../../scripts/server/sse');
        const broadcaster = new EventBroadcaster();
        const handler = createRequestHandler(broadcaster, tempDir);

        const res = await handler(
            new Request('http://localhost:3456/tasks', {
                method: 'OPTIONS',
                headers: { Origin: 'http://localhost:3456' },
            }),
        );
        expect(res.status).toBe(204);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3456');
        broadcaster.closeAll();
        broadcaster.closeAll();
    });

    it('returns 404 for unknown paths', async () => {
        const { createRequestHandler } = await import('../../scripts/server/router');
        const { EventBroadcaster } = await import('../../scripts/server/sse');
        const broadcaster = new EventBroadcaster();
        const handler = createRequestHandler(broadcaster, tempDir);

        const res = await handler(new Request('http://localhost/unknown'));
        expect(res.status).toBe(404);
        const body = (await res.json()) as Record<string, unknown>;
        expect(body.ok).toBe(false);
        expect(body.error as string).toContain('Not found');
        broadcaster.closeAll();
    });

    it('returns 405 for wrong method on valid path', async () => {
        const { createRequestHandler } = await import('../../scripts/server/router');
        const { EventBroadcaster } = await import('../../scripts/server/sse');
        const broadcaster = new EventBroadcaster();
        const handler = createRequestHandler(broadcaster, tempDir);

        // DELETE /tasks should 405 (only GET and POST are registered for /tasks)
        const res = await handler(new Request('http://localhost/tasks', { method: 'DELETE' }));
        expect(res.status).toBe(405);
        const body = (await res.json()) as Record<string, unknown>;
        expect(body.ok).toBe(false);
        expect(body.error as string).toContain('not allowed');
        broadcaster.closeAll();
    });

    it('handles server errors gracefully', async () => {
        const { createRequestHandler } = await import('../../scripts/server/router');
        const { EventBroadcaster } = await import('../../scripts/server/sse');
        const broadcaster = new EventBroadcaster();
        const handler = createRequestHandler(broadcaster, tempDir);

        // POST /tasks with invalid JSON body
        const res = await handler(
            new Request('http://localhost/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: 'not json{{{',
            }),
        );
        expect(res.status).toBe(400);
        const body = (await res.json()) as Record<string, unknown>;
        expect(body.ok).toBe(false);
        broadcaster.closeAll();
    });

    it('end-to-end: create → show → cancel → verify gone', async () => {
        const { createRequestHandler } = await import('../../scripts/server/router');
        const { EventBroadcaster } = await import('../../scripts/server/sse');
        const broadcaster = new EventBroadcaster();
        const handler = createRequestHandler(broadcaster, tempDir);

        // Create
        const createRes = await handler(
            new Request('http://localhost/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'E2E integration test' }),
            }),
        );
        expect(createRes.status).toBe(200);
        const createBody = (await createRes.json()) as Record<string, unknown>;
        const wbs = (createBody.data as Record<string, unknown>).wbs as string;

        // Show
        const showRes = await handler(new Request(`http://localhost/tasks/${wbs}`));
        expect(showRes.status).toBe(200);
        const showBody = (await showRes.json()) as Record<string, unknown>;
        expect((showBody.data as Record<string, unknown>).wbs).toBe(wbs);
        expect((showBody.data as Record<string, unknown>).content as string).toContain('E2E integration test');

        // Cancel (DELETE)
        const deleteRes = await handler(new Request(`http://localhost/tasks/${wbs}`, { method: 'DELETE' }));
        expect(deleteRes.status).toBe(200);

        // Verify status is Canceled
        const verifyRes = await handler(new Request(`http://localhost/tasks/${wbs}`));
        const verifyBody = (await verifyRes.json()) as Record<string, unknown>;
        expect((verifyBody.data as Record<string, unknown>).content as string).toContain('Canceled');

        broadcaster.closeAll();
    });
});
