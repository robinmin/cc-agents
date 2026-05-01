import { resolve } from 'node:path';
import { createDbAdapter, FeatureService, initSchema, isAppError } from '@ftree/core';
import { Command, Option } from 'clipanion';

export class FeatureCheckDoneCommand extends Command {
    constructor() {
        super();
    }

    static paths = [['check-done']];

    static usage = Command.Usage({
        category: 'Feature Tree',
        description: 'Check whether a feature is eligible to be marked as done',
        examples: [['Check if feature is done-eligible', 'ftree check-done abc123']],
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

        const dbPath = this.db ?? process.env.FTREE_DB ?? 'docs/.ftree/ftree.db';
        const adapter = await createDbAdapter({ driver: 'bun-sqlite', url: resolve(dbPath) });

        try {
            initSchema(adapter);
            const service = new FeatureService(adapter);

            const result = await service.checkDone(featureId);
            if (!result.ok) {
                this.context.stderr.write(`Error: ${result.error.message}\n`);
                return 1;
            }

            const { eligible, reasons } = result.data;

            if (eligible) {
                this.context.stdout.write(`${JSON.stringify({ eligible, reasons })}\n`);
                return 0;
            }

            this.context.stdout.write(`${JSON.stringify({ eligible, reasons })}\n`);
            for (const reason of reasons) {
                this.context.stderr.write(`${reason}\n`);
            }
            return 1;
        } catch (e) {
            this.context.stderr.write(`Error: ${e instanceof Error ? e.message : String(e)}\n`);
            if (isAppError(e) && e.code === 'INTERNAL') return 2;
            return 1;
        } finally {
            adapter.close();
        }
    }
}
