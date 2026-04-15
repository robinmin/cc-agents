/**
 * ftree — FeatureService Mutation Tests
 *
 * Tests all 6 mutation methods: update, remove, move, unlinkWbs, digest, importTree.
 * Each test creates its own feature data within a shared in-memory DB.
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { BunSqliteAdapter } from '../../src/db/adapters/bun-sqlite';
import { isAppError } from '../../src/errors';
import { FeatureService, initSchema } from '../../src/services/feature-service';
import type { TemplateNode } from '../../src/types/feature';

/**
 * Type assertion helper that narrows `T | null | undefined` to `T`.
 * Use after `expect(val).toBeDefined()` to satisfy noNonNullAssertion rule.
 */
function assertDefined<T>(val: T | null | undefined, context: string): asserts val is T {
    if (val === null || val === undefined) {
        throw new Error(`${context} should be defined but was ${val}`);
    }
}

describe('FeatureService — Mutations', () => {
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

    // ─── update ───────────────────────────────────────────────────────────

    describe('update', () => {
        test('updates title', async () => {
            const created = await service.create({ title: 'Original Title' });
            expect(created.ok).toBe(true);
            if (!created.ok) return;

            const result = await service.update(created.data.id, { title: 'Updated Title' });
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.data.title).toBe('Updated Title');
            // Status and metadata unchanged
            expect(result.data.status).toBe('backlog');
        });

        test('updates status with valid transition (backlog → validated)', async () => {
            const created = await service.create({ title: 'Status Update' });
            expect(created.ok).toBe(true);
            if (!created.ok) return;

            const result = await service.update(created.data.id, { status: 'validated' });
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.data.status).toBe('validated');
        });

        test('updates metadata', async () => {
            const created = await service.create({ title: 'Meta Update' });
            expect(created.ok).toBe(true);
            if (!created.ok) return;

            const result = await service.update(created.data.id, { metadata: '{"key":"value"}' });
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.data.metadata).toBe('{"key":"value"}');
        });

        test('updates multiple fields at once', async () => {
            const created = await service.create({ title: 'Multi Update' });
            expect(created.ok).toBe(true);
            if (!created.ok) return;

            const result = await service.update(created.data.id, {
                title: 'Multi Updated',
                status: 'blocked',
                metadata: '{"priority":"high"}',
            });
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.data.title).toBe('Multi Updated');
            expect(result.data.status).toBe('blocked');
            expect(result.data.metadata).toBe('{"priority":"high"}');
        });

        test('trims whitespace from title on update', async () => {
            const created = await service.create({ title: 'Trim Test' });
            expect(created.ok).toBe(true);
            if (!created.ok) return;

            const result = await service.update(created.data.id, { title: '  Trimmed  ' });
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.data.title).toBe('Trimmed');
        });

        test('rejects invalid status transition (backlog → done)', async () => {
            const created = await service.create({ title: 'Bad Transition' });
            expect(created.ok).toBe(true);
            if (!created.ok) return;

            const result = await service.update(created.data.id, { status: 'done' });
            expect(result.ok).toBe(false);
            if (result.ok) return;
            expect(isAppError(result.error)).toBe(true);
            expect(result.error.message).toContain('invalid');
        });

        test('rejects blank title on update', async () => {
            const created = await service.create({ title: 'NotBlank' });
            expect(created.ok).toBe(true);
            if (!created.ok) return;

            const result = await service.update(created.data.id, { title: '   ' });
            expect(result.ok).toBe(false);
            if (result.ok) return;
            expect(isAppError(result.error)).toBe(true);
            expect(result.error.message).toContain('blank');
        });

        test('returns error for nonexistent feature', async () => {
            const result = await service.update('nonexistent-id', { title: 'Ghost' });
            expect(result.ok).toBe(false);
            if (result.ok) return;
            expect(isAppError(result.error)).toBe(true);
        });

        test('no-op when setting same status', async () => {
            const created = await service.create({ title: 'Same Status' });
            expect(created.ok).toBe(true);
            if (!created.ok) return;

            // Setting same status should not trigger validation error
            const result = await service.update(created.data.id, { status: 'backlog' });
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.data.status).toBe('backlog');
        });

        test('allows chained valid transitions', async () => {
            const created = await service.create({ title: 'Chain' });
            expect(created.ok).toBe(true);
            if (!created.ok) return;
            const id = created.data.id;

            // backlog → validated
            const r1 = await service.update(id, { status: 'validated' });
            expect(r1.ok).toBe(true);
            if (!r1.ok) return;
            expect(r1.data.status).toBe('validated');

            // validated → executing
            const r2 = await service.update(id, { status: 'executing' });
            expect(r2.ok).toBe(true);
            if (!r2.ok) return;
            expect(r2.data.status).toBe('executing');

            // executing → done
            const r3 = await service.update(id, { status: 'done' });
            expect(r3.ok).toBe(true);
            if (!r3.ok) return;
            expect(r3.data.status).toBe('done');
        });
    });

    // ─── remove ───────────────────────────────────────────────────────────

    describe('remove', () => {
        test('removes a leaf node with no WBS links', async () => {
            const created = await service.create({ title: 'Removable Leaf' });
            expect(created.ok).toBe(true);
            if (!created.ok) return;

            const result = await service.remove(created.data.id);
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.data.count).toBe(1);

            // Verify it's gone
            expect(service.exists(created.data.id)).toBe(false);
        });

        test('rejects removal when feature has children', async () => {
            const parent = await service.create({ title: 'Parent with Kids' });
            expect(parent.ok).toBe(true);
            if (!parent.ok) return;

            await service.create({ title: 'Child', parentId: parent.data.id });

            const result = await service.remove(parent.data.id);
            expect(result.ok).toBe(false);
            if (result.ok) return;
            expect(isAppError(result.error)).toBe(true);
            expect(result.error.message).toContain('child');
        });

        test('rejects removal when feature has WBS links', async () => {
            const feature = await service.create({ title: 'WBS Linked' });
            expect(feature.ok).toBe(true);
            if (!feature.ok) return;

            service.linkWbs(feature.data.id, 'WBS-999');

            const result = await service.remove(feature.data.id);
            expect(result.ok).toBe(false);
            if (result.ok) return;
            expect(isAppError(result.error)).toBe(true);
            expect(result.error.message).toContain('WBS');
        });

        test('force removes feature with children and WBS links', async () => {
            const root = await service.create({ title: 'Force Root' });
            expect(root.ok).toBe(true);
            if (!root.ok) return;

            const child = await service.create({ title: 'Force Child', parentId: root.data.id });
            expect(child.ok).toBe(true);
            if (!child.ok) return;

            const grandchild = await service.create({ title: 'Force Grandchild', parentId: child.data.id });
            expect(grandchild.ok).toBe(true);
            if (!grandchild.ok) return;

            // Add WBS links to root and child
            service.linkWbs(root.data.id, 'WBS-F1');
            service.linkWbs(child.data.id, 'WBS-F2');

            const result = await service.remove(root.data.id, { force: true });
            expect(result.ok).toBe(true);
            if (!result.ok) return;

            // Count should include root + child + grandchild = 3
            expect(result.data.count).toBe(3);

            // All three should be gone
            expect(service.exists(root.data.id)).toBe(false);
            expect(service.exists(child.data.id)).toBe(false);
            expect(service.exists(grandchild.data.id)).toBe(false);

            // WBS links should be gone
            expect(service.getWbsIds(root.data.id)).toHaveLength(0);
            expect(service.getWbsIds(child.data.id)).toHaveLength(0);
        });

        test('returns error for nonexistent feature', async () => {
            const result = await service.remove('nonexistent-id');
            expect(result.ok).toBe(false);
            if (result.ok) return;
            expect(isAppError(result.error)).toBe(true);
        });

        test('force remove on a leaf node removes just the one feature', async () => {
            const leaf = await service.create({ title: 'Force Leaf' });
            expect(leaf.ok).toBe(true);
            if (!leaf.ok) return;

            const result = await service.remove(leaf.data.id, { force: true });
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.data.count).toBe(1);
            expect(service.exists(leaf.data.id)).toBe(false);
        });
    });

    // ─── move ─────────────────────────────────────────────────────────────

    describe('move', () => {
        test('moves feature to a new parent', async () => {
            const parentA = await service.create({ title: 'Parent A' });
            expect(parentA.ok).toBe(true);
            if (!parentA.ok) return;

            const parentB = await service.create({ title: 'Parent B' });
            expect(parentB.ok).toBe(true);
            if (!parentB.ok) return;

            const child = await service.create({ title: 'Movable Child', parentId: parentA.data.id });
            expect(child.ok).toBe(true);
            if (!child.ok) return;

            const result = await service.move(child.data.id, parentB.data.id);
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.data.parentId).toBe(parentB.data.id);

            // Verify the child is now under parentB
            const childrenB = service.getChildren(parentB.data.id);
            expect(childrenB.some((c) => c.id === child.data.id)).toBe(true);
        });

        test('moves feature to root (null parent)', async () => {
            const parent = await service.create({ title: 'Rootify Parent' });
            expect(parent.ok).toBe(true);
            if (!parent.ok) return;

            const child = await service.create({ title: 'Becoming Root', parentId: parent.data.id });
            expect(child.ok).toBe(true);
            if (!child.ok) return;
            expect(child.data.depth).toBe(1);

            const result = await service.move(child.data.id, null);
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.data.parentId).toBeNull();
            expect(result.data.depth).toBe(0);
        });

        test('no-op when moving to same parent', async () => {
            const parent = await service.create({ title: 'Same Parent Move' });
            expect(parent.ok).toBe(true);
            if (!parent.ok) return;

            const child = await service.create({ title: 'Stay Put', parentId: parent.data.id });
            expect(child.ok).toBe(true);
            if (!child.ok) return;

            const result = await service.move(child.data.id, parent.data.id);
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.data.parentId).toBe(parent.data.id);
        });

        test('rejects circular reference (move into own subtree)', async () => {
            const root = await service.create({ title: 'Circular Root' });
            expect(root.ok).toBe(true);
            if (!root.ok) return;

            const child = await service.create({ title: 'Circular Child', parentId: root.data.id });
            expect(child.ok).toBe(true);
            if (!child.ok) return;

            const grandchild = await service.create({ title: 'Circular Grandchild', parentId: child.data.id });
            expect(grandchild.ok).toBe(true);
            if (!grandchild.ok) return;

            // Moving root under grandchild should fail
            const result = await service.move(root.data.id, grandchild.data.id);
            expect(result.ok).toBe(false);
            if (result.ok) return;
            expect(isAppError(result.error)).toBe(true);
            expect(result.error.message).toContain('circular');
        });

        test('rejects move to nonexistent parent', async () => {
            const feature = await service.create({ title: 'Orphan Move' });
            expect(feature.ok).toBe(true);
            if (!feature.ok) return;

            const result = await service.move(feature.data.id, 'nonexistent-parent');
            expect(result.ok).toBe(false);
            if (result.ok) return;
            expect(isAppError(result.error)).toBe(true);
        });

        test('rejects move of nonexistent feature', async () => {
            const target = await service.create({ title: 'Move Target' });
            expect(target.ok).toBe(true);
            if (!target.ok) return;

            const result = await service.move('nonexistent-id', target.data.id);
            expect(result.ok).toBe(false);
            if (result.ok) return;
            expect(isAppError(result.error)).toBe(true);
        });

        test('recalculates depth for subtree when moved deeper', async () => {
            const root = await service.create({ title: 'Depth Root' });
            expect(root.ok).toBe(true);
            if (!root.ok) return;

            const mid = await service.create({ title: 'Depth Mid' });
            expect(mid.ok).toBe(true);
            if (!mid.ok) return;

            // Create a node at root level, with its own child
            const node = await service.create({ title: 'Depth Node' });
            expect(node.ok).toBe(true);
            if (!node.ok) return;

            const nodeChild = await service.create({ title: 'Depth Node Child', parentId: node.data.id });
            expect(nodeChild.ok).toBe(true);
            if (!nodeChild.ok) return;
            // nodeChild should be at depth 1
            expect(nodeChild.data.depth).toBe(1);

            // Move node under mid (mid is depth 0, so node becomes depth 1)
            const moved = await service.move(node.data.id, mid.data.id);
            expect(moved.ok).toBe(true);
            if (!moved.ok) return;
            expect(moved.data.depth).toBe(1);

            // nodeChild should now be at depth 2
            const refreshed = await service.getById(nodeChild.data.id);
            expect(refreshed.ok).toBe(true);
            if (!refreshed.ok) return;
            expect(refreshed.data.depth).toBe(2);
        });
    });

    // ─── unlinkWbs ────────────────────────────────────────────────────────

    describe('unlinkWbs', () => {
        test('removes specified WBS links and returns count', async () => {
            const feature = await service.create({ title: 'Unlink Test' });
            expect(feature.ok).toBe(true);
            if (!feature.ok) return;

            service.linkWbs(feature.data.id, 'WBS-A');
            service.linkWbs(feature.data.id, 'WBS-B');
            service.linkWbs(feature.data.id, 'WBS-C');

            // Verify all linked
            expect(service.getWbsIds(feature.data.id)).toHaveLength(3);

            const result = await service.unlinkWbs(feature.data.id, ['WBS-A', 'WBS-C']);
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.data.count).toBe(2);

            // WBS-B should remain
            const remaining = service.getWbsIds(feature.data.id);
            expect(remaining).toEqual(['WBS-B']);
        });

        test('returns 0 count for WBS IDs that are not linked', async () => {
            const feature = await service.create({ title: 'Unlink Missing' });
            expect(feature.ok).toBe(true);
            if (!feature.ok) return;

            // No links exist, so unlinking should succeed with count 0
            const result = await service.unlinkWbs(feature.data.id, ['WBS-NONEXISTENT']);
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.data.count).toBe(0);
        });

        test('returns error for nonexistent feature', async () => {
            const result = await service.unlinkWbs('nonexistent-id', ['WBS-001']);
            expect(result.ok).toBe(false);
            if (result.ok) return;
            expect(isAppError(result.error)).toBe(true);
        });

        test('returns error for empty wbsIds array', async () => {
            const feature = await service.create({ title: 'Unlink Empty' });
            expect(feature.ok).toBe(true);
            if (!feature.ok) return;

            const result = await service.unlinkWbs(feature.data.id, []);
            expect(result.ok).toBe(false);
            if (result.ok) return;
            expect(isAppError(result.error)).toBe(true);
            expect(result.error.message).toContain('empty');
        });

        test('partial unlink — only linked IDs are removed', async () => {
            const feature = await service.create({ title: 'Partial Unlink' });
            expect(feature.ok).toBe(true);
            if (!feature.ok) return;

            service.linkWbs(feature.data.id, 'WBS-X');
            service.linkWbs(feature.data.id, 'WBS-Y');

            // Try to unlink WBS-X (linked) and WBS-Z (not linked)
            const result = await service.unlinkWbs(feature.data.id, ['WBS-X', 'WBS-Z']);
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.data.count).toBe(1); // Only WBS-X was actually unlinked

            const remaining = service.getWbsIds(feature.data.id);
            expect(remaining).toEqual(['WBS-Y']);
        });
    });

    // ─── digest ───────────────────────────────────────────────────────────

    describe('digest', () => {
        test('atomically links WBS and applies status transition', async () => {
            const feature = await service.create({ title: 'Digest Test' });
            expect(feature.ok).toBe(true);
            if (!feature.ok) return;

            const result = await service.digest(feature.data.id, ['WBS-D1', 'WBS-D2'], {
                status: 'validated',
            });
            expect(result.ok).toBe(true);
            if (!result.ok) return;

            const summary = result.data;
            expect(summary.status).toBe('validated');
            expect(summary.previous_status).toBe('backlog');
            expect(summary.status_changed).toBe(true);
            expect(summary.wbs_ids).toEqual(['WBS-D1', 'WBS-D2']);
            expect(summary.wbs_linked).toEqual(['WBS-D1', 'WBS-D2']);
        });

        test('returns error on invalid status transition', async () => {
            const feature = await service.create({ title: 'Digest Bad Transition' });
            expect(feature.ok).toBe(true);
            if (!feature.ok) return;

            // backlog → done is invalid
            const result = await service.digest(feature.data.id, ['WBS-DX'], { status: 'done' });
            expect(result.ok).toBe(false);
            if (result.ok) return;
            expect(isAppError(result.error)).toBe(true);
            expect(result.error.message).toContain('invalid');
        });

        test('defaults to executing when no status override is provided', async () => {
            const feature = await service.create({ title: 'Digest No Status' });
            expect(feature.ok).toBe(true);
            if (!feature.ok) return;

            const result = await service.digest(feature.data.id, ['WBS-D3']);
            expect(result.ok).toBe(true);
            if (!result.ok) return;

            const summary = result.data;
            expect(summary.status).toBe('executing');
            expect(summary.status_changed).toBe(true);
            expect(summary.previous_status).toBe('backlog');
            expect(summary.wbs_ids).toEqual(['WBS-D3']);
        });

        test('returns error for nonexistent feature', async () => {
            const result = await service.digest('nonexistent-id', ['WBS-D4']);
            expect(result.ok).toBe(false);
            if (result.ok) return;
            expect(isAppError(result.error)).toBe(true);
        });

        test('includes children count in summary', async () => {
            const parent = await service.create({ title: 'Digest Parent' });
            expect(parent.ok).toBe(true);
            if (!parent.ok) return;

            await service.create({ title: 'Digest Child 1', parentId: parent.data.id });
            await service.create({ title: 'Digest Child 2', parentId: parent.data.id });

            const result = await service.digest(parent.data.id, []);
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.data.children_count).toBe(2);
        });

        test('WBS link is idempotent across multiple digests', async () => {
            const feature = await service.create({ title: 'Digest Idempotent' });
            expect(feature.ok).toBe(true);
            if (!feature.ok) return;

            await service.digest(feature.data.id, ['WBS-IDEM']);
            await service.digest(feature.data.id, ['WBS-IDEM']);

            const wbsIds = service.getWbsIds(feature.data.id);
            expect(wbsIds).toEqual(['WBS-IDEM']);
        });
    });

    // ─── importTree ───────────────────────────────────────────────────────

    describe('importTree', () => {
        test('imports flat template nodes at root', async () => {
            const nodes: TemplateNode[] = [{ title: 'Feature A' }, { title: 'Feature B' }, { title: 'Feature C' }];

            const result = await service.importTree(nodes);
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.data.count).toBe(3);
        });

        test('imports nested template with children', async () => {
            const nodes: TemplateNode[] = [
                {
                    title: 'Auth Module',
                    status: 'validated',
                    children: [{ title: 'OAuth2' }, { title: 'JWT', status: 'executing' }],
                },
                { title: 'API Layer' },
            ];

            const result = await service.importTree(nodes);
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            // Auth Module + OAuth2 + JWT + API Layer = 4
            expect(result.data.count).toBe(4);
        });

        test('imports under an existing parent', async () => {
            const parent = await service.create({ title: 'Import Parent' });
            expect(parent.ok).toBe(true);
            if (!parent.ok) return;

            const nodes: TemplateNode[] = [{ title: 'Sub A' }, { title: 'Sub B', children: [{ title: 'Sub B.1' }] }];

            const result = await service.importTree(nodes, parent.data.id);
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            // Sub A + Sub B + Sub B.1 = 3
            expect(result.data.count).toBe(3);

            // Verify children are under the parent
            const children = service.getChildren(parent.data.id);
            expect(children.length).toBe(2);
            for (const c of children) {
                expect(c.parentId).toBe(parent.data.id);
                expect(c.depth).toBe(parent.data.depth + 1);
            }
        });

        test('returns error for empty nodes array', async () => {
            const result = await service.importTree([]);
            expect(result.ok).toBe(false);
            if (result.ok) return;
            expect(isAppError(result.error)).toBe(true);
            expect(result.error.message).toContain('empty');
        });

        test('returns error for nonexistent parent', async () => {
            const nodes: TemplateNode[] = [{ title: 'Orphan Import' }];
            const result = await service.importTree(nodes, 'nonexistent-parent');
            expect(result.ok).toBe(false);
            if (result.ok) return;
            expect(isAppError(result.error)).toBe(true);
        });

        test('imports deep nesting correctly', async () => {
            const nodes: TemplateNode[] = [
                {
                    title: 'L0',
                    children: [
                        {
                            title: 'L1',
                            children: [
                                {
                                    title: 'L2',
                                    children: [{ title: 'L3' }],
                                },
                            ],
                        },
                    ],
                },
            ];

            const result = await service.importTree(nodes);
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.data.count).toBe(4);

            // Verify we can get subtree and depth is correct
            const listResult = await service.list();
            expect(listResult.ok).toBe(true);
            if (!listResult.ok) return;
            const l3 = listResult.data.find((f) => f.title === 'L3');
            expect(l3).toBeDefined();
            assertDefined(l3, 'l3');
            expect(l3.depth).toBe(3);
        });

        test('uses default backlog status when not specified', async () => {
            const nodes: TemplateNode[] = [{ title: 'Default Status' }];
            const result = await service.importTree(nodes);
            expect(result.ok).toBe(true);
            if (!result.ok) return;

            const listResult = await service.list();
            expect(listResult.ok).toBe(true);
            if (!listResult.ok) return;
            const imported = listResult.data.find((f) => f.title === 'Default Status');
            expect(imported).toBeDefined();
            assertDefined(imported, 'imported');
            expect(imported.status).toBe('backlog');
        });

        test('re-imports by title path without duplicating branches', async () => {
            const nodes: TemplateNode[] = [
                {
                    title: 'Upsert Root',
                    children: [{ title: 'Upsert Child' }],
                },
            ];

            const first = await service.importTree(nodes);
            expect(first.ok).toBe(true);
            if (!first.ok) return;
            expect(first.data.count).toBe(2);

            const second = await service.importTree(nodes);
            expect(second.ok).toBe(true);
            if (!second.ok) return;
            expect(second.data.count).toBe(0);

            const listResult = await service.list();
            expect(listResult.ok).toBe(true);
            if (!listResult.ok) return;

            const roots = listResult.data.filter((feature) => feature.title === 'Upsert Root');
            const children = listResult.data.filter((feature) => feature.title === 'Upsert Child');

            expect(roots).toHaveLength(1);
            expect(children).toHaveLength(1);
            expect(children[0]?.parentId).toBe(roots[0]?.id ?? null);
        });

        test('validates the full import tree before mutating the database', async () => {
            const nodes = JSON.parse(
                '[{"title":"Valid Before Failure"},{"title":"Invalid Status","status":"not-a-real-status"}]',
            ) as TemplateNode[];

            const result = await service.importTree(nodes);
            expect(result.ok).toBe(false);
            if (result.ok) return;
            expect(isAppError(result.error)).toBe(true);
            expect(result.error.message).toContain('unknown status');

            const listResult = await service.list();
            expect(listResult.ok).toBe(true);
            if (!listResult.ok) return;

            const titles = listResult.data.map((feature) => feature.title);
            expect(titles).not.toContain('Valid Before Failure');
            expect(titles).not.toContain('Invalid Status');
        });
    });
});
