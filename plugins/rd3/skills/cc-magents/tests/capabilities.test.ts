import { describe, expect, test } from 'bun:test';
import { getCapability, inferPlatformFromPath, PLATFORM_CAPABILITIES, PLATFORM_IDS } from '../scripts/capabilities';

describe('platform capability registry', () => {
    test('contains verified core platforms', () => {
        expect(PLATFORM_IDS).toContain('codex');
        expect(PLATFORM_IDS).toContain('claude-code');
        expect(PLATFORM_IDS).toContain('gemini-cli');
        expect(PLATFORM_IDS).toContain('opencode');
        expect(getCapability('claude-code').modularity).toContain('native_import');
    });

    test('keeps provisional platforms low confidence', () => {
        expect(PLATFORM_CAPABILITIES.antigravity.confidence).toBe('low');
        expect(PLATFORM_CAPABILITIES.pi.confidence).toBe('low');
    });

    test('infers platform from known file paths', () => {
        expect(inferPlatformFromPath('CLAUDE.md')).toBe('claude-code');
        expect(inferPlatformFromPath('.github/instructions/typescript.instructions.md')).toBe('copilot');
        expect(inferPlatformFromPath('.clinerules/testing.md')).toBe('cline');
        expect(inferPlatformFromPath('SOUL.md')).toBe('openclaw');
    });
});
