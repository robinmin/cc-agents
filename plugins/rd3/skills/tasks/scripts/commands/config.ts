// config command — show or modify configuration

import { loadConfig, saveConfig, getConfigPath } from '../lib/config';
import { logger } from '../../../../scripts/logger';

export function showConfig(
    projectRoot: string,
    quiet = false,
): {
    config: ReturnType<typeof loadConfig>;
    configPath: string;
} {
    const config = loadConfig(projectRoot);
    const configPath = getConfigPath(projectRoot);

    if (!quiet) {
        logger.log(`Config: ${configPath}`);
        logger.log(`Active folder: ${config.active_folder}`);
        logger.log('Folders:');
        for (const [path, folderConfig] of Object.entries(config.folders)) {
            logger.log(
                `  ${path} (base: ${folderConfig.base_counter}) ${folderConfig.label ? `— ${folderConfig.label}` : ''}`,
            );
        }
    }

    return { config, configPath };
}

export function setActiveFolder(
    projectRoot: string,
    folder: string,
    quiet = false,
): { ok: boolean; error?: string; activeFolder?: string } {
    const config = loadConfig(projectRoot);

    if (!config.folders[folder]) {
        return {
            ok: false,
            error: `Folder '${folder}' is not configured. Add it with 'tasks config add-folder ${folder}' first.`,
        };
    }

    config.active_folder = folder;
    const result = saveConfig(config, projectRoot);
    if (!result.ok) {
        return { ok: false, error: result.error };
    }

    if (!quiet) {
        logger.success(`Set active folder: ${folder}`);
    }
    return { ok: true, activeFolder: folder };
}

export function addFolder(
    projectRoot: string,
    folder: string,
    baseCounter: number,
    label?: string,
    quiet = false,
): { ok: boolean; error?: string; folder?: string; baseCounter?: number; label?: string } {
    const config = loadConfig(projectRoot);

    if (config.folders[folder]) {
        return { ok: false, error: `Folder '${folder}' is already configured.` };
    }

    config.folders[folder] = { base_counter: baseCounter };
    if (label) config.folders[folder].label = label;

    const result = saveConfig(config, projectRoot);
    if (!result.ok) {
        return { ok: false, error: result.error };
    }

    if (!quiet) {
        logger.success(`Added folder: ${folder} (base: ${baseCounter})`);
    }
    return {
        ok: true,
        folder,
        baseCounter,
        ...(label !== undefined ? { label } : {}),
    };
}
