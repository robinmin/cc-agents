import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getEvolutionStoragePaths } from '../../../scripts/evolution-engine';

const TEST_DIR = '/tmp/cc-commands-evolve-test';
const __dirname = dirname(fileURLToPath(import.meta.url));
const EVOLVE_SCRIPT = join(__dirname, '..', 'scripts', 'evolve.ts');

describe('Integration: evolve command', () => {
    beforeEach(() => {
        rmSync(TEST_DIR, { recursive: true, force: true });
        mkdirSync(TEST_DIR, { recursive: true });
    });

    afterEach(() => {
        if (existsSync(TEST_DIR)) {
            rmSync(TEST_DIR, { recursive: true, force: true });
        }
        const storage = getEvolutionStoragePaths('.cc-commands', join(TEST_DIR, 'review-code.md'));
        if (existsSync(storage.rootDir)) {
            rmSync(storage.rootDir, { recursive: true, force: true });
        }
    });

    it('should show help', async () => {
        const proc = Bun.spawn(['bun', 'run', EVOLVE_SCRIPT, '--help'], {
            stdout: 'pipe',
            stderr: 'pipe',
        });

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);
    });

    it('should analyze command evolution signals', async () => {
        const commandPath = join(TEST_DIR, 'review-code.md');
        writeFileSync(
            commandPath,
            `---
description: Review code for placeholder evolution tests
---

# Review Code
`,
            'utf-8',
        );

        const proc = Bun.spawn(['bun', 'run', EVOLVE_SCRIPT, commandPath, '--analyze'], {
            stdout: 'pipe',
            stderr: 'pipe',
        });

        const [exitCode, stdout, stderr] = await Promise.all([
            proc.exited,
            new Response(proc.stdout).text(),
            new Response(proc.stderr).text(),
        ]);

        expect(exitCode).toBe(0);
        expect(`${stdout}\n${stderr}`).toContain('Evolution Analysis');
    });

    it('should apply and rollback a saved proposal', async () => {
        const commandPath = join(TEST_DIR, 'review-code.md');
        writeFileSync(
            commandPath,
            `---
description: This command helps you review code for placeholder evolution tests with an intentionally long description
---

# Review Code

You should use /rd3:command-add before running this command.
`,
            'utf-8',
        );

        const proposeProc = Bun.spawn(['bun', 'run', EVOLVE_SCRIPT, commandPath, '--propose'], {
            stdout: 'pipe',
            stderr: 'pipe',
        });
        const proposeExit = await proposeProc.exited;
        expect(proposeExit).toBe(0);

        const storage = getEvolutionStoragePaths('.cc-commands', commandPath);
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
        const originalContent = readFileSync(commandPath, 'utf-8');

        const applyProc = Bun.spawn(
            ['bun', 'run', EVOLVE_SCRIPT, commandPath, '--apply', firstProposal.id, '--confirm'],
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
        const appliedContent = readFileSync(commandPath, 'utf-8');
        expect(appliedContent).not.toBe(originalContent);

        const historyPath = storage.historyPath;
        expect(existsSync(historyPath)).toBe(true);

        const rollbackProc = Bun.spawn(['bun', 'run', EVOLVE_SCRIPT, commandPath, '--rollback', 'v0', '--confirm'], {
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
        const rolledBackContent = readFileSync(commandPath, 'utf-8');
        expect(rolledBackContent).toBe(originalContent);

        const backupsDir = storage.backupsDir;
        expect(existsSync(backupsDir)).toBe(true);
    });
});
