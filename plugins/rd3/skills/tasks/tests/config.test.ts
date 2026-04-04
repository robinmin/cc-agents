import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    loadConfig,
    getProjectRoot,
    resolveFolderPath,
    getMetaDir,
    getConfigPath,
    getTemplatePath,
    getLegacyTemplatePath,
    saveConfig,
    LEGACY_META_DIR,
    LEGACY_DIR,
} from '../scripts/lib/config';

describe('getProjectRoot', () => {
    test('returns project root from current directory', () => {
        const root = getProjectRoot();
        expect(root).toBeTruthy();
        // Should contain .claude or docs indicator
        expect(existsSync(join(root, '.claude')) || existsSync(join(root, 'docs'))).toBe(true);
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
    "docs/prompts": {
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
        expect(config.folders['docs/prompts']?.label).toBe('Phase 1');
        expect(config.folders['docs/tasks']?.base_counter).toBe(184);
    });

    test('returns legacy config when no config.jsonc exists', () => {
        const config = loadConfig(tempDir);
        expect(config.active_folder).toBe(LEGACY_DIR);
        expect(config.folders[LEGACY_DIR]).toBeTruthy();
    });

    test('loadConfig handles malformed config.jsonc gracefully', () => {
        const configPath = join(tempDir, LEGACY_META_DIR, 'config.jsonc');
        writeFileSync(configPath, '{ invalid json ');
        // Should fall back to legacy mode
        const config = loadConfig(tempDir);
        expect(config.active_folder).toBe(LEGACY_DIR);
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

describe('getLegacyTemplatePath', () => {
    test('returns resolved legacy template path', () => {
        const legacyPath = getLegacyTemplatePath('/project/root');
        expect(legacyPath).toBe('/project/root/docs/prompts/.template.md');
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
            active_folder: LEGACY_DIR,
            folders: { [LEGACY_DIR]: { base_counter: 0 } },
        };
        const result = saveConfig(config, tempDir);
        expect(result.ok).toBe(true);
        const configPath = join(tempDir, LEGACY_META_DIR, 'config.jsonc');
        const content = readFileSync(configPath, 'utf-8');
        expect(content).toContain('active_folder');
    });

    test('saveConfig returns err on write failure', () => {
        // Write to a path where parent dir does not exist — should fail
        const config = { $schema_version: 1, active_folder: LEGACY_DIR, folders: {} };
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
            expect(root).toBe(projectDir);
        } finally {
            process.cwd = originalCwd;
        }
    });
});
