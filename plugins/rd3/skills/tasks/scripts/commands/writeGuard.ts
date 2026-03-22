// write-guard command — PreToolUse hook integration
// Reads JSON from stdin: {"tool_name":"Edit","tool_input":{"file_path":"..."}}
// Exit codes: 0=allow, 1=warn, 2=block

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ToolInput } from '../types';

const LEGACY_META_DIR = 'docs/.tasks';
const LEGACY_CONFIG_FILE = 'docs/.tasks/config.jsonc';

// Cached patterns for performance (loaded once per process)
let cachedPatterns: { protected: RegExp[]; exempt: RegExp[] } | null = null;

/**
 * Load protected and exempt patterns from config dynamically.
 * Uses CLAUDE_PROJECT_DIR env var if available (set by Claude Code hook system).
 */
function loadPatterns(): { protected: RegExp[]; exempt: RegExp[] } {
    if (cachedPatterns) {
        return cachedPatterns;
    }

    // Determine project root
    const projectRoot = process.env.CLAUDE_PROJECT_DIR || findProjectRoot();

    if (!projectRoot) {
        // Fallback to legacy hardcoded patterns if no project root found
        cachedPatterns = {
            protected: [/^docs\/tasks\/.+\.md$/, /^docs\/prompts\/.+\.md$/],
            exempt: [/^docs\/tasks\/\d{4}\/.+$/],
        };
        return cachedPatterns;
    }

    // Load config from docs/.tasks/config.jsonc
    const configPath = resolve(projectRoot, LEGACY_CONFIG_FILE);

    let folders: string[] = [LEGACY_META_DIR.replace('docs/.tasks', 'docs/prompts')]; // legacy fallback

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
            }
        } catch {
            // Use legacy fallback
        }
    }

    // Build protected patterns from configured folders
    const protectedPatterns: RegExp[] = folders.map((folder) => {
        // Escape special regex chars in folder path and build pattern
        // that matches any .md file directly under the folder (not subdirectories)
        const escaped = folder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`^${escaped}/.+.md$`);
    });

    // Exempt patterns: allow subdirectories (e.g., docs/tasks/0089/0089_summary.md)
    // These are managed by 'tasks put' command
    const exemptPatterns: RegExp[] = folders.map((folder) => {
        const escaped = folder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Use double backslash for regex escapes in template literal
        return new RegExp(`^${escaped}/\\d{4}/.+$`);
    });

    cachedPatterns = {
        protected: protectedPatterns,
        exempt: exemptPatterns,
    };

    return cachedPatterns;
}

/**
 * Walk up from cwd to find project root (contains .git or docs/).
 * Falls back to cwd if not found within 10 levels.
 */
function findProjectRoot(): string | null {
    let dir = process.cwd();
    for (let i = 0; i < 10; i++) {
        if (existsSync(resolve(dir, '.git')) || existsSync(resolve(dir, 'docs'))) {
            return dir;
        }
        const parent = resolve(dir, '..');
        if (parent === dir) break;
        dir = parent;
    }
    return null;
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
            console.error(`[GUARD] ${result.reason}`);
        }

        return result.code;
    } catch {
        // If we can't parse input, allow by default
        console.error('[GUARD] Failed to parse stdin input, allowing by default');
        return 0;
    }
}
