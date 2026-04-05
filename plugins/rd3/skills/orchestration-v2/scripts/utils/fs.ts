/**
 * orchestration-v2 — File System Utilities
 *
 * Common file system operations and helpers.
 */

import { existsSync, statSync, mkdirSync } from 'node:fs';

/**
 * Check if a path is a file (exists and is not a directory).
 */
export function isFile(path: string): boolean {
    try {
        const stats = statSync(path);
        return stats !== undefined && !stats.isDirectory();
    } catch {
        return false;
    }
}

/**
 * Check if a path is a directory (exists and is a directory).
 */
export function isDirectory(path: string): boolean {
    try {
        return statSync(path)?.isDirectory() ?? false;
    } catch {
        return false;
    }
}

/**
 * Ensure a directory exists, creating it if necessary.
 */
export function ensureDirectory(path: string): void {
    if (!existsSync(path)) {
        mkdirSync(path, { recursive: true });
    }
}

/**
 * Get the size of a file in bytes.
 */
export function getFileSize(path: string): number {
    try {
        const stats = statSync(path);
        return stats?.size ?? 0;
    } catch {
        return 0;
    }
}

/**
 * Check if a file is empty (size === 0).
 */
export function isEmptyFile(path: string): boolean {
    return getFileSize(path) === 0;
}
