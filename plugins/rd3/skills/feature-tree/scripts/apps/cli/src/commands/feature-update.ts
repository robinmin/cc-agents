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

export class FeatureUpdateCommand extends Command {
    constructor() {
        super();
    }

    static paths = [['update']];

    static usage = Command.Usage({
        category: 'Feature Tree',
        description: 'Update a feature title, status, or metadata',
        examples: [
            ['Update title', 'ftree update abc123 --title "New Title"'],
            ['Update status', 'ftree update abc123 --status executing'],
            ['Update metadata', 'ftree update abc123 --metadata \'{"priority":"high"}\''],
        ],
    });

    id = Option.String({ name: 'id', required: true });

    title = Option.String('--title,-t', {
        description: 'New feature title',
        required: false,
    });

    status = Option.String('--status,-s', {
        description: `New status (${FEATURE_STATUSES.join(', ')})`,
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
        const featureId = this.id?.trim();
        if (!featureId) {
            this.context.stderr.write('Error: feature ID is required\n');
            return 1;
        }

        // At least one mutable field must be provided
        if (!this.title && !this.status && !this.metadata) {
            this.context.stderr.write('Error: at least one of --title, --status, or --metadata is required\n');
            return 1;
        }

        // Validate status value
        if (this.status && !FEATURE_STATUSES.includes(this.status as FeatureStatus)) {
            this.context.stderr.write(`Invalid status "${this.status}". Valid: ${FEATURE_STATUSES.join(', ')}\n`);
            return 1;
        }

        // Parse metadata
        let metadataJson: string | undefined;
        if (this.metadata) {
            try {
                metadataJson = JSON.stringify(JSON.parse(this.metadata));
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

            const result = await service.update(featureId, {
                ...(this.title && { title: this.title.trim() }),
                ...(this.status && { status: this.status as FeatureStatus }),
                ...(metadataJson !== undefined && { metadata: metadataJson }),
            });

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
