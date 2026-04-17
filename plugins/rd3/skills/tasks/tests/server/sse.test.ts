import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { EventBroadcaster } from '../../scripts/server/sse';

describe('EventBroadcaster', () => {
    let broadcaster: EventBroadcaster;

    beforeEach(() => {
        broadcaster = new EventBroadcaster();
    });

    afterEach(() => {
        broadcaster.closeAll();
    });

    test('initializes with 0 clients', () => {
        expect(broadcaster.clientCount).toBe(0);
    });

    test('adds a client when createStream is called', () => {
        const response = broadcaster.createStream();
        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('text/event-stream');
        expect(broadcaster.clientCount).toBe(1);
    });

    test('broadcasts events to active clients', async () => {
        const response1 = broadcaster.createStream();
        const response2 = broadcaster.createStream();
        expect(broadcaster.clientCount).toBe(2);

        const reader1 = response1.body?.getReader();
        const reader2 = response2.body?.getReader();
        expect(reader1).toBeDefined();
        expect(reader2).toBeDefined();
        if (!reader1 || !reader2) throw new Error('no reader');

        broadcaster.broadcast({ type: 'updated', wbs: '0001', status: 'Backlog', timestamp: new Date().toISOString() });

        const { value: val1 } = await reader1.read();
        const { value: val2 } = await reader2.read();

        const decoder = new TextDecoder();
        const text1 = decoder.decode(val1);
        const text2 = decoder.decode(val2);

        expect(text1).toContain('data: {"type":"updated","wbs":"0001","status":"Backlog","timestamp":"');
        expect(text2).toContain('data: {"type":"updated","wbs":"0001","status":"Backlog","timestamp":"');
    });

    test('closeAll closes all connections and resets clientCount', () => {
        broadcaster.createStream();
        broadcaster.createStream();
        expect(broadcaster.clientCount).toBe(2);

        broadcaster.closeAll();
        expect(broadcaster.clientCount).toBe(0);
    });

    test('removes client when write fails', async () => {
        const response = broadcaster.createStream();
        expect(broadcaster.clientCount).toBe(1);

        // Cancel the reader so the underlying writer is closed,
        // causing subsequent writes to fail.
        const reader = response.body?.getReader();
        if (!reader) throw new Error('no reader');
        await reader.cancel();

        broadcaster.broadcast({ type: 'updated', wbs: '0001', status: 'Backlog', timestamp: new Date().toISOString() });

        // Give the microtask queue time to process the rejected write
        await Bun.sleep(10);
        expect(broadcaster.clientCount).toBe(0);
    });

    test('broadcast honors status filters', async () => {
        const response = broadcaster.createStream('Done');
        expect(response.status).toBe(200);
        expect(broadcaster.clientCount).toBe(1);

        const reader = response.body?.getReader();
        if (!reader) throw new Error('no reader');

        const firstMessage = reader.read();
        broadcaster.broadcast({ type: 'updated', wbs: '0001', status: 'Backlog', timestamp: new Date().toISOString() });
        broadcaster.broadcast({ type: 'updated', wbs: '0001', status: 'Done', timestamp: new Date().toISOString() });
        const { value } = await firstMessage;
        const text = new TextDecoder().decode(value);
        expect(text).toContain('"status":"Done"');
    });

    test('closeAll handles already-closed writers gracefully', async () => {
        broadcaster.createStream();
        broadcaster.createStream();
        // closeAll should not throw even if writers are already closed
        broadcaster.closeAll();
        broadcaster.closeAll(); // double close is safe
        expect(broadcaster.clientCount).toBe(0);
    });

    test('closeAll handles writer.close() rejection', async () => {
        // Create a stream then abort its body so writer.close() rejects
        const response = broadcaster.createStream();
        expect(broadcaster.clientCount).toBe(1);

        // Abort the response body so the internal writer is broken
        if (response.body) await response.body.cancel();

        broadcaster.closeAll();
        expect(broadcaster.clientCount).toBe(0);
    });

    test('createStream sets ACAO header for localhost origin', () => {
        const response = broadcaster.createStream(undefined, 'http://localhost:3000');
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    });

    test('createStream sets ACAO header for 127.0.0.1 origin', () => {
        const response = broadcaster.createStream(undefined, 'http://127.0.0.1:3000');
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://127.0.0.1:3000');
    });

    test('createStream sets empty ACAO for non-localhost origin', () => {
        const response = broadcaster.createStream(undefined, 'https://evil.example.com');
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('');
    });

    test('createStream sets empty ACAO for invalid origin', () => {
        const response = broadcaster.createStream(undefined, 'not-a-url');
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('');
    });
});
