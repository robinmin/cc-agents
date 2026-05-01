import { resolve } from 'node:path';
import { createDbAdapter, type FeatureNode, FeatureService, initSchema, isAppError } from '@ftree/core';
import { Command, Option } from 'clipanion';

function serializeNode(node: FeatureNode, includeMetadata: boolean): Record<string, unknown> {
    return {
        id: node.id,
        title: node.title,
        status: node.storedStatus,
        ...(node.storedStatus !== node.status ? { rollup_status: node.status } : {}),
        ...(includeMetadata ? { metadata: node.metadata } : {}),
        wbs_ids: node.wbsIds,
    };
}

export class FeatureContextCommand extends Command {
    constructor() {
        super();
    }

    static paths = [['context']];

    static usage = Command.Usage({
        category: 'Feature Tree',
        description: 'Show full context for a feature (parent, children, linked WBS)',
        examples: [
            ['Brief context', 'ftree context abc123'],
            ['Full context', 'ftree context abc123 --format full'],
        ],
    });

    featureId = Option.String({ name: 'feature-id', required: true });

    format = Option.String('--format', 'brief', {
        description: 'Output format: brief|full',
    });

    db = Option.String('--db', {
        description: 'Database file path',
        required: false,
    });

    async execute() {
        const featureId = this.featureId?.trim();
        if (!featureId) {
            this.context.stderr.write('Error: feature ID is required\n');
            return 1;
        }

        if (this.format !== 'brief' && this.format !== 'full') {
            this.context.stderr.write(`Error: --format must be "brief" or "full", got "${this.format}"\n`);
            return 1;
        }

        const dbPath = this.db ?? process.env.FTREE_DB ?? 'docs/.ftree/ftree.db';
        const adapter = await createDbAdapter({ driver: 'bun-sqlite', url: resolve(dbPath) });

        try {
            initSchema(adapter);
            const service = new FeatureService(adapter);

            const result = await service.getContext(featureId);
            if (!result.ok) {
                this.context.stderr.write(`Error: ${result.error.message}\n`);
                return 1;
            }

            const ctx = result.data;

            if (this.format === 'brief') {
                const output = {
                    node: serializeNode(ctx.node, false),
                    parent: ctx.parent,
                    children: ctx.children.map((child) => serializeNode(child, false)),
                    linked_wbs: ctx.linkedWbs,
                };
                this.context.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
            } else {
                const output = {
                    node: serializeNode(ctx.node, true),
                    parent: ctx.parent,
                    children: ctx.children.map((child) => serializeNode(child, true)),
                    linked_wbs: ctx.linkedWbs,
                };
                this.context.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
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
