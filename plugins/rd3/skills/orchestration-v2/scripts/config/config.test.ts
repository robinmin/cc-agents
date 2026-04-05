import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    _setTestConfigPath,
    _resetTestConfigPath,
    resetConfigCache,
    globalConfigExists,
    loadExternalConfig,
    createDefaultConfig,
    getGlobalConfigPath,
    getGlobalConfigDir,
    resolveConfig,
} from './config';
import { DEFAULT_CHANNEL } from './consts';

const TEST_DIR = '/tmp/orchestrator-config-test';
const TEST_CONFIG_DIR = `${TEST_DIR}/.config/orchestrator`;
const TEST_CONFIG_PATH = `${TEST_CONFIG_DIR}/config.yaml`;

function setupTestDir(): void {
    mkdirSync(TEST_CONFIG_DIR, { recursive: true });
}

function cleanupTestDir(): void {
    rmSync(TEST_DIR, { recursive: true, force: true });
}

beforeEach(() => {
    _resetTestConfigPath();
    resetConfigCache();
    setupTestDir();
});

afterEach(() => {
    _resetTestConfigPath();
    resetConfigCache();
    cleanupTestDir();
});

// ─── Test Injection ────────────────────────────────────────────────────────────

describe('_setTestConfigPath / _resetTestConfigPath', () => {
    test('sets and resets test config path', () => {
        _setTestConfigPath('/fake/dir', '/fake/dir/config.yaml');
        expect(getGlobalConfigPath()).toBe('/fake/dir/config.yaml');
        expect(getGlobalConfigDir()).toBe('/fake/dir');

        _resetTestConfigPath();
        // After reset, should use real paths (but we can't predict them)
        // Just verify it doesn't throw
        expect(() => getGlobalConfigPath()).not.toThrow();
    });
});

// ─── globalConfigExists ────────────────────────────────────────────────────────

describe('globalConfigExists', () => {
    test('returns false when no config file exists', () => {
        _setTestConfigPath(TEST_CONFIG_DIR, TEST_CONFIG_PATH);
        expect(globalConfigExists()).toBe(false);
    });

    test('returns true when config file exists', () => {
        _setTestConfigPath(TEST_CONFIG_DIR, TEST_CONFIG_PATH);
        writeFileSync(TEST_CONFIG_PATH, '# test config');
        expect(globalConfigExists()).toBe(true);
    });
});

// ─── loadExternalConfig ───────────────────────────────────────────────────────

describe('loadExternalConfig', () => {
    test('returns null when no config file exists', () => {
        _setTestConfigPath(TEST_CONFIG_DIR, TEST_CONFIG_PATH);
        expect(loadExternalConfig()).toBeNull();
    });

    test('loads valid YAML config', () => {
        _setTestConfigPath(TEST_CONFIG_DIR, TEST_CONFIG_PATH);
        const yamlContent = `
state_dir: .workflow-state
pipeline_dir: .pipelines
default_preset: custom-preset
default_channel: codex
executor_channels:
  - pi
  - codex
`;
        writeFileSync(TEST_CONFIG_PATH, yamlContent);
        const config = loadExternalConfig();
        expect(config).not.toBeNull();
        expect(config?.state_dir).toBe('.workflow-state');
        expect(config?.pipeline_dir).toBe('.pipelines');
        expect(config?.default_preset).toBe('custom-preset');
        expect(config?.default_channel).toBe('codex');
        expect(config?.executor_channels).toEqual(['pi', 'codex']);
    });

    test('returns null for invalid YAML', () => {
        _setTestConfigPath(TEST_CONFIG_DIR, TEST_CONFIG_PATH);
        writeFileSync(TEST_CONFIG_PATH, 'invalid: yaml: content:');
        expect(loadExternalConfig()).toBeNull();
    });

    test('returns parsed YAML for array content', () => {
        // YAML arrays pass the 'object !== null' check, so they're returned
        _setTestConfigPath(TEST_CONFIG_DIR, TEST_CONFIG_PATH);
        writeFileSync(TEST_CONFIG_PATH, '- item1\n- item2');
        const config = loadExternalConfig();
        expect(Array.isArray(config)).toBe(true);
        expect(config as unknown[]).toEqual(['item1', 'item2']);
    });

    test('handles partial config', () => {
        _setTestConfigPath(TEST_CONFIG_DIR, TEST_CONFIG_PATH);
        writeFileSync(TEST_CONFIG_PATH, 'default_channel: custom');
        const config = loadExternalConfig();
        expect(config).not.toBeNull();
        expect(config?.default_channel).toBe('custom');
        expect(config?.state_dir).toBeUndefined();
    });
});

// ─── createDefaultConfig ──────────────────────────────────────────────────────

