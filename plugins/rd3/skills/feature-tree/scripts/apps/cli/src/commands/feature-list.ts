import { resolve } from 'node:path';
import {
    buildFeatureTree,
    createDbAdapter,
    type Feature,
    type FeatureNode,
    FeatureService,
    type FeatureStatus,
    initSchema,
    isAppError,
    renderTree,
} from '@ftree/core';
import { Command, Option } from 'clipanion';

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

export class FeatureListCommand extends Command {
    constructor() {
        super();
    }

    static paths = [['ls'], ['list']];

    static usage = Command.Usage({
        category: 'Feature Tree',
        description: 'List features in tree view or as JSON',
        examples: [
            ['List all', 'ftree ls'],
            ['Subtree', 'ftree ls --root abc123'],
            ['Depth limit', 'ftree ls --depth 2'],
            ['JSON output', 'ftree ls --json'],
            ['Filter status', 'ftree ls --status executing'],
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

    status = Option.String('--status,-s', {
        description: 'Filter by status',
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
        const dbPath = this.db ?? process.env.FTREE_DB ?? 'docs/.ftree/db.sqlite';
        const adapter = await createDbAdapter({ driver: 'bun-sqlite', url: resolve(dbPath) });

        try {
            initSchema(adapter);
            const service = new FeatureService(adapter);

            let features: Feature[];
            let wbsByFeature: Map<string, string[]>;

            if (this.root) {
                features = service.getSubtree(this.root);
                if (features.length === 0) {
                    this.context.stderr.write(`Error: Root feature "${this.root}" not found\n`);
                    return 1;
                }
                wbsByFeature = service.buildWbsMap(features.map((f) => f.id));
            } else if (this.status) {
                const allResult = await service.list();
                if (!allResult.ok) {
                    this.context.stderr.write(`Error: ${allResult.error.message}\n`);
                    return 1;
                }
                features = allResult.data.filter((f) => f.status === (this.status as FeatureStatus));
                wbsByFeature = service.buildWbsMap(features.map((f) => f.id));
            } else {
                const allResult = await service.list();
                if (!allResult.ok) {
                    this.context.stderr.write(`Error: ${allResult.error.message}\n`);
                    return 1;
                }
                features = allResult.data;
                wbsByFeature = service.buildWbsMap(features.map((f) => f.id));
            }

            if (features.length === 0) {
                if (this.json) {
                    this.context.stdout.write('[]\n');
                } else {
                    this.context.stdout.write('(no features)\n');
                }
                return 0;
            }

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
                this.context.stdout.write(`${renderTree(tree, { color: true })}\n`);
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
