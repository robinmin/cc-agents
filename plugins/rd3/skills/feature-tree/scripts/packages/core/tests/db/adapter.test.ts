import { describe, expect, test } from 'bun:test';
import { createDbAdapter } from '../../src/db/adapter';

describe('createDbAdapter', () => {
    test('creates bun-sqlite adapter', async () => {
        const adapter = await createDbAdapter({ driver: 'bun-sqlite', url: ':memory:' });
        expect(adapter).toBeDefined();
        const db = adapter.getDb();
        expect(db).toBeDefined();
        adapter.close();
    });

    test('bun-sqlite adapter with default url', async () => {
        const adapter = await createDbAdapter({ driver: 'bun-sqlite' });
        expect(adapter).toBeDefined();
        adapter.close();
    });
});
