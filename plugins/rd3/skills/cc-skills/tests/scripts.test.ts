/**
 * Unit tests for rd3:cc-skills script functions via CLI
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TEST_DIR = '/tmp/script-integration-test';
const SCRIPTS_DIR = '/Users/robin/projects/cc-agents/plugins/rd3/skills/cc-skills/scripts';

describe('Integration: scaffold command', () => {
    beforeEach(() => {
        rmSync(TEST_DIR, { recursive: true, force: true });
    });

    afterEach(() => {
        if (existsSync(TEST_DIR)) {
            rmSync(TEST_DIR, { recursive: true, force: true });
        }
    });

    it('should scaffold skill with technique template', async () => {
        const { spawn } = await import('bun');

        const proc = spawn([
            'bun',
            'run',
            join(SCRIPTS_DIR, 'scaffold.ts'),
            'technique-test',
            '--path',
            join(TEST_DIR, 'technique-test'),
            '--template',
            'technique',
        ]);

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);
        // scaffold creates skill in a subdirectory named after the skill
        expect(existsSync(join(TEST_DIR, 'technique-test', 'technique-test', 'SKILL.md'))).toBe(true);
    });

    it('should scaffold skill with pattern template', async () => {
        const { spawn } = await import('bun');

        const proc = spawn([
            'bun',
            'run',
            join(SCRIPTS_DIR, 'scaffold.ts'),
            'pattern-test',
            '--path',
            join(TEST_DIR, 'pattern-test'),
            '--template',
            ' pattern',
        ]);

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);
        expect(existsSync(join(TEST_DIR, 'pattern-test', 'pattern-test', 'SKILL.md'))).toBe(true);
    });

    it('should scaffold skill with resources', async () => {
        const { spawn } = await import('bun');

        const proc = spawn([
            'bun',
            'run',
            join(SCRIPTS_DIR, 'scaffold.ts'),
            'resource-test',
            '--path',
            join(TEST_DIR, 'resource-test'),
            '--template',
            'technique',
            '--resources',
            'scripts,references,assets',
        ]);

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);
        expect(existsSync(join(TEST_DIR, 'resource-test', 'resource-test', 'scripts'))).toBe(true);
        expect(existsSync(join(TEST_DIR, 'resource-test', 'resource-test', 'references'))).toBe(true);
        expect(existsSync(join(TEST_DIR, 'resource-test', 'resource-test', 'assets'))).toBe(true);
    });

    it('should scaffold skill with platforms', async () => {
        const { spawn } = await import('bun');

        const proc = spawn([
            'bun',
            'run',
            join(SCRIPTS_DIR, 'scaffold.ts'),
            'platform-test',
            '--path',
            join(TEST_DIR, 'platform-test'),
            '--template',
            'technique',
            '--platform',
            'codex,openclaw',
        ]);

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);
        expect(existsSync(join(TEST_DIR, 'platform-test', 'platform-test', 'agents', 'openai.yaml'))).toBe(true);
    });

    it('should show help', async () => {
        const { spawn } = await import('bun');

        const proc = spawn(['bun', 'run', join(SCRIPTS_DIR, 'scaffold.ts'), '--help']);

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);
    });
});

describe('Integration: validate command', () => {
    beforeEach(() => {
        rmSync(TEST_DIR, { recursive: true, force: true });
    });

    afterEach(() => {
        if (existsSync(TEST_DIR)) {
            rmSync(TEST_DIR, { recursive: true, force: true });
        }
    });

    it('should validate valid skill', async () => {
        const skillPath = join(TEST_DIR, 'valid-skill');
        mkdirSync(skillPath, { recursive: true });
        writeFileSync(
            join(skillPath, 'SKILL.md'),
            `---
name: valid-skill
description: A valid skill for testing
---

# Valid Skill`,
            'utf-8',
        );

        const { spawn } = await import('bun');

        const proc = spawn(['bun', 'run', join(SCRIPTS_DIR, 'validate.ts'), skillPath]);

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);
    });

    it('should fail validation for missing SKILL.md', async () => {
        const skillPath = join(TEST_DIR, 'missing-skill');
        mkdirSync(skillPath, { recursive: true });

        const { spawn } = await import('bun');

        const proc = spawn(['bun', 'run', join(SCRIPTS_DIR, 'validate.ts'), skillPath]);

        const exitCode = await proc.exited;
        expect(exitCode).toBe(1);
    });

    it('should show help', async () => {
        const { spawn } = await import('bun');

        const proc = spawn(['bun', 'run', join(SCRIPTS_DIR, 'validate.ts'), '--help']);

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);
    });
});

describe('Integration: evaluate command', () => {
    beforeEach(() => {
        rmSync(TEST_DIR, { recursive: true, force: true });
    });

    afterEach(() => {
        if (existsSync(TEST_DIR)) {
            rmSync(TEST_DIR, { recursive: true, force: true });
        }
    });

    it('should evaluate skill with full scope', async () => {
        const skillPath = join(TEST_DIR, 'eval-skill');
        mkdirSync(skillPath, { recursive: true });
        writeFileSync(
            join(skillPath, 'SKILL.md'),
            `---
name: eval-skill
description: A skill for evaluation testing with enough content
---

# Eval Skill

## When to Use

Use this when testing evaluation.

## Examples

Example:
\`\`\`bash
echo hello
\`\`\`

## Advanced

Advanced content.`,
            'utf-8',
        );

        const { spawn } = await import('bun');

        const proc = spawn(['bun', 'run', join(SCRIPTS_DIR, 'evaluate.ts'), skillPath, '--scope', 'full']);

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);
    });

    it('should show help', async () => {
        const { spawn } = await import('bun');

        const proc = spawn(['bun', 'run', join(SCRIPTS_DIR, 'evaluate.ts'), '--help']);

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);
    });
});

describe('Integration: refine command', () => {
    beforeEach(() => {
        rmSync(TEST_DIR, { recursive: true, force: true });
    });

    afterEach(() => {
        if (existsSync(TEST_DIR)) {
            rmSync(TEST_DIR, { recursive: true, force: true });
        }
    });

    it('should show help', async () => {
        const { spawn } = await import('bun');

        const proc = spawn(['bun', 'run', join(SCRIPTS_DIR, 'refine.ts'), '--help']);

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);
    });
});

describe('Integration: package command', () => {
    beforeEach(() => {
        rmSync(TEST_DIR, { recursive: true, force: true });
    });

    afterEach(() => {
        if (existsSync(TEST_DIR)) {
            rmSync(TEST_DIR, { recursive: true, force: true });
        }
    });

    it('should package skill', async () => {
        const skillPath = join(TEST_DIR, 'package-skill');
        mkdirSync(skillPath, { recursive: true });
        writeFileSync(
            join(skillPath, 'SKILL.md'),
            `---
name: package-skill
description: A skill for packaging
---

# Package Skill`,
            'utf-8',
        );

        const outputPath = join(TEST_DIR, 'dist');
        const { spawn } = await import('bun');

        const proc = spawn(['bun', 'run', join(SCRIPTS_DIR, 'package.ts'), skillPath, '--output', outputPath]);

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);
        expect(existsSync(join(outputPath, 'SKILL.md'))).toBe(true);
    });

    it('should show help', async () => {
        const { spawn } = await import('bun');

        const proc = spawn(['bun', 'run', join(SCRIPTS_DIR, 'package.ts'), '--help']);

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);
    });
});
