#!/usr/bin/env bun
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setGlobalSilent } from '../../../scripts/logger';
import { CODEX_AGENT_DESCRIPTION_MAX_LENGTH } from '../scripts/description-constraints';
import {
    handleFatalRefineError,
    main,
    migrateFromRd2,
    parseCliArgs,
    printUsage,
    refineAgent,
    refineAgentWithDeps,
} from '../scripts/refine';
import { parseFrontmatter } from '../scripts/utils';

const TEMP_FILES: string[] = [];
const originalExit = process.exit;
const originalStderr = process.stderr;
const originalArgv = process.argv;

beforeEach(() => {
    setGlobalSilent(true);
    Object.defineProperty(process, 'exit', {
        value: ((code?: number) => {
            throw new Error(`process.exit(${code})`);
        }) as typeof process.exit,
        writable: true,
    });
    Object.defineProperty(process, 'stderr', {
        value: { write: () => true },
        writable: true,
    });
});

afterEach(() => {
    for (const file of TEMP_FILES.splice(0)) {
        rmSync(file, { force: true });
    }
    setGlobalSilent(false);
    process.exit = originalExit;
    process.stderr = originalStderr;
    process.argv = originalArgv;
});

function makeTempFile(name: string, content: string): string {
    const filePath = resolve(import.meta.dir, 'fixtures', name);
    TEMP_FILES.push(filePath);
    writeFileSync(filePath, content, 'utf-8');
    return filePath;
}

describe('refineAgent', () => {
    it('returns an error when the target file does not exist', async () => {
        const filePath = resolve(import.meta.dir, 'fixtures', 'missing-agent.md');
        const result = await refineAgent(filePath, { agentPath: filePath });

        expect(result.success).toBe(false);
        expect(result.errors).toContain('Agent file not found or invalid');
    });

    it('truncates long descriptions while preserving an example block', async () => {
        const filePath = makeTempFile(
            'temp-refine-long-description.md',
            `---
name: refine-long-description
description: |
  Use PROACTIVELY for ${'a'.repeat(800)}

  <example>
  user: "Create a new agent"
  assistant: "Route to scaffold, generate the wrapper, and explain the validation flow."
  <commentary>This example should survive the truncation pass.</commentary>
  </example>

  <example>
  user: "Evaluate this agent"
  assistant: "Run evaluation and summarize the findings."
  <commentary>This second example may be dropped.</commentary>
  </example>

  ${'b'.repeat(800)}
tools: [Read]
---

# Body

Some body content.
`,
        );

        const result = await refineAgent(filePath, { agentPath: filePath, fromEval: filePath });
        expect(result.success).toBe(true);
        expect(result.changes.some((change) => change.includes('Truncated description'))).toBe(true);
        expect(result.changes.some((change) => change.includes('Preserved at least one <example> block'))).toBe(true);

        const content = await Bun.file(filePath).text();
        const parsed = parseFrontmatter(content);
        const description = parsed.frontmatter?.description;

        expect(typeof description).toBe('string');
        expect((description as string).length).toBeLessThanOrEqual(CODEX_AGENT_DESCRIPTION_MAX_LENGTH);
        expect(description).toContain('<example>');
        expect(description).toContain('Create a new agent');
        expect(content).toContain('description: |');
    });

    it('applies rd2 migration fixes in place', async () => {
        const filePath = makeTempFile(
            'temp-refine-migrate.md',
            `---
description: "Legacy agent"
model: gpt-5.4
---

# legacy-agent

Legacy body content.
`,
        );

        const result = await refineAgent(filePath, { agentPath: filePath, migrate: true });
        const content = await Bun.file(filePath).text();

        expect(result.success).toBe(true);
        expect(result.changes).toContain('Added missing name field from heading');
        expect(result.changes).toContain('Added empty tools field');
        expect(content).toContain('name: legacy-agent');
        expect(content).toContain('tools: []');
    });

    it('writes refined content to the output path when provided', async () => {
        const inputPath = makeTempFile(
            'temp-refine-output-input.md',
            `---
description: "Legacy output agent"
model: gpt-5.4
---

# output-agent

Legacy body content.
`,
        );
        const outputPath = makeTempFile('temp-refine-output-result.md', '');

        const result = await refineAgent(inputPath, {
            agentPath: inputPath,
            migrate: true,
            output: outputPath,
        });
        const inputContent = await Bun.file(inputPath).text();
        const outputContent = await Bun.file(outputPath).text();

        expect(result.success).toBe(true);
        expect(result.agentPath).toBe(outputPath);
        expect(inputContent).not.toContain('tools: []');
        expect(outputContent).toContain('name: output-agent');
        expect(outputContent).toContain('tools: []');
    });
});

