import { expect, test, describe, spyOn, beforeEach, afterEach } from 'bun:test';
import { runServer } from '../scripts/commands/server';
import { setGlobalSilent } from '../../../scripts/logger';

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
});
