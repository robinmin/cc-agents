// write-guard command — PreToolUse hook integration
// Reads JSON from stdin: {"tool_name":"Edit","tool_input":{"file_path":"..."}}
// Exit codes: 0=allow, 1=warn, 2=block

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { logger } from '../../../../scripts/logger';
import type { ToolInput } from '../types';

const LEGACY_CONFIG_FILE = 'docs/.tasks/config.jsonc';

// Cached patterns for performance (loaded once per process)
let cachedPatterns: { protected: RegExp[]; exempt: RegExp[] } | null = null;

/**
 * Load protected and exempt patterns from config.jsonc.
 * Always resolves the project root from the script's own location (process.argv[1]),
 * then walks up until it finds docs/.tasks/config.jsonc.
 * Falls back to hardcoded patterns only if config cannot be loaded.
 */
function loadPatterns(): { protected: RegExp[]; exempt: RegExp[] } {
    if (cachedPatterns) {
        return cachedPatterns;
    }

    // Derive plugin root from the script's own path: tasks.ts lives at
    // <plugin-root>/skills/tasks/scripts/tasks.ts
    const scriptPath = process.argv[1] ?? '';
    const pluginRoot = resolve(scriptPath, '../../../../..');

    // Find project root by walking up from plugin root until we find docs/.tasks/config.jsonc
    const configPath = resolve(pluginRoot, LEGACY_CONFIG_FILE);
    let folders: string[] = [];
    let configLoaded = false;

    if (existsSync(configPath)) {
        try {
            const raw = readFileSync(configPath, 'utf-8');
            // Support JSONC comments and trailing commas
            const stripped = raw
                .replace(/\/\/.*$/gm, '')
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/,\s*([}\]])/g, '$1');
            const parsed = JSON.parse(stripped) as {
                folders?: Record<string, unknown>;
            };
            if (parsed.folders) {
                folders = Object.keys(parsed.folders);
                configLoaded = true;
            }
        } catch {
            // config unreadable — fall through to fallback
        }
    }

    if (!configLoaded) {
        // Fallback: cover the three standard folders if config missing
        folders = ['docs/tasks', 'docs/tasks2', 'docs/prompts'];
        logger.warn('[GUARD] Could not load config.jsonc — using folder-based fallback');
    }

    // Build protected patterns from configured folders
    // Protected: blocks direct .md writes directly under each folder
    const protectedPatterns: RegExp[] = folders.map((folder) => {
        const escaped = folder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`^${escaped}/.+.md$`);
    });

    // Exempt: allows subdirectory paths (docs/tasks/<wbs>/<files>) managed by tasks put
    const exemptPatterns: RegExp[] = folders.map((folder) => {
        const escaped = folder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`^${escaped}/\\d{4}/.+$`);
    });

    cachedPatterns = {
        protected: protectedPatterns,
        exempt: exemptPatterns,
    };

    return cachedPatterns;
}


export function checkWriteGuard(
    toolName: string,
    filePath: string,
): { allowed: boolean; code: number; reason?: string } {
    // Only protect Edit and Write tool operations
    if (toolName !== 'Edit' && toolName !== 'Write') {
        return { allowed: true, code: 0 };
    }

    const { protected: protectedPatterns, exempt: exemptPatterns } = loadPatterns();

    // Check exempt patterns first (subdirectories of docs/tasks/<wbs>/)
    for (const pattern of exemptPatterns) {
        if (pattern.test(filePath)) {
            return { allowed: true, code: 0 };
        }
    }

    // Check protected patterns
    for (const pattern of protectedPatterns) {
        if (pattern.test(filePath)) {
            return {
                allowed: false,
                code: 2,
                reason: `Write to ${filePath} is blocked — use 'tasks update' or 'tasks put' instead`,
            };
        }
    }

    return { allowed: true, code: 0 };
}

export function runWriteGuardStdin(): number {
    try {
        const input = readFileSync('/dev/stdin', 'utf-8');
        const toolInput: ToolInput = JSON.parse(input);
        const filePath = (toolInput.tool_input?.file_path as string) || '';
        const toolName = toolInput.tool_name || 'Unknown';

        const result = checkWriteGuard(toolName, filePath);

        if (result.reason) {
            logger.error(`[GUARD] ${result.reason}`);
        }

        return result.code;
    } catch {
        // If we can't parse input, allow by default
        logger.error('[GUARD] Failed to parse stdin input, allowing by default');
        return 0;
    }
}
