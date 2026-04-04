/**
 * Router — path + method matching → handler dispatch.
 *
 * Simple hand-rolled router. No external dependencies.
 * Matches URL patterns like /tasks/:wbs/artifacts to the correct handler.
 */
import { existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { getProjectRoot } from '../lib/config';
import type { EventBroadcaster } from './sse';
import type { RouteHandler } from './types';

const MIME_TYPES: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
};

function serveStaticFile(pathname: string, isFallback = false): Response | null {
    const staticDir = join(import.meta.dir, '..', 'static');
    if (!existsSync(staticDir)) return null;

    // SPA entry point or fallback: serve index.html
    if (pathname === '/' || isFallback) {
        const indexPath = join(staticDir, 'index.html');
        if (existsSync(indexPath)) {
            return new Response(Bun.file(indexPath), {
                headers: { 'Content-Type': 'text/html' },
            });
        }
        return null;
    }

    // Only serve static files (must have extension to prevent directory traversal)
    const ext = extname(pathname);
    if (!ext || pathname.includes('..')) return null;

    const filePath = join(staticDir, pathname);
    if (!existsSync(filePath) || !statSync(filePath).isFile()) return null;

    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    return new Response(Bun.file(filePath), {
        headers: { 'Content-Type': contentType },
    });
}
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
    taskActionHandler,
    treeHandler,
    updateConfigHandler,
    updateTaskHandler,
    getTemplateHandler,
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

    // Actions (AI/Workflow)
    { method: 'POST', pattern: /^\/tasks\/([^/]+)\/actions$/, paramNames: ['wbs'], handler: taskActionHandler },

    // Config
    { method: 'GET', pattern: /^\/config$/, paramNames: [], handler: getConfigHandler },
    { method: 'PATCH', pattern: /^\/config$/, paramNames: [], handler: updateConfigHandler },
    { method: 'GET', pattern: /^\/config\/template$/, paramNames: [], handler: getTemplateHandler },
];

function matchRoute(method: string, pathname: string): { route: Route; params: Record<string, string> } | null {
    const normalizedMethod = method === 'HEAD' ? 'GET' : method;
    for (const route of routes) {
        if (route.method !== normalizedMethod) continue;

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
            const isGetOrHead = method === 'GET' || method === 'HEAD';

            if (isGetOrHead) {
                // Try static file serving (UI assets like /assets/index.js)
                const staticResponse = serveStaticFile(pathname);
                if (staticResponse) return staticResponse;

                // SPA Fallback: if it's a GET request and not an API route/asset, serve index.html.
                // This allows deep-linking and browser refreshes on routes like /0001
                const fallbackResponse = serveStaticFile('/', true);
                if (fallbackResponse) return fallbackResponse;
            }

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
