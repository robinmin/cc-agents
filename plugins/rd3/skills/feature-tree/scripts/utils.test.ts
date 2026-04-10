/**
 * ftree — Tree Rendering Utilities Unit Tests
 *
 * Tests all exported functions from utils.ts:
 * formatStatus, formatNodeStatus, renderTreeNode, renderTree,
 * buildFeatureTree, findNode, findParent.
 */

import { describe, expect, test } from 'bun:test';
import type { FeatureStatus, FeatureNode } from './types';
import {
    formatStatus,
    formatNodeStatus,
    renderTreeNode,
    renderTree,
    buildFeatureTree,
    findNode,
    findParent,
} from './utils';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeNode(overrides: Partial<FeatureNode> = {}): FeatureNode {
    return {
        id: 'feat-1',
        title: 'Feature One',
        status: 'backlog',
        storedStatus: 'backlog',
        metadata: {},
        depth: 0,
        position: 0,
        children: [],
        wbs_ids: [],
        ...overrides,
    };
}

/** Assert non-null and return narrowed type */
function asNode(node: FeatureNode | null): FeatureNode {
    expect(node).not.toBeNull();
    return node as FeatureNode;
}

const ALL_STATUSES: FeatureStatus[] = ['backlog', 'validated', 'executing', 'done', 'blocked'];

const ESC = '\x1b';
const RESET = `${ESC}[0m`;

// ─── formatStatus ───────────────────────────────────────────────────────────

describe('formatStatus', () => {
    test('returns plain status string when color=false', () => {
        for (const s of ALL_STATUSES) {
            expect(formatStatus(s, false)).toBe(s);
        }
    });

    test('returns ANSI-colored string when color=true', () => {
        const result = formatStatus('done', true);
        // Should contain the status text wrapped in ANSI codes
        expect(result).toContain('done');
        expect(result).toContain(`${ESC}[32m`); // green
        expect(result).toContain(RESET);
    });

    test('default color argument is true', () => {
        const withDefault = formatStatus('backlog');
        const withExplicit = formatStatus('backlog', true);
        expect(withDefault).toBe(withExplicit);
    });

    test('each status uses a distinct color code', () => {
        const colors = ALL_STATUSES.map((s) => {
            const colored = formatStatus(s, true);
            // Extract the ANSI escape sequence (between start and status text)
            return colored.replace(s, '').replaceAll(RESET, '');
        });
        // All should be unique
        expect(new Set(colors).size).toBe(ALL_STATUSES.length);
    });
});

// ─── formatNodeStatus ──────────────────────────────────────────────────────

describe('formatNodeStatus', () => {
    test('shows plain status when stored and effective match', () => {
        const node = makeNode({ status: 'done', storedStatus: 'done' });
        expect(formatNodeStatus(node, false)).toBe('done');
    });

    test('shows stored → effective when they differ', () => {
        const node = makeNode({ status: 'executing', storedStatus: 'backlog' });
        expect(formatNodeStatus(node, false)).toBe('backlog → executing');
    });

    test('colored output includes ANSI codes', () => {
        const node = makeNode({ status: 'executing', storedStatus: 'backlog' });
        const result = formatNodeStatus(node, true);
        expect(result).toContain(ESC);
        expect(result).toContain('backlog');
        expect(result).toContain('executing');
    });

    test('default color is true', () => {
        const node = makeNode({ status: 'done', storedStatus: 'done' });
        expect(formatNodeStatus(node)).toBe(formatNodeStatus(node, true));
    });
});

// ─── renderTreeNode ─────────────────────────────────────────────────────────

