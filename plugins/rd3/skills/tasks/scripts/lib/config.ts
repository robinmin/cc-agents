// Config loading — dual-mode: legacy (no config.jsonc) and config mode

import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import type { TasksConfig } from '../types';
import { err, ok, type Result } from '../../../../scripts/libs/result';

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
 */
export function getProjectRoot(): string {
    const rawCwd = process.cwd();
    const safeRealpath = (p: string) => {
        try {
            return realpathSync(p);
        } catch {
            return p;
        }
    };

    const realCwd = safeRealpath(rawCwd);
    const realTemp = safeRealpath(tmpdir());

    // Only isolate if specifically in a temporary directory to avoid monorepo config leakage.
    // We allow normal discovery if we're in the repository itself.
    const isInTemp =
        realCwd === realTemp ||
        realCwd.startsWith(`${realTemp}/`) ||
        realCwd.startsWith(`${realTemp}\\`) ||
        realCwd.includes('/tmp/') ||
        realCwd.includes('/private/tmp/') ||
        realCwd.includes('/Temp/') ||
        realCwd.includes('/private/var/') ||
        realCwd.includes('/var/folders/');

    const findMarker = (startDir: string, marker: string): string | null => {
        let dir = resolve(startDir);
        for (let i = 0; i < 12; i++) {
            if (existsSync(resolve(dir, marker))) return dir;
            const parent = resolve(dir, '..');
            if (parent === dir) break;
            dir = parent;
        }
        return null;
    };

    // Stage 1: Try discovery from current directory
    const taskRoot = findMarker(rawCwd, 'docs/.tasks');

    // Stage 2: If we are in a temp directory, ensure we don't leak to the monorepo root.
    // We only return taskRoot if it's ALSO within the temp directory.
    if (isInTemp) {
        if (taskRoot) {
            const realTaskRoot = safeRealpath(taskRoot);
            if (
                realTaskRoot.startsWith(realTemp) ||
                realTaskRoot.includes('/tmp/') ||
                realTaskRoot.includes('/var/folders/')
            ) {
                return taskRoot;
            }
        }
        return rawCwd;
    }

    // Stage 3: Normal discovery (not in temp)
    if (taskRoot) return taskRoot;

    // Stage 4: Fallback to walking up from the script's location for docs/.tasks
    // This allows commands run inside plugins/rd3 to find the repo root.
    const scriptDir = dirname(import.meta.dir);
    const scriptTaskRoot = findMarker(scriptDir, 'docs/.tasks');
    if (scriptTaskRoot) return scriptTaskRoot;

    // Stage 5: Fallback to generic repo markers (.git, package.json)
    for (const marker of ['.git', 'package.json', 'bun.lockb']) {
        const root = findMarker(rawCwd, marker);
        if (root) return root;
    }

    return rawCwd;
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
    const active = existsSync(resolve(root, PRIMARY_TASKS_DIR)) ? PRIMARY_TASKS_DIR : LEGACY_DIR;
    return {
        $schema_version: 1,
        active_folder: active,
        folders: {
            [LEGACY_DIR]: { base_counter: 0 },
            [PRIMARY_TASKS_DIR]: { base_counter: 0 },
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
