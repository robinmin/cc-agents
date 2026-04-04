// open command — open task in default editor (for humans)

import { existsSync } from 'node:fs';
import { execSync as defaultExecSync, type ExecSyncOptions } from 'node:child_process';
import { err, ok, type Result } from '../lib/result';
import { loadConfig } from '../lib/config';
import { findTaskByWbs } from '../lib/wbs';
import { logger } from '../../../../scripts/logger';
import { platform } from 'node:os';

// Type for execSync function - allows dependency injection for testing
type ExecSyncFn = (command: string, options?: ExecSyncOptions) => Buffer | undefined;

/**
 * Options for openTask function.
 * @param execSync - Optional execSync function for testing (defaults to node:child_process.execSync)
 */
export interface OpenTaskOptions {
    execSync?: ExecSyncFn;
}

export function openTask(
    projectRoot: string,
    wbs: string,
    quiet = false,
    options?: OpenTaskOptions,
): Result<{ wbs: string; path: string }> {
    const execSync = options?.execSync ?? defaultExecSync;
    const config = loadConfig(projectRoot);
    const taskPath = findTaskByWbs(wbs, config, projectRoot);

    if (!taskPath || !existsSync(taskPath)) {
        return err(`Task ${wbs} not found`);
    }

    try {
        const os = platform();
        if (os === 'darwin') {
            execSync(`open "${taskPath}"`, { stdio: 'ignore' });
        } else if (os === 'linux') {
            execSync(`xdg-open "${taskPath}"`, { stdio: 'ignore' });
        } else {
            execSync(`start "" "${taskPath}"`, { stdio: 'ignore' });
        }
        if (!quiet) {
            logger.log(`Opened ${wbs} in editor`);
        }
        return ok({ wbs, path: taskPath });
    } catch (e) {
        return err(`Failed to open task: ${e}`);
    }
}
