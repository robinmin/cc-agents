import { resolve } from 'node:path';
import { createDbAdapter, FeatureService, initSchema, isAppError, type TemplateNode } from '@ftree/core';
import { Command, Option } from 'clipanion';
import { loadTemplateNodesFromFile } from '../lib/template-loader';

export class FeatureImportCommand extends Command {
    constructor() {
        super();
    }

    static paths = [['import']];

    static usage = Command.Usage({
        category: 'Feature Tree',
        description: 'Import features from a JSON template file',
        examples: [
            ['Import to root', 'ftree import template.json'],
            ['Import under parent', 'ftree import template.json --parent abc123'],
        ],
    });

    file = Option.String({ name: 'file', required: true });

    parent = Option.String('--parent,-p', {
        description: 'Parent feature ID to import under (default: root)',
        required: false,
    });

    db = Option.String('--db', {
        description: 'Database file path',
        required: false,
    });

    async execute() {
        const filePath = this.file?.trim();
        if (!filePath) {
            this.context.stderr.write('Error: file path is required\n');
            return 1;
        }

        // Read and parse the JSON template file
        let template: TemplateNode[];
        try {
            template = loadTemplateNodesFromFile(filePath);
        } catch (e) {
            this.context.stderr.write(
                `Error: Failed to read/parse template file: ${e instanceof Error ? e.message : String(e)}\n`,
            );
            return 1;
        }

        if (template.length === 0) {
            this.context.stderr.write('Error: template file is empty\n');
            return 1;
        }

        const dbPath = this.db ?? process.env.FTREE_DB ?? 'docs/.ftree/ftree.db';
        const adapter = await createDbAdapter({ driver: 'bun-sqlite', url: resolve(dbPath) });

        try {
            initSchema(adapter);
            const service = new FeatureService(adapter);
            const result = await service.importTree(template, this.parent ?? null);
            if (!result.ok) {
                this.context.stderr.write(`Error: ${result.error.message}\n`);
                return isAppError(result.error) && result.error.code === 'INTERNAL' ? 2 : 1;
            }

            this.context.stdout.write(`Imported ${result.data.count} feature(s)\n`);
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
