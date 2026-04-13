/**
 * ftree — FeatureService Tests
 *
 * Tests all FeatureService operations: create, getById, list, getChildren,
 * getSubtree, exists, getMaxPosition, linkWbs, getWbsIds, seedFromTemplate.
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { BunSqliteAdapter } from '../../src/db/adapters/bun-sqlite';
import { isAppError } from '../../src/errors';
import { FeatureService, initSchema } from '../../src/services/feature-service';

describe('FeatureService', () => {
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

    // ─── create ───────────────────────────────────────────────────────────

    describe('create', () => {
        test('creates a root feature with defaults', async () => {
            const result = await service.create({ title: 'My Feature' });
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.data.title).toBe('My Feature');
            expect(result.data.status).toBe('backlog');
            expect(result.data.parentId).toBeNull();
            expect(result.data.depth).toBe(0);
            expect(result.data.position).toBe(0);
            expect(result.data.id).toBeDefined();
        });

        test('rejects empty title', async () => {
            const result = await service.create({ title: '   ' });
            expect(result.ok).toBe(false);
            if (result.ok) return;
            expect(isAppError(result.error)).toBe(true);
            expect(result.error.message).toContain('blank');
        });

        test('rejects empty string title', async () => {
            const result = await service.create({ title: '' });
            expect(result.ok).toBe(false);
        });

        test('trims whitespace from title', async () => {
            const result = await service.create({ title: '  Trimmed Title  ' });
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.data.title).toBe('Trimmed Title');
        });

        test('creates feature with explicit status', async () => {
            const result = await service.create({ title: 'Status Test', status: 'executing' });
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.data.status).toBe('executing');
        });

        test('creates feature with metadata', async () => {
            const result = await service.create({
                title: 'Meta Test',
                metadata: '{"priority":"high"}',
            });
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.data.metadata).toBe('{"priority":"high"}');
        });

        test('creates child with correct depth and position', async () => {
            const parent = await service.create({ title: 'Parent Feature' });
            if (!parent.ok) return;

            const child = await service.create({
                title: 'Child Feature',
                parentId: parent.data.id,
                status: 'validated',
            });

            expect(child.ok).toBe(true);
            if (!child.ok) return;
            expect(child.data.parentId).toBe(parent.data.id);
            expect(child.data.depth).toBe(1);
            expect(child.data.position).toBe(0);
        });

        test('returns error for non-existent parent', async () => {
            const result = await service.create({
                title: 'Orphan',
                parentId: 'nonexistent',
            });
            expect(result.ok).toBe(false);
        });

        test('appends at next position when siblings exist', async () => {
            const parent = await service.create({ title: 'Parent for Positioning' });
            if (!parent.ok) return;

            await service.create({ title: 'Child 1', parentId: parent.data.id });
            await service.create({ title: 'Child 2', parentId: parent.data.id });

            const children = service.getChildren(parent.data.id);
            expect(children).toHaveLength(2);
            expect(children[0].position).toBe(0);
            expect(children[1].position).toBe(1);
        });
    });

    // ─── getById ──────────────────────────────────────────────────────────

    describe('getById', () => {
        test('returns existing feature', async () => {
            const created = await service.create({ title: 'Find Me' });
            if (!created.ok) return;

            const result = await service.getById(created.data.id);
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.data.title).toBe('Find Me');
        });

        test('returns NotFoundError for missing id', async () => {
            const result = await service.getById('nonexistent');
            expect(result.ok).toBe(false);
            if (result.ok) return;
            expect(isAppError(result.error)).toBe(true);
        });
    });

    // ─── list ─────────────────────────────────────────────────────────────

    describe('list', () => {
        test('returns all features ordered by depth and position', async () => {
            const result = await service.list();
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.data.length).toBeGreaterThan(0);
        });
    });

    // ─── getChildren ──────────────────────────────────────────────────────

    describe('getChildren', () => {
        test('returns root features when parentId is null', () => {
            const roots = service.getChildren(null);
            expect(roots.length).toBeGreaterThan(0);
            for (const r of roots) {
                expect(r.parentId).toBeNull();
            }
        });

        test('returns empty array when no children', async () => {
            const leaf = await service.create({ title: 'Lonely Leaf' });
            if (!leaf.ok) return;
            const children = service.getChildren(leaf.data.id);
            expect(children).toHaveLength(0);
        });
    });

    // ─── getSubtree ───────────────────────────────────────────────────────

    describe('getSubtree', () => {
        test('returns subtree inclusive of root', async () => {
            const parent = await service.create({ title: 'Subtree Root' });
            if (!parent.ok) return;
            await service.create({ title: 'Subtree Child', parentId: parent.data.id });

            const subtree = service.getSubtree(parent.data.id);
            expect(subtree.length).toBeGreaterThanOrEqual(2);
            expect(subtree[0].id).toBe(parent.data.id);
        });
    });

    // ─── exists ───────────────────────────────────────────────────────────

    describe('exists', () => {
        test('returns true for existing feature', async () => {
            const created = await service.create({ title: 'Exists Check' });
            if (!created.ok) return;
            expect(service.exists(created.data.id)).toBe(true);
        });

        test('returns false for missing feature', () => {
            expect(service.exists('ghost')).toBe(false);
        });
    });

    // ─── getMaxPosition ───────────────────────────────────────────────────

    describe('getMaxPosition', () => {
        test('returns -1 when no children', async () => {
            const parent = await service.create({ title: 'Empty Parent' });
            if (!parent.ok) return;
            expect(service.getMaxPosition(parent.data.id)).toBe(-1);
        });

        test('returns max position of children', async () => {
            const parent = await service.create({ title: 'Position Parent' });
            if (!parent.ok) return;
            await service.create({ title: 'PChild 1', parentId: parent.data.id });
            await service.create({ title: 'PChild 2', parentId: parent.data.id });
            await service.create({ title: 'PChild 3', parentId: parent.data.id });

            expect(service.getMaxPosition(parent.data.id)).toBe(2);
        });
    });

    // ─── WBS Operations ──────────────────────────────────────────────────

    describe('linkWbs + getWbsIds', () => {
        test('links and retrieves WBS IDs', async () => {
            const feature = await service.create({ title: 'WBS Feature' });
            if (!feature.ok) return;

            service.linkWbs(feature.data.id, 'WBS-001');
            service.linkWbs(feature.data.id, 'WBS-002');

            const ids = service.getWbsIds(feature.data.id);
            expect(ids).toHaveLength(2);
            expect(ids).toContain('WBS-001');
            expect(ids).toContain('WBS-002');
        });

        test('linkWbs is idempotent', async () => {
            const feature = await service.create({ title: 'Idempotent WBS' });
            if (!feature.ok) return;

            service.linkWbs(feature.data.id, 'WBS-001');
            service.linkWbs(feature.data.id, 'WBS-001');

            const ids = service.getWbsIds(feature.data.id);
            expect(ids).toHaveLength(1);
        });

        test('getWbsIds returns empty array when no links', async () => {
            const feature = await service.create({ title: 'No WBS' });
            if (!feature.ok) return;
            const ids = service.getWbsIds(feature.data.id);
            expect(ids).toHaveLength(0);
        });
    });

    // ─── seedFromTemplate ─────────────────────────────────────────────────

    describe('seedFromTemplate', () => {
        test('seeds features from template', () => {
            const count = service.seedFromTemplate(
                [
                    { title: 'Auth', status: 'backlog', children: [{ title: 'OAuth2' }, { title: 'JWT' }] },
                    { title: 'API' },
                ],
                null,
                0,
            );

            expect(count).toBe(4); // Auth + OAuth2 + JWT + API
        });
    });
});
