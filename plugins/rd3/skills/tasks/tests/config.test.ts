import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import {
    loadConfig,
    getProjectRoot,
    getStaticDir,
    getUiDir,
    resolveFolderPath,
    resolveActiveFolder,
    getMetaDir,
    getConfigPath,
    getTemplatePath,
    saveConfig,
    resetConfigCache,
    LEGACY_META_DIR,
    PRIMARY_TASKS_DIR,
} from '../scripts/lib/config';
import type { TasksConfig } from '../scripts/types';

describe('getProjectRoot', () => {
    test('returns project root from current directory', () => {
        const root = getProjectRoot();
        expect(root).toBeTruthy();
        // Should contain .claude or docs indicator
        expect(existsSync(join(root, '.claude')) || existsSync(join(root, 'docs'))).toBe(true);
    });

    test('returns temp task root when cwd is inside a temp project with docs/.tasks', () => {
        const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `temp-root-${Date.now()}`);
        const projectDir = join(tempDir, 'project');
        mkdirSync(join(projectDir, LEGACY_META_DIR), { recursive: true });

        const originalCwd = process.cwd;
        process.cwd = () => join(projectDir, 'nested', 'worktree');
        try {
            expect(getProjectRoot()).toBe(projectDir);
        } finally {
            process.cwd = originalCwd;
            rmSync(tempDir, { recursive: true, force: true });
        }
    });

    test('returns cwd when cwd is outside cc-agents with no markers', () => {
        // Create a real temp directory without any markers
        const tempBase = Bun.env.TEMP_DIR ?? '/tmp';
        const externalDir = join(tempBase, `external-no-markers-${Date.now()}`);
        mkdirSync(externalDir, { recursive: true });

        const originalCwd = process.cwd;
        process.cwd = () => externalDir;
        try {
            // When outside cc-agents with no markers, should return cwd (not cc-agents)
            const root = getProjectRoot();
            expect(root).toBe(externalDir);
        } finally {
            process.cwd = originalCwd;
            rmSync(externalDir, { recursive: true, force: true });
        }
    });

    test('falls back to script directory only when cwd IS inside cc-agents', () => {
        // When cwd IS inside cc-agents and has no docs/.tasks, should find cc-agents root
        const ccAgentsRoot = realpathSync(join(import.meta.dir, '../../../../../'));
        const nestedInCcAgents = join(ccAgentsRoot, 'plugins/rd3/skills/tasks');

        const originalCwd = process.cwd;
        process.cwd = () => nestedInCcAgents;
        try {
            // Should find cc-agents via Stage 4 since we're inside cc-agents
            expect(getProjectRoot()).toBe(ccAgentsRoot);
        } finally {
            process.cwd = originalCwd;
        }
    });
});

describe('loadConfig', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `config-test-${Date.now()}`);

    beforeEach(() => {
        mkdirSync(join(tempDir, LEGACY_META_DIR), { recursive: true });
        mkdirSync(join(tempDir, 'docs', 'tasks'), { recursive: true });
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    test('loads config from docs/.tasks/config.jsonc', () => {
        const configPath = join(tempDir, LEGACY_META_DIR, 'config.jsonc');
        writeFileSync(
            configPath,
            `{
  "$schema_version": 1,
  "active_folder": "docs/tasks",
  "folders": {
    "docs/tasks": {
      "base_counter": 0,
      "label": "primary"
    }
  }
}
`,
        );
        const config = loadConfig(tempDir);
        expect(config.active_folder).toBe('docs/tasks');
        expect(config.folders['docs/tasks']).toBeTruthy();
        expect(config.folders['docs/tasks'].label).toBe('primary');
    });

    test('loads JSONC config with comments and trailing commas', () => {
        const configPath = join(tempDir, LEGACY_META_DIR, 'config.jsonc');
        writeFileSync(
            configPath,
            `// managed by tasks
{
  "$schema_version": 1,
  "active_folder": "docs/tasks",
  "folders": {
    "docs/archive": {
      "base_counter": 0,
      "label": "Phase 1",
    },
    "docs/tasks": {
      "base_counter": 184,
      "label": "Phase 2",
    },
  },
}
`,
        );

        const config = loadConfig(tempDir);
        expect(config.active_folder).toBe('docs/tasks');
        expect(config.folders['docs/archive']?.label).toBe('Phase 1');
        expect(config.folders['docs/tasks']?.base_counter).toBe(184);
    });

    test('returns minimal config when no config.jsonc exists', () => {
        const config = loadConfig(tempDir);
        expect(config.active_folder).toBe(PRIMARY_TASKS_DIR);
        expect(config.folders[PRIMARY_TASKS_DIR]).toBeTruthy();
    });

    test('loadConfig handles malformed config.jsonc gracefully', () => {
        const configPath = join(tempDir, LEGACY_META_DIR, 'config.jsonc');
        writeFileSync(configPath, '{ invalid json ');
        // Should fall back to minimal defaults
        const config = loadConfig(tempDir);
        expect(config.active_folder).toBe(PRIMARY_TASKS_DIR);
    });
});

