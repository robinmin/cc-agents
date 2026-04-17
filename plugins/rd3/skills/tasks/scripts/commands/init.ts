// init command — idempotent initialization

import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { err, ok, type Result } from '../../../../scripts/libs/result';
import { getMetaDir, getConfigPath, LEGACY_META_DIR, PRIMARY_TASKS_DIR } from '../lib/config';
import { logger } from '../../../../scripts/logger';

export function runInit(projectRoot: string): Result<boolean> {
    try {
        // Ensure docs/.tasks/ exists
        const metaDir = getMetaDir(projectRoot);
        if (!existsSync(metaDir)) {
            mkdirSync(metaDir, { recursive: true });
            logger.info(`Created ${LEGACY_META_DIR}/`);
        }

        // Ensure docs/tasks/ exists (default task storage)
        const primaryDir = resolve(projectRoot, PRIMARY_TASKS_DIR);
        if (!existsSync(primaryDir)) {
            mkdirSync(primaryDir, { recursive: true });
            logger.info(`Created ${PRIMARY_TASKS_DIR}/`);
        }

        // Copy template files if not already present
        // Try process.cwd() first (works when CLI is run from project root in dev)
        // Fall back to dist/templates/ (populated by the build step for production installs)
        // Fall back to source templates (works in source TS execution via import.meta.dir)
        const scriptsDir = dirname(fileURLToPath(import.meta.url));
        let skillTemplates = resolve(process.cwd(), 'plugins/rd3/skills/tasks/templates');
        if (!existsSync(skillTemplates)) {
            // Bundled production: dist/tasks.js → dist/templates/
            skillTemplates = resolve(scriptsDir, 'templates');
        }
        if (!existsSync(skillTemplates)) {
            // Source dev: scripts/commands/ → scripts/ → skills/tasks/ → templates
            skillTemplates = resolve(scriptsDir, '../../templates');
        }

        // Task template
        const taskTemplateDest = resolve(metaDir, 'task.md');
        if (!existsSync(taskTemplateDest)) {
            const taskTemplateSrc = resolve(skillTemplates, 'task.md');
            if (existsSync(taskTemplateSrc)) {
                copyFileSync(taskTemplateSrc, taskTemplateDest);
                logger.success(`Copied template: ${LEGACY_META_DIR}/task.md`);
            }
        }

        // Kanban template
        const kanbanDest = resolve(metaDir, 'kanban.md');
        if (!existsSync(kanbanDest)) {
            const kanbanSrc = resolve(skillTemplates, 'kanban.md');
            if (existsSync(kanbanSrc)) {
                copyFileSync(kanbanSrc, kanbanDest);
                logger.success(`Copied kanban: ${LEGACY_META_DIR}/kanban.md`);
            }
        }

        // Create config.jsonc if not present
        const configPath = getConfigPath(projectRoot);
        if (!existsSync(configPath)) {
            const defaultConfig = {
                $schema_version: 1,
                active_folder: PRIMARY_TASKS_DIR,
                folders: {
                    [PRIMARY_TASKS_DIR]: { base_counter: 0, label: 'Primary' },
                },
            };
            writeFileSync(configPath, `${JSON.stringify(defaultConfig, null, 2)}\n`, 'utf-8');
            logger.success(`Created config: ${LEGACY_META_DIR}/config.jsonc`);
        }

        logger.success('tasks init complete');
        return ok(true);
    } catch (e) {
        logger.error(`tasks init failed: ${e}`);
        return err(`init failed: ${e}`);
    }
}
