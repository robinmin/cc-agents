import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ADAPT_SCRIPT = join(__dirname, '..', 'scripts', 'adapt.ts');
let testDir = '';

function createTestDir(): string {
    return mkdtempSync(join(tmpdir(), 'cc-commands-adapt-'));
}

describe('Integration: adapt command', () => {
    beforeEach(() => {
        testDir = createTestDir();
    });

    afterEach(() => {
        if (testDir && existsSync(testDir)) {
            rmSync(testDir, { recursive: true, force: true });
        }
        testDir = '';
    });

    it('should adapt a single command file path', async () => {
        const commandPath = join(testDir, 'test-command.md');
        writeFileSync(
            commandPath,
            `---
description: Adapt a single command file path for regression testing
---

# Test Command

## When to Use

Use this command to verify direct path adaptation.
`,
            'utf-8',
        );

        const proc = Bun.spawn(['bun', 'run', ADAPT_SCRIPT, commandPath, 'codex'], {
            stdout: 'pipe',
            stderr: 'pipe',
        });

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);

        const openaiYamlPath = join(testDir, 'agents', 'openai.yaml');
        expect(existsSync(openaiYamlPath)).toBe(true);
        expect(readFileSync(openaiYamlPath, 'utf-8')).toContain('name: test-command');
    });
});
