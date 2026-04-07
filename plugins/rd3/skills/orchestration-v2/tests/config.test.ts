import { describe, test, expect, afterEach } from 'bun:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync, writeFileSync, existsSync, mkdirSync, mkdtempSync } from 'node:fs';
import {
    resolveConfig,
    resetConfigCache,
    loadExternalConfig,
    globalConfigExists,
    createDefaultConfig,
    _setTestConfigPath,
    _resetTestConfigPath,
} from '../scripts/config/config';
import { DEFAULT_CHANNEL } from '../scripts/config/consts';

let testDir = '';
let testConfigDir = '';
let testConfigPath = '';
let testProject = '';

function setupClean(): void {
    resetConfigCache();
    _resetTestConfigPath();
    if (testDir) {
        rmSync(testDir, { recursive: true, force: true });
    }
    testDir = mkdtempSync(join(tmpdir(), 'cc-agents-config-test-'));
    testConfigDir = join(testDir, '.config', 'orchestrator');
    testConfigPath = join(testConfigDir, 'config.yaml');
    testProject = join(testDir, 'project');
    mkdirSync(testConfigDir, { recursive: true });
    _setTestConfigPath(testConfigDir, testConfigPath);
}

function teardown(): void {
    _resetTestConfigPath();
    resetConfigCache();
    if (testDir) {
        rmSync(testDir, { recursive: true, force: true });
        testDir = '';
        testConfigDir = '';
        testConfigPath = '';
        testProject = '';
    }
}

function writeConfig(content: string): void {
    writeFileSync(testConfigPath, content);
}

describe('config cache', () => {
    afterEach(teardown);

    test('first call caches, subsequent calls return same reference', () => {
        setupClean();
        const first = resolveConfig(testProject);
        const second = resolveConfig(testProject);
        expect(first).toBe(second); // Same reference = cached
    });

    test('resetConfigCache clears all cached entries', () => {
        setupClean();
        const first = resolveConfig(testProject);
        expect(first.defaultChannel).toBe(DEFAULT_CHANNEL);
        resetConfigCache();
        const reloaded = resolveConfig(testProject);
        expect(reloaded.defaultChannel).toBe(DEFAULT_CHANNEL);
    });

    test('different project roots get independent cache entries', () => {
        setupClean();
        const configA = resolveConfig(join(testDir, 'proj-a'));
        const configB = resolveConfig(join(testDir, 'proj-b'));
        expect(configA).not.toBe(configB);
    });
});

describe('loadExternalConfig', () => {
    afterEach(teardown);

    test('returns null when config file does not exist', () => {
        setupClean();
        expect(loadExternalConfig()).toBeNull();
    });

    test('returns null for empty YAML content', () => {
        setupClean();
        writeConfig('');
        expect(loadExternalConfig()).toBeNull();
    });

    test('loads executor_channels from YAML', () => {
        setupClean();
        writeConfig('default_channel: codex\nexecutor_channels:\n  - codex\n  - openclaw\n');
        const cfg = loadExternalConfig();
        expect(cfg?.executor_channels).toEqual(['codex', 'openclaw']);
    });
});

describe('globalConfigExists', () => {
    afterEach(teardown);

    test('returns false when config.yaml is missing', () => {
        setupClean();
        expect(globalConfigExists()).toBe(false);
    });

    test('returns true when config.yaml exists', () => {
        setupClean();
        writeConfig('# empty\n');
        expect(globalConfigExists()).toBe(true);
    });
});

describe('createDefaultConfig', () => {
    afterEach(teardown);

    test('creates YAML file at the test config path', () => {
        setupClean();
        createDefaultConfig();
        expect(existsSync(testConfigPath)).toBe(true);
    });

    test('is idempotent', () => {
        setupClean();
        createDefaultConfig();
        createDefaultConfig(); // no throw
        expect(existsSync(testConfigPath)).toBe(true);
    });

    test('uses DEFAULT_CHANNEL as default executor channel', () => {
        setupClean();
        createDefaultConfig();
        const config = resolveConfig(testProject);
        expect(config.defaultChannel).toBe('pi');
    });
});

describe('resolveConfig defaults', () => {
    afterEach(teardown);

    test('uses pi as default channel', () => {
        setupClean();
        const config = resolveConfig(testProject);
        expect(config.defaultChannel).toBe('pi');
    });

    test('defaultPreset is standard', () => {
        setupClean();
        const config = resolveConfig(testProject);
        expect(config.defaultPreset).toBe('standard');
    });

    test('executorChannels includes DEFAULT_CHANNEL', () => {
        setupClean();
        const config = resolveConfig(testProject);
        expect(config.executorChannels).toContain('pi');
    });

    test('respects default_channel from YAML config', () => {
        setupClean();
        writeConfig('default_channel: codex\nexecutor_channels:\n  - codex\n');
        const config = resolveConfig(testProject);
        expect(config.defaultChannel).toBe('codex');
        expect(config.executorChannels).toContain('codex');
    });
});
