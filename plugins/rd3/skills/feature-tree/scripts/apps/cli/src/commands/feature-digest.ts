import { resolve } from 'node:path';
import {
    createDbAdapter,
    FEATURE_STATUSES,
    FeatureService,
    type FeatureStatus,
    initSchema,
    isAppError,
} from '@ftree/core';
import { Command, Option } from 'clipanion';

export class FeatureDigestCommand extends Command {
    constructor() {
        super();
    }

    static paths = [['digest']];

    static usage = Command.Usage({
        category: 'Feature Tree',
        description: 'Produce a concise summary digest for a feature and its WBS links',
        examples: [
            ['Basic digest', 'ftree digest abc123 --wbs 001,002'],
            ['With status override', 'ftree digest abc123 --wbs 001 --status done'],
        ],
    });

    id = Option.String({ name: 'id', required: true });

    wbs = Option.String('--wbs,-w', {
        description: 'Comma-separated WBS IDs to include (required)',
        required: true,
    });

    status = Option.String('--status,-s', {
        description: `Override status (${FEATURE_STATUSES.join(', ')})`,
        required: false,
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

        const wbsIds = this.wbs
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s !== '');

        if (wbsIds.length === 0) {
            this.context.stderr.write('Error: at least one --wbs ID is required\n');
            return 1;
        }

        // Validate status if provided
        if (this.status && !FEATURE_STATUSES.includes(this.status as FeatureStatus)) {
            this.context.stderr.write(`Invalid status "${this.status}". Valid: ${FEATURE_STATUSES.join(', ')}\n`);
            return 1;
        }

        const dbPath = this.db ?? process.env.FTREE_DB ?? 'docs/.ftree/ftree.db';
        const adapter = await createDbAdapter({ driver: 'bun-sqlite', url: resolve(dbPath) });

        try {
            initSchema(adapter);
            const service = new FeatureService(adapter);

            const result = await service.digest(featureId, wbsIds, {
                ...(this.status && { status: this.status as FeatureStatus }),
            });

            if (!result.ok) {
                this.context.stderr.write(`Error: ${result.error.message}\n`);
                return 1;
            }

            this.context.stdout.write(`${JSON.stringify(result.data, null, 2)}\n`);
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