describe('renderTreeNode', () => {
    test('renders a leaf node as last sibling', () => {
        const node = makeNode({ id: 'f1', title: 'Alpha' });
        const result = renderTreeNode(node, true, '', false);
        expect(result).toBe('└── [f1] Alpha (backlog)');
    });

    test('renders a leaf node as middle sibling', () => {
        const node = makeNode({ id: 'f1', title: 'Alpha' });
        const result = renderTreeNode(node, false, '', false);
        expect(result).toBe('├── [f1] Alpha (backlog)');
    });

    test('renders WBS IDs when present', () => {
        const node = makeNode({ id: 'f1', title: 'Alpha', wbs_ids: ['0266', '0267'] });
        const result = renderTreeNode(node, true, '', false);
        expect(result).toContain('→ 0266, 0267');
    });

    test('renders no WBS suffix when empty', () => {
        const node = makeNode({ id: 'f1', title: 'Alpha', wbs_ids: [] });
        const result = renderTreeNode(node, true, '', false);
        expect(result).not.toContain('→');
    });

    test('renders children with proper indentation', () => {
        const child1 = makeNode({ id: 'c1', title: 'Child1' });
        const child2 = makeNode({ id: 'c2', title: 'Child2' });
        const parent = makeNode({ id: 'p1', title: 'Parent', children: [child1, child2] });

        const result = renderTreeNode(parent, true, '', false);
        const lines = result.split('\n');

        expect(lines).toHaveLength(3);
        expect(lines[0]).toBe('└── [p1] Parent (backlog)');
        expect(lines[1]).toBe('    ├── [c1] Child1 (backlog)');
        expect(lines[2]).toBe('    └── [c2] Child2 (backlog)');
    });

    test('respects prefix for nested levels', () => {
        const child = makeNode({ id: 'c1', title: 'Child' });
        const parent = makeNode({ id: 'p1', title: 'Parent', children: [child] });

        const result = renderTreeNode(parent, false, '', false);
        // Middle sibling uses │ continuation
        expect(result).toContain('│   └── [c1]');
    });

    test('color=true includes ANSI escape codes', () => {
        const node = makeNode({ id: 'f1', title: 'Alpha' });
        const result = renderTreeNode(node, true, '', true);
        expect(result).toContain(ESC);
    });

    test('multi-level nesting renders correct connectors', () => {
        const grandchild = makeNode({ id: 'gc1', title: 'GC' });
        const child = makeNode({ id: 'c1', title: 'Child', children: [grandchild] });
        const parent = makeNode({ id: 'p1', title: 'Parent', children: [child] });

        const result = renderTreeNode(parent, true, '', false);
        const lines = result.split('\n');
        expect(lines[0]).toBe('└── [p1] Parent (backlog)');
        expect(lines[1]).toBe('    └── [c1] Child (backlog)');
        expect(lines[2]).toBe('        └── [gc1] GC (backlog)');
    });
});

// ─── renderTree ─────────────────────────────────────────────────────────────

describe('renderTree', () => {
    test('renders virtual root by unwrapping children', () => {
        const child1 = makeNode({ id: 'r1', title: 'Root1' });
        const child2 = makeNode({ id: 'r2', title: 'Root2' });
        const virtualRoot = makeNode({
            id: '__virtual_root__',
            title: '(feature tree)',
            children: [child1, child2],
        });

        const result = renderTree(virtualRoot, { color: false });
        const lines = result.split('\n');
        // Virtual root itself is skipped, only children rendered
        expect(lines).toHaveLength(2);
        expect(lines[0]).toBe('├── [r1] Root1 (backlog)');
        expect(lines[1]).toBe('└── [r2] Root2 (backlog)');
    });

    test('renders non-virtual root with title line', () => {
        const root = makeNode({ id: 'root', title: 'My Tree' });
        const result = renderTree(root, { color: false });
        expect(result).toBe('[root] My Tree (backlog)');
    });

    test('renders root with WBS IDs', () => {
        const root = makeNode({ id: 'root', title: 'My Tree', wbs_ids: ['0001'] });
        const result = renderTree(root, { color: false });
        expect(result).toContain('→ 0001');
    });

    test('defaults color to true when options.color is undefined', () => {
        const root = makeNode({ id: 'root', title: 'Tree' });
        const result = renderTree(root, {});
        expect(result).toContain(ESC);
    });

    test('renders non-virtual root with children', () => {
        const child = makeNode({ id: 'c1', title: 'Child' });
        const root = makeNode({ id: 'root', title: 'Root', children: [child] });
        const result = renderTree(root, { color: false });
        const lines = result.split('\n');
        expect(lines).toHaveLength(2);
        expect(lines[0]).toBe('[root] Root (backlog)');
        expect(lines[1]).toBe('└── [c1] Child (backlog)');
    });
});

// ─── buildFeatureTree ───────────────────────────────────────────────────────

