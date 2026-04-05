/**
 * server command — start an HTTP server exposing task operations as REST endpoints.
 *
 * Usage:
 *   tasks server [--port <number>] [--host <addr>]
 */
import { getStaticDir, getUiDir } from '../lib/config';
import { EventBroadcaster } from '../server/sse';
import { createRequestHandler } from '../server/router';
import type { ServerConfig } from '../server/types';
import { existsSync } from 'node:fs';
import { logger } from '../../../../scripts/logger';
import { execSync } from 'node:child_process';

const DEFAULT_PORT = 3456;
const DEFAULT_HOST = '127.0.0.1';

export function describePortUsage(port: number, runner: typeof execSync = execSync): string {
    return runner(`lsof -i :${port} 2>/dev/null | tail -n +2`, {
        encoding: 'utf-8',
        timeout: 5000,
    });
}

export function exitServerProcess(code: number, exitFn: typeof process.exit = process.exit): never {
    return exitFn(code);
}

type ServerRuntime = {
    pathExists: (path: string) => boolean;
    resolveStaticDir: () => string;
    resolveUiDir: () => string;
    buildUi: (uiDir: string) => number | null | undefined;
    describePortUsage: (port: number) => string;
    exitProcess: (code: number) => never;
    registerSignal: (event: NodeJS.Signals, listener: () => void) => NodeJS.Process;
};

const defaultServerRuntime: ServerRuntime = {
    pathExists: existsSync,
    resolveStaticDir: getStaticDir,
    resolveUiDir: getUiDir,
    buildUi: (uiDir) =>
        Bun.spawnSync(['bun', 'run', 'build'], {
            cwd: uiDir,
            stdout: 'ignore',
            stderr: 'ignore',
        }).exitCode,
    describePortUsage,
    exitProcess: exitServerProcess,
    registerSignal: (event, listener) => process.on(event, listener),
};

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
        } else if (args[i] === '--build') {
            config.build = true;
        }
    }

    return config;
}

/**
 * Ensure the UI is built. Triggers if artifacts are missing or if force is requested.
 */
function ensureUIBuilt(force = false, runtime: ServerRuntime = defaultServerRuntime): void {
    const staticDir = runtime.resolveStaticDir();
    const uiDir = runtime.resolveUiDir();

    if (!force && runtime.pathExists(staticDir)) {
        return;
    }

    if (force) {
        logger.info('Forcing UI rebuild...');
    } else {
        logger.info('UI artifacts missing. Building Kanban UI...');
    }

    if (!runtime.pathExists(uiDir)) {
        logger.error(`UI source directory not found at ${uiDir}`);
        return;
    }

    const exitCode = runtime.buildUi(uiDir);

    if (exitCode !== 0) {
        logger.error(`UI build failed with exit code ${exitCode}`);
    } else {
        logger.info('UI build successful.');
    }
}

export function runServer(args: string[], runtimeOverrides: Partial<ServerRuntime> = {}): void {
    const config = parseServerArgs(args);
    const broadcaster = new EventBroadcaster();
    const runtime: ServerRuntime = { ...defaultServerRuntime, ...runtimeOverrides };

    // Ensure UI is built if missing OR if --build flag is present
    ensureUIBuilt(config.build, runtime);

    const handler = createRequestHandler(broadcaster);

    let server: ReturnType<typeof Bun.serve>;

    try {
        server = Bun.serve({
            hostname: config.host,
            port: config.port,
            fetch: handler,
            idleTimeout: 255, // 255 seconds (max allowed by Bun)
        });
    } catch (err) {
        const error = err as NodeJS.ErrnoException;
        if (error.code === 'EADDRINUSE') {
            logger.error(`Port ${config.port} is already in use.`);
            logger.log('');
            logger.log('To find the process using this port:');
            logger.log(`  lsof -i :${config.port}`);
            logger.log('');
            logger.log('To kill it:');
            logger.log(`  kill $(lsof -t -i :${config.port})`);
            logger.log('');
            logger.log('Or start on a different port:');
            logger.log(`  tasks server --port ${config.port + 1}`);
            logger.log('');
            // Try to identify what process is using the port
            try {
                const result = runtime.describePortUsage(config.port);
                if (result.trim()) {
                    logger.log('Current process using port:');
                    logger.log(result.trim());
                }
            } catch {
                // lsof not available or timed out, skip additional info
            }
            runtime.exitProcess(1);
        }
        // Re-throw for unexpected errors
        throw err;
    }

    logger.info(`rd3:tasks server listening on http://${config.host}:${config.port}`);
    logger.info(`Endpoints: /tasks, /tasks/:wbs, /tasks/:wbs/artifacts, /events, /health, /config`);

    // Graceful shutdown
    const shutdown = () => {
        logger.info('\nShutting down tasks server...');
        broadcaster.closeAll();
        server.stop();
        process.exit(0);
    };

    runtime.registerSignal('SIGINT', shutdown);
    runtime.registerSignal('SIGTERM', shutdown);
}
