import { resolve } from 'node:path';
import { createDbAdapter, FeatureService, initSchema, isAppError } from '@ftree/core';
import { Command, Option } from 'clipanion';

export class FeatureLinkCommand extends Command {
    constructor() {
        super();
    }

    static paths = [['link']];

    static usage = Command.Usage({
        category: 'Feature Tree',
        description: 'Link a feature to WBS task IDs (idempotent)',
        examples: [
            ['Link single WBS', 'ftree link abc123 --wbs 001'],
            ['Link multiple WBS', 'ftree link abc123 --wbs 001,002'],
        ],
    });

    featureId = Option.String({ name: 'feature-id', required: true });

    wbs = Option.String('--wbs,-w', {
        description: 'Comma-separated WBS IDs (required)',
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

            if (!service.exists(featureId)) {
                this.context.stderr.write(`Error: Feature "${featureId}" not found\n`);
                return 1;
            }

            for (const wbsId of wbsIds) {
                try {
                    service.linkWbs(featureId, wbsId);
                } catch (e) {
                    this.context.stderr.write(`Warning: Failed to link WBS "${wbsId}": ${e}\n`);
                }
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
