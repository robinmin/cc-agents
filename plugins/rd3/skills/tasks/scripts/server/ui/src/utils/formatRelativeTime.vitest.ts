import { describe, it, expect } from 'vitest';
import { formatRelativeTime } from './formatRelativeTime';

describe('formatRelativeTime', () => {
    it('returns "unknown" for undefined', () => {
        expect(formatRelativeTime(undefined)).toBe('unknown');
    });

    it('returns "unknown" for null', () => {
        expect(formatRelativeTime(null)).toBe('unknown');
    });

    it('returns "unknown" for empty string', () => {
        expect(formatRelativeTime('')).toBe('unknown');
    });

    it('returns "unknown" for invalid date string', () => {
        expect(formatRelativeTime('not-a-date')).toBe('unknown');
    });

    it('returns "just now" for future timestamps', () => {
        const future = new Date(Date.now() + 60000).toISOString(); // 1 minute in future
        expect(formatRelativeTime(future)).toBe('just now');
    });

    it('returns "just now" for very recent past', () => {
        const recent = new Date(Date.now() - 5000).toISOString(); // 5 seconds ago
        expect(formatRelativeTime(recent)).toBe('just now');
    });

    it('returns minutes ago for times under an hour', () => {
        const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        expect(formatRelativeTime(thirtyMinAgo)).toBe('30 minutes ago');
    });

    it('handles singular minute', () => {
        const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();
        expect(formatRelativeTime(oneMinAgo)).toBe('1 minute ago');
    });

    it('returns hours ago for times under a day', () => {
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
        expect(formatRelativeTime(threeHoursAgo)).toBe('3 hours ago');
    });

    it('handles singular hour', () => {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        expect(formatRelativeTime(oneHourAgo)).toBe('1 hour ago');
    });

    it('returns days ago for times under a week', () => {
        const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
        expect(formatRelativeTime(fiveDaysAgo)).toBe('5 days ago');
    });

    it('handles singular day', () => {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        expect(formatRelativeTime(oneDayAgo)).toBe('1 day ago');
    });

    it('returns weeks ago for times under 30 days', () => {
        const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        expect(formatRelativeTime(twoWeeksAgo)).toBe('2 weeks ago');
    });

    it('handles singular week', () => {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        expect(formatRelativeTime(oneWeekAgo)).toBe('1 week ago');
    });

    it('returns absolute date for times more than 30 days ago', () => {
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        const formatted = formatRelativeTime(sixtyDaysAgo.toISOString());
        // Should match YYYY-MM-DD format
        expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns absolute date for exactly 31 days ago', () => {
        const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
        const formatted = formatRelativeTime(thirtyOneDaysAgo.toISOString());
        expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('handles date strings with timezone offset', () => {
        const date = '2024-03-15T10:30:00.000Z';
        const result = formatRelativeTime(date);
        // Should not throw and should return a valid string
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });

    it('handles ISO date strings', () => {
        const isoDate = new Date().toISOString();
        const result = formatRelativeTime(isoDate);
        expect(result).toBe('just now');
    });

    it('handles dates at minute boundaries', () => {
        const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        expect(formatRelativeTime(twoMinAgo)).toBe('2 minutes ago');
    });

    it('handles dates at hour boundaries', () => {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
        expect(formatRelativeTime(twoHoursAgo)).toBe('2 hours ago');
    });

    it('handles dates at day boundaries', () => {
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
        expect(formatRelativeTime(twoDaysAgo)).toBe('2 days ago');
    });
});
