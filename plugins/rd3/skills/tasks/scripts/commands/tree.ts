// tree command — show directory structure of <task-dir>/<wbs>/

import { existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { err, ok, type Result } from '../../../../scripts/libs/result';
import { loadConfig } from '../lib/config';
import { findTaskByWbs } from '../lib/wbs';
import { logger } from '../../../../scripts/logger';

function walkDir(dir: string, prefix: string, lines: string[]): void {
    const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const isLast = i === entries.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        lines.push(`${prefix}${connector}${entry.name}`);
        if (entry.isDirectory()) {
            const childPrefix = prefix + (isLast ? '    ' : '│   ');
            walkDir(resolve(dir, entry.name), childPrefix, lines);
        }
    }
}

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

    const treeLines: string[] = [];
    walkDir(artifactDir, '', treeLines);

    const flatFiles = treeLines.map((line) => `${artifactRelativeDir}/${line.replace(/^[├└│─\s]+/, '')}`);

    if (!quiet) {
        logger.log(`${artifactRelativeDir}/`);
        for (const line of treeLines) {
            logger.log(line);
        }
        logger.log(`${treeLines.length} file(s)`);
    }

    return ok({ wbs, files: flatFiles });
}
