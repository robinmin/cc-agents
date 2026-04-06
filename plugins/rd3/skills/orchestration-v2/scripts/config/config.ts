/**
 * orchestration-v2 — Configuration
 *
 * Loads configuration from multiple sources (highest priority first):
 * 1. Environment variables
 * 2. External config file (~/.config/orchestrator/config.yaml)
 * 3. Project-level defaults
 *
 * Config file format: YAML
 * Config file path: ~/.config/orchestrator/config.yaml
 */

import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { spawnSync } from 'node:child_process';
import { DEFAULT_STATE_DIR, DB_FILENAME, CONFIG_DIR_NAME, CONFIG_FILE_NAME, DEFAULT_CHANNEL } from './consts';

// ─── Test injection ────────────────────────────────────────────────────────────
// These are used by tests to redirect config I/O to an isolated fake directory.
// In production these are undefined and the real homedir() / paths are used.

let _testConfigDir: string | undefined;
let _testConfigPath: string | undefined;

/**
 * Override config directory and path for testing.
 * Set both to undefined to restore real behavior.
 */
export function _setTestConfigPath(dir: string, file: string): void {
    _testConfigDir = dir;
    _testConfigPath = file;
}

export function _resetTestConfigPath(): void {
    _testConfigDir = undefined;
    _testConfigPath = undefined;
}

// ─── Process-level config cache ───────────────────────────────────────────────

/** Cache key = resolved absolute project root. Value = resolved config. */
const _cache = new Map<string, OrchestratorConfig>();

/** Flag to ensure LLM CLI initialization runs only once. */
let _llmCliInitialized = false;

/**
 * Detect the full path of the 'pi' agent binary.
 * Returns undefined if not found.
 */
function detectPiPath(): string | undefined {
    try {
        const result = spawnSync('which', ['pi'], { shell: false });
        if (result.status === 0 && result.stdout) {
            const path = result.stdout.toString().trim();
            if (path && existsSync(path)) {
                return path;
            }
        }
    } catch {
        // Fallback: try common paths
    }
    return undefined;
}

/**
 * Initialize LLM_CLI_COMMAND environment variable.
 * If not set, defaults to the 'pi' agent's full path.
 * This is called automatically on first resolveConfig() call.
 */
function ensureLlmCliInitialized(): void {
    if (_llmCliInitialized) {
        return; // Already initialized
    }
    _llmCliInitialized = true;

    if (process.env.LLM_CLI_COMMAND) {
        return; // User already set it, respect their choice
    }

    const piPath = detectPiPath();
    if (piPath) {
        process.env.LLM_CLI_COMMAND = piPath;
    }
}

/**
 * Clear the in-process config cache. Forces the next resolveConfig() to reload from disk.
 */
export function resetConfigCache(): void {
    _cache.clear();
}

export interface OrchestratorConfig {
    /** Directory for workflow state files */
    readonly stateDir: string;
    /** Path to SQLite database file */
    readonly dbPath: string;
    /** Directory for pipeline YAML files */
    readonly pipelineDir: string;
    /** Default execution preset */
    readonly defaultPreset: string;
    /** Default execution channel (from config or DEFAULT_CHANNEL) */
    readonly defaultChannel: string;
    /** Registered and enabled execution channels */
    readonly executorChannels: readonly string[];
}

export interface ExternalConfig {
    readonly state_dir?: string;
    readonly pipeline_dir?: string;
    readonly default_preset?: string;
    readonly default_channel?: string;
    readonly db_path?: string;
    /** Registered and enabled executor channels. Defaults to [DEFAULT_CHANNEL]. */
    readonly executor_channels?: readonly string[];
}

function getConfigDir(): string {
    return _testConfigDir ?? join(homedir(), CONFIG_DIR_NAME, 'orchestrator');
}

function getConfigPath(): string {
    return _testConfigPath ?? join(getConfigDir(), CONFIG_FILE_NAME);
}

/**
 * Check if the global config file exists.
 */
export function globalConfigExists(): boolean {
    return existsSync(getConfigPath());
}

