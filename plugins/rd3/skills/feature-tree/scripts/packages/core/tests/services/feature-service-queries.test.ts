/**
 * ftree — Phase 2 Query Tests
 *
 * Tests for getContext, checkDone, and exportTree service methods.
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { BunSqliteAdapter } from '../../src/db/adapters/bun-sqlite';
import { FeatureService, initSchema } from '../../src/services/feature-service';

/**
 * Type assertion helper that narrows `T | null | undefined` to `T`.
 * Use after `expect(val).toBeDefined()` to satisfy noNonNullAssertion rule.
 */
function assertDefined<T>(val: T | null | undefined, context: string): asserts val is T {
    if (val === null || val === undefined) {
        throw new Error(`${context} should be defined but was ${val}`);
    }
}

describe('FeatureService — Query Methods', () => {
    let service: FeatureService;
    let adapter: BunSqliteAdapter;

    beforeAll(() => {
        adapter = new BunSqliteAdapter(':memory:');
        initSchema(adapter);
        service = new FeatureService(adapter);
    });

    afterAll(() => {
        adapter.close();
    });

    // ─── getContext ──────────────────────────────────────────────────────

    describe('getContext', () => {
        test('returns error for non-existent feature', async () => {
            const result = await service.getContext('nonexistent');
            expect(result.ok).toBe(false);
        });

        test('returns context for root feature without parent', async () => {
            const created = await service.create({ title: 'Root Feature' });
            expect(created.ok).toBe(true);
            if (!created.ok) return;

            const result = await service.getContext(created.data.id);
            expect(result.ok).toBe(true);
            if (!result.ok) return;

            expect(result.data.node.id).toBe(created.data.id);
            expect(result.data.node.title).toBe('Root Feature');
            expect(result.data.parent).toBeNull();
            expect(result.data.children).toHaveLength(0);
            expect(result.data.linkedWbs).toEqual([]);
        });

        test('returns context with parent for child feature', async () => {
            const parent = await service.create({ title: 'Parent for Context' });
            expect(parent.ok).toBe(true);
            if (!parent.ok) return;

            const child = await service.create({
                title: 'Child for Context',
                parentId: parent.data.id,
            });
            expect(child.ok).toBe(true);
            if (!child.ok) return;

            const result = await service.getContext(child.data.id);
            expect(result.ok).toBe(true);
            if (!result.ok) return;

            expect(result.data.node.id).toBe(child.data.id);
            expect(result.data.parent).toBeDefined();
            assertDefined(result.data.parent, 'parent');
            expect(result.data.parent.id).toBe(parent.data.id);
            expect(result.data.parent.title).toBe('Parent for Context');
        });

        test('returns context with children', async () => {
            const parent = await service.create({ title: 'Parent with Kids' });
            expect(parent.ok).toBe(true);
            if (!parent.ok) return;

            await service.create({ title: 'Kid 1', parentId: parent.data.id });
            await service.create({ title: 'Kid 2', parentId: parent.data.id });

            const result = await service.getContext(parent.data.id);
            expect(result.ok).toBe(true);
            if (!result.ok) return;

            expect(result.data.children).toHaveLength(2);
            expect(result.data.children.map((c) => c.title)).toEqual(['Kid 1', 'Kid 2']);
        });

        test('returns context with linked WBS', async () => {
            const feature = await service.create({ title: 'WBS Feature' });
            expect(feature.ok).toBe(true);
            if (!feature.ok) return;

            service.linkWbs(feature.data.id, '001');
            service.linkWbs(feature.data.id, '002');

            const result = await service.getContext(feature.data.id);
            expect(result.ok).toBe(true);
            if (!result.ok) return;

            expect(result.data.linkedWbs).toEqual(['001', '002']);
        });
    });

    // ─── checkDone ───────────────────────────────────────────────────────

    describe('checkDone', () => {
        test('returns error for non-existent feature', async () => {
            const result = await service.checkDone('nonexistent');
            expect(result.ok).toBe(false);
        });

        test('leaf node is eligible for done', async () => {
            const feature = await service.create({ title: 'Leaf Feature' });
            expect(feature.ok).toBe(true);
            if (!feature.ok) return;

            const result = await service.checkDone(feature.data.id);
            expect(result.ok).toBe(true);
            if (!result.ok) return;

            expect(result.data.eligible).toBe(true);
            expect(result.data.reasons).toHaveLength(0);
        });

        test('branch with all children done is eligible', async () => {
            const parent = await service.create({ title: 'All Done Parent' });
            expect(parent.ok).toBe(true);
            if (!parent.ok) return;

            await service.create({
                title: 'Done Child 1',
                parentId: parent.data.id,
                status: 'done',
            });
            await service.create({
                title: 'Done Child 2',
                parentId: parent.data.id,
                status: 'done',
            });

            const result = await service.checkDone(parent.data.id);
            expect(result.ok).toBe(true);
            if (!result.ok) return;

            expect(result.data.eligible).toBe(true);
            expect(result.data.reasons).toHaveLength(0);
        });

        test('branch with non-done children is not eligible', async () => {
            const parent = await service.create({ title: 'Mixed Parent' });
            expect(parent.ok).toBe(true);
            if (!parent.ok) return;

            await service.create({
                title: 'Done Child',
                parentId: parent.data.id,
                status: 'done',
            });
            const _executingChild = await service.create({
                title: 'Executing Child',
                parentId: parent.data.id,
                status: 'executing',
            });

            const result = await service.checkDone(parent.data.id);
            expect(result.ok).toBe(true);
            if (!result.ok) return;

            expect(result.data.eligible).toBe(false);
            expect(result.data.reasons.length).toBeGreaterThan(0);
            expect(result.data.reasons[0]).toContain('Executing Child');
            expect(result.data.reasons[0]).toContain('executing');
        });

        test('branch with backlog children is not eligible', async () => {
            const parent = await service.create({ title: 'Backlog Parent' });
            expect(parent.ok).toBe(true);
            if (!parent.ok) return;

            await service.create({
                title: 'Backlog Child',
                parentId: parent.data.id,
                status: 'backlog',
            });

            const result = await service.checkDone(parent.data.id);
            expect(result.ok).toBe(true);
            if (!result.ok) return;

            expect(result.data.eligible).toBe(false);
            expect(result.data.reasons[0]).toContain('backlog');
        });

        test('branch with blocked children is not eligible', async () => {
            const parent = await service.create({ title: 'Blocked Parent' });
            expect(parent.ok).toBe(true);
            if (!parent.ok) return;

            await service.create({
                title: 'Blocked Child',
                parentId: parent.data.id,
                status: 'blocked',
            });

            const result = await service.checkDone(parent.data.id);
            expect(result.ok).toBe(true);
            if (!result.ok) return;

            expect(result.data.eligible).toBe(false);
            expect(result.data.reasons[0]).toContain('blocked');
        });
    });

    // ─── exportTree ──────────────────────────────────────────────────────

    describe('exportTree', () => {
        test('exports empty tree', async () => {
            const result = await service.exportTree();
            expect(result.ok).toBe(true);
            if (!result.ok) return;

            // Empty tree returns the virtual root with no children
            const data = result.data as Record<string, unknown>;
            expect(data).toBeDefined();
        });

        test('exports full tree', async () => {
            const parent = await service.create({ title: 'Export Root' });
            expect(parent.ok).toBe(true);
            if (!parent.ok) return;

            await service.create({
                title: 'Export Child',
                parentId: parent.data.id,
                status: 'executing',
            });

            const result = await service.exportTree();
            expect(result.ok).toBe(true);
            if (!result.ok) return;

            const data = result.data as Record<string, unknown>;
            expect(data).toBeDefined();
            expect(data.children).toBeDefined();

            // Should contain the root feature
            const children = data.children as Record<string, unknown>[];
            const rootChild = children.find((c) => c.title === 'Export Root');
            expect(rootChild).toBeDefined();
            assertDefined(rootChild, 'rootChild');
            expect(rootChild.children).toHaveLength(1);
        });

        test('exports subtree with rootId', async () => {
            const top = await service.create({ title: 'Top Level' });
            expect(top.ok).toBe(true);
            if (!top.ok) return;

            const mid = await service.create({
                title: 'Mid Level',
                parentId: top.data.id,
            });
            expect(mid.ok).toBe(true);
            if (!mid.ok) return;

            await service.create({
                title: 'Bottom Level',
                parentId: mid.data.id,
            });

            const result = await service.exportTree(mid.data.id);
            expect(result.ok).toBe(true);
            if (!result.ok) return;

            const data = result.data as Record<string, unknown>;
            expect(data.title).toBe('Mid Level');

            const children = data.children as Record<string, unknown>[];
            expect(children).toHaveLength(1);
            expect(children[0].title).toBe('Bottom Level');
        });

        test('returns error for non-existent rootId', async () => {
            const result = await service.exportTree('nonexistent');
            expect(result.ok).toBe(false);
        });

        test('export includes WBS links', async () => {
            const feature = await service.create({ title: 'WBS Export Feature' });
            expect(feature.ok).toBe(true);
            if (!feature.ok) return;

            service.linkWbs(feature.data.id, '099');
            service.linkWbs(feature.data.id, '100');

            const result = await service.exportTree(feature.data.id);
            expect(result.ok).toBe(true);
            if (!result.ok) return;

            const data = result.data as Record<string, unknown>;
            expect(data.wbs_ids).toEqual(['099', '100']);
        });

        test('export includes metadata', async () => {
            const feature = await service.create({
                title: 'Meta Export Feature',
                metadata: '{"priority":"critical"}',
            });
            expect(feature.ok).toBe(true);
            if (!feature.ok) return;

            const result = await service.exportTree(feature.data.id);
            expect(result.ok).toBe(true);
            if (!result.ok) return;

            const data = result.data as Record<string, unknown>;
            expect(data.metadata).toEqual({ priority: 'critical' });
        });
    });
});
