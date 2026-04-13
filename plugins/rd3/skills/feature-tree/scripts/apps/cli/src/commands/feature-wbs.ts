import { resolve } from 'node:path';
import { createDbAdapter, FeatureService, initSchema, isAppError } from '@ftree/core';
import { Command, Option } from 'clipanion';

export class FeatureWbsCommand extends Command {
    constructor() {
        super();
    }

    static paths = [['wbs']];

    static usage = Command.Usage({
        category: 'Feature Tree',
        description: 'List linked WBS IDs for a feature',
        examples: [['List WBS IDs for a feature', 'ftree wbs abc123']],
    });

    featureId = Option.String({ name: 'feature-id', required: true });

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

        const dbPath = this.db ?? process.env.FTREE_DB ?? 'docs/.ftree/db.sqlite';
        const adapter = await createDbAdapter({ driver: 'bun-sqlite', url: resolve(dbPath) });

        try {
            initSchema(adapter);
            const service = new FeatureService(adapter);

            if (!service.exists(featureId)) {
                this.context.stderr.write(`Error: Feature "${featureId}" not found\n`);
                return 1;
            }

            const wbsIds = service.getWbsIds(featureId);
            for (const wbsId of wbsIds) {
                this.context.stdout.write(`${wbsId}\n`);
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
