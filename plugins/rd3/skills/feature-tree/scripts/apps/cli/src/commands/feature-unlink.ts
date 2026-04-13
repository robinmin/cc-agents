import { resolve } from 'node:path';
import { createDbAdapter, FeatureService, initSchema, isAppError } from '@ftree/core';
import { Command, Option } from 'clipanion';

export class FeatureUnlinkCommand extends Command {
    constructor() {
        super();
    }

    static paths = [['unlink']];

    static usage = Command.Usage({
        category: 'Feature Tree',
        description: 'Unlink WBS task IDs from a feature',
        examples: [
            ['Unlink single WBS', 'ftree unlink abc123 --wbs 001'],
            ['Unlink multiple WBS', 'ftree unlink abc123 --wbs 001,002'],
        ],
    });

    featureId = Option.String({ name: 'feature-id', required: true });

    wbs = Option.String('--wbs,-w', {
        description: 'Comma-separated WBS IDs to unlink (required)',
        required: true,
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

        const wbsIds = this.wbs
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s !== '');

        if (wbsIds.length === 0) {
            this.context.stderr.write('Error: at least one --wbs ID is required\n');
            return 1;
        }

        const dbPath = this.db ?? process.env.FTREE_DB ?? 'docs/.ftree/db.sqlite';
        const adapter = await createDbAdapter({ driver: 'bun-sqlite', url: resolve(dbPath) });

        try {
            initSchema(adapter);
            const service = new FeatureService(adapter);

            const result = await service.unlinkWbs(featureId, wbsIds);

            if (!result.ok) {
                this.context.stderr.write(`Error: ${result.error.message}\n`);
                return 1;
            }

            this.context.stdout.write(`Unlinked ${result.data.count} WBS link(s)\n`);
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