describe('migrateFromRd2', () => {
    it('skips adding a name for command-style frontmatter that already has argument-hint', () => {
        const result = migrateFromRd2(`---
argument-hint: <topic>
description: "Command-style wrapper"
---

# command-wrapper
`);

        expect(result.success).toBe(true);
        expect(result.actions).toContain('Added empty tools field');
        expect(result.actions).not.toContain('Added missing name field from heading');
        expect(result.content).toContain('argument-hint: <topic>');
        expect(result.content).not.toContain('name: command-wrapper');
    });

    it('returns unchanged content when no frontmatter exists', () => {
        const content = '# Just a heading\n\nNo frontmatter here.';
        const result = migrateFromRd2(content);
        expect(result.success).toBe(true);
        expect(result.actions).toEqual([]);
        expect(result.content).toBe(content);
    });

    it('skips name and tools when both already exist', () => {
        const result = migrateFromRd2(`---
name: existing-name
description: "Has everything"
tools: [Read]
---

# Body
`);
        expect(result.success).toBe(true);
        expect(result.actions).toEqual([]);
        expect(result.content).toContain('name: existing-name');
        expect(result.content).toContain('tools: [Read]');
    });
});

describe('refineAgent - additional paths', () => {
    it('truncates description without example preservation when severely over limit', async () => {
        const longDesc = 'x'.repeat(CODEX_AGENT_DESCRIPTION_MAX_LENGTH + 2000);
        const filePath = makeTempFile(
            'temp-refine-no-example.md',
            `---
name: no-example-agent
description: |
  ${longDesc}
tools: []
---

# Body
`,
        );

        const result = await refineAgent(filePath, { agentPath: filePath, fromEval: filePath });
        expect(result.success).toBe(true);
        expect(result.changes.some((c) => c.includes('Truncated description'))).toBe(true);
        // No example was present, so preservedExample warning should appear
        expect(result.warnings.some((w) => w.includes('example preservation was not possible'))).toBe(true);

        const content = await Bun.file(filePath).text();
        const parsed = parseFrontmatter(content);
        const description = parsed.frontmatter?.description;
        expect(typeof description).toBe('string');
        expect((description as string).length).toBeLessThanOrEqual(CODEX_AGENT_DESCRIPTION_MAX_LENGTH + 1);
    });
});

describe('refineAgentWithDeps', () => {
    it('captures evaluation failures without aborting refinement', async () => {
        const filePath = resolve(import.meta.dir, 'fixtures', 'deps-eval-failure.md');
        const raw = `---
name: deps-eval-failure
description: "Short description"
tools: []
---

# Body
`;

        const result = await refineAgentWithDeps(
            filePath,
            { agentPath: filePath, fromEval: filePath },
            {
                readAgent: async () => ({
                    frontmatter: parseFrontmatter(raw).frontmatter,
                    body: parseFrontmatter(raw).body,
                    raw,
                    path: filePath,
                    filename: 'deps-eval-failure',
                    sourcePlatform: 'claude',
                }),
                evaluateAgent: async () => {
                    throw new Error('eval boom');
                },
                migrateFromRd2,
                applyBestPracticeFixes: (content) => ({ success: true, actions: [], content }),
                parseFrontmatter,
                writeFile: async () => 0,
            },
        );

        expect(result.success).toBe(false);
        expect(result.errors.some((error) => error.includes('Evaluation failed: Error: eval boom'))).toBe(true);
    });

    it('propagates migration errors and writes best-practice-updated content', async () => {
        const filePath = resolve(import.meta.dir, 'fixtures', 'deps-migrate-error.md');
        const writes: Array<{ path: string; content: string }> = [];
        const raw = `---
name: deps-migrate-error
description: "Short description"
tools: []
---

# Body
`;

        const result = await refineAgentWithDeps(
            filePath,
            { agentPath: filePath, migrate: true, output: `${filePath}.out` },
            {
                readAgent: async () => ({
                    frontmatter: parseFrontmatter(raw).frontmatter,
                    body: parseFrontmatter(raw).body,
                    raw,
                    path: filePath,
                    filename: 'deps-migrate-error',
                    sourcePlatform: 'claude',
                }),
                evaluateAgent: async () => ({
                    agentPath: filePath,
                    agentName: 'deps-migrate-error',
                    scope: 'full',
                    weightProfile: 'thin-wrapper',
                    overallScore: 100,
                    maxScore: 100,
                    passed: true,
                    percentage: 100,
                    grade: 'A',
                    dimensions: [],
                    timestamp: new Date().toISOString(),
                }),
                migrateFromRd2: () => ({
                    success: false,
                    actions: ['Injected migration action'],
                    errors: ['Injected migration error'],
                    content: raw.replace('Short description', 'Migrated description'),
                }),
                applyBestPracticeFixes: (content) => ({
                    success: true,
                    actions: ['Injected best-practice action'],
                    content: content.replace('Migrated description', 'Best practice description'),
                }),
                parseFrontmatter,
                writeFile: async (path, content) => {
                    writes.push({ path: String(path), content: String(content) });
                    return 0;
                },
            },
        );

        expect(result.success).toBe(false);
        expect(result.changes).toContain('Injected migration action');
        expect(result.changes).toContain('Injected best-practice action');
        expect(result.errors).toContain('Injected migration error');
        expect(writes).toHaveLength(1);
        expect(writes[0]?.path).toBe(`${filePath}.out`);
        expect(writes[0]?.content).toContain('Best practice description');
    });
});

