/**
 * Configuration utilities for WT publishing plugins
 *
 * This module provides configuration parsing utilities with support for:
 * - JSONC (JSON with Comments)
 * - Trailing commas
 * - Environment variable fallback
 * - Per-platform configuration
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as process from 'node:process';

// ============================================================================
// Configuration Types
// ============================================================================

export interface PlatformConfig {
  [key: string]: unknown;
}

export interface ConfigOptions {
  /** Config file path (defaults to ~/.claude/wt/config.jsonc) */
  configPath?: string;
  /** Platform name (e.g., 'publish-to-wechatmp') */
  platform?: string;
  /** Environment variable name for config override */
  envVar?: string;
  /** Cache TTL in milliseconds (default: 60000) */
  cacheTtlMs?: number;
}

// ============================================================================
// Config Cache
// ============================================================================

interface ConfigCacheEntry {
  config: PlatformConfig;
  timestamp: number;
}

const configCache = new Map<string, ConfigCacheEntry>();
const DEFAULT_CACHE_TTL_MS = 60000; // 1 minute

// ============================================================================
// Path Utilities
// ============================================================================

/**
 * Expand tilde (~) in file paths to user's home directory
 */
export function expandTilde(filePath: string): string {
  if (filePath === '~') {
    return os.homedir();
  }
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

/**
 * Get default WT config directory
 */
export function getDefaultConfigDir(): string {
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(configHome, 'wt');
}

/**
 * Get default WT config file path
 */
export function getDefaultConfigPath(): string {
  // Check legacy location first (~/.claude/wt/config.jsonc)
  const legacyPath = path.join(os.homedir(), '.claude', 'wt', 'config.jsonc');
  if (fs.existsSync(legacyPath)) {
    return legacyPath;
  }

  // Use XDG standard location
  const configDir = getDefaultConfigDir();
  return path.join(configDir, 'config.jsonc');
}

// ============================================================================
// JSONC Parsing
// ============================================================================

/**
 * Parse JSONC (JSON with Comments and trailing commas)
 */
export function parseJsonc(content: string): PlatformConfig {
  // Remove single-line comments (// ...)
  content = content.replace(/\/\/.*$/gm, '');

  // Remove multi-line comments (/* ... */)
  content = content.replace(/\/\*[\s\S]*?\*\//g, '');

  // Remove trailing commas
  content = content.replace(/,(\s*[}\]])/g, '$1');

  // Parse JSON
  try {
    return JSON.parse(content) as PlatformConfig;
  } catch (error) {
    throw new Error(`Failed to parse config JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Read and parse JSONC file
 */
export function readJsoncFile(filePath: string): PlatformConfig {
  const expandedPath = expandTilde(filePath);

  if (!fs.existsSync(expandedPath)) {
    return {};
  }

  const content = fs.readFileSync(expandedPath, 'utf-8');
  return parseJsonc(content);
}

// ============================================================================
// Configuration Loading
// ============================================================================

/**
 * Get configuration for a specific platform
 */
export function getPlatformConfig(options: ConfigOptions = {}): PlatformConfig {
  const {
    configPath = getDefaultConfigPath(),
    platform,
    envVar,
    cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  } = options;

  const cacheKey = `${configPath}:${platform || 'default'}`;
  const now = Date.now();

  // Check cache
  const cached = configCache.get(cacheKey);
  if (cached && (now - cached.timestamp) < cacheTtlMs) {
    return cached.config;
  }

  // Load config
  let config: PlatformConfig = {};

  // Read file config
  try {
    const fileConfig = readJsoncFile(configPath);
    config = { ...config, ...fileConfig };
  } catch {
    // File doesn't exist or is invalid, use empty config
  }

  // Get platform-specific config
  if (platform && config[platform]) {
    const platformConfig = config[platform] as Record<string, unknown>;
    config = { ...config, ...platformConfig };
  }

  // Apply environment variable override
  if (envVar) {
    const envValue = process.env[envVar];
    if (envValue) {
      try {
        const envConfig = JSON.parse(envValue);
        config = { ...config, ...envConfig };
      } catch {
        // Env var is not JSON, use as string value
        config = { ...config, value: envValue };
      }
    }
  }

  // Cache the result
  configCache.set(cacheKey, { config, timestamp: now });

  return config;
}

/**
 * Get the full WT configuration (all platforms)
 * This is a convenience wrapper for getPlatformConfig() without options.
 * Returns the complete config object from ~/.claude/wt/config.jsonc
 *
 * @example
 * const wtConfig = getWtConfig();
 * const wechatConfig = wtConfig['publish-to-wechatmp'] as WeChatConfig;
 */
export function getWtConfig(): PlatformConfig {
  return getPlatformConfig();
}

/**
 * Get a specific config value with a default fallback
 */
export function getConfigValue<T>(
  key: string,
  defaultValue: T,
  options: ConfigOptions = {}
): T {
  const config = getPlatformConfig(options);
  const value = config[key];

  if (value === undefined || value === null) {
    return defaultValue;
  }

  return value as T;
}

/**
 * Get a string config value
 */
export function getStringConfig(
  key: string,
  defaultValue: string,
  options: ConfigOptions = {}
): string {
  return String(getConfigValue(key, defaultValue, options));
}

/**
 * Get a boolean config value
 */
export function getBooleanConfig(
  key: string,
  defaultValue: boolean,
  options: ConfigOptions = {}
): boolean {
  return Boolean(getConfigValue(key, defaultValue, options));
}

/**
 * Get a number config value
 */
export function getNumberConfig(
  key: string,
  defaultValue: number,
  options: ConfigOptions = {}
): number {
  return Number(getConfigValue(key, defaultValue, options));
}

/**
 * Get an array config value
 */
export function getArrayConfig<T>(
  key: string,
  defaultValue: T[],
  options: ConfigOptions = {}
): T[] {
  const value = getConfigValue(key, defaultValue, options);
  if (!Array.isArray(value)) {
    return defaultValue;
  }
  return value as T[];
}

// ============================================================================
// Config Validation
// ============================================================================

export interface ConfigValidationRule {
  key: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  validate?: (value: unknown) => boolean;
  errorMessage?: string;
}

/**
 * Validate configuration against rules
 */
export function validateConfig(
  config: PlatformConfig,
  rules: ConfigValidationRule[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const rule of rules) {
    const value = config[rule.key];

    // Check required
    if (rule.required && (value === undefined || value === null)) {
      errors.push(`Required config key missing: ${rule.key}`);
      continue;
    }

    // Skip type validation if value is undefined (and not required)
    if (value === undefined || value === null) {
      continue;
    }

    // Check type
    if (rule.type) {
      let typeValid = true;
      switch (rule.type) {
        case 'string':
          typeValid = typeof value === 'string';
          break;
        case 'number':
          typeValid = typeof value === 'number' && !isNaN(value);
          break;
        case 'boolean':
          typeValid = typeof value === 'boolean';
          break;
        case 'array':
          typeValid = Array.isArray(value);
          break;
        case 'object':
          typeValid = typeof value === 'object' && !Array.isArray(value);
          break;
      }

      if (!typeValid) {
        errors.push(rule.errorMessage || `Config key "${rule.key}" must be of type ${rule.type}`);
        continue;
      }
    }

    // Custom validation
    if (rule.validate && !rule.validate(value)) {
      errors.push(rule.errorMessage || `Config key "${rule.key}" failed validation`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear all cached configurations
 */
export function clearConfigCache(): void {
  configCache.clear();
}

/**
 * Clear cached configuration for a specific platform
 */
export function clearPlatformCache(platform: string, configPath?: string): void {
  const path = configPath || getDefaultConfigPath();
  const cacheKey = `${path}:${platform}`;
  configCache.delete(cacheKey);
}

// ============================================================================
// Export default
// ============================================================================

export default {
  getPlatformConfig,
  getConfigValue,
  getStringConfig,
  getBooleanConfig,
  getNumberConfig,
  getArrayConfig,
  validateConfig,
  clearConfigCache,
  clearPlatformCache,
  parseJsonc,
  readJsoncFile,
  getDefaultConfigPath,
  getDefaultConfigDir,
  expandTilde,
};
