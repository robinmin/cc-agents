/**
 * Tests for config module
 *
 * Tests configuration utilities with JSONC parsing and caching
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  expandTilde,
  getDefaultConfigDir,
  getDefaultConfigPath,
  parseJsonc,
  readJsoncFile,
  getPlatformConfig,
  getWtConfig,
  getConfigValue,
  getStringConfig,
  getBooleanConfig,
  getNumberConfig,
  getArrayConfig,
  validateConfig,
  clearConfigCache,
  clearPlatformCache,
  PlatformConfig,
  ConfigValidationRule,
} from '../src/config.js';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

describe('config', () => {
  let tempDir: string;
  let originalEnv: Record<string, string | undefined>;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `wt-config-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    originalEnv = { ...process.env };
    delete process.env.XDG_CONFIG_HOME;
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}

    // Restore environment variables properly
    // First, delete any keys that weren't in originalEnv
    for (const key of Object.keys(process.env)) {
      if (!Object.prototype.hasOwnProperty.call(originalEnv, key)) {
        delete process.env[key];
      }
    }
    // Then restore original keys
    for (const key of Object.keys(originalEnv)) {
      if (originalEnv[key] !== undefined) {
        process.env[key] = originalEnv[key];
      } else {
        delete process.env[key];
      }
    }
    clearConfigCache();
  });

  describe('expandTilde', () => {
    it('should expand tilde to home directory', () => {
      const result = expandTilde('~/test/path');
      expect(result).toBe(path.join(os.homedir(), 'test/path'));
    });

    it('should not expand paths without tilde', () => {
      const result = expandTilde('/absolute/path');
      expect(result).toBe('/absolute/path');
    });

    it('should not expand tilde in middle of path', () => {
      const result = expandTilde('/path/~test/mid');
      expect(result).toBe('/path/~test/mid');
    });

    it('should handle just tilde', () => {
      const result = expandTilde('~');
      expect(result).toBe(os.homedir());
    });

    it('should handle empty string', () => {
      expect(expandTilde('')).toBe('');
    });
  });

  describe('getDefaultConfigDir', () => {
    it('should use XDG_CONFIG_HOME when set', () => {
      // Clear any existing XDG_CONFIG_HOME and set new value
      delete process.env.XDG_CONFIG_HOME;
      const customDir = '/custom/config';
      process.env.XDG_CONFIG_HOME = customDir;

      expect(getDefaultConfigDir()).toBe(path.join(customDir, 'wt'));
    });

    it('should use .config when XDG_CONFIG_HOME is not set', () => {
      delete process.env.XDG_CONFIG_HOME;

      expect(getDefaultConfigDir()).toBe(path.join(os.homedir(), '.config', 'wt'));
    });
  });

  describe('getDefaultConfigPath', () => {
    it('should return legacy path if it exists', async () => {
      const legacyPath = path.join(os.homedir(), '.claude', 'wt', 'config.jsonc');
      const legacyDir = path.dirname(legacyPath);

      // Create legacy directory structure
      await fs.mkdir(legacyDir, { recursive: true });
      await fs.writeFile(legacyPath, '{}');

      const result = getDefaultConfigPath();
      expect(result).toBe(legacyPath);

      // Cleanup
      await fs.unlink(legacyPath);
      // Only remove the directories we created, use recursive for safety
      try {
        await fs.rm(legacyDir, { recursive: true, force: true });
      } catch {}
    });

    it('should return XDG path when legacy does not exist', () => {
      delete process.env.XDG_CONFIG_HOME;

      const expected = path.join(os.homedir(), '.config', 'wt', 'config.jsonc');
      expect(getDefaultConfigPath()).toBe(expected);
    });
  });

  describe('parseJsonc', () => {
    it('should parse valid JSON', () => {
      const result = parseJsonc('{"key": "value"}');
      expect(result).toEqual({ key: 'value' });
    });

    it('should remove single-line comments', () => {
      const result = parseJsonc('{"key": "value" // comment\n}');
      expect(result).toEqual({ key: 'value' });
    });

    it('should remove multi-line comments', () => {
      const result = parseJsonc('{"key": "value" /* comment */}');
      expect(result).toEqual({ key: 'value' });
    });

    it('should remove trailing commas', () => {
      const result = parseJsonc('{"key": "value",}');
      expect(result).toEqual({ key: 'value' });
    });

    it('should handle JSON with all features', () => {
      const jsonc = `
        // Configuration file
        {
          /* Multi-line comment */
          "name": "test",
          "values": [1, 2, 3], // trailing comment
        }
      `;
      const result = parseJsonc(jsonc);
      expect(result).toEqual({
        name: 'test',
        values: [1, 2, 3],
      });
    });

    it('should throw error for invalid JSON', () => {
      expect(() => parseJsonc('{invalid json}')).toThrow('Failed to parse config JSON');
    });

    it('should parse empty object', () => {
      expect(parseJsonc('{}')).toEqual({});
    });

    it('should parse complex nested structure', () => {
      const result = parseJsonc('{"a": {"b": {"c": 1}}}');
      expect(result).toEqual({ a: { b: { c: 1 } } });
    });
  });

  describe('readJsoncFile', () => {
    it('should read and parse JSONC file', async () => {
      const filePath = path.join(tempDir, 'config.jsonc');
      await fs.writeFile(filePath, '{"key": "value"}');

      const result = readJsoncFile(filePath);
      expect(result).toEqual({ key: 'value' });
    });

    it('should expand tilde in path', async () => {
      const fileName = 'config.jsonc';
      const expandedPath = expandTilde(`~/${fileName}`);
      const actualPath = path.join(os.homedir(), fileName);

      await fs.writeFile(actualPath, '{"test": true}');

      const result = readJsoncFile(`~/${fileName}`);
      expect(result).toEqual({ test: true });

      await fs.unlink(actualPath);
    });

    it('should return empty object for non-existent file', () => {
      const result = readJsoncFile(path.join(tempDir, 'nonexistent.jsonc'));
      expect(result).toEqual({});
    });

    it('should throw parse error for invalid JSONC', async () => {
      const filePath = path.join(tempDir, 'invalid.jsonc');
      await fs.writeFile(filePath, '{invalid}');

      expect(() => readJsoncFile(filePath)).toThrow();
    });
  });

  describe('getPlatformConfig', () => {
    it('should return empty config for non-existent file', () => {
      clearConfigCache(); // Ensure fresh state
      const config = getPlatformConfig({
        configPath: path.join(tempDir, 'nonexistent.jsonc'),
      });
      expect(config).toEqual({});
    });

    it('should load config from file', async () => {
      clearConfigCache(); // Ensure fresh state
      const filePath = path.join(tempDir, 'config.jsonc');
      await fs.writeFile(filePath, '{"key": "value"}');

      const config = getPlatformConfig({ configPath: filePath });
      expect(config).toEqual({ key: 'value' });
    });

    it('should merge platform-specific config', async () => {
      clearConfigCache(); // Ensure fresh state
      const filePath = path.join(tempDir, 'config.jsonc');
      await fs.writeFile(filePath, JSON.stringify({
        'default-key': 'default-value',
        'my-platform': {
          'platform-key': 'platform-value',
        },
      }, null, 2));

      const config = getPlatformConfig({
        configPath: filePath,
        platform: 'my-platform',
      });

      expect(config['default-key']).toBe('default-value');
      expect(config['platform-key']).toBe('platform-value');
    });

    it('should apply environment variable override', async () => {
      // Clear cache and env var to ensure clean state
      clearConfigCache();
      delete process.env.TEST_OVERRIDE;

      const filePath = path.join(tempDir, 'config.jsonc');
      await fs.writeFile(filePath, '{"fileKey": "fileValue"}');

      // Set env var AFTER file is created to avoid race conditions
      process.env.TEST_OVERRIDE = JSON.stringify({ envKey: 'envValue' });

      const config = getPlatformConfig({
        configPath: filePath,
        envVar: 'TEST_OVERRIDE',
      });

      expect(config['fileKey']).toBe('fileValue');
      expect(config['envKey']).toBe('envValue');

      // Cleanup
      delete process.env.TEST_OVERRIDE;
      clearConfigCache();
    });

    it('should handle non-JSON env var as string value', async () => {
      // Clear cache and env var to ensure clean state
      clearConfigCache();
      delete process.env.TEST_OVERRIDE;

      // Set env var BEFORE calling getPlatformConfig
      process.env.TEST_OVERRIDE = 'string-value';

      const config = getPlatformConfig({
        configPath: path.join(tempDir, 'nonexistent.jsonc'),
        envVar: 'TEST_OVERRIDE',
      });

      expect(config['value']).toBe('string-value');

      // Cleanup
      delete process.env.TEST_OVERRIDE;
      clearConfigCache();
    });

    it('should cache config results', async () => {
      const filePath = path.join(tempDir, 'config.jsonc');
      await fs.writeFile(filePath, '{"key": "value1"}');

      const config1 = getPlatformConfig({ configPath: filePath });
      await fs.writeFile(filePath, '{"key": "value2"}');
      const config2 = getPlatformConfig({ configPath: filePath });

      expect(config1).toEqual({ key: 'value1' });
      expect(config2).toEqual({ key: 'value1' }); // Cached
    });

    it('should respect cache TTL', async () => {
      const filePath = path.join(tempDir, 'config.jsonc');
      await fs.writeFile(filePath, '{"key": "value1"}');

      const config1 = getPlatformConfig({ configPath: filePath, cacheTtlMs: 10 });
      await new Promise(resolve => setTimeout(resolve, 20));
      await fs.writeFile(filePath, '{"key": "value2"}');
      const config2 = getPlatformConfig({ configPath: filePath, cacheTtlMs: 10 });

      expect(config1).toEqual({ key: 'value1' });
      expect(config2).toEqual({ key: 'value2' }); // Cache expired
    });
  });

  describe('getWtConfig', () => {
    it('should get full WT configuration', async () => {
      // Create the wt subdirectory that getDefaultConfigPath expects
      // Use a unique directory to avoid conflicts with other tests
      const uniqueDir = path.join(os.tmpdir(), `wt-getwtconfig-test-${Date.now()}`);
      await fs.mkdir(uniqueDir, { recursive: true });
      const wtDir = path.join(uniqueDir, 'wt');
      await fs.mkdir(wtDir, { recursive: true });
      const filePath = path.join(wtDir, 'config.jsonc');
      await fs.writeFile(filePath, JSON.stringify({
        'platform1': { key: 'value1' },
        'platform2': { key: 'value2' },
      }, null, 2));

      // Clear any existing cache first
      clearConfigCache();

      // Set environment variable BEFORE calling getWtConfig
      // This ensures getDefaultConfigPath will use our custom directory
      process.env.XDG_CONFIG_HOME = uniqueDir;

      // getWtConfig uses getDefaultConfigPath which now should point to uniqueDir/wt/config.jsonc
      const config = getWtConfig();
      expect(config['platform1']).toEqual({ key: 'value1' });
      expect(config['platform2']).toEqual({ key: 'value2' });

      // Cleanup
      delete process.env.XDG_CONFIG_HOME;
      clearConfigCache();
      await fs.rm(uniqueDir, { recursive: true, force: true });
    });
  });

  describe('getConfigValue', () => {
    it('should return value for existing key', async () => {
      clearConfigCache();
      const filePath = path.join(tempDir, 'config.jsonc');
      await fs.writeFile(filePath, '{"key": "value"}');

      const value = getConfigValue('key', 'default', { configPath: filePath });
      expect(value).toBe('value');
    });

    it('should return default for non-existent key', async () => {
      clearConfigCache();
      const filePath = path.join(tempDir, 'config.jsonc');
      await fs.writeFile(filePath, '{}');

      const value = getConfigValue('missing', 'default', { configPath: filePath });
      expect(value).toBe('default');
    });

    it('should return default for null value', async () => {
      clearConfigCache();
      const filePath = path.join(tempDir, 'config.jsonc');
      await fs.writeFile(filePath, '{"key": null}');

      const value = getConfigValue('key', 'default', { configPath: filePath });
      expect(value).toBe('default');
    });

    it('should return default for undefined value', async () => {
      clearConfigCache();
      const filePath = path.join(tempDir, 'config.jsonc');
      await fs.writeFile(filePath, '{"key": null}');

      const value = getConfigValue('key', 'default', { configPath: filePath });
      expect(value).toBe('default');
    });
  });

  describe('getStringConfig', () => {
    it('should convert value to string', async () => {
      const filePath = path.join(tempDir, 'config.jsonc');
      await fs.writeFile(filePath, '{"key": 123}');

      const value = getStringConfig('key', 'default', { configPath: filePath });
      expect(value).toBe('123');
    });
  });

  describe('getBooleanConfig', () => {
    it('should convert truthy values to true', async () => {
      const filePath = path.join(tempDir, 'config.jsonc');
      await fs.writeFile(filePath, '{"key": true}');

      const value = getBooleanConfig('key', false, { configPath: filePath });
      expect(value).toBe(true);
    });

    it('should convert falsy values to false', async () => {
      const filePath = path.join(tempDir, 'config.jsonc');
      await fs.writeFile(filePath, '{"key": false}');

      const value = getBooleanConfig('key', true, { configPath: filePath });
      expect(value).toBe(false);
    });

    it('should return default for missing key', async () => {
      const filePath = path.join(tempDir, 'config.jsonc');
      await fs.writeFile(filePath, '{}');

      const value = getBooleanConfig('missing', true, { configPath: filePath });
      expect(value).toBe(true);
    });
  });

  describe('getNumberConfig', () => {
    it('should return number value', async () => {
      const filePath = path.join(tempDir, 'config.jsonc');
      await fs.writeFile(filePath, '{"key": 42}');

      const value = getNumberConfig('key', 0, { configPath: filePath });
      expect(value).toBe(42);
    });

    it('should convert string to number', async () => {
      const filePath = path.join(tempDir, 'config.jsonc');
      await fs.writeFile(filePath, '{"key": "123"}');

      const value = getNumberConfig('key', 0, { configPath: filePath });
      expect(value).toBe(123);
    });
  });

  describe('getArrayConfig', () => {
    it('should return array value', async () => {
      const filePath = path.join(tempDir, 'config.jsonc');
      await fs.writeFile(filePath, '{"key": [1, 2, 3]}');

      const value = getArrayConfig('key', [], { configPath: filePath });
      expect(value).toEqual([1, 2, 3]);
    });

    it('should return default for non-array value', async () => {
      const filePath = path.join(tempDir, 'config.jsonc');
      await fs.writeFile(filePath, '{"key": "not-an-array"}');

      const value = getArrayConfig('key', [1, 2, 3], { configPath: filePath });
      expect(value).toEqual([1, 2, 3]);
    });

    it('should return default for missing key', async () => {
      const filePath = path.join(tempDir, 'config.jsonc');
      await fs.writeFile(filePath, '{}');

      const value = getArrayConfig('missing', [1, 2], { configPath: filePath });
      expect(value).toEqual([1, 2]);
    });
  });

  describe('validateConfig', () => {
    it('should pass valid config', () => {
      const config = { name: 'test', count: 5, active: true };
      const rules: ConfigValidationRule[] = [
        { key: 'name', required: true, type: 'string' },
        { key: 'count', required: true, type: 'number' },
        { key: 'active', required: true, type: 'boolean' },
      ];

      const result = validateConfig(config, rules);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should fail on missing required key', () => {
      const config = { name: 'test' };
      const rules: ConfigValidationRule[] = [
        { key: 'name', required: true },
        { key: 'missing', required: true },
      ];

      const result = validateConfig(config, rules);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Required config key missing: missing');
    });

    it('should fail on wrong type', () => {
      const config = { count: 'not-a-number' };
      const rules: ConfigValidationRule[] = [
        { key: 'count', type: 'number' },
      ];

      const result = validateConfig(config, rules);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should check array type', () => {
      const config = { items: 'not-an-array' };
      const rules: ConfigValidationRule[] = [
        { key: 'items', type: 'array' },
      ];

      const result = validateConfig(config, rules);
      expect(result.valid).toBe(false);
    });

    it('should check object type', () => {
      const config = { settings: 'not-an-object' };
      const rules: ConfigValidationRule[] = [
        { key: 'settings', type: 'object' },
      ];

      const result = validateConfig(config, rules);
      expect(result.valid).toBe(false);
    });

    it('should use custom validator', () => {
      const config = { value: 15 };
      const rules: ConfigValidationRule[] = [
        { key: 'value', validate: (v) => typeof v === 'number' && v > 10 && v < 20 },
      ];

      const result = validateConfig(config, rules);
      expect(result.valid).toBe(true);
    });

    it('should fail custom validator', () => {
      const config = { value: 25 };
      const rules: ConfigValidationRule[] = [
        { key: 'value', validate: (v) => typeof v === 'number' && v < 20 },
      ];

      const result = validateConfig(config, rules);
      expect(result.valid).toBe(false);
    });

    it('should use custom error message', () => {
      const config = { value: 25 };
      const rules: ConfigValidationRule[] = [
        { key: 'value', type: 'number', validate: (v) => typeof v === 'number' && v < 20, errorMessage: 'Custom error message' },
      ];

      const result = validateConfig(config, rules);
      expect(result.errors).toContain('Custom error message');
    });

    it('should handle NaN for number type', () => {
      const config = { value: NaN };
      const rules: ConfigValidationRule[] = [
        { key: 'value', type: 'number' },
      ];

      const result = validateConfig(config, rules);
      expect(result.valid).toBe(false);
    });
  });

  describe('clearConfigCache', () => {
    it('should clear all cached configs', async () => {
      const filePath = path.join(tempDir, 'config.jsonc');
      await fs.writeFile(filePath, '{"key": "value1"}');

      getPlatformConfig({ configPath: filePath });
      clearConfigCache();

      await fs.writeFile(filePath, '{"key": "value2"}');
      const config = getPlatformConfig({ configPath: filePath });

      expect(config).toEqual({ key: 'value2' });
    });
  });

  describe('clearPlatformCache', () => {
    it('should clear specific platform cache', async () => {
      const filePath = path.join(tempDir, 'config.jsonc');
      await fs.writeFile(filePath, '{"key": "value1"}');

      getPlatformConfig({ configPath: filePath, platform: 'test' });
      clearPlatformCache('test', filePath);

      await fs.writeFile(filePath, '{"key": "value2"}');
      const config = getPlatformConfig({ configPath: filePath, platform: 'test' });

      expect(config).toEqual({ key: 'value2' });
    });
  });
});
