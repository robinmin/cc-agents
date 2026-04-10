// tree command — show directory structure of <task-dir>/<wbs>/

import { existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { err, ok, type Result } from '../../../../scripts/libs/result';
import { loadConfig } from '../lib/config';
import { findTaskByWbs } from '../lib/wbs';
import { logger } from '../../../../scripts/logger';

export function showTree(projectRoot: string, wbs: string, quiet = false): Result<{ wbs: string; files: string[] }> {
    const config = loadConfig(projectRoot);
    const taskPath = findTaskByWbs(wbs, config, projectRoot);

    if (!taskPath || !existsSync(taskPath)) {
        return err(`Task ${wbs} not found`);
    }

    const taskDir = dirname(taskPath);
    const artifactDir = resolve(taskDir, wbs);
    const artifactRelativeDir = artifactDir.replace(`${projectRoot}/`, '');

    if (!existsSync(artifactDir)) {
        if (!quiet) {
            logger.log(`No files stored for ${wbs} (${artifactRelativeDir}/ does not exist)`);
        }
        return ok({ wbs, files: [] });
    }

    const files = readdirSync(artifactDir);
    const treeLines: string[] = [];
    for (const file of files) {
        treeLines.push(`${artifactRelativeDir}/${file}`);
    }

    if (!quiet) {
        logger.log(`${artifactRelativeDir}/`);
        for (const file of files) {
            logger.log(`  └── ${file}`);
        }
        logger.log(`${files.length} file(s)`);
    }

    return ok({ wbs, files: treeLines });
}
