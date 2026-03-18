#!/usr/bin/env bun
import { describe, expect, it } from 'bun:test';
import {
    analyzeBody,
    detectTemplateTier,
    detectWeightProfile,
    isValidAgentName,
    normalizeAgentName,
    parseFrontmatter,
} from '../scripts/utils';

describe('parseFrontmatter', () => {
    it('should parse valid YAML frontmatter', () => {
        const input = '---\nname: test-agent\ndescription: "A test agent"\n---\n\n# Body';
        const result = parseFrontmatter(input);
        expect(result.frontmatter?.name).toBe('test-agent');
        expect(result.frontmatter?.description).toBe('A test agent');
        expect(result.body).toContain('# Body');
    });

    it('should handle missing frontmatter', () => {
        const input = '# No frontmatter here';
        const result = parseFrontmatter(input);
        expect(result.frontmatter).toBeNull();
    });

    it('should detect unknown fields', () => {
        const input = '---\nname: test\nflavor: chocolate\n---\n\nBody';
        const result = parseFrontmatter(input, ['name', 'description']);
        expect(result.unknownFields).toContain('flavor');
    });
});

describe('normalizeAgentName', () => {
    it('should convert to lowercase hyphen-case', () => {
        expect(normalizeAgentName('MyAgent')).toBe('my-agent');
        expect(normalizeAgentName('my_agent')).toBe('my-agent');
        expect(normalizeAgentName('MY AGENT')).toBe('my-agent');
    });

    it('should handle already normalized names', () => {
        expect(normalizeAgentName('my-agent')).toBe('my-agent');
    });
});

describe('isValidAgentName', () => {
    it('should accept valid names', () => {
        expect(isValidAgentName('my-agent')).toBe(true);
        expect(isValidAgentName('code-reviewer')).toBe(true);
        expect(isValidAgentName('a1b')).toBe(true);
    });

    it('should reject invalid names', () => {
        expect(isValidAgentName('a')).toBe(false); // too short (single char)
        expect(isValidAgentName('My-Agent')).toBe(false); // uppercase
        expect(isValidAgentName('my_agent')).toBe(false); // underscore
    });
});

describe('analyzeBody', () => {
    it('should count lines and sections', () => {
        const body = '# Header\n\nSome text\n\n## Section 1\n\nContent\n\n## Section 2\n\nMore content';
        const analysis = analyzeBody(body);
        expect(analysis.lineCount).toBeGreaterThan(0);
        expect(analysis.sections.length).toBeGreaterThanOrEqual(2);
    });
});

describe('detectTemplateTier', () => {
    it('should detect minimal tier for short body', () => {
        const body = '# Agent\n\nShort body.';
        expect(detectTemplateTier(body)).toBe('minimal');
    });

    it('should detect specialist tier for long structured body', () => {
        const sections = Array.from(
            { length: 8 },
            (_, i) => `# ${i + 1}. Section ${i + 1}\n\n${'Content line\n'.repeat(30)}`,
        );
        const body = sections.join('\n');
        expect(detectTemplateTier(body)).toBe('specialist');
    });
});

describe('detectWeightProfile', () => {
    it('should detect thin-wrapper for short body', () => {
        expect(detectWeightProfile('Short body\nRules')).toBe('thin-wrapper');
    });

    it('should detect specialist for long structured body', () => {
        const sections = Array.from({ length: 8 }, (_, i) => `# ${i + 1}. Section\n\n${'Line\n'.repeat(30)}`);
        expect(detectWeightProfile(sections.join('\n'))).toBe('specialist');
    });
});
