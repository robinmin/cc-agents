import { describe, test, expect } from 'bun:test';
import { parseSkillName, resolveSkillScript, skillHasScript } from '../scripts/utils/skill-resolver';

describe('parseSkillName', () => {
    test('parses valid skill name with colon', () => {
        expect(parseSkillName('rd3:request-intake')).toEqual({
            namespace: 'rd3',
            name: 'request-intake',
        });
        expect(parseSkillName('wt:image-generator')).toEqual({
            namespace: 'wt',
            name: 'image-generator',
        });
    });

    test('returns null for skill names without colon', () => {
        expect(parseSkillName('request-intake')).toBeNull();
        expect(parseSkillName('rd3request-intake')).toBeNull();
    });

    test('returns null for empty or malformed names', () => {
        expect(parseSkillName(':request-intake')).toBeNull();
        expect(parseSkillName('rd3:')).toBeNull();
        expect(parseSkillName('')).toBeNull();
    });
});

describe('resolveSkillScript', () => {
    test('resolves orchestration-v2 skill to scripts/run.ts', () => {
        const path = resolveSkillScript('rd3:orchestration-v2');
        expect(path).toContain('plugins/rd3/skills/orchestration-v2/scripts/run.ts');
    });

    test('resolves orchestration-v1 skill to scripts/run.ts', () => {
        const path = resolveSkillScript('rd3:orchestration-v1');
        expect(path).toContain('plugins/rd3/skills/orchestration-v1/scripts/run.ts');
    });

    test('returns undefined for markdown-only skills', () => {
        expect(resolveSkillScript('rd3:request-intake')).toBeUndefined();
        expect(resolveSkillScript('rd3:code-implement-common')).toBeUndefined();
        expect(resolveSkillScript('wt:image-generator')).toBeUndefined();
    });

    test('returns undefined for invalid skill names', () => {
        expect(resolveSkillScript('request-intake')).toBeUndefined();
        expect(resolveSkillScript('rd3')).toBeUndefined();
        expect(resolveSkillScript('')).toBeUndefined();
    });
});

describe('skillHasScript', () => {
    test('returns true for skills with scripts/run.ts', () => {
        expect(skillHasScript('rd3:orchestration-v2')).toBe(true);
        expect(skillHasScript('rd3:orchestration-v1')).toBe(true);
    });

    test('returns false for markdown-only skills', () => {
        expect(skillHasScript('rd3:request-intake')).toBe(false);
        expect(skillHasScript('rd3:sys-testing')).toBe(false);
    });
});