/**
 * Load external config from ~/.config/orchestrator/config.yaml.
 * Returns null if file doesn't exist or is unreadable.
 */
export function loadExternalConfig(): ExternalConfig | null {
    const path = getConfigPath();
    if (!existsSync(path)) {
        return null;
    }

    try {
        const content = readFileSync(path, 'utf-8');
        const parsed = parseYaml(content);
        if (typeof parsed === 'object' && parsed !== null) {
            return parsed as ExternalConfig;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Create the global config directory and a default config file.
 */
export function createDefaultConfig(): void {
    const dir = getConfigDir();
    const path = getConfigPath();

    if (existsSync(path)) {
        return; // Idempotent — do not overwrite existing config
    }
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }

    const content = [
        `# orchestrator global config`,
        `# ~/.config/orchestrator/config.yaml`,
        ``,
        `# Default execution channel`,
        `default_channel: ${DEFAULT_CHANNEL}`,
        ``,
        `# Registered executor channels (acpx agent registry names)`,
        `executor_channels:`,
        `  - ${DEFAULT_CHANNEL}`,
        ``,
    ].join('\n');

    Bun.write(path, content);
}

/**
 * Get the path to the global config file.
 */
export function getGlobalConfigPath(): string {
    return getConfigPath();
}

/**
 * Get the directory containing the global config file.
 */
export function getGlobalConfigDir(): string {
    return getConfigDir();
}

/**
 * Resolve the final configuration by merging sources.
 * Results are cached in-process — the config file is read once per process.
 *
 * Priority (highest to lowest):
 * 1. Environment variables
 * 2. External config file (~/.config/orchestrator/config.yaml)
 * 3. Project-level defaults
 *
 * Caching: the resolved config is memoized per projectRoot. The first call
 * for each distinct projectRoot value populates the cache. Subsequent calls with the
 * same projectRoot return the cached value. Use resetConfigCache() to clear the cache.
 */
export function resolveConfig(projectRoot?: string): OrchestratorConfig {
    // Ensure LLM_CLI_COMMAND is initialized before any phase execution
    ensureLlmCliInitialized();

    const project = resolve(projectRoot ?? process.cwd());
    const cached = _cache.get(project);
    if (cached !== undefined) {
        return cached;
    }
    const config = resolveUncached(project);
    _cache.set(project, config);
    return config;
}

function resolveUncached(project: string): OrchestratorConfig {
    const defaults: OrchestratorConfig = {
        stateDir: resolve(project, DEFAULT_STATE_DIR),
        dbPath: resolve(project, DEFAULT_STATE_DIR, DB_FILENAME),
        pipelineDir: resolve(project, 'docs', '.workflows'),
        defaultPreset: 'standard',
        defaultChannel: DEFAULT_CHANNEL,
        executorChannels: [DEFAULT_CHANNEL],
    };

    const external = loadExternalConfig();
    if (!external) {
        return defaults;
    }

    const stateDir = external.state_dir
        ? external.state_dir.startsWith('/')
            ? external.state_dir
            : resolve(project, external.state_dir)
        : defaults.stateDir;

    const channels = external.executor_channels?.length
        ? external.executor_channels
        : [DEFAULT_CHANNEL];

    const defaultChannel = external.default_channel ?? defaults.defaultChannel;

    const resolvedChannel = channels.includes(defaultChannel)
        ? defaultChannel
        : channels[0] ?? DEFAULT_CHANNEL;

    return {
        stateDir,
        dbPath: external.db_path
            ? external.db_path.startsWith('/')
                ? external.db_path
                : resolve(project, external.db_path)
            : resolve(stateDir, DB_FILENAME),
        pipelineDir: external.pipeline_dir
            ? external.pipeline_dir.startsWith('/')
                ? external.pipeline_dir
                : resolve(project, external.pipeline_dir)
            : defaults.pipelineDir,
        defaultPreset: external.default_preset ?? defaults.defaultPreset,
        defaultChannel: resolvedChannel,
        executorChannels: channels,
    };
}
