/**
 * ftree init command
 *
 * Creates the feature tree database, optionally seeded from a project template.
 */

import type { Database } from 'bun:sqlite';
import { join, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { createId } from '@paralleldrive/cuid2';

import type { FeatureStatus, TemplateNode } from '../types';
import { openDatabase, initSchema, resolveDbPath } from '../db';
import { TEMPLATE_SQL } from '../dao/sql';
import { logger } from '../../../../scripts/logger';

// ─── Template registry ──────────────────────────────────────────────────────

/**
 * Resolve the templates directory, ensuring it's an absolute path.
 * When module is imported via Bun, import.meta.file may be relative.
 */
function resolveTemplatesDir(): string {
    // import.meta.file is relative ('.') when module is imported in Bun.
    // Compute templates dir relative to project root using known structure:
    // project/plugins/rd3/skills/feature-tree/templates/
    return resolve(process.cwd(), 'plugins', 'rd3', 'skills', 'feature-tree', 'templates');
}

const TEMPLATES_DIR = resolveTemplatesDir();

/** Built-in templates */
const BUILTIN_TEMPLATES = ['web-app', 'cli-tool', 'api-service'] as const;

type BuiltinTemplate = (typeof BUILTIN_TEMPLATES)[number];

/**
 * Load a built-in template by name.
 *
 * @param name - Template name
 * @returns Parsed template or null if not found
 */
function loadTemplate(name: string): TemplateNode[] | null {
    const templatePath = join(TEMPLATES_DIR, `${name}.json`);
    if (!existsSync(templatePath)) {
        return null;
    }

    try {
        const content = readFileSync(templatePath, 'utf-8');
        const parsed = JSON.parse(content) as TemplateNode[];
        return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
        logger.error(`Failed to load template "${name}": ${e}`);
        return null;
    }
}

/**
 * List available built-in templates.
 *
 * @returns Array of template names
 */
export function listTemplates(): string[] {
    return [...BUILTIN_TEMPLATES];
}

/**
 * Seed database from a template.
 * Templates are additive — safe to apply to existing DB.
 *
 * @param db - Open database connection
 * @param nodes - Template nodes to insert
 * @param parentId - Parent feature ID (null for root level)
 * @param depth - Current depth
 * @returns Number of features inserted
 */
function seedFromTemplate(db: Database, nodes: TemplateNode[], parentId: string | null, depth: number): number {
    let count = 0;

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const id = createId();
        const status: FeatureStatus = node.status ?? 'backlog';
        const metadata = '{}';
        const position = i;

        // Insert the feature
        db.run(TEMPLATE_SQL.insertWithTimestamp, [
            id,
            parentId,
            node.title,
            status,
            metadata,
            depth,
            position,
            new Date().toISOString(),
            new Date().toISOString(),
        ]);

        count++;

        // Recurse for children
        if (node.children && node.children.length > 0) {
            count += seedFromTemplate(db, node.children, id, depth + 1);
        }
    }

    return count;
}

// ─── Init command ──────────────────────────────────────────────────────────

/**
 * Initialize a feature tree database.
 *
 * @param options - Init options
 * @returns Exit code
 */
export async function init(options: { db: string | undefined; template: string | undefined }): Promise<number> {
    const { path, tier } = resolveDbPath(options.db);

    logger.debug(`[ftree init] DB path: ${path} (resolved via ${tier})`);

    // Check if DB already exists
    const dbExists = existsSync(path);
    if (dbExists) {
        logger.info(`Database already exists at ${path}`);
        // Still run init to ensure schema is up-to-date
        // (CREATE TABLE IF NOT EXISTS is safe)
    }

    // Open and initialize database
    const db = openDatabase(path);
    initSchema(db);

    // Handle template seeding
    if (options.template) {
        const templateName = options.template;

        // Validate template name
        if (!BUILTIN_TEMPLATES.includes(templateName as BuiltinTemplate)) {
            logger.error(`Unknown template "${templateName}". Available: ${BUILTIN_TEMPLATES.join(', ')}`);
            db.close();
            return 1;
        }

        const template = loadTemplate(templateName);
        if (!template) {
            logger.error(`Failed to load template "${templateName}"`);
            db.close();
            return 1;
        }

        logger.info(`Seeding from template "${templateName}"...`);
        const count = seedFromTemplate(db, template, null, 0);
        logger.info(`Inserted ${count} features from template "${templateName}"`);
    }

    db.close();

    if (!dbExists) {
        logger.info(`Created new database at ${path}`);
    } else if (!options.template) {
        logger.info(`Database schema verified (no changes)`);
    }

    return 0;
}
