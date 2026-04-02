#!/usr/bin/env bun
import { afterEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { applyBestPracticeFixes, extractToReferences } from '../scripts/best-practice-fixes';

const TEMP_DIRS: string[] = [];

afterEach(() => {
    for (const dir of TEMP_DIRS.splice(0)) {
        rmSync(dir, { force: true, recursive: true });
    }
});

function makeTempDir(prefix: string): string {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    TEMP_DIRS.push(dir);
    return dir;
}

function repeatLines(prefix: string, count: number): string {
    return Array.from({ length: count }, (_, index) => `${prefix} ${index + 1}`).join('\n');
}

describe('applyBestPracticeFixes', () => {
    it('applies deterministic text fixes and removals', () => {
        const input = `TODO finish this
TODO: clean this up
I can help you route tasks.
I will help you stay productive.
you can use the workflow.
you should remove stale text.
you need to update the file at C:\\temp\\skill.md
Repeat C:\\temp\\skill.md once more.
/rd3:command-run do the thing
## Commands Reference
Old circular content

---
Tail section`;

        const result = applyBestPracticeFixes(input, {
            entityLabel: 'This agent helps',
            removeCircularRefs: true,
            removeSlashRefs: true,
        });

        expect(result.success).toBe(true);
        expect(result.actions.some((action) => action.includes('TODO marker'))).toBe(true);
        expect(result.actions.some((action) => action.includes('Fixed Windows path'))).toBe(true);
        expect(result.actions).toContain('Removed "Commands Reference" section');
        expect(result.actions).toContain('Removed slash command references');
        expect(result.content).toContain('TODO: FIX ME finish this');
        expect(result.content).toContain('TODO: clean this up');
        expect(result.content).toContain('This agent helps route tasks.');
        expect(result.content).toContain('This agent helps stay productive.');
        expect(result.content).toContain('Use the workflow.');
        expect(result.content).toContain('Do remove stale text.');
        expect(result.content).toContain('You must update the file at C:/temp/skill.md');
        expect(result.content).not.toContain('/rd3:command-run');
        expect(result.content).not.toContain('## Commands Reference');
    });

    it('flags long unstructured content for manual review', () => {
        const input = `Intro paragraph\n\n${'x'.repeat(2100)}`;

        const result = applyBestPracticeFixes(input, {
            entityLabel: 'This skill helps',
        });

        expect(result.actions).toContain(
            'Content may need section headers for progressive disclosure (manual review needed)',
        );
    });

    it('returns clean content unchanged when no fixes apply', () => {
        const input = `# Agent\n\n## Purpose\n\nUse this agent for structured work.`;

        const result = applyBestPracticeFixes(input, {
            entityLabel: 'This agent helps',
        });

        expect(result.actions).toEqual([]);
        expect(result.content).toBe(input);
    });
});

describe('extractToReferences', () => {
    it('returns early when content is below the extraction threshold', () => {
        const result = extractToReferences('/tmp/sample-skill', repeatLines('short', 50), {
            writeFiles: false,
        });

        expect(result.success).toBe(true);
        expect(result.actions).toEqual([]);
    });

    it('extracts a standard reference section and writes a reference file', () => {
        const skillDir = makeTempDir('rd3-best-practice-standard-');
        const content = `---
name: sample-skill
description: "Skill description"
---

# Sample Skill

${repeatLines('intro', 210)}

## Quick Reference
${repeatLines('| row | value |', 12)}

## Usage
${repeatLines('usage', 210)}
`;

        const result = extractToReferences(skillDir, content);
        const refPath = join(skillDir, 'references', 'quick-reference.md');

        expect(result.success).toBe(true);
        expect(result.actions.some((action) => action.includes('Extracted ## Quick Reference'))).toBe(true);
        expect(result.actions.some((action) => action.includes(`Created ${refPath}`))).toBe(true);
        expect(result.content).toContain('See [Quick Reference](references/quick-reference.md) for detailed content.');
        expect(existsSync(refPath)).toBe(true);

        const refContent = readFileSync(refPath, 'utf-8');
        expect(refContent).toContain('see_also:');
        expect(refContent).toContain('- rd3:sample-skill');
        expect(refContent).toContain('# Quick Reference');
        expect(refContent).not.toContain('## Quick Reference');
    });

    it('infers skill name from H1 heading when frontmatter is absent', () => {
        const skillDir = makeTempDir('rd3-best-practice-h1-');
        // No frontmatter name field — H1 heading pattern "rd3 — <name>" should be used
        const content = `# rd3 — h1-derived-skill

## Quick Reference
${repeatLines('| row | value |', 12)}

## Usage
${repeatLines('usage', 410)}
`;
        const result = extractToReferences(skillDir, content);
        expect(result.success).toBe(true);
        const refPath = join(skillDir, 'references', 'quick-reference.md');
        expect(existsSync(refPath)).toBe(true);
        const refContent = readFileSync(refPath, 'utf-8');
        expect(refContent).toContain('- rd3:h1-derived-skill');
    });

    it('skips extraction candidate when section is below minLines threshold', () => {
        const skillDir = makeTempDir('rd3-best-practice-minlines-');
        // ADR has minLines: 20 — make it only 15 lines long
        const shortADR = Array.from({ length: 15 }, (_, i) => `ADR line ${i}`).join('\n');
        const content = `---
name: adr-test
---

# ADR Test

${repeatLines('intro', 380)}

## Architecture Decision Records (ADRs)
${shortADR}

## Usage
${repeatLines('usage', 30)}
`;
        const result = extractToReferences(skillDir, content);
        // ADR section was too short to extract
        expect(result.actions.some((a) => a.includes('Architecture Decision Records'))).toBe(false);
    });

    it('handles generic extraction with no H2 headings gracefully', () => {
        const skillDir = makeTempDir('rd3-best-practice-no-h2-');
        const content = `---
name: no-h2-test
---

# No H2 Test

${repeatLines('flat content', 450)}
`;
        const result = extractToReferences(skillDir, content);
        // No H2 headings => generic extraction returns empty => fallback yields no extractions
        expect(result.success).toBe(false);
    });

    it('sorts generic extraction candidates by size and extracts largest first', () => {
        const skillDir = makeTempDir('rd3-best-practice-sort-');
        // Two sections both >= 30 lines; largest extracted first, may stop before smaller
        const content = `---
name: sort-test
---

# Sort Test

## Small Section
${repeatLines('small', 180)}

## Large Section
${repeatLines('large', 250)}
`;
        const result = extractToReferences(skillDir, content, { writeFiles: false });
        expect(result.success).toBe(true);
        // Largest section is always extracted; smaller one depends on remaining line count
        expect(result.actions.some((a) => a.includes('Extracted ## Large Section'))).toBe(true);
    });

    it('falls back to generic extraction, reports large tables, and supports dry-run file creation', () => {
        const skillDir = makeTempDir('rd3-best-practice-generic-');
        const largeTable = [
            '| col-a | col-b |',
            '| --- | --- |',
            ...Array.from({ length: 12 }, () => '| data | data |'),
        ].join('\n');
        const content = `# rd3 — fallback-skill

## Massive Notes
${largeTable}
${repeatLines('detail line', 430)}
`;

        const result = extractToReferences(skillDir, content, { writeFiles: false });

        expect(result.success).toBe(true);
        expect(result.actions.some((action) => action.includes('Found large table'))).toBe(true);
        expect(result.actions.some((action) => action.includes('Extracted ## Massive Notes'))).toBe(true);
        expect(result.actions.some((action) => action.includes('Would create'))).toBe(true);
        expect(result.content).toContain('See [Massive Notes](references/massive-notes.md) for detailed content.');
        expect(existsSync(join(skillDir, 'references', 'massive-notes.md'))).toBe(false);
    });
});
