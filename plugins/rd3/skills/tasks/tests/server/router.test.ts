import { describe, expect, it } from 'bun:test';
import { createRequestHandler } from '../../scripts/server/router';
import { EventBroadcaster } from '../../scripts/server/sse';

describe('router', () => {
    const broadcaster = new EventBroadcaster();
    const handler = createRequestHandler(broadcaster);

    async function fetch(method: string, path: string, body?: unknown): Promise<Response> {
        const url = `http://127.0.0.1${path}`;
        const init: RequestInit = { method };
        if (body !== undefined) {
            init.headers = { 'Content-Type': 'application/json' };
            init.body = JSON.stringify(body);
        }
        return handler(new Request(url, init));
    }

    it('returns health check', async () => {
        const res = await fetch('GET', '/health');
        const data = (await res.json()) as Record<string, unknown>;
        expect(data.ok).toBe(true);
        expect((data.data as Record<string, unknown>).uptime as number).toBeGreaterThanOrEqual(0);
    });

    it('returns 404 for unknown paths', async () => {
        const res = await fetch('GET', '/nonexistent');
        expect(res.status).toBe(404);
        const data = (await res.json()) as Record<string, unknown>;
        expect(data.ok).toBe(false);
        expect(data.error as string).toContain('Not found');
    });

    it('returns 405 for wrong method on known path', async () => {
        const res = await fetch('DELETE', '/health');
        expect(res.status).toBe(405);
        const data = (await res.json()) as Record<string, unknown>;
        expect(data.ok).toBe(false);
        expect(data.error as string).toContain('not allowed');
    });

    it('handles CORS preflight', async () => {
        const res = await fetch('OPTIONS', '/tasks');
        expect(res.status).toBe(204);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('lists tasks', async () => {
        const res = await fetch('GET', '/tasks');
        expect(res.status).toBe(200);
        const data = (await res.json()) as Record<string, unknown>;
        expect(data.ok).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
    });

    it('shows a task by WBS', async () => {
        const res = await fetch('GET', '/tasks/0317');
        expect(res.status).toBe(200);
        const data = (await res.json()) as Record<string, unknown>;
        expect(data.ok).toBe(true);
        expect((data.data as Record<string, unknown>).wbs).toBe('0317');
    });

    it('returns 404 for nonexistent WBS', async () => {
        const res = await fetch('GET', '/tasks/9999');
        expect(res.status).toBe(404);
        const data = (await res.json()) as Record<string, unknown>;
        expect(data.ok).toBe(false);
    });

    it('shows config', async () => {
        const res = await fetch('GET', '/config');
        expect(res.status).toBe(200);
        const data = (await res.json()) as Record<string, unknown>;
        expect(data.ok).toBe(true);
        expect(((data.data as Record<string, unknown>).config as Record<string, unknown>).active_folder).toBeDefined();
    });

    it('checks a task', async () => {
        const res = await fetch('GET', '/tasks/0317/check');
        expect(res.status).toBe(200);
        const data = (await res.json()) as Record<string, unknown>;
        expect(data.ok).toBe(true);
        expect((data.data as Record<string, unknown>).valid).toBeDefined();
    });
});
