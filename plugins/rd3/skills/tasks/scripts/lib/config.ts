// Config loading — dual-mode: legacy (no config.jsonc) and config mode

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { TasksConfig } from '../types';
import { err, ok, type Result } from './result';

export const LEGACY_DIR = 'docs/prompts';
export const LEGACY_META_DIR = 'docs/.tasks';
export const PRIMARY_TASKS_DIR = 'docs/tasks';
export const LEGACY_TEMPLATE = '.template.md';

/**
 * Resets the cached configuration. (Legacy/No-op for compatibility)
 */
export function resetConfigCache(): void {}

/**
 * Robustly find the static directory (UI build artifacts).
 * It is expected to be in the same directory as scripts/tasks.ts.
 */
export function getStaticDir(): string {
    // This file: scripts/lib/config.ts -> dirname is scripts/lib -> parent is scripts/
    const scriptsDir = dirname(import.meta.dir);
    return join(scriptsDir, 'static');
}

/**
 * Robustly find the UI source directory (the Vite project).
 */
export function getUiDir(): string {
    const scriptsDir = dirname(import.meta.dir);
    return join(scriptsDir, 'server/ui');
}

/**
 * Robustly find the repo root.
 * Walks up from both process.cwd() and the script's own directory.
 * Prioritizes task-specific markers to avoid mis-identifying the root in monorepos.
 */
/**
 * Robustly find the repo root.
 * Walks up from both process.cwd() and the script's own directory.
 * Prioritizes task-specific markers to avoid mis-identifying the root in monorepos.
 */
export function getProjectRoot(): string {
    const cwd = process.cwd();
    // Only isolate if specifically in a temporary directory to avoid monorepo config leakage.
    // We allow normal discovery if we're in the repository itself.
    const isInTemp = cwd.includes('/tmp/') || cwd.includes('/Temp/');

    const findMarker = (startDir: string, marker: string): string | null => {
        let dir = startDir;
        for (let i = 0; i < 12; i++) {
            if (existsSync(resolve(dir, marker))) return dir;
            const parent = resolve(dir, '..');
            if (parent === dir) break;
            dir = parent;
        }
        return null;
    };

    // 1. Prioritize closest docs/.tasks from CWD
    const taskRoot = findMarker(cwd, 'docs/.tasks');
    if (taskRoot) return taskRoot;

    // 2. If in temp context, STOP HERE to prevent monorepo root leakage.
    if (isInTemp) {
        return cwd;
    }

    // 3. Fallback to walking up from the script's location for docs/.tasks
    // This allows commands run inside plugins/rd3 to find the repo root.
    const scriptDir = dirname(import.meta.dir);
    const scriptTaskRoot = findMarker(scriptDir, 'docs/.tasks');
    if (scriptTaskRoot) return scriptTaskRoot;

    // 4. Fallback to generic repo markers (.git, package.json)
    for (const marker of ['.git', 'package.json', 'bun.lockb']) {
        const root = findMarker(cwd, marker);
        if (root) return root;
    }

    return cwd;
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

export function loadConfig(projectRoot?: string): TasksConfig {
    const root = projectRoot || getProjectRoot();
    const configPath = getConfigPath(root);

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
