import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runInit } from '../scripts/commands/init';
import { createTask } from '../scripts/commands/create';
import { PRIMARY_TASKS_DIR, LEGACY_DIR, LEGACY_META_DIR } from '../scripts/lib/config';
import { setGlobalSilent } from '../../../scripts/logger';

const repoRoot = resolve(import.meta.dir, '../../../../..');

describe('init/create folder layout', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `tasks-init-create-test-${Date.now()}`);
    const originalPluginRoot = process.env.CLAUDE_PLUGIN_ROOT;

    beforeEach(() => {
        mkdirSync(join(tempDir, 'docs'), { recursive: true });
        process.env.CLAUDE_PLUGIN_ROOT = repoRoot;
        setGlobalSilent(true);
    });

    afterEach(() => {
        setGlobalSilent(false);
        if (originalPluginRoot === undefined) {
            process.env.CLAUDE_PLUGIN_ROOT = undefined;
        } else {
            process.env.CLAUDE_PLUGIN_ROOT = originalPluginRoot;
        }
        rmSync(tempDir, { recursive: true, force: true });
    });

    test('runInit creates metadata under docs/.tasks and defaults task storage to docs/tasks', () => {
        const result = runInit(tempDir);

        expect(result.ok).toBe(true);
        expect(existsSync(join(tempDir, LEGACY_META_DIR))).toBe(true);
        expect(existsSync(join(tempDir, PRIMARY_TASKS_DIR))).toBe(true);
        expect(existsSync(join(tempDir, LEGACY_DIR))).toBe(true);

        const configPath = join(tempDir, LEGACY_META_DIR, 'config.jsonc');
        const config = JSON.parse(readFileSync(configPath, 'utf-8')) as {
            active_folder: string;
            folders: Record<string, { base_counter: number; label?: string }>;
        };

        expect(config.active_folder).toBe(PRIMARY_TASKS_DIR);
        expect(config.folders[PRIMARY_TASKS_DIR]?.base_counter).toBe(0);
        expect(config.folders[LEGACY_DIR]?.base_counter).toBe(0);
        expect(config.folders[LEGACY_META_DIR]).toBeUndefined();
    });

    test('createTask writes task files into docs/tasks after init', () => {
        const initResult = runInit(tempDir);
        expect(initResult.ok).toBe(true);

        const createResult = createTask(tempDir, 'Folder Layout Check');
        expect(createResult.ok).toBe(true);

        const taskPath = join(tempDir, PRIMARY_TASKS_DIR, '0001_Folder_Layout_Check.md');
        expect(existsSync(taskPath)).toBe(true);
        expect(existsSync(join(tempDir, LEGACY_META_DIR, '0001_Folder_Layout_Check.md'))).toBe(false);

        const content = readFileSync(taskPath, 'utf-8');
        expect(content).toContain('name: Folder Layout Check');
        expect(content).toContain('folder: docs/tasks');
        expect(content).not.toContain('{ {');
    });
});
