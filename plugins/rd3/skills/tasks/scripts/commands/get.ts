// get command — list artifacts for a task

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { err, ok, type Result } from '../../../../scripts/libs/result';
import { loadConfig } from '../lib/config';
import { findTaskByWbs } from '../lib/wbs';
import { parseSection } from '../lib/taskFile';
import { logger } from '../../../../scripts/logger';
import type { ArtifactEntry, GetResult } from '../types';

function isDividerRow(cells: string[]): boolean {
    return cells.every((cell) => /^-+$/.test(cell.replace(/:/g, '')));
}

export function getArtifacts(
    projectRoot: string,
    wbs: string,
    options: { artifactType?: string } = {},
    quiet = false,
): Result<GetResult> {
    const config = loadConfig(projectRoot);
    const taskPath = findTaskByWbs(wbs, config, projectRoot);

    if (!taskPath || !existsSync(taskPath)) {
        return err(`Task ${wbs} not found`);
    }

    const content = readFileSync(taskPath, 'utf-8');
    const artifactsSection = parseSection(content, 'Artifacts');

    // Parse the artifacts table
    const artifacts: ArtifactEntry[] = [];
    const rows = artifactsSection.split('\n').filter((r) => r.includes('|'));

    // Skip header row and empty rows
    for (const row of rows.slice(1)) {
        const cells = row
            .split('|')
            .map((c) => c.trim())
            .filter((c) => c && c !== 'Type');
        if (cells.length >= 2 && !isDividerRow(cells)) {
            const [type, path, agent, date] = cells;
            if (options.artifactType && type !== options.artifactType) continue;
            artifacts.push({
                type,
                path,
                ...(agent ? { agent } : {}),
                date: date || '',
            });
        }
    }

    // Also check for files in <task-dir>/<wbs>/ directory (alongside the task file)
    const taskDir = dirname(taskPath);
    const artifactDir = resolve(taskDir, wbs);
    const storedFiles: string[] = [];
    if (existsSync(artifactDir)) {
        const files = readdirSync(artifactDir);
        for (const file of files) {
            const filePath = resolve(artifactDir, file);
            const relativePath = filePath.replace(`${projectRoot}/`, '');
            if (!storedFiles.includes(relativePath)) {
                storedFiles.push(relativePath);
            }
        }
    }

    const artifactPaths = artifacts.map((artifact) => artifact.path);
    const paths = options.artifactType !== undefined ? artifactPaths : [...new Set([...artifactPaths, ...storedFiles])];
    const result: GetResult = { wbs, artifacts, paths };

    if (!quiet) {
        if (artifacts.length === 0 && paths.length === 0) {
            logger.log(`No artifacts found for ${wbs}`);
        } else {
            logger.log(`Artifacts for ${wbs}:`);
            for (const artifact of artifacts) {
                logger.log(`  [${artifact.type}] ${artifact.path} ${artifact.date ? `(${artifact.date})` : ''}`);
            }
            if (storedFiles.length > 0) {
                logger.log(`Stored files in docs/tasks/${wbs}/:`);
                for (const file of storedFiles) {
                    logger.log(`  ${file}`);
                }
            }
        }
    }

    return ok(result);
}