describe('resolveFolderPath', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `resolve-folder-test-${Date.now()}`);

    beforeEach(() => {
        mkdirSync(tempDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    test('resolves active folder relative to project root', () => {
        const config = loadConfig(tempDir);
        const resolved = resolveFolderPath(config, tempDir);
        expect(resolved).toBe(join(tempDir, config.active_folder));
    });

    test('resolves cliFolder override', () => {
        mkdirSync(join(tempDir, 'custom-folder'), { recursive: true });
        const config = loadConfig(tempDir);
        const resolved = resolveFolderPath(config, tempDir, 'custom-folder');
        expect(resolved).toBe(join(tempDir, 'custom-folder'));
    });
});

describe('path helpers', () => {
    test('getStaticDir resolves relative to the tasks scripts directory', () => {
        expect(getStaticDir()).toBe(join(import.meta.dir, '../scripts/static'));
    });

    test('getUiDir resolves relative to the tasks scripts directory', () => {
        expect(getUiDir()).toBe(join(import.meta.dir, '../scripts/server/ui'));
    });
});

describe('resolveActiveFolder', () => {
    test('prefers cli folder override', () => {
        const config: TasksConfig = {
            $schema_version: 1,
            active_folder: 'docs/tasks',
            folders: { 'docs/tasks': { base_counter: 0 } },
        };
        expect(resolveActiveFolder(config, 'docs/archive')).toBe('docs/archive');
    });

    test('falls back to primary folder when config has no active folder', () => {
        const config = {
            $schema_version: 1,
            active_folder: '',
            folders: { 'docs/tasks': { base_counter: 0 } },
        } as TasksConfig;
        expect(resolveActiveFolder(config)).toBe(PRIMARY_TASKS_DIR);
    });
});

describe('getMetaDir', () => {
    test('returns resolved meta dir path', () => {
        const metaDir = getMetaDir('/project/root');
        expect(metaDir).toBe('/project/root/docs/.tasks');
    });
});

describe('getConfigPath', () => {
    test('returns resolved config path', () => {
        const configPath = getConfigPath('/project/root');
        expect(configPath).toBe('/project/root/docs/.tasks/config.jsonc');
    });
});

describe('getTemplatePath', () => {
    test('returns resolved template path', () => {
        const templatePath = getTemplatePath('/project/root');
        expect(templatePath).toBe('/project/root/docs/.tasks/.template.md');
    });
});

describe('saveConfig', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `save-config-test-${Date.now()}`);

    beforeEach(() => {
        mkdirSync(join(tempDir, LEGACY_META_DIR), { recursive: true });
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    test('saves config to config.jsonc', () => {
        const config = {
            $schema_version: 1,
            active_folder: PRIMARY_TASKS_DIR,
            folders: { [PRIMARY_TASKS_DIR]: { base_counter: 0 } },
        };
        const result = saveConfig(config, tempDir);
        expect(result.ok).toBe(true);
        const configPath = join(tempDir, LEGACY_META_DIR, 'config.jsonc');
        const content = readFileSync(configPath, 'utf-8');
        expect(content).toContain('active_folder');
    });

    test('saveConfig returns err on write failure', () => {
        // Write to a path where parent dir does not exist — should fail
        const config = { $schema_version: 1, active_folder: PRIMARY_TASKS_DIR, folders: {} };
        const result = saveConfig(config, '/nonexistent/root');
        expect(result.ok).toBe(false);
    });
});

describe('getProjectRoot - edge cases', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `root-test-${Date.now()}`);

    beforeEach(() => {
        mkdirSync(tempDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    test('returns cwd when in temp directory with no markers', () => {
        const originalCwd = process.cwd;
        process.cwd = () => join(tempDir, 'some-temp-project');
        try {
            const root = getProjectRoot();
            expect(root).toBe(join(tempDir, 'some-temp-project'));
        } finally {
            process.cwd = originalCwd;
        }
    });

    test('falls back to generic repo markers when docs/.tasks not found', () => {
        // Create a temp directory with package.json but no docs/.tasks
        const projectDir = join(tempDir, 'orphan-project');
        mkdirSync(projectDir, { recursive: true });
        writeFileSync(join(projectDir, 'package.json'), '{}');

        const originalCwd = process.cwd;
        process.cwd = () => projectDir;
        try {
            const root = getProjectRoot();
            const realRoot = realpathSync(root);
            const realExpected = realpathSync(projectDir);
            expect(realRoot).toBe(realExpected);
        } finally {
            process.cwd = originalCwd;
        }
    });
});

describe('resetConfigCache', () => {
    test('is a no-op for compatibility', () => {
        expect(() => resetConfigCache()).not.toThrow();
    });
});
