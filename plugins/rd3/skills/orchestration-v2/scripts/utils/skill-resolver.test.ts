/**
 * skill-resolver tests
 */

import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseSkillName, skillHasScript, resolveSkillScript, resolveSkillDirectory } from './skill-resolver';

describe('parseSkillName', () => {
    test('parses valid skill name with colon', () => {
        const result = parseSkillName('rd3:request-intake');
        expect(result).toEqual({ namespace: 'rd3', name: 'request-intake' });
    });

    test('parses skill name with underscores and hyphens', () => {
        const result = parseSkillName('wt:image-generator_v2');
        expect(result).toEqual({ namespace: 'wt', name: 'image-generator_v2' });
    });

    test('returns null for missing colon', () => {
        const result = parseSkillName('rd3request-intake');
        expect(result).toBeNull();
    });

    test('returns null for empty namespace', () => {
        const result = parseSkillName(':request-intake');
        expect(result).toBeNull();
    });

    test('returns null for empty name', () => {
        const result = parseSkillName('rd3:');
        expect(result).toBeNull();
    });

    test('returns null for colon at start', () => {
        const result = parseSkillName(':request-intake');
        expect(result).toBeNull();
    });
});

describe('resolveSkillScript', () => {
    test('returns undefined for non-existent skill (cwd-based resolution)', () => {
        // resolveSkillScript uses process.cwd(), so we just verify it doesn't crash
        // and returns undefined for clearly non-existent skills
        const result = resolveSkillScript('rd3:definitely-does-not-exist-12345');
        expect(result).toBeUndefined();
    });

    test('returns undefined for invalid format', () => {
        expect(resolveSkillScript('invalid')).toBeUndefined();
        expect(resolveSkillScript('no-colon')).toBeUndefined();
    });

    test('parseSkillName extracts parts correctly for script resolution', () => {
        const parsed = parseSkillName('rd3:request-intake');
        expect(parsed?.namespace).toBe('rd3');
        expect(parsed?.name).toBe('request-intake');
    });
});

describe('skillHasScript', () => {
    test('returns boolean for any skill reference', () => {
        const result = skillHasScript('rd3:tasks');
        expect(typeof result).toBe('boolean');
    });

    test('returns false for invalid format', () => {
        expect(skillHasScript('invalid')).toBe(false);
    });
});

describe('resolveSkillDirectory', () => {
    const testDir = resolve(import.meta.dir, 'temp-skill-dir-test');

    beforeEach(() => {
        rmSync(testDir, { recursive: true, force: true });
        mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(testDir, { recursive: true, force: true });
    });

    test('returns null for invalid skill reference', () => {
        expect(resolveSkillDirectory('invalid')).toBeNull();
        expect(resolveSkillDirectory('no-colon')).toBeNull();
        expect(resolveSkillDirectory(':empty')).toBeNull();
        expect(resolveSkillDirectory('empty:')).toBeNull();
    });

    test('returns null for non-existent skill', () => {
        const result = resolveSkillDirectory('rd3:non-existent', testDir);
        expect(result).toBeNull();
    });

    test('resolves skill in workspace layout', () => {
        const skillPath = resolve(testDir, 'plugins', 'rd3', 'skills', 'test-skill');
        mkdirSync(skillPath, { recursive: true });

        const result = resolveSkillDirectory('rd3:test-skill', testDir);
        expect(result).toBe(skillPath);
    });

    test('resolves skill in nested plugin layout (rd3/skills/ format)', () => {
        // Create nested structure where plugin name is the directory itself: testDir/rd3/skills/test-skill
        // This is the "plugin root candidate" case where the parent dir matches the plugin name
        const skillPath = resolve(testDir, 'rd3', 'skills', 'test-skill');
        mkdirSync(skillPath, { recursive: true });

        // Start search from the rd3 directory itself (plugin root)
        const pluginRoot = resolve(testDir, 'rd3');
        const result = resolveSkillDirectory('rd3:test-skill', pluginRoot);
        expect(result).toBe(skillPath);
    });

    test('walks up directory tree to find plugin root', () => {
        // Create nested structure with skill in nested plugin
        const skillPath = resolve(testDir, 'plugins', 'rd3', 'skills', 'deep-skill');
        mkdirSync(skillPath, { recursive: true });

        // Start search from a subdirectory
        const subDir = resolve(testDir, 'plugins', 'rd3', 'skills', 'deep-skill', 'scripts');
        mkdirSync(subDir, { recursive: true });

        const result = resolveSkillDirectory('rd3:deep-skill', subDir);
        expect(result).toBe(skillPath);
    });

    test('returns null when walking beyond root', () => {
        // Create a directory structure without proper plugin layout
        const emptyDir = resolve(testDir, 'empty');
        mkdirSync(emptyDir, { recursive: true });

        const result = resolveSkillDirectory('rd3:test', emptyDir);
        expect(result).toBeNull();
    });
});
