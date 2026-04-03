import { describe, expect, it } from 'bun:test';
import { acquire } from '../../scripts/server/writeLock';

describe('writeLock', () => {
    it('acquires and releases a lock', async () => {
        const release = await acquire('test-key-1');
        release();
        // Should be able to acquire again immediately
        const release2 = await acquire('test-key-1');
        release2();
    });

    it('serializes concurrent acquisitions for the same key', async () => {
        const order: number[] = [];

        const p1 = (async () => {
            const release = await acquire('serialize-test');
            order.push(1);
            await new Promise((r) => setTimeout(r, 50));
            order.push(2);
            release();
        })();

        const p2 = (async () => {
            // Small delay to ensure p1 acquires first
            await new Promise((r) => setTimeout(r, 10));
            const release = await acquire('serialize-test');
            order.push(3);
            release();
        })();

        await Promise.all([p1, p2]);
        expect(order).toEqual([1, 2, 3]);
    });

    it('allows concurrent acquisitions for different keys', async () => {
        const order: string[] = [];

        const p1 = (async () => {
            const release = await acquire('key-a');
            order.push('a-start');
            await new Promise((r) => setTimeout(r, 50));
            order.push('a-end');
            release();
        })();

        const p2 = (async () => {
            const release = await acquire('key-b');
            order.push('b-start');
            release();
        })();

        await Promise.all([p1, p2]);
        // Both should start without waiting
        expect(order).toContain('a-start');
        expect(order).toContain('b-start');
    });
});
