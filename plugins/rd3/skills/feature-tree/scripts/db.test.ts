/**
 * ftree — Database Module Unit Tests
 *
 * Tests all exported functions from db.ts: resolveDbPath, openDatabase,
 * initSchema, insertFeature, getFeatureById, getAllFeatures, getChildren,
 * getSubtree, featureExists, hasChildren, hasWbsLinks, getMaxPosition,
 * insertWbsLink, getWbsIds, validateFeatureId.
 */

import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { resolve } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import {
    resolveDbPath,
    openDatabase,
    initSchema,
    insertFeature,
    getFeatureById,
    getAllFeatures,
    getChildren,
    getSubtree,
    featureExists,
    hasChildren,
    hasWbsLinks,
    getMaxPosition,
    insertWbsLink,
    getWbsIds,
    validateFeatureId,
} from './db';
import { enableLogger } from '../../../scripts/logger';
import type { Feature, FeatureStatus } from './types';
import type { Database } from 'bun:sqlite';

const TEST_DB_DIR = resolve('/tmp', 'ftree-db-unit-test');
const TEST_DB_PATH = resolve(TEST_DB_DIR, 'unit-test.db');

/** Helper: create a feature record matching the Feature type */
function makeFeature(overrides: Partial<Omit<Feature, 'created_at' | 'updated_at'>> = {}): Feature {
    return {
        id: overrides.id ?? 'f1',
        parent_id: overrides.parent_id ?? null,
        title: overrides.title ?? 'Feature',
        status: (overrides.status as FeatureStatus) ?? 'backlog',
        metadata: overrides.metadata ?? '{}',
        depth: overrides.depth ?? 0,
        position: overrides.position ?? 0,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    };
}