describe('createDefaultConfig', () => {
    test('creates config directory and file', () => {
        _setTestConfigPath(TEST_CONFIG_DIR, TEST_CONFIG_PATH);
        createDefaultConfig();

        expect(globalConfigExists()).toBe(true);
        const config = loadExternalConfig();
        expect(config).not.toBeNull();
        expect(config?.default_channel).toBe(DEFAULT_CHANNEL);
        expect(config?.executor_channels).toContain(DEFAULT_CHANNEL);
    });

    test('is idempotent - does not overwrite existing config', () => {
        _setTestConfigPath(TEST_CONFIG_DIR, TEST_CONFIG_PATH);
        const originalContent = 'custom: value\n';
        writeFileSync(TEST_CONFIG_PATH, originalContent);
        createDefaultConfig();

        // Read the file back
        const { readFileSync } = require('node:fs');
        const content = readFileSync(TEST_CONFIG_PATH, 'utf-8');
        expect(content).toContain('custom: value');
        expect(content).not.toContain('custom-preset');
    });
});

// ─── getGlobalConfigPath / getGlobalConfigDir ─────────────────────────────────

describe('getGlobalConfigPath / getGlobalConfigDir', () => {
    test('returns configured paths', () => {
        _setTestConfigPath(TEST_CONFIG_DIR, TEST_CONFIG_PATH);
        expect(getGlobalConfigPath()).toBe(TEST_CONFIG_PATH);
        expect(getGlobalConfigDir()).toBe(TEST_CONFIG_DIR);
    });
});

// ─── resolveConfig ────────────────────────────────────────────────────────────

