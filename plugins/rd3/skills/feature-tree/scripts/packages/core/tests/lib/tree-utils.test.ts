/**
 * ftree — Tree Rendering Utilities Unit Tests
 */

import { describe, expect, test } from 'bun:test';
import {
    buildFeatureTree,
    findNode,
    findParent,
    formatNodeStatus,
    formatStatus,
    renderTree,
    renderTreeNode,
} from '../../src/lib/tree-utils';
import type { FeatureNode, FeatureStatus } from '../../src/types/feature';

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
        wbsIds: [],
        ...overrides,
    };
}

function asNode(node: FeatureNode | null): FeatureNode {
    expect(node).not.toBeNull();
    return node as FeatureNode;
}

const ALL_STATUSES: FeatureStatus[] = ['backlog', 'validated', 'executing', 'done', 'blocked'];
const ESC = '\x1b';
const RESET = `${ESC}[0m`;

describe('formatStatus', () => {
    test('returns plain status string when color=false', () => {
        for (const s of ALL_STATUSES) {
            expect(formatStatus(s, false)).toBe(s);
        }
    });

    test('returns ANSI-colored string when color=true', () => {
        const result = formatStatus('done', true);
        expect(result).toContain('done');
        expect(result).toContain(`${ESC}[32m`);
        expect(result).toContain(RESET);
    });

    test('default color argument is true', () => {
        const withDefault = formatStatus('backlog');
        const withExplicit = formatStatus('backlog', true);
        expect(withDefault).toBe(withExplicit);
    });
});

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
    });
});

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
        const node = makeNode({ id: 'f1', title: 'Alpha', wbsIds: ['0266', '0267'] });
        const result = renderTreeNode(node, true, '', false);
        expect(result).toContain('→ 0266, 0267');
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
});

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
        expect(lines).toHaveLength(2);
        expect(lines[0]).toBe('├── [r1] Root1 (backlog)');
        expect(lines[1]).toBe('└── [r2] Root2 (backlog)');
    });

    test('renders non-virtual root with title line', () => {
        const root = makeNode({ id: 'root', title: 'My Tree' });
        const result = renderTree(root, { color: false });
        expect(result).toBe('[root] My Tree (backlog)');
    });
});

describe('buildFeatureTree', () => {
    const flatFeatures = [
        {
            id: 'f1',
            parentId: null,
            title: 'Root',
            status: 'backlog' as FeatureStatus,
            metadata: '{}',
            depth: 0,
            position: 0,
        },
        {
            id: 'f2',
            parentId: 'f1',
            title: 'Child A',
            status: 'done' as FeatureStatus,
            metadata: '{}',
            depth: 1,
            position: 0,
        },
        {
            id: 'f3',
            parentId: 'f1',
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
        expect(tree.children).toHaveLength(1);
        expect(tree.children[0].id).toBe('f1');
        expect(tree.children[0].children).toHaveLength(2);
    });

    test('builds tree from flat features with rootId', () => {
        const tree = asNode(buildFeatureTree(flatFeatures, new Map(), 'f1'));
        expect(tree.id).toBe('f1');
        expect(tree.children).toHaveLength(2);
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
        expect(tree.wbsIds).toEqual(['0001', '0002']);
        expect(tree.children[0].wbsIds).toEqual(['0003']);
        expect(tree.children[1].wbsIds).toEqual([]);
    });

    test('computes rollup status from children', () => {
        const tree = asNode(buildFeatureTree(flatFeatures, new Map(), 'f1'));
        expect(tree.status).toBe('executing');
        expect(tree.storedStatus).toBe('backlog');
    });

    test('leaf node uses stored status when no children', () => {
        const leafFeatures = [
            {
                id: 'f1',
                parentId: null,
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
                parentId: null,
                title: 'Root',
                status: 'backlog' as FeatureStatus,
                metadata: '{}',
                depth: 0,
                position: 0,
            },
            {
                id: 'f2',
                parentId: 'f1',
                title: 'L1',
                status: 'backlog' as FeatureStatus,
                metadata: '{}',
                depth: 1,
                position: 0,
            },
            {
                id: 'f3',
                parentId: 'f2',
                title: 'L2',
                status: 'backlog' as FeatureStatus,
                metadata: '{}',
                depth: 2,
                position: 0,
            },
        ];
        const tree = asNode(buildFeatureTree(deepFeatures, new Map(), 'f1', 1));
        expect(tree.children[0].children).toHaveLength(0);
    });

    test('maxDepth=0 includes only root', () => {
        const tree = asNode(buildFeatureTree(flatFeatures, new Map(), 'f1', 0));
        expect(tree.children).toHaveLength(0);
    });

    test('handles invalid metadata JSON gracefully', () => {
        const features = [
            {
                id: 'f1',
                parentId: null,
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
                parentId: null,
                title: 'Root1',
                status: 'backlog' as FeatureStatus,
                metadata: '{}',
                depth: 0,
                position: 0,
            },
            {
                id: 'r2',
                parentId: null,
                title: 'Root2',
                status: 'done' as FeatureStatus,
                metadata: '{}',
                depth: 0,
                position: 1,
            },
        ];
        const tree = asNode(buildFeatureTree(multiRoot, new Map()));
        expect(tree.children).toHaveLength(2);
    });
});

describe('findNode', () => {
    test('returns null for null root', () => {
        expect(findNode(null, 'any')).toBeNull();
    });

    test('returns root when id matches', () => {
        const root = makeNode({ id: 'target' });
        expect(findNode(root, 'target')).toBe(root);
    });

    test('finds a child node', () => {
        const child = makeNode({ id: 'child-1' });
        const root = makeNode({ id: 'root', children: [child] });
        expect(findNode(root, 'child-1')).toBe(child);
    });
});

describe('findParent', () => {
    test('returns null for null root', () => {
        expect(findParent(null, 'any')).toBeNull();
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
});