describe('db.ts', () => {
    let db: Database;

    beforeEach(() => {
        enableLogger(false, false);
        try {
            rmSync(TEST_DB_DIR, { recursive: true, force: true });
        } catch {
            // ignore
        }
        mkdirSync(TEST_DB_DIR, { recursive: true });
        db = openDatabase(TEST_DB_PATH);
        initSchema(db);
    });

    afterEach(() => {
        db.close();
        try {
            rmSync(TEST_DB_DIR, { recursive: true, force: true });
        } catch {
            // ignore
        }
        enableLogger(true, true);
    });

    // ─── resolveDbPath ──────────────────────────────────────────────────────

    describe('resolveDbPath', () => {
        test('tier 1: explicit path returns --db flag tier', () => {
            const config = resolveDbPath('/tmp/custom.sqlite');
            expect(config.path).toBe(resolve('/tmp/custom.sqlite'));
            expect(config.tier).toBe('--db flag');
        });

        test('tier 2: FTREE_DB env var returns env tier', () => {
            const original = process.env.FTREE_DB;
            process.env.FTREE_DB = '/env/path/db.sqlite';
            try {
                const config = resolveDbPath();
                expect(config.path).toBe(resolve('/env/path/db.sqlite'));
                expect(config.tier).toBe('FTREE_DB env');
            } finally {
                if (original === undefined) {
                    delete process.env.FTREE_DB;
                } else {
                    process.env.FTREE_DB = original;
                }
            }
        });

        test('tier 3: no flag, no env → CWD default', () => {
            const original = process.env.FTREE_DB;
            delete process.env.FTREE_DB;
            try {
                const config = resolveDbPath();
                expect(config.path).toBe(resolve('docs/.ftree/db.sqlite'));
                expect(config.tier).toBe('CWD default');
            } finally {
                if (original !== undefined) {
                    process.env.FTREE_DB = original;
                }
            }
        });

        test('explicit path takes precedence over env var', () => {
            const original = process.env.FTREE_DB;
            process.env.FTREE_DB = '/env/path/db.sqlite';
            try {
                const config = resolveDbPath('/explicit/path.sqlite');
                expect(config.tier).toBe('--db flag');
                expect(config.path).toBe(resolve('/explicit/path.sqlite'));
            } finally {
                if (original === undefined) {
                    delete process.env.FTREE_DB;
                } else {
                    process.env.FTREE_DB = original;
                }
            }
        });
    });

    // ─── Feature DAO ────────────────────────────────────────────────────────

    describe('insertFeature + getFeatureById', () => {
        test('insert and retrieve a feature', () => {
            const feature = makeFeature();
            insertFeature(db, feature);

            const result = getFeatureById(db, 'f1');
            expect(result).not.toBeNull();
            expect(result?.id).toBe('f1');
            expect(result?.title).toBe('Feature');
            expect(result?.status).toBe('backlog');
            expect(result?.parent_id).toBeNull();
            expect(result?.depth).toBe(0);
            expect(result?.position).toBe(0);
        });

        test('getFeatureById returns null for missing ID', () => {
            const result = getFeatureById(db, 'nonexistent');
            expect(result).toBeNull();
        });

        test('insert feature with parent', () => {
            const parent = makeFeature({ id: 'parent', title: 'Parent' });
            const child = makeFeature({
                id: 'child',
                parent_id: 'parent',
                title: 'Child',
                depth: 1,
                position: 0,
            });
            insertFeature(db, parent);
            insertFeature(db, child);

            const result = getFeatureById(db, 'child');
            expect(result).not.toBeNull();
            expect(result?.parent_id).toBe('parent');
        });
    });

    describe('getAllFeatures', () => {
        test('returns empty array when no features', () => {
            const result = getAllFeatures(db);
            expect(result).toHaveLength(0);
        });

        test('returns all features ordered by depth and position', () => {
            insertFeature(db, makeFeature({ id: 'f2', depth: 1, position: 0 }));
            insertFeature(db, makeFeature({ id: 'f1', depth: 0, position: 0 }));
            insertFeature(db, makeFeature({ id: 'f3', depth: 1, position: 1 }));

            const result = getAllFeatures(db);
            expect(result).toHaveLength(3);
            expect(result[0].id).toBe('f1');
            expect(result[1].id).toBe('f2');
            expect(result[2].id).toBe('f3');
        });
    });

    describe('getChildren', () => {
        test('returns root features when parentId is null', () => {
            insertFeature(db, makeFeature({ id: 'root1', position: 0 }));
            insertFeature(db, makeFeature({ id: 'root2', position: 1 }));
            insertFeature(db, makeFeature({ id: 'child', parent_id: 'root1', depth: 1, position: 0 }));

            const roots = getChildren(db, null);
            expect(roots).toHaveLength(2);
            expect(roots[0].id).toBe('root1');
            expect(roots[1].id).toBe('root2');
        });

        test('returns children of a specific parent', () => {
            insertFeature(db, makeFeature({ id: 'parent' }));
            insertFeature(db, makeFeature({ id: 'other' }));
            insertFeature(db, makeFeature({ id: 'c1', parent_id: 'parent', depth: 1, position: 0 }));
            insertFeature(db, makeFeature({ id: 'c2', parent_id: 'parent', depth: 1, position: 1 }));
            insertFeature(db, makeFeature({ id: 'c3', parent_id: 'other', depth: 1, position: 0 }));

            const children = getChildren(db, 'parent');
            expect(children).toHaveLength(2);
            expect(children[0].id).toBe('c1');
            expect(children[1].id).toBe('c2');
        });

        test('returns empty array when no children', () => {
            insertFeature(db, makeFeature({ id: 'lonely' }));
            const children = getChildren(db, 'lonely');
            expect(children).toHaveLength(0);
        });
    });

    describe('getSubtree', () => {
        test('returns subtree inclusive of root', () => {
            insertFeature(db, makeFeature({ id: 'root' }));
            insertFeature(db, makeFeature({ id: 'c1', parent_id: 'root', depth: 1, position: 0 }));
            insertFeature(
                db,
                makeFeature({
                    id: 'c1a',
                    parent_id: 'c1',
                    depth: 2,
                    position: 0,
                }),
            );
            insertFeature(db, makeFeature({ id: 'c2', parent_id: 'root', depth: 1, position: 1 }));

            const subtree = getSubtree(db, 'root');
            expect(subtree).toHaveLength(4);
            // ORDER BY depth, position: root(0), c1(1,0), c2(1,1), c1a(2,0)
            expect(subtree.map((f) => f.id)).toEqual(['root', 'c1', 'c2', 'c1a']);
        });

        test('returns single node when no children', () => {
            insertFeature(db, makeFeature({ id: 'leaf' }));
            const subtree = getSubtree(db, 'leaf');
            expect(subtree).toHaveLength(1);
            expect(subtree[0].id).toBe('leaf');
        });
    });

    describe('featureExists', () => {
        test('returns true for existing feature', () => {
            insertFeature(db, makeFeature({ id: 'exists' }));
            expect(featureExists(db, 'exists')).toBe(true);
        });

        test('returns false for missing feature', () => {
            expect(featureExists(db, 'ghost')).toBe(false);
        });
    });

    describe('hasChildren', () => {
        test('returns true when feature has children', () => {
            insertFeature(db, makeFeature({ id: 'parent' }));
            insertFeature(db, makeFeature({ id: 'child', parent_id: 'parent', depth: 1, position: 0 }));
            expect(hasChildren(db, 'parent')).toBe(true);
        });

        test('returns false when feature has no children', () => {
            insertFeature(db, makeFeature({ id: 'leaf' }));
            expect(hasChildren(db, 'leaf')).toBe(false);
        });
    });

    describe('hasWbsLinks', () => {
        test('returns true when feature has WBS links', () => {
            insertFeature(db, makeFeature({ id: 'f1' }));
            insertWbsLink(db, 'f1', 'WBS-001');
            expect(hasWbsLinks(db, 'f1')).toBe(true);
        });

        test('returns false when feature has no WBS links', () => {
            insertFeature(db, makeFeature({ id: 'f1' }));
            expect(hasWbsLinks(db, 'f1')).toBe(false);
        });
    });

    describe('getMaxPosition', () => {
        test('returns -1 when parent has no children', () => {
            insertFeature(db, makeFeature({ id: 'parent' }));
            expect(getMaxPosition(db, 'parent')).toBe(-1);
        });

        test('returns -1 when querying root with no root features', () => {
            expect(getMaxPosition(db, null)).toBe(-1);
        });

        test('returns max position of children', () => {
            insertFeature(db, makeFeature({ id: 'parent' }));
            insertFeature(
                db,
                makeFeature({
                    id: 'c1',
                    parent_id: 'parent',
                    depth: 1,
                    position: 0,
                }),
            );
            insertFeature(
                db,
                makeFeature({
                    id: 'c2',
                    parent_id: 'parent',
                    depth: 1,
                    position: 5,
                }),
            );
            insertFeature(
                db,
                makeFeature({
                    id: 'c3',
                    parent_id: 'parent',
                    depth: 1,
                    position: 3,
                }),
            );

            expect(getMaxPosition(db, 'parent')).toBe(5);
        });

        test('returns max position for root features', () => {
            insertFeature(db, makeFeature({ id: 'r1', position: 2 }));
            insertFeature(db, makeFeature({ id: 'r2', position: 7 }));
            expect(getMaxPosition(db, null)).toBe(7);
        });
    });

    // ─── WBS Link DAO ──────────────────────────────────────────────────────

    describe('insertWbsLink + getWbsIds', () => {
        test('insert and retrieve WBS links', () => {
            insertFeature(db, makeFeature({ id: 'f1' }));
            insertWbsLink(db, 'f1', 'WBS-001');
            insertWbsLink(db, 'f1', 'WBS-002');

            const ids = getWbsIds(db, 'f1');
            expect(ids).toHaveLength(2);
            expect(ids).toContain('WBS-001');
            expect(ids).toContain('WBS-002');
        });

        test('insertWbsLink is idempotent', () => {
            insertFeature(db, makeFeature({ id: 'f1' }));
            insertWbsLink(db, 'f1', 'WBS-001');
            insertWbsLink(db, 'f1', 'WBS-001');

            const ids = getWbsIds(db, 'f1');
            expect(ids).toHaveLength(1);
        });

        test('getWbsIds returns empty array when no links', () => {
            insertFeature(db, makeFeature({ id: 'f1' }));
            const ids = getWbsIds(db, 'f1');
            expect(ids).toHaveLength(0);
        });
    });

    // ─── validateFeatureId ─────────────────────────────────────────────────

    describe('validateFeatureId', () => {
        test('returns ok for valid ID', () => {
            const result = validateFeatureId('my-feature');
            expect(result.ok).toBe(true);
        });

        test('returns err for empty string', () => {
            const result = validateFeatureId('');
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe('Feature ID cannot be empty');
            }
        });

        test('returns err for whitespace-only string', () => {
            const result = validateFeatureId('   ');
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe('Feature ID cannot be empty');
            }
        });
    });
});
