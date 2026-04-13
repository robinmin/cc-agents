import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createDbAdapter, FeatureService, initSchema, isAppError } from '@ftree/core';
import { Command, Option } from 'clipanion';

export class FeatureExportCommand extends Command {
    constructor() {
        super();
    }

    static paths = [['export']];

    static usage = Command.Usage({
        category: 'Feature Tree',
        description: 'Export feature tree as JSON',
        examples: [
            ['Export full tree', 'ftree export'],
            ['Export subtree', 'ftree export --root abc123'],
            ['Export to file', 'ftree export --output tree.json'],
        ],
    });

    root = Option.String('--root,-r', {
        description: 'Root feature ID for subtree export',
        required: false,
    });

    output = Option.String('--output,-o', {
        description: 'Output file path (default: stdout)',
        required: false,
    });

    db = Option.String('--db', {
        description: 'Database file path',
        required: false,
    });

    async execute() {
        const dbPath = this.db ?? process.env.FTREE_DB ?? 'docs/.ftree/db.sqlite';
        const adapter = await createDbAdapter({ driver: 'bun-sqlite', url: resolve(dbPath) });

        try {
            initSchema(adapter);
            const service = new FeatureService(adapter);

            const result = await service.exportTree(this.root);
            if (!result.ok) {
                this.context.stderr.write(`Error: ${result.error.message}\n`);
                return 1;
            }

            const json = JSON.stringify(result.data, null, 2);

            if (this.output) {
                const outputPath = resolve(this.output);
                writeFileSync(outputPath, `${json}\n`, 'utf-8');
                this.context.stderr.write(`Exported to ${outputPath}\n`);
            } else {
                this.context.stdout.write(`${json}\n`);
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