describe('resolveConfig', () => {
    const projectRoot = '/test/project';

    test('returns defaults when no external config exists', () => {
        _setTestConfigPath(TEST_CONFIG_DIR, TEST_CONFIG_PATH);
        const config = resolveConfig(projectRoot);

        expect(config.stateDir).toBe(resolve(projectRoot, 'docs/.workflow-runs'));
        expect(config.dbPath).toBe(resolve(projectRoot, 'docs/.workflow-runs/state.db'));
        expect(config.pipelineDir).toBe(resolve(projectRoot, 'docs/.workflows'));
        expect(config.defaultPreset).toBe('standard');
        expect(config.defaultChannel).toBe(DEFAULT_CHANNEL);
        expect(config.executorChannels).toEqual([DEFAULT_CHANNEL]);
    });

    test('applies external config values', () => {
        _setTestConfigPath(TEST_CONFIG_DIR, TEST_CONFIG_PATH);
        writeFileSync(
            TEST_CONFIG_PATH,
            `
state_dir: .custom-state
pipeline_dir: .custom-pipelines
default_preset: my-preset
default_channel: codex
executor_channels:
  - pi
  - codex
  - claude
`,
        );
        const config = resolveConfig(projectRoot);

        expect(config.stateDir).toBe(resolve(projectRoot, '.custom-state'));
        expect(config.pipelineDir).toBe(resolve(projectRoot, '.custom-pipelines'));
        expect(config.defaultPreset).toBe('my-preset');
        expect(config.defaultChannel).toBe('codex');
        expect(config.executorChannels).toEqual(['pi', 'codex', 'claude']);
    });

    test('handles absolute paths', () => {
        _setTestConfigPath(TEST_CONFIG_DIR, TEST_CONFIG_PATH);
        writeFileSync(
            TEST_CONFIG_PATH,
            `
state_dir: /absolute/path/to/state
pipeline_dir: /absolute/path/to/pipelines
db_path: /absolute/path/to/db.sqlite
`,
        );
        const config = resolveConfig(projectRoot);

        expect(config.stateDir).toBe('/absolute/path/to/state');
        expect(config.pipelineDir).toBe('/absolute/path/to/pipelines');
        expect(config.dbPath).toBe('/absolute/path/to/db.sqlite');
    });

    test('resolves relative paths relative to project root', () => {
        _setTestConfigPath(TEST_CONFIG_DIR, TEST_CONFIG_PATH);
        writeFileSync(
            TEST_CONFIG_PATH,
            `
state_dir: relative/state
pipeline_dir: relative/pipelines
db_path: relative/db.sqlite
`,
        );
        const config = resolveConfig(projectRoot);

        expect(config.stateDir).toBe(resolve(projectRoot, 'relative/state'));
        expect(config.pipelineDir).toBe(resolve(projectRoot, 'relative/pipelines'));
        expect(config.dbPath).toBe(resolve(projectRoot, 'relative/db.sqlite'));
    });

    test('uses default db_path when not specified', () => {
        _setTestConfigPath(TEST_CONFIG_DIR, TEST_CONFIG_PATH);
        writeFileSync(
            TEST_CONFIG_PATH,
            `
state_dir: .my-state
`,
        );
        const config = resolveConfig(projectRoot);

        expect(config.dbPath).toBe(resolve(projectRoot, '.my-state/state.db'));
    });

    test('defaults db_path to stateDir when state_dir not specified', () => {
        _setTestConfigPath(TEST_CONFIG_DIR, TEST_CONFIG_PATH);
        writeFileSync(
            TEST_CONFIG_PATH,
            `
pipeline_dir: .pipelines
`,
        );
        const config = resolveConfig(projectRoot);

        expect(config.dbPath).toBe(resolve(projectRoot, 'docs/.workflow-runs/state.db'));
    });

    test('caches config per project root', () => {
        _setTestConfigPath(TEST_CONFIG_DIR, TEST_CONFIG_PATH);
        const config1 = resolveConfig('/project-a');
        const config2 = resolveConfig('/project-b');

        // Different projects get different cached configs
        expect(config1).not.toBe(config2);

        // Same project returns cached instance
        const config1Again = resolveConfig('/project-a');
        expect(config1Again).toBe(config1);
    });

    test('resetConfigCache clears the cache', () => {
        _setTestConfigPath(TEST_CONFIG_DIR, TEST_CONFIG_PATH);
        const config1 = resolveConfig(projectRoot);
        resetConfigCache();
        const config2 = resolveConfig(projectRoot);

        // After reset, should be a new object (not same reference)
        expect(config2).not.toBe(config1);
    });

    test('defaults to current working directory when no projectRoot provided', () => {
        _setTestConfigPath(TEST_CONFIG_DIR, TEST_CONFIG_PATH);
        const config = resolveConfig();

        expect(config.stateDir).toContain('docs/.workflow-runs');
        expect(config.dbPath).toContain('state.db');
    });

    test('uses default channel when configured channel not in channels list', () => {
        _setTestConfigPath(TEST_CONFIG_DIR, TEST_CONFIG_PATH);
        writeFileSync(
            TEST_CONFIG_PATH,
            `
default_channel: unknown-channel
executor_channels:
  - pi
  - codex
`,
        );
        const config = resolveConfig(projectRoot);

        // Should fall back to first channel
        expect(config.defaultChannel).toBe('pi');
    });

    test('uses specified default channel when it exists in channels', () => {
        _setTestConfigPath(TEST_CONFIG_DIR, TEST_CONFIG_PATH);
        writeFileSync(
            TEST_CONFIG_PATH,
            `
default_channel: codex
executor_channels:
  - pi
  - codex
`,
        );
        const config = resolveConfig(projectRoot);

        expect(config.defaultChannel).toBe('codex');
    });

    test('handles empty executor_channels array', () => {
        _setTestConfigPath(TEST_CONFIG_DIR, TEST_CONFIG_PATH);
        writeFileSync(
            TEST_CONFIG_PATH,
            `
executor_channels: []
`,
        );
        const config = resolveConfig(projectRoot);

        expect(config.executorChannels).toEqual([DEFAULT_CHANNEL]);
    });

    test('returns config with readonly properties', () => {
        _setTestConfigPath(TEST_CONFIG_DIR, TEST_CONFIG_PATH);
        const config = resolveConfig(projectRoot);

        // TypeScript readonly is compile-time only, but verify the config structure
        expect(typeof config.stateDir).toBe('string');
        expect(typeof config.dbPath).toBe('string');
        expect(typeof config.pipelineDir).toBe('string');
        expect(typeof config.defaultPreset).toBe('string');
        expect(typeof config.defaultChannel).toBe('string');
        expect(Array.isArray(config.executorChannels)).toBe(true);
    });
});

// ─── Edge Cases ────────────────────────────────────────────────────────────────

describe('edge cases', () => {
    test('handles YAML with comments', () => {
        _setTestConfigPath(TEST_CONFIG_DIR, TEST_CONFIG_PATH);
        writeFileSync(
            TEST_CONFIG_PATH,
            `
# This is a comment
state_dir: .state  # inline comment
pipeline_dir: .pipelines
`,
        );
        const config = loadExternalConfig();
        expect(config).not.toBeNull();
        expect(config?.state_dir).toBe('.state');
    });

    test('handles YAML with null values', () => {
        _setTestConfigPath(TEST_CONFIG_DIR, TEST_CONFIG_PATH);
        writeFileSync(
            TEST_CONFIG_PATH,
            `
state_dir: null
pipeline_dir: ~
`,
        );
        const config = loadExternalConfig();
        expect(config).not.toBeNull();
        // YAML null is valid
    });

    test('handles nested config structure', () => {
        _setTestConfigPath(TEST_CONFIG_DIR, TEST_CONFIG_PATH);
        writeFileSync(
            TEST_CONFIG_PATH,
            `
executor_channels:
  - pi
`,
        );
        const config = loadExternalConfig();
        expect(config?.executor_channels).toEqual(['pi']);
    });
});
