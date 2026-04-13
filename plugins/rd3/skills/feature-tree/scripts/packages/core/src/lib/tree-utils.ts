/**
 * ftree — Tree rendering utilities
 *
 * Unicode box-drawing tree output + roll-up computation.
 */

import type { FeatureNode, FeatureStatus } from '../types/feature';
import { computeRollupStatus } from './state-machine';

// ─── Box-drawing constants ─────────────────────────────────────────────────

const BOX_MIDDLE = '├──';
const BOX_LAST = '└──';
const BOX_SPACE = '    ';
const BOX_CONTINUE = '│   ';

// ─── Status formatting ─────────────────────────────────────────────────────

const STATUS_COLORS: Record<FeatureStatus, string> = {
    backlog: '\x1b[90m',
    validated: '\x1b[36m',
    executing: '\x1b[33m',
    done: '\x1b[32m',
    blocked: '\x1b[31m',
};

const RESET = '\x1b[0m';

/**
 * Format a status string with color.
 */
export function formatStatus(status: FeatureStatus, color = true): string {
    if (color) {
        return `${STATUS_COLORS[status]}${status}${RESET}`;
    }
    return status;
}

/**
 * Format status for display, showing stored → rollup when they differ.
 */
export function formatNodeStatus(node: FeatureNode, color = true): string {
    if (node.storedStatus !== node.status) {
        return `${formatStatus(node.storedStatus, color)} → ${formatStatus(node.status, color)}`;
    }
    return formatStatus(node.status, color);
}

// ─── Tree rendering ─────────────────────────────────────────────────────────

/**
 * Render a tree node and its children to a Unicode box-drawing string.
 */
export function renderTreeNode(node: FeatureNode, isLast: boolean, prefix = '', color = true): string {
    const lines: string[] = [];

    const connector = isLast ? BOX_LAST : BOX_MIDDLE;
    const statusStr = formatNodeStatus(node, color);
    const wbsSuffix = node.wbsIds.length > 0 ? ` → ${node.wbsIds.join(', ')}` : '';

    lines.push(`${prefix}${connector} [${node.id}] ${node.title} (${statusStr})${wbsSuffix}`);

    const children = node.children;
    const childPrefix = prefix + (isLast ? BOX_SPACE : BOX_CONTINUE);

    for (const [i, child] of children.entries()) {
        const childIsLast = i === children.length - 1;
        lines.push(renderTreeNode(child, childIsLast, childPrefix, color));
    }

    return lines.join('\n');
}

/**
 * Render a feature tree from a root node.
 */
export function renderTree(root: FeatureNode, options: { color?: boolean } = {}): string {
    const color = options.color ?? true;
    const lines: string[] = [];

    if (root.id === '__virtual_root__') {
        for (const [i, child] of root.children.entries()) {
            const childIsLast = i === root.children.length - 1;
            lines.push(renderTreeNode(child, childIsLast, '', color));
        }
        return lines.join('\n');
    }

    const statusStr = formatNodeStatus(root, color);
    const wbsSuffix = root.wbsIds.length > 0 ? ` → ${root.wbsIds.join(', ')}` : '';
    lines.push(`[${root.id}] ${root.title} (${statusStr})${wbsSuffix}`);

    for (const [i, child] of root.children.entries()) {
        const childIsLast = i === root.children.length - 1;
        lines.push(renderTreeNode(child, childIsLast, '', color));
    }

    return lines.join('\n');
}

// ─── Tree building ─────────────────────────────────────────────────────────

/**
 * Build a FeatureNode tree from a flat array of features + WBS IDs.
 */
export function buildFeatureTree(
    features: {
        id: string;
        parentId: string | null;
        title: string;
        status: FeatureStatus;
        metadata: string;
        depth: number;
        position: number;
    }[],
    wbsByFeature: Map<string, string[]>,
    rootId?: string,
    maxDepth = -1,
): FeatureNode | null {
    if (features.length === 0) {
        return null;
    }

    const byId = new Map<string, (typeof features)[0]>();
    for (const f of features) {
        byId.set(f.id, f);
    }

    const children: Map<string | null, typeof features> = new Map();
    children.set(null, []);
    for (const f of features) {
        const parent = f.parentId;
        if (!children.has(parent)) {
            children.set(parent, []);
        }
        const arr = children.get(parent);
        if (arr) {
            arr.push(f);
        }
    }

    function parseMeta(m: string): Record<string, unknown> {
        try {
            return JSON.parse(m) as Record<string, unknown>;
        } catch {
            return {};
        }
    }

    function buildNode(feature: (typeof features)[0] | undefined, depth: number): FeatureNode | null {
        if (!feature) {
            return null;
        }

        if (maxDepth >= 0 && depth > maxDepth) {
            return null;
        }

        const childFeatures = children.get(feature.id) ?? [];
        const childNodes: FeatureNode[] = [];

        for (const child of childFeatures) {
            const childNode = buildNode(child, depth + 1);
            if (childNode) {
                childNodes.push(childNode);
            }
        }

        const childStatuses = childNodes.map((n) => n.status);
        const rollupStatus = computeRollupStatus(childStatuses);
        const effectiveStatus = childNodes.length > 0 ? rollupStatus : feature.status;

        return {
            id: feature.id,
            title: feature.title,
            status: effectiveStatus,
            storedStatus: feature.status,
            metadata: parseMeta(feature.metadata),
            depth: feature.depth,
            position: feature.position,
            children: childNodes,
            wbsIds: wbsByFeature.get(feature.id) ?? [],
        };
    }

    const root = rootId ? byId.get(rootId) : features[0];
    if (!root) {
        return null;
    }

    const mainNode = buildNode(root, 0);

    if (!rootId) {
        const rootChildren: FeatureNode[] = [];
        if (mainNode) {
            rootChildren.push(mainNode);
        }
        for (const f of features) {
            if (f.parentId === null && f.id !== root.id) {
                const node = buildNode(f, 0);
                if (node) {
                    rootChildren.push(node);
                }
            }
        }

        const rollup = computeRollupStatus(rootChildren.map((n) => n.status));

        return {
            id: '__virtual_root__',
            title: '(feature tree)',
            status: rollup,
            storedStatus: rollup,
            metadata: {},
            depth: -1,
            position: 0,
            children: rootChildren,
            wbsIds: [],
        };
    }

    return mainNode;
}

/**
 * Find a node in the tree by ID.
 */
export function findNode(root: FeatureNode | null, id: string): FeatureNode | null {
    if (!root) {
        return null;
    }

    if (root.id === id) {
        return root;
    }

    for (const child of root.children) {
        const found = findNode(child, id);
        if (found) {
            return found;
        }
    }

    return null;
}

/**
 * Get the parent of a node in the tree.
 */
export function findParent(root: FeatureNode | null, childId: string): { id: string; title: string } | null {
    if (!root) {
        return null;
    }

    for (const child of root.children) {
        if (child.id === childId) {
            return { id: root.id, title: root.title };
        }
        const found = findParent(child, childId);
        if (found) {
            return found;
        }
    }

    return null;
}
