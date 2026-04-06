import { describe, expect, test, beforeEach, afterEach, spyOn } from 'bun:test';
import { join } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { setGlobalSilent } from '../../../scripts/logger';
import { EventBroadcaster } from '../scripts/server/sse';
import { createRequestHandler } from '../scripts/server/router';
import * as config from '../scripts/lib/config';

describe('router', () => {
    let broadcaster: EventBroadcaster;
    let tempStaticDir: string;
    let staticDirSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
        setGlobalSilent(true);
        broadcaster = new EventBroadcaster();
        // Use a temp directory instead of the real static dir to avoid
        // destroying production build artifacts (scripts/static/) during cleanup.
        tempStaticDir = mkdtempSync(join(tmpdir(), 'tasks-router-test-'));
        writeFileSync(join(tempStaticDir, 'test.css'), 'body{}');
        staticDirSpy = spyOn(config, 'getStaticDir').mockReturnValue(tempStaticDir);
    });

    afterEach(() => {
        setGlobalSilent(false);
        staticDirSpy.mockRestore();
        rmSync(tempStaticDir, { recursive: true, force: true });
    });

    test('returns 404 for unknown path', async () => {
        const handler = createRequestHandler(broadcaster);
        const response = await handler(new Request('http://localhost:8080/nonexistent'));
        expect(response.status).toBe(404);
        const body = (await response.json()) as { ok: boolean; error: string };
        expect(body.ok).toBe(false);
        expect(body.error).toContain('Not found');
    });

    test('returns 405 for known path with wrong method', async () => {
        const handler = createRequestHandler(broadcaster);
        const response = await handler(new Request('http://localhost:8080/tasks', { method: 'DELETE' }));
        expect(response.status).toBe(405);
        const body = (await response.json()) as { ok: boolean; error: string };
        expect(body.ok).toBe(false);
        expect(body.error).toContain('not allowed');
    });

    test('returns CORS headers for OPTIONS preflight', async () => {
        const handler = createRequestHandler(broadcaster);
        const response = await handler(new Request('http://localhost:8080/tasks', { method: 'OPTIONS' }));
        expect(response.status).toBe(204);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });

    test('serveStaticFile returns 404 for path traversal', async () => {
        const handler = createRequestHandler(broadcaster);
        const response = await handler(new Request('http://localhost:8080/../../../etc/passwd'));
        expect(response.status).toBe(404);
    });

    test('serveStaticFile returns 404 for path without extension', async () => {
        const handler = createRequestHandler(broadcaster);
        const response = await handler(new Request('http://localhost:8080/tasks/list'));
        expect(response.status).toBe(404);
    });

    test('serveStaticFile returns 404 when index.html does not exist', async () => {
        const handler = createRequestHandler(broadcaster);
        const response = await handler(new Request('http://localhost:8080/'));
        expect(response.status).toBe(404);
    });

    test('serveStaticFile serves index.html when it exists', async () => {
        writeFileSync(join(tempStaticDir, 'index.html'), '<html></html>');
        const handler = createRequestHandler(broadcaster);
        const response = await handler(new Request('http://localhost:8080/'));
        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('text/html');
    });

    test('serveStaticFile returns 404 when file does not exist', async () => {
        const handler = createRequestHandler(broadcaster);
        const response = await handler(new Request('http://localhost:8080/nonexistent.css'));
        expect(response.status).toBe(404);
    });

    test('serveStaticFile serves static files with extension', async () => {
        const handler = createRequestHandler(broadcaster);
        const response = await handler(new Request('http://localhost:8080/test.css'));
        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('text/css');
    });
});
