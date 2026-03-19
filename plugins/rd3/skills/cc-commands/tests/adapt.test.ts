import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DIR = '/tmp/cc-commands-adapt-test';
const __dirname = dirname(fileURLToPath(import.meta.url));
const ADAPT_SCRIPT = join(__dirname, '..', 'scripts', 'adapt.ts');

describe('Integration: adapt command', () => {
    beforeEach(() => {
        rmSync(TEST_DIR, { recursive: true, force: true });
        mkdirSync(TEST_DIR, { recursive: true });
    });

    afterEach(() => {
        if (existsSync(TEST_DIR)) {
            rmSync(TEST_DIR, { recursive: true, force: true });
        }
    });

    it('should adapt a single command file path', async () => {
        const commandPath = join(TEST_DIR, 'test-command.md');
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

        const openaiYamlPath = join(TEST_DIR, 'agents', 'openai.yaml');
        expect(existsSync(openaiYamlPath)).toBe(true);
        expect(readFileSync(openaiYamlPath, 'utf-8')).toContain('name: test-command');
    });
});
