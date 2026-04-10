// put command — copy a file to <task-folder>/<wbs>/ (alongside the task file)

import { existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { err, ok, type Result } from '../../../../scripts/libs/result';
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

export function validateArtifactDisplayName(displayName: string): Result<string> {
    const trimmed = displayName.trim();

    if (trimmed.length === 0) {
        return err('Artifact name must not be empty');
    }

    if (trimmed === '.' || trimmed === '..' || trimmed.includes('/') || trimmed.includes('\\')) {
        return err('Artifact name must be a file name, not a path');
    }

    return ok(trimmed);
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

    // Determine target directory (alongside the task file) and filename
    const taskDir = dirname(taskPath);
    const artifactSubDir = resolve(taskDir, wbs);
    const rawDisplayName = options.name || sourcePath.split('/').pop() || 'artifact';
    const displayNameResult = validateArtifactDisplayName(rawDisplayName);
    if (!displayNameResult.ok) {
        return err(displayNameResult.error);
    }

    const displayName = displayNameResult.value;
    const targetPath = resolve(artifactSubDir, displayName);
    const artifactRelativePath = relative(projectRoot, targetPath);

    // Lazily create directory
    if (!existsSync(artifactSubDir)) {
        mkdirSync(artifactSubDir, { recursive: true });
        if (!options.quiet) {
            logger.info(`Created directory: ${artifactRelativePath.replace(`/${displayName}`, '')}/`);
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
        path: artifactRelativePath,
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
            logger.success(`Stored artifact: ${artifactRelativePath}`);
        }
    }

    return ok({ path: targetPath, artifact });
}
