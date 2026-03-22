// put command — copy a file to docs/tasks/<wbs>/

import { existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { err, ok, type Result } from '../lib/result';
import { loadConfig } from '../lib/config';
import { findTaskByWbs } from '../lib/wbs';
import { appendArtifactRow } from '../lib/taskFile';
import { logger } from '../../../../scripts/logger';
import type { ArtifactEntry } from '../types';

function inferArtifactType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();

    switch (extension) {
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'svg':
        case 'webp':
            return 'image';
        case 'md':
            return 'document';
        case 'json':
        case 'yaml':
        case 'yml':
            return 'data';
        case 'txt':
        case 'log':
            return 'text';
        default:
            return 'file';
    }
}

export function putArtifact(
    projectRoot: string,
    wbs: string,
    sourcePath: string,
    options: { name?: string; agent?: string; quiet?: boolean } = {},
): Result<{ path: string; artifact: ArtifactEntry }> {
    const config = loadConfig(projectRoot);
    const taskPath = findTaskByWbs(wbs, config, projectRoot);

    if (!taskPath || !existsSync(taskPath)) {
        return err(`Task ${wbs} not found`);
    }

    if (!existsSync(sourcePath)) {
        return err(`Source file does not exist: ${sourcePath}`);
    }

    // Determine target directory and filename
    const targetDir = resolve(projectRoot, 'docs/tasks', wbs);
    const displayName = options.name || sourcePath.split('/').pop() || 'artifact';
    const targetPath = resolve(targetDir, displayName);

    // Lazily create directory
    if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
        if (!options.quiet) {
            logger.info(`Created directory: docs/tasks/${wbs}/`);
        }
    }

    // Copy file
    try {
        copyFileSync(sourcePath, targetPath);
    } catch (e) {
        return err(`Failed to copy file: ${e}`);
    }

    // Append to Artifacts table
    const artifact: ArtifactEntry = {
        type: inferArtifactType(displayName),
        path: `docs/tasks/${wbs}/${displayName}`,
        ...(options.agent ? { agent: options.agent } : {}),
        date: new Date().toISOString().split('T')[0],
    };

    const result = appendArtifactRow(taskPath, artifact);
    if (!result.ok) {
        if (!options.quiet) {
            logger.warn(`File copied but failed to update Artifacts table: ${result.error}`);
        }
    } else {
        if (!options.quiet) {
            logger.success(`Stored artifact: docs/tasks/${wbs}/${displayName}`);
        }
    }

    return ok({ path: targetPath, artifact });
}
