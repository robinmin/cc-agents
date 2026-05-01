import { resolve } from 'node:path';
import {
    buildFeatureTree,
    createDbAdapter,
    type FeatureNode,
    type FeatureStatus,
    FeatureService,
    formatStatus,
    initSchema,
    isAppError,
    renderTree,
} from '@ftree/core';
import { Command, Option } from 'clipanion';

// ─── Summary helpers ──────────────────────────────────────────────────────────

/**
 * Count all non-virtual nodes in a FeatureNode tree by stored status.
 */
function countNodesByStatus(root: FeatureNode): Record<FeatureStatus, number> {
    const counts: Record<FeatureStatus, number> = {
        backlog: 0,
        validated: 0,
        executing: 0,
        done: 0,
        blocked: 0,
    };

    function walk(node: FeatureNode) {
        if (node.id !== '__virtual_root__') {
            counts[node.storedStatus] += 1;
        }
        for (const child of node.children) {
            walk(child);
        }
    }

    walk(root);
    return counts;
}

/**
 * Format the footer summary lines for the tree display.
 */
function formatFooter(counts: Record<FeatureStatus, number>, dbPath: string, totalFeatures: number): string {
    const treeShown = Object.values(counts).reduce((sum, n) => sum + n, 0);
    const statusParts = (Object.keys(counts) as FeatureStatus[])
        .map((s) => `${formatStatus(s)} ${counts[s]}`)
        .join(' │ ');

    const line1 = `\n\n─── ${treeShown} node${treeShown !== 1 ? 's' : ''}`;
    const totalNote = treeShown !== totalFeatures ? ` (of ${totalFeatures} total)` : '';

    return `${line1}${totalNote}:  ${statusParts}\n📁 ${dbPath}`;
}

function serializeNode(node: FeatureNode): Record<string, unknown> {
    return {
        id: node.id,
        title: node.title,
        status: node.storedStatus,
        ...(node.storedStatus !== node.status ? { rollup_status: node.status } : {}),
        metadata: node.metadata,
        depth: node.depth,
        position: node.position,
        children: node.children.map(serializeNode),
        wbs_ids: node.wbsIds,
    };
}

export class FeatureShowCommand extends Command {
    constructor() {
        super();
    }

    static paths = [['show']];

    static usage = Command.Usage({
        category: 'Feature Tree',
        description: 'Show the full feature tree (like Unix tree)',
        examples: [
            ['Show full tree', 'ftree show'],
            ['Subtree from a root', 'ftree show --root abc123'],
            ['Limit depth', 'ftree show --depth 2'],
            ['JSON output', 'ftree show --json'],
        ],
    });

    root = Option.String('--root,-r', {
        description: 'Root feature ID for subtree',
        required: false,
    });

    depth = Option.String('--depth,-d', {
        description: 'Maximum depth to display',
        required: false,
    });

    json = Option.Boolean('--json,-j', false, {
        description: 'Output as JSON',
    });

    db = Option.String('--db', {
        description: 'Database file path',
        required: false,
    });

    async execute() {
        const dbPath = this.db ?? process.env.FTREE_DB ?? 'docs/.ftree/ftree.db';
        const resolvedDbPath = resolve(dbPath);
        const adapter = await createDbAdapter({ driver: 'bun-sqlite', url: resolvedDbPath });

        try {
            initSchema(adapter);
            const service = new FeatureService(adapter);

            const allResult = await service.list();
            if (!allResult.ok) {
                this.context.stderr.write(`Error: ${allResult.error.message}\n`);
                return 1;
            }

            const features = allResult.data;
            const totalFeatures = features.length;
            if (features.length === 0) {
                if (this.json) {
                    this.context.stdout.write('[]\n');
                } else {
                    this.context.stdout.write(`(no features)\n📁 ${resolvedDbPath}\n`);
                }
                return 0;
            }

            const wbsByFeature = service.buildWbsMap(features.map((f) => f.id));

            const maxDepth = this.depth ? Number.parseInt(this.depth, 10) : -1;
            const tree = buildFeatureTree(
                features.map((f) => ({
                    id: f.id,
                    parentId: f.parentId,
                    title: f.title,
                    status: f.status,
                    metadata: f.metadata,
                    depth: f.depth,
                    position: f.position,
                })),
                wbsByFeature,
                this.root,
                maxDepth,
            );

            if (!tree) {
                this.context.stderr.write('Failed to build feature tree\n');
                return 1;
            }

            if (this.json) {
                const output =
                    tree.id === '__virtual_root__' ? tree.children.map(serializeNode) : [serializeNode(tree)];
                this.context.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
            } else {
                const counts = countNodesByStatus(tree);
                const footer = formatFooter(counts, resolvedDbPath, totalFeatures);
                this.context.stdout.write(`${renderTree(tree, { color: true })}${footer}\n`);
            }

            return 0;
        } catch (e) {
            this.context.stderr.write(`Error: ${e instanceof Error ? e.message : String(e)}\n`);
            if (isAppError(e) && e.code === 'INTERNAL') return 2;
            return 1;
        } finally {
            adapter.close();
        }
    }
}
