import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getEvolutionStoragePaths } from '../../../scripts/evolution-engine';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVOLVE_SCRIPT = join(__dirname, '..', 'scripts', 'evolve.ts');
let testDir = '';

function createTestDir(): string {
    return mkdtempSync(join(tmpdir(), 'cc-agents-evolve-'));
}

describe('Integration: evolve command', () => {
    beforeEach(() => {
        testDir = createTestDir();
    });

    afterEach(() => {
        if (testDir && existsSync(testDir)) {
            rmSync(testDir, { recursive: true, force: true });
        }
        const storage = getEvolutionStoragePaths('.cc-agents', join(testDir, 'test-agent.md'));
        if (existsSync(storage.rootDir)) {
            rmSync(storage.rootDir, { recursive: true, force: true });
        }
        testDir = '';
    });

    it('should show help', async () => {
        const proc = Bun.spawn(['bun', 'run', EVOLVE_SCRIPT, '--help'], {
            stdout: 'pipe',
            stderr: 'pipe',
        });

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);
    });

    it('should analyze agent evolution signals', async () => {
        const agentPath = join(testDir, 'test-agent.md');
        writeFileSync(
            agentPath,
            `---
name: test-agent
description: Use PROACTIVELY for placeholder evolution tests
---

# Test Agent
`,
            'utf-8',
        );

        const proc = Bun.spawn(['bun', 'run', EVOLVE_SCRIPT, agentPath, '--analyze'], {
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

    it('should generate proposals, apply one, and roll back successfully', async () => {
        const agentPath = join(testDir, 'test-agent.md');
        writeFileSync(
            agentPath,
            `---
name: test-agent
description: helper
---

# Test Agent
`,
            'utf-8',
        );

        const proposeProc = Bun.spawn(['bun', 'run', EVOLVE_SCRIPT, agentPath, '--propose'], {
            stdout: 'pipe',
            stderr: 'pipe',
        });
        const proposeExit = await proposeProc.exited;
        expect(proposeExit).toBe(0);

        const storage = getEvolutionStoragePaths('.cc-agents', agentPath);
        const proposalsPath = storage.proposalsPath;
        expect(existsSync(proposalsPath)).toBe(true);

        const proposalSet = JSON.parse(readFileSync(proposalsPath, 'utf-8')) as {
            proposals: Array<{ id: string; targetSection: string }>;
        };
        expect(proposalSet.proposals.length).toBeGreaterThan(0);
        const selectedProposal =
            proposalSet.proposals.find((proposal) => proposal.targetSection === 'Description Effectiveness') ||
            proposalSet.proposals[0];
        expect(selectedProposal).toBeDefined();
        if (!selectedProposal) {
            throw new Error('Expected at least one proposal');
        }

        const applyProc = Bun.spawn(
            ['bun', 'run', EVOLVE_SCRIPT, agentPath, '--apply', selectedProposal.id, '--confirm'],
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

        const historyPath = storage.historyPath;
        const fallbackHistoryPath = join(storage.rootDir, 'versions', 'test-agent.proposals.history.json');
        expect(existsSync(historyPath) || existsSync(fallbackHistoryPath)).toBe(true);

        const rollbackProc = Bun.spawn(['bun', 'run', EVOLVE_SCRIPT, agentPath, '--rollback', 'v0', '--confirm'], {
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
    });
});
