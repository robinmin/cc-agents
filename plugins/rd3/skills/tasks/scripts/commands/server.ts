/**
 * server command — start an HTTP server exposing task operations as REST endpoints.
 *
 * Usage:
 *   tasks server [--port <number>] [--host <addr>]
 */
import { logger } from '../../../../scripts/logger';
import { EventBroadcaster } from '../server/sse';
import { createRequestHandler } from '../server/router';
import type { ServerConfig } from '../server/types';

const DEFAULT_PORT = 3456;
const DEFAULT_HOST = '127.0.0.1';

function parseServerArgs(args: string[]): ServerConfig {
    const config: ServerConfig = {
        host: process.env.TASKS_HOST ?? DEFAULT_HOST,
        port: process.env.TASKS_PORT ? Number.parseInt(process.env.TASKS_PORT, 10) : DEFAULT_PORT,
    };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--port' && i + 1 < args.length) {
            const parsed = Number.parseInt(args[++i], 10);
            if (!Number.isFinite(parsed) || parsed < 1 || parsed > 65535) {
                logger.error(`Invalid port: ${args[i]}. Must be 1-65535.`);
                process.exit(1);
            }
            config.port = parsed;
        } else if (args[i] === '--host' && i + 1 < args.length) {
            config.host = args[++i];
        }
    }

    return config;
}

export function runServer(args: string[]): void {
    const config = parseServerArgs(args);
    const broadcaster = new EventBroadcaster();
    const handler = createRequestHandler(broadcaster);

    const server = Bun.serve({
        hostname: config.host,
        port: config.port,
        fetch: handler,
        idleTimeout: 255, // 255 seconds (max allowed by Bun)
    });

    logger.info(`rd3:tasks server listening on http://${config.host}:${config.port}`);
    logger.info(`Endpoints: /tasks, /tasks/:wbs, /tasks/:wbs/artifacts, /events, /health, /config`);

    // Graceful shutdown
    const shutdown = () => {
        logger.info('\nShutting down tasks server...');
        broadcaster.closeAll();
        server.stop();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}