describe('buildFeatureTree', () => {
    const flatFeatures = [
        {
            id: 'f1',
            parent_id: null,
            title: 'Root',
            status: 'backlog' as FeatureStatus,
            metadata: '{}',
            depth: 0,
            position: 0,
        },
        {
            id: 'f2',
            parent_id: 'f1',
            title: 'Child A',
            status: 'done' as FeatureStatus,
            metadata: '{}',
            depth: 1,
            position: 0,
        },
        {
            id: 'f3',
            parent_id: 'f1',
            title: 'Child B',
            status: 'executing' as FeatureStatus,
            metadata: '{}',
            depth: 1,
            position: 1,
        },
    ];

    test('returns null for empty features array', () => {
        const result = buildFeatureTree([], new Map());
        expect(result).toBeNull();
    });

    test('builds tree from flat features without rootId (virtual root)', () => {
        const tree = asNode(buildFeatureTree(flatFeatures, new Map()));
        expect(tree.id).toBe('__virtual_root__');
        expect(tree.children).toHaveLength(1); // f1 is the only root-level
        expect(tree.children[0].id).toBe('f1');
        expect(tree.children[0].children).toHaveLength(2);
    });

    test('builds tree from flat features with rootId', () => {
        const tree = asNode(buildFeatureTree(flatFeatures, new Map(), 'f1'));
        expect(tree.id).toBe('f1');
        expect(tree.children).toHaveLength(2);
        expect(tree.children[0].id).toBe('f2');
        expect(tree.children[1].id).toBe('f3');
    });

    test('returns null when rootId not found', () => {
        const result = buildFeatureTree(flatFeatures, new Map(), 'nonexistent');
        expect(result).toBeNull();
    });

    test('assigns WBS IDs from map', () => {
        const wbsMap = new Map<string, string[]>([
            ['f1', ['0001', '0002']],
            ['f2', ['0003']],
        ]);
        const tree = asNode(buildFeatureTree(flatFeatures, wbsMap, 'f1'));
        expect(tree.wbs_ids).toEqual(['0001', '0002']);
        expect(tree.children[0].wbs_ids).toEqual(['0003']);
        expect(tree.children[1].wbs_ids).toEqual([]);
    });

    test('computes rollup status from children', () => {
        const tree = asNode(buildFeatureTree(flatFeatures, new Map(), 'f1'));
        // Children: done + executing → worst wins = executing
        expect(tree.status).toBe('executing');
        // Stored status stays as original
        expect(tree.storedStatus).toBe('backlog');
    });

    test('leaf node uses stored status when no children', () => {
        const leafFeatures = [
            {
                id: 'f1',
                parent_id: null,
                title: 'Leaf',
                status: 'validated' as FeatureStatus,
                metadata: '{}',
                depth: 0,
                position: 0,
            },
        ];
        const tree = asNode(buildFeatureTree(leafFeatures, new Map(), 'f1'));
        expect(tree.status).toBe('validated');
        expect(tree.storedStatus).toBe('validated');
    });

    test('respects maxDepth parameter', () => {
        const deepFeatures = [
            {
                id: 'f1',
                parent_id: null,
                title: 'Root',
                status: 'backlog' as FeatureStatus,
                metadata: '{}',
                depth: 0,
                position: 0,
            },
            {
                id: 'f2',
                parent_id: 'f1',
                title: 'L1',
                status: 'backlog' as FeatureStatus,
                metadata: '{}',
                depth: 1,
                position: 0,
            },
            {
                id: 'f3',
                parent_id: 'f2',
                title: 'L2',
                status: 'backlog' as FeatureStatus,
                metadata: '{}',
                depth: 2,
                position: 0,
            },
        ];
        const tree = asNode(buildFeatureTree(deepFeatures, new Map(), 'f1', 1));
        expect(tree.children[0].children).toHaveLength(0); // L2 excluded by maxDepth=1
    });

    test('maxDepth=0 includes only root', () => {
        const tree = asNode(buildFeatureTree(flatFeatures, new Map(), 'f1', 0));
        expect(tree.children).toHaveLength(0);
    });

    test('maxDepth=-1 means unlimited', () => {
        const tree = asNode(buildFeatureTree(flatFeatures, new Map(), 'f1', -1));
        expect(tree.children).toHaveLength(2);
    });

    test('parses valid metadata JSON', () => {
        const features = [
            {
                id: 'f1',
                parent_id: null,
                title: 'Root',
                status: 'backlog' as FeatureStatus,
                metadata: '{"key":"val"}',
                depth: 0,
                position: 0,
            },
        ];
        const tree = asNode(buildFeatureTree(features, new Map(), 'f1'));
        expect(tree.metadata).toEqual({ key: 'val' });
    });

    test('handles invalid metadata JSON gracefully', () => {
        const features = [
            {
                id: 'f1',
                parent_id: null,
                title: 'Root',
                status: 'backlog' as FeatureStatus,
                metadata: 'not-json',
                depth: 0,
                position: 0,
            },
        ];
        const tree = asNode(buildFeatureTree(features, new Map(), 'f1'));
        expect(tree.metadata).toEqual({});
    });

    test('virtual root includes all root-level features', () => {
        const multiRoot = [
            {
                id: 'r1',
                parent_id: null,
                title: 'Root1',
                status: 'backlog' as FeatureStatus,
                metadata: '{}',
                depth: 0,
                position: 0,
            },
            {
                id: 'r2',
                parent_id: null,
                title: 'Root2',
                status: 'done' as FeatureStatus,
                metadata: '{}',
                depth: 0,
                position: 1,
            },
        ];
        const tree = asNode(buildFeatureTree(multiRoot, new Map()));
        expect(tree.children).toHaveLength(2);
        expect(tree.children[0].id).toBe('r1');
        expect(tree.children[1].id).toBe('r2');
    });
});

