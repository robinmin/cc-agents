import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Logger, createLogger, isGlobalSilent, logger, setGlobalSilent } from '../../../scripts/logger';

describe('logger coverage for orchestration-v2', () => {
    const originalQuiet = process.env.RD3_LOG_QUIET;
    let debugSpy: ReturnType<typeof spyOn>;
    let infoSpy: ReturnType<typeof spyOn>;
    let warnSpy: ReturnType<typeof spyOn>;
    let errorSpy: ReturnType<typeof spyOn>;
    let logSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
        setGlobalSilent(false);
        process.env.RD3_LOG_QUIET = undefined;
        debugSpy = spyOn(console, 'debug').mockImplementation(mock(() => {}));
        infoSpy = spyOn(console, 'info').mockImplementation(mock(() => {}));
        warnSpy = spyOn(console, 'warn').mockImplementation(mock(() => {}));
        errorSpy = spyOn(console, 'error').mockImplementation(mock(() => {}));
        logSpy = spyOn(console, 'log').mockImplementation(mock(() => {}));
    });

    afterEach(() => {
        process.env.RD3_LOG_QUIET = originalQuiet;
        setGlobalSilent(false);
        debugSpy.mockRestore();
        infoSpy.mockRestore();
        warnSpy.mockRestore();
        errorSpy.mockRestore();
        logSpy.mockRestore();
    });

    test('logs each level when enabled and supports colored and plain formatting', () => {
        const colorLogger = new Logger({ level: 'debug', prefix: 'orch', color: true });
        const plainLogger = createLogger({ level: 'debug', prefix: 'plain', color: false });

        colorLogger.debug('debug message', { debug: true });
        colorLogger.info('info message');
        colorLogger.warn('warn message');
        colorLogger.error('error message');
        colorLogger.success('success message');
        colorLogger.fail('fail message');
        plainLogger.info('plain info');
        colorLogger.log('raw log', 42);

        expect(debugSpy).toHaveBeenCalled();
        expect(infoSpy).toHaveBeenCalledTimes(2);
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(errorSpy).toHaveBeenCalledTimes(2);
        expect(logSpy).toHaveBeenCalledTimes(2);

        expect(String(debugSpy.mock.calls[0]?.[0])).toContain('[orch]');
        expect(String(infoSpy.mock.calls[1]?.[0])).toContain('[plain]');
        expect(String(logSpy.mock.calls[0]?.[0])).toContain('[OK]');
        expect(String(errorSpy.mock.calls[1]?.[0])).toContain('[X]');
        expect(logSpy).toHaveBeenCalledWith('raw log', 42);
    });

    test('suppresses formatted logs in quiet mode but keeps plain log available', () => {
        process.env.RD3_LOG_QUIET = 'true';
        const quietLogger = new Logger({ level: 'debug' });

        quietLogger.debug('hidden debug');
        quietLogger.info('hidden info');
        quietLogger.warn('hidden warn');
        quietLogger.error('hidden error');
        quietLogger.success('hidden success');
        quietLogger.fail('hidden fail');
        quietLogger.log('still visible');

        expect(debugSpy).not.toHaveBeenCalled();
        expect(infoSpy).not.toHaveBeenCalled();
        expect(warnSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
        expect(logSpy).toHaveBeenCalledWith('still visible');
    });

    test('global silent suppresses every output path and exported default logger is usable', () => {
        setGlobalSilent(true);

        logger.info('hidden info');
        logger.warn('hidden warn');
        logger.error('hidden error');
        logger.success('hidden success');
        logger.fail('hidden fail');
        logger.log('hidden log');

        expect(isGlobalSilent()).toBe(true);
        expect(logger).toBeInstanceOf(Logger);
        expect(debugSpy).not.toHaveBeenCalled();
        expect(infoSpy).not.toHaveBeenCalled();
        expect(warnSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
        expect(logSpy).not.toHaveBeenCalled();
    });

    test('quiet mode also recognizes numeric flag', () => {
        process.env.RD3_LOG_QUIET = '1';
        const quietLogger = new Logger({ level: 'debug' });

        quietLogger.info('suppressed');

        expect(infoSpy).not.toHaveBeenCalled();
    });
});
