// Config loading — dual-mode: legacy (no config.jsonc) and config mode

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TasksConfig } from '../types';
import { err, ok, type Result } from './result';

export const LEGACY_DIR = 'docs/prompts';
export const LEGACY_META_DIR = 'docs/.tasks';
export const PRIMARY_TASKS_DIR = 'docs/tasks';
export const LEGACY_TEMPLATE = '.template.md';

export function getProjectRoot(): string {
    // Walk up from cwd to find project root (contains .git or docs/)
    let dir = process.cwd();
    for (let i = 0; i < 10; i++) {
        if (existsSync(resolve(dir, '.git')) || existsSync(resolve(dir, 'docs'))) {
            return dir;
        }
        const parent = resolve(dir, '..');
        if (parent === dir) break;
        dir = parent;
    }
    return process.cwd();
}

export function getMetaDir(projectRoot: string): string {
    return resolve(projectRoot, LEGACY_META_DIR);
}

export function getConfigPath(projectRoot: string): string {
    return resolve(projectRoot, LEGACY_META_DIR, 'config.jsonc');
}

export function getTemplatePath(projectRoot: string): string {
    return resolve(projectRoot, LEGACY_META_DIR, LEGACY_TEMPLATE);
}

export function getLegacyTemplatePath(projectRoot: string): string {
    return resolve(projectRoot, LEGACY_DIR, LEGACY_TEMPLATE);
}

export function loadConfig(projectRoot: string): TasksConfig {
    const configPath = getConfigPath(projectRoot);

    if (existsSync(configPath)) {
        try {
            const raw = readFileSync(configPath, 'utf-8');
            // Support JSONC comments and trailing commas in managed config files.
            const stripped = raw
                .replace(/\/\/.*$/gm, '')
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/,\s*([}\]])/g, '$1');
            const parsed = JSON.parse(stripped) as TasksConfig;
            return parsed;
        } catch {
            // Fall through to legacy mode
        }
    }

    // Legacy mode: no config.jsonc — use defaults
    return {
        $schema_version: 1,
        active_folder: LEGACY_DIR,
        folders: {
            [LEGACY_DIR]: { base_counter: 0 },
        },
    };
}

export function saveConfig(config: TasksConfig, projectRoot: string): Result<boolean> {
    const configPath = getConfigPath(projectRoot);
    const metaDir = getMetaDir(projectRoot);

    try {
        // Ensure meta dir exists
        if (!existsSync(metaDir)) {
            // Can't use mkdirSync here — will be handled by init command
        }
        const content = `${JSON.stringify(config, null, 2)}\n`;
        writeFileSync(configPath, content, 'utf-8');
        return ok(true);
    } catch (e) {
        return err(`Failed to save config: ${e}`);
    }
}

export function resolveActiveFolder(config: TasksConfig, cliFolder?: string): string {
    if (cliFolder) return cliFolder;
    return config.active_folder || LEGACY_DIR;
}

export function resolveFolderPath(config: TasksConfig, projectRoot: string, cliFolder?: string): string {
    const folder = resolveActiveFolder(config, cliFolder);
    return resolve(projectRoot, folder);
}
