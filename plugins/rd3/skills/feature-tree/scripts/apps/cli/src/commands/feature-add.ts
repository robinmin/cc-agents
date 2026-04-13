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

export class FeatureAddCommand extends Command {
    constructor() {
        super();
    }

    static paths = [['add']];

    static usage = Command.Usage({
        category: 'Feature Tree',
        description: 'Add a new feature to the tree',
        examples: [
            ['Add root feature', "ftree add --title 'User Auth'"],
            ['Add child feature', "ftree add --title 'OAuth2' --parent abc123"],
            ['With status', "ftree add --title 'API Gateway' --status executing"],
            ['With metadata', 'ftree add --title "Search" --metadata \'{"priority":"high"}\''],
        ],
    });

    title = Option.String('--title', {
        description: 'Feature title (required)',
        required: true,
    });

    parent = Option.String('--parent,-p', {
        description: 'Parent feature ID',
        required: false,
    });

    status = Option.String('--status,-s', {
        description: `Feature status (${FEATURE_STATUSES.join(', ')})`,
        required: false,
    });

    metadata = Option.String('--metadata,-m', {
        description: 'JSON metadata string',
        required: false,
    });

    db = Option.String('--db', {
        description: 'Database file path',
        required: false,
    });

    async execute() {
        // Validate title
        if (!this.title || this.title.trim() === '') {
            this.context.stderr.write('Error: --title is required\n');
            return 1;
        }

        // Validate status
        const status = this.status as FeatureStatus | undefined;
        if (status && !FEATURE_STATUSES.includes(status)) {
            this.context.stderr.write(`Invalid status "${status}". Valid: ${FEATURE_STATUSES.join(', ')}\n`);
            return 1;
        }

        // Parse metadata
        let metadataJson = '{}';
        if (this.metadata) {
            try {
                const parsed = JSON.parse(this.metadata);
                metadataJson = JSON.stringify(parsed);
            } catch {
                this.context.stderr.write('Error: --metadata must be valid JSON\n');
                return 1;
            }
        }

        const dbPath = this.db ?? process.env.FTREE_DB ?? 'docs/.ftree/db.sqlite';
        const adapter = await createDbAdapter({ driver: 'bun-sqlite', url: resolve(dbPath) });

        try {
            initSchema(adapter);
            const service = new FeatureService(adapter);

            const result = await service.create({
                title: this.title,
                parentId: this.parent ?? null,
                ...(status !== undefined && { status }),
                metadata: metadataJson,
            });

            if (!result.ok) {
                this.context.stderr.write(`Error: ${result.error.message}\n`);
                return 1;
            }

            // Output the new feature ID to stdout
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
