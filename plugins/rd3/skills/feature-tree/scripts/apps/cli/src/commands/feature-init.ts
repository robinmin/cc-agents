import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createDbAdapter, FeatureService, initSchema, isAppError } from '@ftree/core';
import { Command, Option } from 'clipanion';
import {
    BUILTIN_TEMPLATES,
    isBuiltinTemplateName,
    loadBuiltinTemplate,
    resolveBuiltinTemplatePath,
} from '../lib/template-loader';

export class FeatureInitCommand extends Command {
    constructor() {
        super();
    }

    static paths = [['init']];

    static usage = Command.Usage({
        category: 'Feature Tree',
        description: 'Initialize a feature tree database',
        examples: [
            ['Initialize database', 'ftree init'],
            ['With template', 'ftree init --template web-app'],
            ['Custom path', 'ftree init --db /tmp/ftree.db'],
        ],
    });

    db = Option.String('--db', {
        description: 'Database file path',
        required: false,
    });

    template = Option.String('--template', {
        description: 'Built-in template to seed (web-app, cli-tool, api-service)',
        required: false,
    });

    async execute() {
        const dbPath = this.db ?? process.env.FTREE_DB ?? 'docs/.ftree/db.sqlite';
        const resolvedPath = resolve(dbPath);
        const dbExists = existsSync(resolvedPath);

        const adapter = await createDbAdapter({ driver: 'bun-sqlite', url: resolvedPath });

        try {
            initSchema(adapter);

            if (this.template) {
                if (!isBuiltinTemplateName(this.template)) {
                    this.context.stderr.write(
                        `Unknown template "${this.template}". Available: ${BUILTIN_TEMPLATES.join(', ')}\n`,
                    );
                    return 1;
                }

                const templatePath = resolveBuiltinTemplatePath(this.template);
                if (!existsSync(templatePath)) {
                    this.context.stderr.write(`Template file not found: ${templatePath}\n`);
                    return 1;
                }

                const service = new FeatureService(adapter);
                const nodes = loadBuiltinTemplate(this.template);
                const result = await service.importTree(nodes);
                if (!result.ok) {
                    this.context.stderr.write(`Error: ${result.error.message}\n`);
                    return isAppError(result.error) && result.error.code === 'INTERNAL' ? 2 : 1;
                }

                this.context.stdout.write(`Seeded ${result.data.count} features from template "${this.template}"\n`);
            }

            if (!dbExists) {
                this.context.stdout.write(`Created new database at ${resolvedPath}\n`);
            } else {
                this.context.stdout.write(`Database schema verified at ${resolvedPath}\n`);
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
