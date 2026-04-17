// open command — open task in default editor (for humans)

import { existsSync } from 'node:fs';
import { spawnSync as defaultSpawnSync, type SpawnSyncOptions, type SpawnSyncReturns } from 'node:child_process';
import { err, ok, type Result } from '../../../../scripts/libs/result';
import { loadConfig } from '../lib/config';
import { findTaskByWbs } from '../lib/wbs';
import { logger } from '../../../../scripts/logger';
import { platform } from 'node:os';

type SpawnSyncFn = (command: string, args?: readonly string[], options?: SpawnSyncOptions) => SpawnSyncReturns<Buffer>;

/**
 * Options for openTask function.
 * @param spawnSync - Optional spawnSync function for testing (defaults to node:child_process.spawnSync)
 */
export interface OpenTaskOptions {
    spawnSync?: SpawnSyncFn;
}

export function getOpenCommandForPlatform(os: NodeJS.Platform, taskPath: string): { command: string; args: string[] } {
    if (os === 'darwin') {
        return { command: 'open', args: [taskPath] };
    }

    if (os === 'linux') {
        return { command: 'xdg-open', args: [taskPath] };
    }

    return { command: 'cmd', args: ['/c', 'start', '', taskPath] };
}

export function openTask(
    projectRoot: string,
    wbs: string,
    quiet = false,
    options?: OpenTaskOptions,
): Result<{ wbs: string; path: string }> {
    const spawnSync = options?.spawnSync ?? defaultSpawnSync;

    if (!/^\d{1,4}$/.test(wbs)) {
        return err(`Invalid WBS format: ${wbs}`);
    }

    const config = loadConfig(projectRoot);
    const taskPath = findTaskByWbs(wbs, config, projectRoot);

    if (!taskPath || !existsSync(taskPath)) {
        return err(`Task ${wbs} not found`);
    }

    try {
        const { command, args } = getOpenCommandForPlatform(platform(), taskPath);
        const result = spawnSync(command, args, {
            stdio: 'ignore',
            shell: false,
            windowsHide: true,
        });
        if (result.error) {
            throw result.error;
        }
        if (typeof result.status === 'number' && result.status !== 0) {
            throw new Error(`${command} exited with status ${result.status}`);
        }
        if (!quiet) {
            logger.log(`Opened ${wbs} in editor`);
        }
        return ok({ wbs, path: taskPath });
    } catch (e) {
        return err(`Failed to open task: ${e}`);
    }
}
