/**
 * ftree — Tree rendering utilities
 *
 * Unicode box-drawing tree output + roll-up computation.
 */

import type { FeatureNode, FeatureStatus } from './types';
import { computeRollupStatus } from './lib/state-machine';

// ─── Box-drawing constants ─────────────────────────────────────────────────

const BOX_MIDDLE = '├──';
const BOX_LAST = '└──';
const BOX_SPACE = '    ';
const BOX_CONTINUE = '│   ';

// ─── Status formatting ─────────────────────────────────────────────────────

/** Color codes for status (ANSI) */
const STATUS_COLORS: Record<FeatureStatus, string> = {
    backlog: '\x1b[90m', // gray
    validated: '\x1b[36m', // cyan
    executing: '\x1b[33m', // yellow
    done: '\x1b[32m', // green
    blocked: '\x1b[31m', // red
};

const RESET = '\x1b[0m';

/**
 * Format a status string with color.
 *
 * @param status - Feature status
 * @param color - Whether to use ANSI colors
 * @returns Formatted status string
 */
export function formatStatus(status: FeatureStatus, color = true): string {
    if (color) {
        return `${STATUS_COLORS[status]}${status}${RESET}`;
    }
    return status;
}

/**
 * Format status for display, showing stored → rollup when they differ.
 *
 * @param node - Feature node
 * @param color - Whether to use ANSI colors
 * @returns Formatted status string
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
 *
 * @param node - Root node of the subtree to render
 * @param isLast - Whether this node is the last sibling
 * @param prefix - Prefix string for the current indentation level
 * @param color - Whether to use ANSI colors
 * @returns Formatted tree string (no trailing newline)
 */
export function renderTreeNode(node: FeatureNode, isLast: boolean, prefix = '', color = true): string {
    const lines: string[] = [];

    // Build the connector line
    const connector = isLast ? BOX_LAST : BOX_MIDDLE;
    const statusStr = formatNodeStatus(node, color);
    const wbsSuffix = node.wbs_ids.length > 0 ? ` → ${node.wbs_ids.join(', ')}` : '';

    lines.push(`${prefix}${connector} [${node.id}] ${node.title} (${statusStr})${wbsSuffix}`);

    // Process children
    const children = node.children;
    const childPrefix = prefix + (isLast ? BOX_SPACE : BOX_CONTINUE);

    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const childIsLast = i === children.length - 1;
        lines.push(renderTreeNode(child, childIsLast, childPrefix, color));
    }

    return lines.join('\n');
}

/**
 * Render a feature tree from a root node.
 *
 * @param root - Root feature node
 * @param options - Rendering options
 * @returns Formatted tree string
 */
export function renderTree(root: FeatureNode, options: { color?: boolean } = {}): string {
    const color = options.color ?? true;
    const lines: string[] = [];

    // Skip virtual root node when rendering
    if (root.id === '__virtual_root__') {
        for (let i = 0; i < root.children.length; i++) {
            const child = root.children[i];
            const childIsLast = i === root.children.length - 1;
            lines.push(renderTreeNode(child, childIsLast, '', color));
        }
        return lines.join('\n');
    }

    // Root title
    const statusStr = formatNodeStatus(root, color);
    const wbsSuffix = root.wbs_ids.length > 0 ? ` → ${root.wbs_ids.join(', ')}` : '';
    lines.push(`[${root.id}] ${root.title} (${statusStr})${wbsSuffix}`);

    // Children
    for (let i = 0; i < root.children.length; i++) {
        const child = root.children[i];
        const childIsLast = i === root.children.length - 1;
        lines.push(renderTreeNode(child, childIsLast, '', color));
    }

    return lines.join('\n');
}

// ─── Tree building ─────────────────────────────────────────────────────────

/**
 * Build a FeatureNode tree from a flat array of features + WBS IDs.
 *
 * @param features - Flat array of features (should be ordered by depth, position)
 * @param wbsByFeature - Map of feature ID -> WBS IDs array
 * @param rootId - ID of the root node (or first feature's ID if not specified)
 * @param maxDepth - Maximum depth to include (-1 for unlimited)
 * @returns FeatureNode tree rooted at rootId
 */
export function buildFeatureTree(
    features: {
        id: string;
        parent_id: string | null;
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

    // Index features by ID
    const byId = new Map<string, (typeof features)[0]>();
    for (const f of features) {
        byId.set(f.id, f);
    }

    // Build parent->children map
    const children: Map<string | null, typeof features> = new Map();
    children.set(null, []);
    for (const f of features) {
        const parent = f.parent_id;
        if (!children.has(parent)) {
            children.set(parent, []);
        }
        const arr = children.get(parent);
        if (arr) {
            arr.push(f);
        }
    }

    // Parse metadata JSON
    function parseMeta(m: string): Record<string, unknown> {
        try {
            return JSON.parse(m) as Record<string, unknown>;
        } catch {
            return {};
        }
    }

    // Build tree recursively
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

        // Compute roll-up status
        const childStatuses = childNodes.map((n) => n.status);
        const rollupStatus = computeRollupStatus(childStatuses);

        // Use stored status if no children, otherwise use rollup
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
            wbs_ids: wbsByFeature.get(feature.id) ?? [],
        };
    }

    // Start from root
    const root = rootId ? byId.get(rootId) : features[0];
    if (!root) {
        return null;
    }

    const mainNode = buildNode(root, 0);

    // If no specific rootId was given, wrap all root-level features
    // (parent_id === null) as children of a virtual root
    if (!rootId) {
        const rootChildren: FeatureNode[] = [];
        if (mainNode) {
            rootChildren.push(mainNode);
        }
        // Add any other root-level features (features[0] is already added)
        for (const f of features) {
            if (f.parent_id === null && f.id !== root.id) {
                const node = buildNode(f, 0);
                if (node) {
                    rootChildren.push(node);
                }
            }
        }

        // Compute roll-up for virtual root
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
            wbs_ids: [],
        };
    }

    return mainNode;
}

/**
 * Find a node in the tree by ID.
 *
 * @param root - Root of the tree
 * @param id - Feature ID to find
 * @returns The found node or null
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
 *
 * @param root - Root of the tree
 * @param childId - ID of the child node
 * @returns Parent feature or null
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
