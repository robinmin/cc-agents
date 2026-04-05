/**
 * orchestration-v2 — Time Utilities
 *
 * Common time and duration parsing utilities.
 */

/**
 * Parse a duration string into milliseconds.
 *
 * @example
 * parseDuration('30m')  // 1800000
 * parseDuration('1h')   // 3600000
 * parseDuration('60s')   // 60000
 * parseDuration('1')    // 60000 (defaults to minutes)
 */
export function parseDuration(duration: string | undefined): number {
    if (!duration) {
        return 30 * 60 * 1000; // Default 30 minutes
    }

    const match = duration.match(/^(\d+)(m|h|s)?$/);
    if (!match) {
        return 30 * 60 * 1000;
    }

    const value = Number.parseInt(match[1], 10);
    const unit = match[2] ?? 'm'; // Default to minutes

    switch (unit) {
        case 'h':
            return value * 60 * 60 * 1000;
        case 's':
            return value * 1000;
        default:
            return value * 60 * 1000;
    }
}

/**
 * Format milliseconds as a human-readable duration.
 */
export function formatDuration(ms: number): string {
    if (ms < 1000) {
        return `${ms}ms`;
    }

    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
        return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
        return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes > 0) {
        return `${hours}h ${remainingMinutes}m`;
    }
    return `${hours}h`;
}

/**
 * Check if a timestamp is older than a given duration.
 */
export function isOlderThan(timestamp: Date, durationMs: number): boolean {
    return Date.now() - timestamp.getTime() > durationMs;
}
