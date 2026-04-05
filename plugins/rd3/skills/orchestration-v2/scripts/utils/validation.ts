/**
 * orchestration-v2 — Validation Utilities
 *
 * Common validation functions.
 */

/**
 * Check if a string is a valid WBS number.
 * WBS format: digits optionally followed by name (e.g., "0330", "0330_task")
 */
export function isValidWbs(wbs: string): boolean {
    if (!wbs || typeof wbs !== 'string') {
        return false;
    }

    const match = wbs.match(/^(\d+)(?:[_-].+)?$/);
    if (!match) {
        return false;
    }

    const number = Number.parseInt(match[1], 10);
    return number >= 0 && number <= 9999;
}

/**
 * Check if a string is a valid task reference.
 * Can be a WBS number or a file path.
 */
export function isValidTaskRef(ref: string): boolean {
    if (!ref || typeof ref !== 'string') {
        return false;
    }

    // WBS number
    if (/^\d{3,4}(?:[_-].+)?$/.test(ref)) {
        return true;
    }

    // File path
    if (ref.endsWith('.md') || ref.startsWith('docs/') || ref.startsWith('./')) {
        return true;
    }

    return false;
}

/**
 * Validate a port number.
 */
export function isValidPort(port: number): boolean {
    return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * Validate a coverage threshold.
 */
export function isValidCoverageThreshold(threshold: number): boolean {
    return Number.isFinite(threshold) && threshold >= 0 && threshold <= 100;
}

/**
 * Validate a preset name.
 */
export function isValidPresetName(name: string): boolean {
    if (!name || typeof name !== 'string') {
        return false;
    }

    // Allow alphanumeric, dash, and underscore
    return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name);
}
