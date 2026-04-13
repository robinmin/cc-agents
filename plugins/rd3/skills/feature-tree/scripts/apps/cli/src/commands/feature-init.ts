import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createDbAdapter, FeatureService, initSchema } from '@ftree/core';
import { Command, Option } from 'clipanion';

export class FeatureInitCommand extends Command {
    // biome-ignore lint/complexity/noUselessConstructor: V8 function coverage requires explicit constructor
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
                const BUILTIN_TEMPLATES = ['web-app', 'cli-tool', 'api-service'] as const;
                if (!BUILTIN_TEMPLATES.includes(this.template as (typeof BUILTIN_TEMPLATES)[number])) {
                    this.context.stderr.write(
                        `Unknown template "${this.template}". Available: ${BUILTIN_TEMPLATES.join(', ')}\n`,
                    );
                    return 1;
                }

                const templatesDir = resolve(process.cwd(), 'plugins', 'rd3', 'skills', 'feature-tree', 'templates');
                const templatePath = join(templatesDir, `${this.template}.json`);
                if (!existsSync(templatePath)) {
                    this.context.stderr.write(`Template file not found: ${templatePath}\n`);
                    return 1;
                }

                const content = readFileSync(templatePath, 'utf-8');
                const nodes = JSON.parse(content);

                const service = new FeatureService(adapter);
                const count = service.seedFromTemplate(Array.isArray(nodes) ? nodes : [nodes], null, 0);

                this.context.stdout.write(`Seeded ${count} features from template "${this.template}"\n`);
            }

            if (!dbExists) {
                this.context.stdout.write(`Created new database at ${resolvedPath}\n`);
            } else {
                this.context.stdout.write(`Database schema verified at ${resolvedPath}\n`);
            }

            return 0;
        } catch (e) {
            this.context.stderr.write(`Error: ${e instanceof Error ? e.message : String(e)}\n`);
            return 1;
        } finally {
            adapter.close();
        }
    }
}
