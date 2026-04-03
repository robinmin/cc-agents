/**
 * SSE (Server-Sent Events) broadcaster.
 *
 * Maintains a set of active client connections and broadcasts
 * task mutation events to all connected clients.
 */
import type { TaskStatus } from '../types';
import type { Broadcaster, TaskEvent } from './types';

interface SseClient {
    writer: WritableStreamDefaultWriter<Uint8Array>;
    statusFilter?: TaskStatus;
}

export class EventBroadcaster implements Broadcaster {
    private clients = new Set<SseClient>();
    private encoder = new TextEncoder();

    // biome-ignore lint/complexity/noUselessConstructor: V8 function coverage requires explicit constructor
    constructor() {}

    broadcast(event: TaskEvent): void {
        const data = this.encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
        for (const client of this.clients) {
            if (client.statusFilter && client.statusFilter !== event.status) {
                continue;
            }

            client.writer.write(data).catch(() => {
                this.clients.delete(client);
            });
        }
    }

    /**
     * Create a new SSE Response for a client connection.
     *
     * Uses a TransformStream: we hold the writable writer for broadcasting
     * and return the readable side inside a Response.
     * The readable is NOT consumed until the HTTP client reads the response body,
     * so it stays available for the Response constructor.
     */
    createStream(statusFilter?: TaskStatus): Response {
        const transform = new TransformStream<Uint8Array, Uint8Array>();
        const writer = transform.writable.getWriter();

        this.clients.add(statusFilter ? { writer, statusFilter } : { writer });

        return new Response(transform.readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }

    /** Number of connected SSE clients (useful for health check) */
    get clientCount(): number {
        return this.clients.size;
    }

    /** Close all SSE connections (used during graceful shutdown) */
    closeAll(): void {
        for (const client of this.clients) {
            client.writer.close().catch(() => {});
        }
        this.clients.clear();
    }
}
