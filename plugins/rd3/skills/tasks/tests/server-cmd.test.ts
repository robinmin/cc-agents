import { expect, test, describe, spyOn, beforeEach, afterEach } from 'bun:test';
import { describePortUsage, exitServerProcess, runServer } from '../scripts/commands/server';
import { setGlobalSilent } from '../../../scripts/logger';
import { logger } from '../../../scripts/logger';

describe('server cmd', () => {
    let originalServe: typeof globalThis.Bun.serve;

    beforeEach(() => {
        setGlobalSilent(true);
        originalServe = globalThis.Bun.serve;
        globalThis.Bun.serve = (() => ({
            stop: () => {},
        })) as unknown as typeof globalThis.Bun.serve;
    });

    afterEach(() => {
        setGlobalSilent(false);
        globalThis.Bun.serve = originalServe;
    });

    test('handles valid arguments', () => {
        const exitSpy = spyOn(process, 'exit').mockImplementation((_code) => undefined as never);
        const signals: string[] = [];

        runServer(['--port', '8080', '--host', '0.0.0.0'], {
            pathExists: () => true,
            registerSignal: (event, _cb) => {
                signals.push(event);
                return process;
            },
        });

        expect(exitSpy).not.toHaveBeenCalled();
        expect(signals).toContain('SIGINT');
        expect(signals).toContain('SIGTERM');

        exitSpy.mockRestore();
    });

    test('handles invalid port', () => {
        const exitSpy = spyOn(process, 'exit').mockImplementation((_code) => undefined as never);
        runServer(['--port', 'invalid']);
        expect(exitSpy).toHaveBeenCalledWith(1);
        exitSpy.mockRestore();
    });

    test('handles graceful shutdown via SIGINT', () => {
        const exitSpy = spyOn(process, 'exit').mockImplementation((_code) => undefined as never);
        let sigintCb: (() => void) | undefined;

        runServer(['--port', '8080'], {
            pathExists: () => true,
            registerSignal: (event, cb) => {
                if (event === 'SIGINT') sigintCb = cb;
                return process;
            },
        });

        expect(sigintCb).toBeDefined();

        // Trigger shutdown
        if (sigintCb) {
            sigintCb();
            expect(exitSpy).toHaveBeenCalledWith(0);
        }

        exitSpy.mockRestore();
    });

    test('forces a UI rebuild when --build is provided', () => {
        const spawnSpy = spyOn(Bun, 'spawnSync').mockImplementation(
            () =>
                ({
                    exitCode: 0,
                }) as ReturnType<typeof Bun.spawnSync>,
        );

        runServer(['--build'], {
            pathExists: () => true,
            resolveUiDir: () => '/tmp/tasks-ui',
            registerSignal: () => process,
        });

        const [command, options] = spawnSpy.mock.calls[0] ?? [];
        expect(command).toEqual(['bun', 'run', 'build']);
        expect(options).toMatchObject({
            cwd: '/tmp/tasks-ui',
            stdout: 'ignore',
            stderr: 'ignore',
        });

        spawnSpy.mockRestore();
    });

    test('builds the UI when static artifacts are missing', () => {
        let buildCount = 0;

        runServer([], {
            resolveStaticDir: () => '/tmp/tasks-static',
            resolveUiDir: () => '/tmp/tasks-ui',
            pathExists: (path) => path === '/tmp/tasks-ui',
            buildUi: () => {
                buildCount += 1;
                return 0;
            },
            registerSignal: () => process,
        });

        expect(buildCount).toBe(1);
    });

    test('skips the UI build when the UI source directory is missing', () => {
        let buildCount = 0;

        runServer([], {
            resolveStaticDir: () => '/tmp/tasks-static',
            resolveUiDir: () => '/tmp/tasks-ui',
            pathExists: () => false,
            buildUi: () => {
                buildCount += 1;
                return 0;
            },
            registerSignal: () => process,
        });

        expect(buildCount).toBe(0);
    });

    test('logs an error when the UI build fails', () => {
        let buildCount = 0;

        runServer([], {
            resolveStaticDir: () => '/tmp/tasks-static',
            resolveUiDir: () => '/tmp/tasks-ui',
            pathExists: (path) => path === '/tmp/tasks-ui',
            buildUi: () => {
                buildCount += 1;
                return 1;
            },
            registerSignal: () => process,
        });

        expect(buildCount).toBe(1);
    });

    test('prints port-in-use diagnostics and current process details when available', () => {
        const exitError = new Error('exit 1');
        const errorSpy = spyOn(logger, 'error');
        const logSpy = spyOn(logger, 'log');

        globalThis.Bun.serve = (() => {
            const error = new Error('Address in use') as NodeJS.ErrnoException;
            error.code = 'EADDRINUSE';
            throw error;
        }) as typeof globalThis.Bun.serve;

        expect(() =>
            runServer(['--port', '3456'], {
                pathExists: () => true,
                describePortUsage: () => 'bun     123 robin   10u  IPv4 0x123      TCP *:3456 (LISTEN)',
                exitProcess: () => {
                    throw exitError;
                },
                registerSignal: () => process,
            }),
        ).toThrow(exitError);

        expect(errorSpy).toHaveBeenCalledWith('Port 3456 is already in use.');
        expect(logSpy).toHaveBeenCalledWith('To find the process using this port:');
        expect(logSpy).toHaveBeenCalledWith('  lsof -i :3456');
        expect(logSpy).toHaveBeenCalledWith('To kill it:');
        expect(logSpy).toHaveBeenCalledWith('  kill $(lsof -t -i :3456)');
        expect(logSpy).toHaveBeenCalledWith('Or start on a different port:');
        expect(logSpy).toHaveBeenCalledWith('  tasks server --port 3457');
        expect(logSpy).toHaveBeenCalledWith('Current process using port:');
        expect(logSpy).toHaveBeenCalledWith('bun     123 robin   10u  IPv4 0x123      TCP *:3456 (LISTEN)');

        logSpy.mockRestore();
        errorSpy.mockRestore();
    });

    test('exits cleanly when port lookup fails for an in-use port', () => {
        const exitError = new Error('exit 1');
        const logSpy = spyOn(logger, 'log');

        globalThis.Bun.serve = (() => {
            const error = new Error('Address in use') as NodeJS.ErrnoException;
            error.code = 'EADDRINUSE';
            throw error;
        }) as typeof globalThis.Bun.serve;

        expect(() =>
            runServer(['--port', '4567'], {
                pathExists: () => true,
                describePortUsage: () => {
                    throw new Error('lsof unavailable');
                },
                exitProcess: () => {
                    throw exitError;
                },
                registerSignal: () => process,
            }),
        ).toThrow(exitError);

        expect(logSpy).not.toHaveBeenCalledWith('Current process using port:');

        logSpy.mockRestore();
    });

    test('rethrows unexpected Bun.serve errors', () => {
        const boom = new Error('boom');

        globalThis.Bun.serve = (() => {
            throw boom;
        }) as typeof globalThis.Bun.serve;

        expect(() =>
            runServer([], {
                pathExists: () => true,
                registerSignal: () => process,
            }),
        ).toThrow(boom);
    });

    test('builds the lsof command with the expected options', () => {
        let receivedCommand = '';
        let receivedOptions: Record<string, unknown> | undefined;

        const result = describePortUsage(
            3456,
            ((command, options) => {
                receivedCommand = command;
                receivedOptions = options as Record<string, unknown>;
                return 'listener';
            }) as typeof import('node:child_process').execSync,
        );

        expect(result).toBe('listener');
        expect(receivedCommand).toBe('lsof -i :3456 2>/dev/null | tail -n +2');
        expect(receivedOptions).toMatchObject({
            encoding: 'utf-8',
            timeout: 5000,
        });
    });

    test('delegates exits through the injected exit function', () => {
        const exitError = new Error('exit 1');

        expect(() =>
            exitServerProcess(
                1,
                ((code) => {
                    expect(code).toBe(1);
                    throw exitError;
                }) as typeof process.exit,
            ),
        ).toThrow(exitError);
    });
});
