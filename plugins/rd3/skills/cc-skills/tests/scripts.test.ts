/**
 * Unit tests for rd3:cc-skills script functions via CLI
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DIR = '/tmp/script-integration-test';
const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = join(__dirname, '..', 'scripts');

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
            'pattern',
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

    it('should scaffold skill with interaction metadata', async () => {
        const { spawn } = await import('bun');

        const proc = spawn([
            'bun',
            'run',
            join(SCRIPTS_DIR, 'scaffold.ts'),
            'interaction-test',
            '--path',
            join(TEST_DIR, 'interaction-test'),
            '--template',
            'technique',
            '--interactions',
            'pipeline,reviewer',
        ]);

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);

        const content = readFileSync(join(TEST_DIR, 'interaction-test', 'interaction-test', 'SKILL.md'), 'utf-8');
        expect(content).toContain('interactions:');
        expect(content).toContain('- pipeline');
        expect(content).toContain('- reviewer');
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
        const skillContent = readFileSync(join(TEST_DIR, 'platform-test', 'platform-test', 'SKILL.md'), 'utf-8');
        expect(skillContent).toContain('openclaw:');
    });

    it('should tailor next steps for non-codex platforms', async () => {
        const { spawn } = await import('bun');

        const proc = spawn(
            [
                'bun',
                'run',
                join(SCRIPTS_DIR, 'scaffold.ts'),
                'openclaw-test',
                '--path',
                join(TEST_DIR, 'openclaw-test'),
                '--platform',
                'openclaw',
            ],
            {
                stdout: 'pipe',
                stderr: 'pipe',
            },
        );

        const [exitCode, stdout] = await Promise.all([proc.exited, new Response(proc.stdout).text()]);
        expect(exitCode).toBe(0);
        const skillContent = readFileSync(join(TEST_DIR, 'openclaw-test', 'openclaw-test', 'SKILL.md'), 'utf-8');
        expect(skillContent).toContain('openclaw:');
        expect(stdout).not.toContain('agents/openai.yaml');
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

        const proc = spawn(['bun', 'run', join(SCRIPTS_DIR, 'validate.ts'), skillPath], {
            stdout: 'pipe',
            stderr: 'pipe',
        });

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);
    });

    it('should fail validation for missing SKILL.md', async () => {
        const skillPath = join(TEST_DIR, 'missing-skill');
        mkdirSync(skillPath, { recursive: true });

        const { spawn } = await import('bun');

        const proc = spawn(['bun', 'run', join(SCRIPTS_DIR, 'validate.ts'), skillPath], {
            stdout: 'pipe',
            stderr: 'pipe',
        });

        const exitCode = await proc.exited;
        expect(exitCode).toBe(1);
    });

    it('should show help', async () => {
        const { spawn } = await import('bun');

        const proc = spawn(['bun', 'run', join(SCRIPTS_DIR, 'validate.ts'), '--help'], {
            stdout: 'pipe',
            stderr: 'pipe',
        });

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);
    });

    it('should allow knowledge-only workflow skills without scripts warnings', async () => {
        const skillPath = join(TEST_DIR, 'knowledge-workflow-skill');
        mkdirSync(skillPath, { recursive: true });
        writeFileSync(
            join(skillPath, 'SKILL.md'),
            `---
name: knowledge-workflow-skill
description: A knowledge-only workflow skill used to validate workflow-only guidance.
metadata:
  interactions:
    - knowledge-only
  openclaw:
    emoji: "🛠️"
---

# Knowledge Workflow Skill

## When to Use

Use this skill when you need a documented workflow without executable scripts.

## Workflows

1. Capture the symptom.
2. Trace the cause.
3. Verify the fix.
`,
            'utf-8',
        );

        const { spawn } = await import('bun');
        const proc = spawn(['bun', 'run', join(SCRIPTS_DIR, 'validate.ts'), skillPath], {
            stdout: 'pipe',
            stderr: 'pipe',
        });

        const [exitCode, stdout] = await Promise.all([proc.exited, new Response(proc.stdout).text()]);
        expect(exitCode).toBe(0);
        expect(stdout).not.toContain('Skill has workflow but no scripts/ directory');
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

        const proc = spawn(['bun', 'run', join(SCRIPTS_DIR, 'evaluate.ts'), skillPath, '--scope', 'full'], {
            stdout: 'pipe',
            stderr: 'pipe',
        });

        const exitCode = await proc.exited;
        // Exit code 0 = pass, 1 = reject (both valid), only crash codes (>1) are failures
        expect(exitCode).toBeLessThanOrEqual(1);
    });

    it('should report advisory findings for interaction metadata mismatches', async () => {
        const skillPath = join(TEST_DIR, 'interaction-eval-skill');
        mkdirSync(join(skillPath, 'references'), { recursive: true });
        writeFileSync(join(skillPath, 'references', 'rules.md'), '# Rules', 'utf-8');
        writeFileSync(
            join(skillPath, 'SKILL.md'),
            `---
name: interaction-eval-skill
description: Evaluate a skill with interaction metadata checks when reviewing code and applying a checklist.
metadata:
  interactions:
    - reviewer
---

# Interaction Eval Skill

## When to Use

Use this when reviewing code with a checklist.

## Workflow

### Step 1
Load references/review-checklist.md and inspect the code.

### Step 2
Group findings by severity and explain the fixes.
`,
            'utf-8',
        );

        const { spawn } = await import('bun');
        const proc = spawn(['bun', 'run', join(SCRIPTS_DIR, 'evaluate.ts'), skillPath, '--scope', 'full', '--json'], {
            stdout: 'pipe',
            stderr: 'pipe',
        });

        const [exitCode, stdout] = await Promise.all([proc.exited, new Response(proc.stdout).text()]);
        expect(exitCode).toBeLessThanOrEqual(1);

        const report = JSON.parse(stdout) as { dimensions: Array<{ name: string; findings: string[] }> };
        const contentDimension = report.dimensions.find((dimension) => dimension.name === 'Content');
        expect(contentDimension).toBeDefined();
        expect(contentDimension?.findings.join('\n')).toContain(
            'Reviewer interaction declared without severity_levels metadata',
        );
    });

    it('should mark low-quality skills as failed in json output', async () => {
        const skillPath = join(TEST_DIR, 'low-quality-skill');
        mkdirSync(skillPath, { recursive: true });
        writeFileSync(
            join(skillPath, 'SKILL.md'),
            `---
name: low-quality-skill
description: short
---

# Low Quality Skill

TODO
`,
            'utf-8',
        );

        const { spawn } = await import('bun');
        const proc = spawn(['bun', 'run', join(SCRIPTS_DIR, 'evaluate.ts'), skillPath, '--scope', 'full', '--json'], {
            stdout: 'pipe',
            stderr: 'pipe',
        });

        const [exitCode, stdout] = await Promise.all([proc.exited, new Response(proc.stdout).text()]);
        expect(exitCode).toBe(1);

        const report = JSON.parse(stdout) as {
            percentage: number;
            passed: boolean;
            dimensions: Array<{ name: string; percentage?: number; passed?: boolean }>;
        };

        expect(report.percentage).toBeLessThan(70);
        expect(report.passed).toBe(false);
        expect(
            report.dimensions.some(
                (dimension) =>
                    typeof dimension.percentage === 'number' && dimension.percentage < 70 && dimension.passed === false,
            ),
        ).toBe(true);
    });

    it('should show help', async () => {
        const { spawn } = await import('bun');

        const proc = spawn(['bun', 'run', join(SCRIPTS_DIR, 'evaluate.ts'), '--help'], {
            stdout: 'pipe',
            stderr: 'pipe',
        });

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

    it('should preserve valid frontmatter delimiters during migration', async () => {
        const skillPath = join(TEST_DIR, 'legacy-skill');
        mkdirSync(skillPath, { recursive: true });
        writeFileSync(
            join(skillPath, 'SKILL.md'),
            `---
description: legacy skill description long enough for migration testing
---

# legacy-skill

Body.`,
            'utf-8',
        );

        const { spawn } = await import('bun');

        const proc = spawn(['bun', 'run', join(SCRIPTS_DIR, 'refine.ts'), skillPath, '--migrate']);

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);

        const content = readFileSync(join(skillPath, 'SKILL.md'), 'utf-8');
        expect(content).toContain('description: legacy skill description long enough for migration testing\n---');
        expect(content).not.toContain('testing---');
    });

    it('should not create files during dry-run refinement', async () => {
        const skillPath = join(TEST_DIR, 'dry-run-skill');
        mkdirSync(skillPath, { recursive: true });

        const lines = Array.from({ length: 520 }, (_, index) => `filler line ${index + 1}`).join('\n');
        writeFileSync(
            join(skillPath, 'SKILL.md'),
            `---
name: dry-run-skill
description: A dry-run refinement regression test skill with enough content to trigger extraction behavior.
---

# Dry Run Skill

## When to Use

Use this skill when validating dry-run behavior.

## Quick Reference

| Key | Value |
|-----|-------|
| 1 | a |
| 2 | b |
| 3 | c |
| 4 | d |
| 5 | e |
| 6 | f |
| 7 | g |
| 8 | h |
| 9 | i |
| 10 | j |
| 11 | k |
| 12 | l |

${lines}
`,
            'utf-8',
        );

        const original = readFileSync(join(skillPath, 'SKILL.md'), 'utf-8');
        const { spawn } = await import('bun');
        const proc = spawn(['bun', 'run', join(SCRIPTS_DIR, 'refine.ts'), skillPath, '--best-practices', '--dry-run'], {
            env: {
                ...process.env,
                RD3_LOG_QUIET: '0',
            },
            stdout: 'pipe',
            stderr: 'pipe',
        });

        const [exitCode, stdout] = await Promise.all([proc.exited, new Response(proc.stdout).text()]);
        expect(exitCode).toBe(0);
        expect(stdout).toContain('Dry run mode');
        expect(readFileSync(join(skillPath, 'SKILL.md'), 'utf-8')).toBe(original);
        expect(existsSync(join(skillPath, 'references', 'quick-reference.md'))).toBe(false);
        expect(existsSync(join(skillPath, 'agents', 'openai.yaml'))).toBe(false);
        expect(existsSync(join(skillPath, 'metadata.openclaw'))).toBe(false);
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

    it('should package companions into output without mutating source and preserve custom icon metadata', async () => {
        const skillPath = join(TEST_DIR, 'package-skill-icon');
        mkdirSync(skillPath, { recursive: true });
        writeFileSync(
            join(skillPath, 'SKILL.md'),
            `---
name: package-skill-icon
description: A skill for packaging with custom icon metadata
metadata:
  author: tester
  version: "1.0.0"
  platforms: "claude-code,codex,openclaw"
  openclaw:
    emoji: "🧪"
---

# Package Skill Icon

## When to use

Use this skill when validating packaged companions.
`,
            'utf-8',
        );

        const outputPath = join(TEST_DIR, 'dist-icon');
        const { spawn } = await import('bun');

        const proc = spawn(['bun', 'run', join(SCRIPTS_DIR, 'package.ts'), skillPath, '--output', outputPath], {
            stdout: 'pipe',
            stderr: 'pipe',
        });

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);
        expect(existsSync(join(skillPath, 'agents', 'openai.yaml'))).toBe(false);

        const openaiYaml = readFileSync(join(outputPath, 'agents', 'openai.yaml'), 'utf-8');
        expect(openaiYaml).toContain('icon: 🧪');
    });

    it('should package skill resources into the output', async () => {
        const skillPath = join(TEST_DIR, 'package-skill-resources');
        mkdirSync(join(skillPath, 'scripts'), { recursive: true });
        mkdirSync(join(skillPath, 'references'), { recursive: true });
        mkdirSync(join(skillPath, 'assets'), { recursive: true });
        writeFileSync(
            join(skillPath, 'SKILL.md'),
            `---
name: package-skill-resources
description: A skill for packaging with scripts, references, and assets.
---

# Package Skill Resources

## When to Use

Use this skill when validating package completeness.
`,
            'utf-8',
        );
        writeFileSync(join(skillPath, 'scripts', 'helper.ts'), 'export const helper = true;\n', 'utf-8');
        writeFileSync(join(skillPath, 'references', 'guide.md'), '# Guide\n', 'utf-8');
        writeFileSync(join(skillPath, 'assets', 'example.txt'), 'asset\n', 'utf-8');

        const outputPath = join(TEST_DIR, 'dist-resources');
        const { spawn } = await import('bun');
        const proc = spawn(['bun', 'run', join(SCRIPTS_DIR, 'package.ts'), skillPath, '--output', outputPath]);

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);
        expect(existsSync(join(outputPath, 'scripts', 'helper.ts'))).toBe(true);
        expect(existsSync(join(outputPath, 'references', 'guide.md'))).toBe(true);
        expect(existsSync(join(outputPath, 'assets', 'example.txt'))).toBe(true);
    });

    it('should show help', async () => {
        const { spawn } = await import('bun');

        const proc = spawn(['bun', 'run', join(SCRIPTS_DIR, 'package.ts'), '--help']);

        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);
    });
});

describe('Wrapper documentation alignment', () => {
    it('should expose interactions in skill-add command docs', () => {
        const content = readFileSync(join(__dirname, '..', '..', '..', 'commands', 'skill-add.md'), 'utf-8');
        expect(content).toContain('--interactions');
    });

    it('should expose interaction-aware guidance in expert-skill agent docs', () => {
        const content = readFileSync(join(__dirname, '..', '..', '..', 'agents', 'expert-skill.md'), 'utf-8');
        expect(content).toContain('tool-wrapper');
        expect(content).toContain('metadata.interactions');
    });
});
