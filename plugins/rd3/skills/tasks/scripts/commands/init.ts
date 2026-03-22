// init command — idempotent initialization

import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { err, ok, type Result } from '../lib/result';
import {
    getMetaDir,
    getConfigPath,
    LEGACY_DIR,
    LEGACY_META_DIR,
    LEGACY_TEMPLATE,
    PRIMARY_TASKS_DIR,
} from '../lib/config';
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

        // Ensure docs/prompts/ exists (legacy folder)
        const legacyDir = resolve(projectRoot, LEGACY_DIR);
        if (!existsSync(legacyDir)) {
            mkdirSync(legacyDir, { recursive: true });
            logger.info(`Created ${LEGACY_DIR}/`);
        }

        // Copy template files if not already present
        const skillTemplates = resolve(process.env.CLAUDE_PLUGIN_ROOT || '', 'plugins/rd3/skills/tasks/templates');

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

        // Legacy template
        const legacyTemplateDest = resolve(legacyDir, LEGACY_TEMPLATE);
        if (!existsSync(legacyTemplateDest)) {
            const legacyTemplateSrc = resolve(skillTemplates, 'prompts.md');
            if (existsSync(legacyTemplateSrc)) {
                copyFileSync(legacyTemplateSrc, legacyTemplateDest);
                logger.success(`Copied legacy template: ${LEGACY_DIR}/.template.md`);
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
                    [LEGACY_DIR]: { base_counter: 0, label: 'Legacy' },
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
