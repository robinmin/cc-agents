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
        const onSpy = spyOn(process, 'on').mockImplementation((_event, _cb) => undefined as never);

        runServer(['--port', '8080', '--host', '0.0.0.0']);

        expect(exitSpy).not.toHaveBeenCalled();
        expect(onSpy).toHaveBeenCalledTimes(2); // SIGINT, SIGTERM

        exitSpy.mockRestore();
        onSpy.mockRestore();
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
        let _sigtermCb: (() => void) | undefined;

        const onSpy = spyOn(process, 'on').mockImplementation((event, cb) => {
            if (event === 'SIGINT') sigintCb = cb as () => void;
            if (event === 'SIGTERM') _sigtermCb = cb as () => void;
            return process;
        });

        runServer(['--port', '8080']);

        expect(sigintCb).toBeDefined();

        // Trigger shutdown
        if (sigintCb) {
            sigintCb();
            expect(exitSpy).toHaveBeenCalledWith(0);
        }

        exitSpy.mockRestore();
        onSpy.mockRestore();
    });
});