// ─── findNode ───────────────────────────────────────────────────────────────

describe('findNode', () => {
    test('returns null for null root', () => {
        expect(findNode(null, 'any')).toBeNull();
    });

    test('returns root when id matches', () => {
        const root = makeNode({ id: 'target' });
        expect(findNode(root, 'target')).toBe(root);
    });

    test('returns null when id not found', () => {
        const root = makeNode({ id: 'root' });
        expect(findNode(root, 'missing')).toBeNull();
    });

    test('finds a child node', () => {
        const child = makeNode({ id: 'child-1' });
        const root = makeNode({ id: 'root', children: [child] });
        expect(findNode(root, 'child-1')).toBe(child);
    });

    test('finds a deeply nested node', () => {
        const deep = makeNode({ id: 'deep' });
        const mid = makeNode({ id: 'mid', children: [deep] });
        const root = makeNode({ id: 'root', children: [mid] });
        expect(findNode(root, 'deep')).toBe(deep);
    });

    test('returns first match in breadth', () => {
        const dupe = makeNode({ id: 'dup' });
        const child1 = makeNode({ id: 'dup' });
        const root = makeNode({ id: 'root', children: [child1, dupe] });
        // Returns first found (DFS order)
        expect(findNode(root, 'dup')).toBe(child1);
    });
});

// ─── findParent ─────────────────────────────────────────────────────────────

describe('findParent', () => {
    test('returns null for null root', () => {
        expect(findParent(null, 'any')).toBeNull();
    });

    test('returns null when child is root itself', () => {
        const root = makeNode({ id: 'root' });
        // Root has no parent in this tree
        expect(findParent(root, 'root')).toBeNull();
    });

    test('returns parent of a direct child', () => {
        const child = makeNode({ id: 'child-1' });
        const root = makeNode({ id: 'root', title: 'RootNode', children: [child] });
        const parent = findParent(root, 'child-1');
        expect(parent).toEqual({ id: 'root', title: 'RootNode' });
    });

    test('returns null for non-existent child', () => {
        const root = makeNode({ id: 'root' });
        expect(findParent(root, 'missing')).toBeNull();
    });

    test('finds parent at deeper nesting', () => {
        const deep = makeNode({ id: 'deep' });
        const mid = makeNode({ id: 'mid', title: 'MidNode', children: [deep] });
        const root = makeNode({ id: 'root', children: [mid] });
        const parent = findParent(root, 'deep');
        expect(parent).toEqual({ id: 'mid', title: 'MidNode' });
    });

    test('finds parent among siblings', () => {
        const c1 = makeNode({ id: 'c1' });
        const c2 = makeNode({ id: 'c2' });
        const root = makeNode({ id: 'root', title: 'Parent', children: [c1, c2] });
        expect(findParent(root, 'c2')).toEqual({ id: 'root', title: 'Parent' });
    });
});
