/**
 * Integration tests for adapt.ts CLI
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DIR = '/tmp/adapt-integration-test';
const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = join(__dirname, '..', 'scripts');
const ADAPT_SCRIPT = join(SCRIPTS_DIR, 'adapt.ts');

describe('Integration: adapt command', () => {
    beforeEach(() => {
        rmSync(TEST_DIR, { recursive: true, force: true });
    });

    afterEach(() => {
        if (existsSync(TEST_DIR)) {
            rmSync(TEST_DIR, { recursive: true, force: true });
        }
    });

    it('should show help', async () => {
        const proc = Bun.spawn(['bun', 'run', ADAPT_SCRIPT, '--help']);
        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);
    });

    it('should fail without arguments', async () => {
        const proc = Bun.spawn(['bun', 'run', ADAPT_SCRIPT], {
            stderr: 'pipe',
        });
        const exitCode = await proc.exited;
        expect(exitCode).toBe(1);
    });

    it('should fail with invalid target', async () => {
        const proc = Bun.spawn(['bun', 'run', ADAPT_SCRIPT, '/tmp', 'invalid-target'], {
            stderr: 'pipe',
        });
        const exitCode = await proc.exited;
        expect(exitCode).toBe(1);
    });

    it('should fail with nonexistent path', async () => {
        const proc = Bun.spawn(['bun', 'run', ADAPT_SCRIPT, '/tmp/nonexistent-path-12345'], {
            stderr: 'pipe',
        });
        const exitCode = await proc.exited;
        expect(exitCode).toBe(1);
    });

    it('should audit a skill in dry-run mode', async () => {
        // Create a minimal skill directory
        const skillDir = join(TEST_DIR, 'test-skill');
        mkdirSync(skillDir, { recursive: true });
        writeFileSync(
            join(skillDir, 'SKILL.md'),
            `---
name: test-skill
description: A test skill for integration testing of the adapt command
---

# Test Skill

Content here.
`,
            'utf-8',
        );

        const proc = Bun.spawn(
            ['bun', 'run', ADAPT_SCRIPT, TEST_DIR, 'all', '--dry-run', '--component', 'skills'],
            { stdout: 'pipe' },
        );

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);

        // In dry-run mode, no files should be created
        expect(existsSync(join(skillDir, 'agents', 'openai.yaml'))).toBe(false);
    });

    it('should generate codex yaml when adapting for codex', async () => {
        const skillDir = join(TEST_DIR, 'codex-skill');
        mkdirSync(skillDir, { recursive: true });
        writeFileSync(
            join(skillDir, 'SKILL.md'),
            `---
name: codex-skill
description: A skill for testing codex adaptation with enough description length
---

# Codex Skill

Content here.
`,
            'utf-8',
        );

        const proc = Bun.spawn(
            ['bun', 'run', ADAPT_SCRIPT, TEST_DIR, 'codex', '--component', 'skills'],
            { stdout: 'pipe' },
        );

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);

        // Codex yaml should be created
        const yamlPath = join(skillDir, 'agents', 'openai.yaml');
        expect(existsSync(yamlPath)).toBe(true);

        const yamlContent = readFileSync(yamlPath, 'utf-8');
        expect(yamlContent).toContain('name: codex-skill');
        expect(yamlContent).toContain('description:');
    });

    it('should add openclaw metadata when adapting for openclaw', async () => {
        const skillDir = join(TEST_DIR, 'claw-skill');
        mkdirSync(skillDir, { recursive: true });
        writeFileSync(
            join(skillDir, 'SKILL.md'),
            `---
name: claw-skill
description: A skill for testing openclaw adaptation
---

# Claw Skill

Content here.
`,
            'utf-8',
        );

        const proc = Bun.spawn(
            ['bun', 'run', ADAPT_SCRIPT, TEST_DIR, 'openclaw', '--component', 'skills'],
            { stdout: 'pipe' },
        );

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);

        // SKILL.md should now contain openclaw metadata
        const content = readFileSync(join(skillDir, 'SKILL.md'), 'utf-8');
        expect(content).toContain('openclaw:');
        expect(content).toContain('emoji:');
    });

    it('should fix skill name mismatch', async () => {
        const skillDir = join(TEST_DIR, 'my-skill');
        mkdirSync(skillDir, { recursive: true });
        writeFileSync(
            join(skillDir, 'SKILL.md'),
            `---
name: wrong-name
description: A skill with mismatched name for testing fix
---

# My Skill

Content here.
`,
            'utf-8',
        );

        const proc = Bun.spawn(
            ['bun', 'run', ADAPT_SCRIPT, TEST_DIR, 'claude', '--component', 'skills'],
            { stdout: 'pipe' },
        );

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);

        // Name should be fixed to match directory
        const content = readFileSync(join(skillDir, 'SKILL.md'), 'utf-8');
        expect(content).toContain('name: my-skill');
        expect(content).not.toContain('name: wrong-name');
    });

    it('should skip existing codex yaml', async () => {
        const skillDir = join(TEST_DIR, 'existing-skill');
        mkdirSync(join(skillDir, 'agents'), { recursive: true });
        writeFileSync(
            join(skillDir, 'SKILL.md'),
            `---
name: existing-skill
description: A skill with existing codex yaml
---

# Existing Skill
`,
            'utf-8',
        );
        writeFileSync(join(skillDir, 'agents', 'openai.yaml'), 'name: existing\n', 'utf-8');

        const proc = Bun.spawn(
            ['bun', 'run', ADAPT_SCRIPT, TEST_DIR, 'codex', '--component', 'skills'],
            { stdout: 'pipe' },
        );

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);

        // Should not overwrite existing yaml
        const yaml = readFileSync(join(skillDir, 'agents', 'openai.yaml'), 'utf-8');
        expect(yaml).toBe('name: existing\n');
    });
});
