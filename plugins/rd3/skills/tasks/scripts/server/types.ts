import type { TaskStatus } from '../types';

/** Configuration for the tasks HTTP server */
export interface ServerConfig {
    host: string;
    port: number;
    build?: boolean;
}

/** Standard JSON envelope matching CLI --json output */
export interface JsonResponse {
    ok: boolean;
    data?: unknown;
    error?: string;
}

/** SSE event payload for task mutations */
export interface TaskEvent {
    type: 'created' | 'updated' | 'deleted';
    wbs: string;
    status?: TaskStatus;
    timestamp: string;
}

/** Route handler signature — pure function, testable without a running server */
export type RouteHandler = (
    projectRoot: string,
    request: Request,
    params: Record<string, string>,
    broadcaster: Broadcaster,
) => Promise<Response> | Response;

/** Broadcaster interface for SSE event dispatch */
export interface Broadcaster {
    broadcast(event: TaskEvent): void;
}
