/**
 * Router — path + method matching → handler dispatch.
 *
 * Simple hand-rolled router. No external dependencies.
 * Matches URL patterns like /tasks/:wbs/artifacts to the correct handler.
 */
import { getProjectRoot } from '../lib/config';
import type { EventBroadcaster } from './sse';
import type { RouteHandler } from './types';
import {
    batchCreateHandler,
    checkHandler,
    createTaskHandler,
    deleteTaskHandler,
    eventsHandler,
    getArtifactsHandler,
    getConfigHandler,
    healthHandler,
    listTasksHandler,
    putArtifactHandler,
    refreshHandler,
    showTaskHandler,
    treeHandler,
    updateConfigHandler,
    updateTaskHandler,
} from './routeHandlers';

interface Route {
    method: string;
    pattern: RegExp;
    paramNames: string[];
    handler: RouteHandler;
}

const routes: Route[] = [
    // Health
    { method: 'GET', pattern: /^\/health$/, paramNames: [], handler: healthHandler },

    // SSE events
    { method: 'GET', pattern: /^\/events$/, paramNames: [], handler: eventsHandler },

    // Batch create (must come before /tasks/:wbs)
    { method: 'POST', pattern: /^\/tasks\/batch-create$/, paramNames: [], handler: batchCreateHandler },

    // Refresh
    { method: 'POST', pattern: /^\/tasks\/refresh$/, paramNames: [], handler: refreshHandler },

    // Task CRUD
    { method: 'GET', pattern: /^\/tasks$/, paramNames: [], handler: listTasksHandler },
    { method: 'POST', pattern: /^\/tasks$/, paramNames: [], handler: createTaskHandler },

    // Task-specific operations (with :wbs)
    { method: 'GET', pattern: /^\/tasks\/([^/]+)$/, paramNames: ['wbs'], handler: showTaskHandler },
    { method: 'PATCH', pattern: /^\/tasks\/([^/]+)$/, paramNames: ['wbs'], handler: updateTaskHandler },
    { method: 'DELETE', pattern: /^\/tasks\/([^/]+)$/, paramNames: ['wbs'], handler: deleteTaskHandler },

    // Artifacts
    { method: 'POST', pattern: /^\/tasks\/([^/]+)\/artifacts$/, paramNames: ['wbs'], handler: putArtifactHandler },
    { method: 'GET', pattern: /^\/tasks\/([^/]+)\/artifacts$/, paramNames: ['wbs'], handler: getArtifactsHandler },

    // Tree
    { method: 'GET', pattern: /^\/tasks\/([^/]+)\/tree$/, paramNames: ['wbs'], handler: treeHandler },

    // Check
    { method: 'GET', pattern: /^\/tasks\/([^/]+)\/check$/, paramNames: ['wbs'], handler: checkHandler },

    // Config
    { method: 'GET', pattern: /^\/config$/, paramNames: [], handler: getConfigHandler },
    { method: 'PATCH', pattern: /^\/config$/, paramNames: [], handler: updateConfigHandler },
];

function matchRoute(method: string, pathname: string): { route: Route; params: Record<string, string> } | null {
    for (const route of routes) {
        if (route.method !== method) continue;

        const match = pathname.match(route.pattern);
        if (!match) continue;

        const params: Record<string, string> = {};
        for (let i = 0; i < route.paramNames.length; i++) {
            params[route.paramNames[i]] = decodeURIComponent(match[i + 1]);
        }

        return { route, params };
    }

    return null;
}

/**
 * Main request handler for Bun.serve().
 * Resolves project root, matches route, and dispatches to handler.
 */
export function createRequestHandler(broadcaster: EventBroadcaster, projectRootOverride?: string) {
    const projectRoot = projectRootOverride ?? getProjectRoot();
    return async (request: Request): Promise<Response> => {
        const url = new URL(request.url);
        const method = request.method;
        const pathname = url.pathname;

        // CORS preflight
        if (method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                },
            });
        }

        const match = matchRoute(method, pathname);

        if (!match) {
            // Check if path matches but method doesn't
            const pathExists = routes.some((r) => r.pattern.test(pathname));
            if (pathExists) {
                return Response.json(
                    { ok: false, error: `Method ${method} not allowed for ${pathname}` },
                    { status: 405 },
                );
            }
            return Response.json({ ok: false, error: `Not found: ${pathname}` }, { status: 404 });
        }

        try {
            return await match.route.handler(projectRoot, request, match.params, broadcaster);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return Response.json({ ok: false, error: `Internal server error: ${message}` }, { status: 500 });
        }
    };
}
