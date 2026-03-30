import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SKILL_ROOT = join(import.meta.dir, '..', 'skills', 'token-saver');

function readSkillFile(relativePath: string): string {
    return readFileSync(join(SKILL_ROOT, relativePath), 'utf-8');
}

describe('token-saver skill docs', () => {
    it('has required directory structure', () => {
        expect(existsSync(join(SKILL_ROOT, 'SKILL.md'))).toBe(true);
        expect(existsSync(join(SKILL_ROOT, 'references', 'commands.md'))).toBe(true);
    });

    it('has valid SKILL.md frontmatter with required fields', () => {
        const content = readSkillFile('SKILL.md');
        const frontmatter = content.split('---')[1] ?? '';

        expect(frontmatter).toContain('name: token-saver');
        expect(frontmatter).toContain('description:');
        expect(frontmatter).toContain('version:');
        expect(frontmatter).toContain('platforms:');
        expect(frontmatter).toContain('interactions:');
        expect(frontmatter).toContain('trigger_keywords:');
    });

    it('lists required platforms in SKILL.md', () => {
        const content = readSkillFile('SKILL.md');
        for (const platform of ['claude-code', 'codex', 'opencode']) {
            expect(content).toContain(platform);
        }
    });

    it('includes trigger keywords for RTK discovery', () => {
        const content = readSkillFile('SKILL.md');
        const frontmatter = content.split('---')[1] ?? '';

        for (const keyword of ['rtk', 'token optimization', 'token savings']) {
            expect(frontmatter).toContain(keyword);
        }
    });

    it('has commands.md with see_also pointing to rd3:token-saver', () => {
        const content = readSkillFile('references/commands.md');
        expect(content).toContain('rd3:token-saver');
    });

    it('documents at least 5 command categories in commands.md', () => {
        const content = readSkillFile('references/commands.md');
        const headings = content.match(/^## \w/gm) ?? [];
        expect(headings.length).toBeGreaterThanOrEqual(5);
    });

    it('does not contain duplicate overview paragraph', () => {
        const content = readSkillFile('SKILL.md');
        const matches = content.match(/RTK transparently intercepts Bash commands/g) ?? [];
        expect(matches.length).toBe(1);
    });
});
