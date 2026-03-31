import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getEvolutionStoragePaths } from '../../../scripts/evolution-engine';

let TEST_DIR = '';
const __dirname = dirname(fileURLToPath(import.meta.url));
const EVOLVE_SCRIPT = join(__dirname, '..', 'scripts', 'evolve.ts');

function createTestDir(): string {
    return mkdtempSync(join(tmpdir(), 'cc-skills-evolve-'));
}

describe('Integration: evolve command', () => {
    beforeEach(() => {
        TEST_DIR = createTestDir();
    });

    afterEach(() => {
        if (existsSync(TEST_DIR)) {
            rmSync(TEST_DIR, { recursive: true, force: true });
        }
        const storage = getEvolutionStoragePaths('.cc-skills', join(TEST_DIR, 'test-skill'));
        if (existsSync(storage.rootDir)) {
            rmSync(storage.rootDir, { recursive: true, force: true });
        }
        TEST_DIR = '';
    });

    it('should show help', async () => {
        const proc = Bun.spawn(['bun', 'run', EVOLVE_SCRIPT, '--help'], {
            stdout: 'pipe',
            stderr: 'pipe',
        });

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);
    });

    it('should generate persisted proposals', async () => {
        const skillPath = join(TEST_DIR, 'test-skill');
        mkdirSync(skillPath, { recursive: true });
        writeFileSync(
            join(skillPath, 'SKILL.md'),
            `---
name: test-skill
description: A placeholder skill for evolution tests
---

# Test Skill

## Commands Reference

- /rd3:skill-add
`,
            'utf-8',
        );

        const proc = Bun.spawn(['bun', 'run', EVOLVE_SCRIPT, skillPath, '--propose'], {
            stdout: 'pipe',
            stderr: 'pipe',
        });

        const [exitCode, stdout, stderr] = await Promise.all([
            proc.exited,
            new Response(proc.stdout).text(),
            new Response(proc.stderr).text(),
        ]);

        expect(exitCode).toBe(0);
        expect(`${stdout}\n${stderr}`).toContain('Evolution Proposals');

        const storage = getEvolutionStoragePaths('.cc-skills', skillPath);
        const proposalsPath = storage.proposalsPath;
        expect(existsSync(proposalsPath)).toBe(true);
    });

    it('should apply and rollback a saved proposal', async () => {
        const skillPath = join(TEST_DIR, 'test-skill');
        mkdirSync(skillPath, { recursive: true });
        writeFileSync(
            join(skillPath, 'SKILL.md'),
            `---
name: test-skill
description: A placeholder skill for evolution tests
---

# Test Skill

Use /rd3:skill-add before trying this skill.
`,
            'utf-8',
        );

        const proposeProc = Bun.spawn(['bun', 'run', EVOLVE_SCRIPT, skillPath, '--propose'], {
            stdout: 'pipe',
            stderr: 'pipe',
        });
        const proposeExit = await proposeProc.exited;
        expect(proposeExit).toBe(0);

        const storage = getEvolutionStoragePaths('.cc-skills', skillPath);
        const proposalsPath = storage.proposalsPath;
        const proposalSet = JSON.parse(readFileSync(proposalsPath, 'utf-8')) as {
            proposals: Array<{ id: string }>;
        };
        expect(proposalSet.proposals.length).toBeGreaterThan(0);
        const [firstProposal] = proposalSet.proposals;
        expect(firstProposal).toBeDefined();
        if (!firstProposal) {
            throw new Error('Expected at least one proposal');
        }
        const originalContent = readFileSync(join(skillPath, 'SKILL.md'), 'utf-8');

        const applyProc = Bun.spawn(
            ['bun', 'run', EVOLVE_SCRIPT, skillPath, '--apply', firstProposal.id, '--confirm'],
            {
                stdout: 'pipe',
                stderr: 'pipe',
            },
        );
        const [applyExit, applyStdout, applyStderr] = await Promise.all([
            applyProc.exited,
            new Response(applyProc.stdout).text(),
            new Response(applyProc.stderr).text(),
        ]);

        expect(applyExit).toBe(0);
        expect(`${applyStdout}\n${applyStderr}`).toContain('applied successfully');
        const appliedContent = readFileSync(join(skillPath, 'SKILL.md'), 'utf-8');
        expect(appliedContent).not.toBe(originalContent);

        const historyPath = storage.historyPath;
        expect(existsSync(historyPath)).toBe(true);

        const rollbackProc = Bun.spawn(['bun', 'run', EVOLVE_SCRIPT, skillPath, '--rollback', 'v0', '--confirm'], {
            stdout: 'pipe',
            stderr: 'pipe',
        });
        const [rollbackExit, rollbackStdout, rollbackStderr] = await Promise.all([
            rollbackProc.exited,
            new Response(rollbackProc.stdout).text(),
            new Response(rollbackProc.stderr).text(),
        ]);

        expect(rollbackExit).toBe(0);
        expect(`${rollbackStdout}\n${rollbackStderr}`).toContain('Rolled back to v0 successfully');
        const rolledBackContent = readFileSync(join(skillPath, 'SKILL.md'), 'utf-8');
        expect(rolledBackContent).toBe(originalContent);

        const backupsDir = storage.backupsDir;
        expect(existsSync(backupsDir)).toBe(true);
    });
});