describe('printUsage', () => {
    it('prints usage without throwing', () => {
        expect(() => printUsage()).not.toThrow();
    });
});

describe('parseCliArgs', () => {
    it('parses valid arguments and promotes refine flags to fromEval', () => {
        const result = parseCliArgs([
            'agent.md',
            '--migrate',
            '--best-practices',
            '--output',
            'out.md',
            '--dry-run',
            '-v',
        ]);

        expect(result.path).toBe('agent.md');
        expect(result.options.agentPath).toBe('agent.md');
        expect(result.options.migrate).toBe(true);
        expect(result.options.fromEval).toBe('agent.md');
        expect(result.options.output).toBe('out.md');
        expect(result.dryRun).toBe(true);
        expect(result.verbose).toBe(true);
    });

    it('handles explicit eval mode and default flags', () => {
        const result = parseCliArgs(['agent.md', '--eval']);

        expect(result.path).toBe('agent.md');
        expect(result.options.migrate).toBe(false);
        expect(result.options.fromEval).toBe('agent.md');
        expect(result.dryRun).toBe(false);
        expect(result.verbose).toBe(false);
    });

    it('throws process.exit(0) for help and process.exit(1) for missing path', () => {
        expect(() => parseCliArgs(['--help'])).toThrow('process.exit(0)');
        expect(() => parseCliArgs([])).toThrow('process.exit(1)');
    });
});

describe('main', () => {
    it('exits successfully when refinement completes', async () => {
        const filePath = makeTempFile(
            'temp-main-success.md',
            `---
name: main-success
description: "Short description"
tools: []
---

# Body
`,
        );
        process.argv = ['bun', 'refine.ts', filePath, '--dry-run'];

        await expect(main()).rejects.toThrow('process.exit(0)');
    });

    it('exits with code 1 when refinement fails', async () => {
        const filePath = resolve(import.meta.dir, 'fixtures', 'missing-main-agent.md');
        process.argv = ['bun', 'refine.ts', filePath];

        await expect(main()).rejects.toThrow('process.exit(1)');
    });

    it('reports changes and warnings through main output', async () => {
        const filePath = makeTempFile(
            'temp-main-with-changes.md',
            `---
description: "Legacy main agent"
model: gpt-5.4
---

# legacy-main-agent

Body content.
`,
        );
        process.argv = ['bun', 'refine.ts', filePath, '--migrate'];

        await expect(main()).rejects.toThrow('process.exit(0)');
    });

    it('exits with code 1 when refinement has errors', async () => {
        const missingPath = resolve(import.meta.dir, 'fixtures', 'nonexistent-agent.md');
        process.argv = ['bun', 'refine.ts', missingPath, '--migrate'];

        await expect(main()).rejects.toThrow('process.exit(1)');
    });
});

describe('handleFatalRefineError', () => {
    it('logs and exits with code 1', () => {
        expect(() => handleFatalRefineError(new Error('fatal boom'))).toThrow('process.exit(1)');
    });
});
