import { resolve } from 'node:path';
import { createDbAdapter, FeatureService, initSchema, isAppError } from '@ftree/core';
import { Command, Option } from 'clipanion';

export class FeatureMoveCommand extends Command {
    constructor() {
        super();
    }

    static paths = [['move']];

    static usage = Command.Usage({
        category: 'Feature Tree',
        description: 'Move a feature to a new parent (use "null" for root)',
        examples: [
            ['Move under a parent', 'ftree move abc123 --parent def456'],
            ['Move to root level', 'ftree move abc123 --parent null'],
        ],
    });

    id = Option.String({ name: 'id', required: true });

    parent = Option.String('--parent,-p', {
        description: 'New parent feature ID (use "null" to move to root)',
        required: true,
    });

    db = Option.String('--db', {
        description: 'Database file path',
        required: false,
    });

    async execute() {
        const featureId = this.id?.trim();
        if (!featureId) {
            this.context.stderr.write('Error: feature ID is required\n');
            return 1;
        }

        // Parse parent: "null" string means root (null parentId)
        const parentId = this.parent === 'null' ? null : this.parent;

        const dbPath = this.db ?? process.env.FTREE_DB ?? 'docs/.ftree/db.sqlite';
        const adapter = await createDbAdapter({ driver: 'bun-sqlite', url: resolve(dbPath) });

        try {
            initSchema(adapter);
            const service = new FeatureService(adapter);

            const result = await service.move(featureId, parentId);

            if (!result.ok) {
                this.context.stderr.write(`Error: ${result.error.message}\n`);
                return 1;
            }

            this.context.stdout.write(`${result.data.id}\n`);
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
