import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { setGlobalSilent } from '../../../scripts/logger';
import { createRequestHandler } from '../scripts/server/router';
import { EventBroadcaster } from '../scripts/server/sse';

describe('router', () => {
    let broadcaster: EventBroadcaster;
    let staticDir: string;

    beforeEach(() => {
        setGlobalSilent(true);
        broadcaster = new EventBroadcaster();
        // Router uses join(__dirname, '..', 'static') where __dirname = scripts/server
        const serverDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'server');
        staticDir = join(serverDir, '..', 'static');
        // Create static dir with test.css (no index.html yet)
        mkdirSync(staticDir, { recursive: true });
        writeFileSync(join(staticDir, 'test.css'), 'body{}');
    });

    afterEach(() => {
        setGlobalSilent(false);
        if (existsSync(staticDir)) {
            rmSync(staticDir, { recursive: true, force: true });
        }
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
        // serveStaticFile checks pathname.includes('..') → returns null → 404
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
        // Static dir exists but index.html does not → serveStaticFile returns null → 404
        const response = await handler(new Request('http://localhost:8080/'));
        expect(response.status).toBe(404);
    });

    test('serveStaticFile serves index.html when it exists', async () => {
        writeFileSync(join(staticDir, 'index.html'), '<html></html>');
        const handler = createRequestHandler(broadcaster);
        const response = await handler(new Request('http://localhost:8080/'));
        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('text/html');
    });

    test('serveStaticFile returns 404 when file does not exist', async () => {
        const handler = createRequestHandler(broadcaster);
        // Extension exists but file doesn't → serveStaticFile returns null → 404
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
