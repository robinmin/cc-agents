import { resolve } from 'node:path';
import { createDbAdapter, FeatureService, initSchema, isAppError } from '@ftree/core';
import { Command, Option } from 'clipanion';

export class FeatureDeleteCommand extends Command {
    constructor() {
        super();
    }

    static paths = [['delete'], ['rm']];

    static usage = Command.Usage({
        category: 'Feature Tree',
        description: 'Delete a feature (and optionally its subtree)',
        examples: [
            ['Delete a leaf feature', 'ftree delete abc123'],
            ['Force delete with children', 'ftree delete abc123 --force'],
        ],
    });

    id = Option.String({ name: 'id', required: true });

    force = Option.Boolean('--force,-f', false, {
        description: 'Force deletion even if the feature has children',
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

        const dbPath = this.db ?? process.env.FTREE_DB ?? 'docs/.ftree/ftree.db';
        const adapter = await createDbAdapter({ driver: 'bun-sqlite', url: resolve(dbPath) });

        try {
            initSchema(adapter);
            const service = new FeatureService(adapter);

            const result = await service.remove(featureId, { force: this.force });

            if (!result.ok) {
                this.context.stderr.write(`Error: ${result.error.message}\n`);
                return 1;
            }

            this.context.stdout.write(`Deleted ${result.data.count} feature(s)\n`);
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
