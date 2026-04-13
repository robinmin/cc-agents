import { describe, expect, test } from 'bun:test';
import { CORE_CONFIG } from '../src/config';

describe('CORE_CONFIG', () => {
    test('has expected db defaults', () => {
        expect(CORE_CONFIG.defaultDbPath).toBe('docs/.ftree/db.sqlite');
    });

    test('has all SQLite pragmas', () => {
        const { pragmas } = CORE_CONFIG;
        expect(pragmas.journalMode).toContain('WAL');
        expect(pragmas.synchronous).toContain('NORMAL');
        expect(pragmas.foreignKeys).toContain('foreign_keys');
        expect(pragmas.busyTimeout).toContain('busy_timeout');
    });

    test('feature constraints are valid', () => {
        const { feature } = CORE_CONFIG;
        expect(feature.titleMinLength).toBeGreaterThanOrEqual(1);
        expect(feature.titleMaxLength).toBeGreaterThan(feature.titleMinLength);
    });
});
