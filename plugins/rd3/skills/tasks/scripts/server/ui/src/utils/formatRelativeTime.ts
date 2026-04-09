/**
 * Format a date string as a relative time string.
 * Examples: "2 minutes ago", "3 hours ago", "5 days ago", "2 weeks ago"
 *
 * Edge cases:
 * - Future timestamps: "just now"
 * - >30 days ago: absolute date (YYYY-MM-DD)
 * - Missing/invalid timestamps: "unknown"
 */
export function formatRelativeTime(dateStr: string | undefined | null): string {
    if (!dateStr) return 'unknown';

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'unknown';

    const now = Date.now();
    const diffMs = now - date.getTime();

    // Handle future timestamps
    if (diffMs < 0) return 'just now';

    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);

    // More than 30 days ago -> absolute date
    if (diffDay > 30) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    if (diffWeek >= 1) {
        return `${diffWeek} week${diffWeek === 1 ? '' : 's'} ago`;
    }

    if (diffDay >= 1) {
        return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
    }

    if (diffHour >= 1) {
        return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
    }

    if (diffMin >= 1) {
        return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    }

    return 'just now';
}
