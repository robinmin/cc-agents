import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setGlobalSilent } from '../../../scripts/logger';
import { runAdaptCli } from '../scripts/adapt';
import { inferPlatformFromPath, isPlatformId } from '../scripts/capabilities';
import { evaluateWorkspace, runEvaluateCli } from '../scripts/evaluate';
import { generateWorkspace } from '../scripts/generator';
import { adaptFile, parseCliArgs, printResult, readWorkspaceFromFile, writeGeneratedWorkspace } from '../scripts/io';
import {
    parseFrontmatter,
    parseInstructionDocument,
    parseMarkdownSections,
    workspaceFromDocuments,
} from '../scripts/parser';
import { runRefineCli, suggestRefinements } from '../scripts/refine';
import { runSynthesizeCli } from '../scripts/synthesize';
import { runValidateCli, validateWorkspace } from '../scripts/validate';
import { runEvolveCli } from '../scripts/evolve';

let tempDir = '';

beforeEach(() => {
    setGlobalSilent(true);
    tempDir = mkdtempSync(join(tmpdir(), 'cc-magents-test-'));
});

afterEach(() => {
    setGlobalSilent(false);
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
});

function fixturePath(name = 'AGENTS.md'): string {
    return join(tempDir, name);
}

async function writeFixture(
    name = 'AGENTS.md',
    content = '# Project\n\n## Safety\n\nAsk approval before destructive commands.',
): Promise<string> {
    const path = fixturePath(name);
    await Bun.write(path, content);
    return path;
}

function workspace(content = '# Project\n\n## Safety\n\nAsk approval before destructive commands.') {
    return workspaceFromDocuments([parseInstructionDocument('AGENTS.md', content, 'agents-md')]);
}

describe('CLI and IO coverage', () => {
    test('parses aliases and rejects unknown platforms', () => {
        expect(parseCliArgs(['CLAUDE.md', '--from', 'claude-md', '--to', 'cursorrules', '--json']).to).toBe('cursor');
        expect(parseCliArgs(['GEMINI.md', '--from', 'gemini', '--to', 'vscode-instructions']).from).toBe('gemini-cli');
        expect(parseCliArgs(['dev-agent', '--platform', 'claude-md']).to).toBe('claude-code');
        expect(parseCliArgs(['CLAUDE.md', '--to', 'all']).targetAll).toBe(true);
        expect(() => parseCliArgs(['AGENTS.md', '--to', 'missing-platform'])).toThrow('Unknown target platform');
        expect(() => parseCliArgs(['AGENTS.md', '--from', 'missing-platform'])).toThrow('Unknown source platform');
    });

    test('reads, adapts, prints, and writes generated workspaces', async () => {
        const input = await writeFixture();
        const read = readWorkspaceFromFile(input);
        expect(read.documents[0].platform).toBe('agents-md');
        const generated = adaptFile(input, undefined, 'claude-code');
        expect(generated.files[0].path).toBe('CLAUDE.md');

        const singleOutput = join(tempDir, 'out.md');
        writeGeneratedWorkspace(generated, singleOutput);
        expect(readFileSync(singleOutput, 'utf-8')).toContain('Claude Code Instructions');

        const multiOutput = join(tempDir, 'multi');
        writeGeneratedWorkspace(generateWorkspace(read, 'agents-md', 'gemini-cli'), multiOutput);
        expect(readFileSync(join(multiOutput, 'GEMINI.md'), 'utf-8')).toContain('@./AGENTS.md');

        printResult('plain', false);
        printResult(generated, false);
        printResult({ ok: true }, false);
        printResult({ ok: true }, true);
    });

    test('runs exported CLI entrypoints', async () => {
        const input = await writeFixture();
        expect(runValidateCli([input, '--json']).ok).toBe(true);
        expect(runValidateCli([input, '--output', join(tempDir, 'validation.json'), '--json']).ok).toBe(true);
        expect(readFileSync(join(tempDir, 'validation.json'), 'utf-8')).toContain('"ok"');
        expect(runEvaluateCli([input, '--json', '--output', join(tempDir, 'evaluation.json')]).score).toBeGreaterThan(
            0,
        );
        expect(readFileSync(join(tempDir, 'evaluation.json'), 'utf-8')).toContain('"score"');
        expect(
            runRefineCli([input, '--to', 'opencode', '--json', '--output', join(tempDir, 'refine.json')]).length,
        ).toBeGreaterThan(0);
        expect(readFileSync(join(tempDir, 'refine.json'), 'utf-8')).toContain('"kind"');
        const aiderResult = runAdaptCli([input, '--to', 'aider', '--output', join(tempDir, 'aider'), '--json']);
        expect(Array.isArray(aiderResult) ? aiderResult.length : aiderResult.files.length).toBe(2);
        const cursorResult = runAdaptCli([input, '--to', 'cursor', '--dry-run', '--json']);
        expect(Array.isArray(cursorResult) ? cursorResult.length : cursorResult.files.length).toBeGreaterThan(0);
        expect(Array.isArray(runAdaptCli([input, '--to', 'all', '--dry-run', '--json']))).toBe(true);
        const allResult = runAdaptCli([input, '--to', 'all', '--output', join(tempDir, 'all'), '--json']);
        expect(Array.isArray(allResult)).toBe(true);
        expect(readFileSync(join(tempDir, 'all', 'claude-code', 'CLAUDE.md'), 'utf-8')).toContain('Claude Code');
        expect(readFileSync(join(tempDir, 'all', 'codex', 'AGENTS.md'), 'utf-8')).toContain('OpenAI Codex');
        expect(() => runAdaptCli([input, '--json'])).toThrow('Usage: adapt.ts');
        expect(runSynthesizeCli(['general-agent', '--to', 'gemini-cli', '--dry-run', '--json']).files.length).toBe(2);
        expect(
            runSynthesizeCli(['research-agent', '--to', 'agents-md', '--dry-run', '--json']).files[0].content,
        ).toContain('Research Agent Instructions');
        expect(
            runSynthesizeCli(['general-agent', '--to', 'agents-md', '--output', join(tempDir, 'synth.md'), '--json'])
                .files.length,
        ).toBe(1);
        expect(
            runSynthesizeCli(['general-agent', '--platform', 'claude-md', '--dry-run', '--json']).files[0].path,
        ).toBe('CLAUDE.md');
        expect(runEvolveCli(['--json', '--output', join(tempDir, 'evolve.json')]).length).toBeGreaterThan(0);
        expect(readFileSync(join(tempDir, 'evolve.json'), 'utf-8')).toContain('refresh-provisional-platforms');
        expect(() => runEvaluateCli(['--json'])).toThrow('Usage: evaluate.ts');
        expect(() => runRefineCli(['--json'])).toThrow('Usage: refine.ts');
    });

    test('covers parser edge cases', () => {
        expect(parseFrontmatter('plain').body).toBe('plain');
        expect(parseFrontmatter('---\nname: test\nflag: true\n---\n# Body').data).toEqual({ name: 'test', flag: true });
        expect(parseMarkdownSections('No headings')).toEqual([
            { level: 1, heading: 'Instructions', content: 'No headings' },
        ]);
        expect(
            parseInstructionDocument('rule.mdc', '---\nglobs: src/**\n---\n# Rule\n\nBody').metadata.frontmatter,
        ).toEqual({
            globs: 'src/**',
        });
        expect(
            workspaceFromDocuments([
                parseInstructionDocument('rule.mdc', '---\napplyTo: src/**, test/**\n---\n# Rule\n\nBody'),
            ]).rules[0].globs,
        ).toEqual(['src/**', 'test/**']);
    });

    test('covers validation and platform edge cases', () => {
        expect(isPlatformId('codex')).toBe(true);
        expect(isPlatformId('not-real')).toBe(false);
        expect(inferPlatformFromPath('unknown.txt')).toBe('generic');
        const empty = validateWorkspace(workspaceFromDocuments([]));
        expect(empty.ok).toBe(false);
        const emptyDocument = workspaceFromDocuments([parseInstructionDocument('EMPTY.md', '', 'pi')]);
        const emptyDocumentResult = validateWorkspace(emptyDocument);
        expect(emptyDocumentResult.ok).toBe(false);
        expect(emptyDocumentResult.issues.some((issue) => issue.message.includes('Pi support is low'))).toBe(true);
        const huge = validateWorkspace(workspace(`# Project\n\n${'x'.repeat(33000)}`));
        expect(huge.issues.some((issue) => issue.message.includes('Large AGENTS.md'))).toBe(true);
        expect(runValidateCli(['--json']).ok).toBe(true);
    });

    test('covers remaining generator targets and reports', () => {
        const rich = workspace(
            '# Identity\n\nrole: Architect\ntone: Direct\n\n## Memory\n\nUpdate MEMORY.md.\n\n## Safety\n\nAsk approval before destructive commands.\n\n## Scoped\n\nUse `src/**/*.ts`.\n\n## Empty\n\n',
        );
        for (const target of [
            'opencode',
            'copilot',
            'windsurf',
            'cline',
            'zed',
            'codex',
            'amp',
            'antigravity',
            'pi',
            'generic',
        ] as const) {
            const generated = generateWorkspace(rich, 'agents-md', target);
            expect(generated.files.length).toBeGreaterThan(0);
        }
        const emptyRules = workspaceFromDocuments([]);
        expect(generateWorkspace(emptyRules, 'agents-md', 'cursor').files[0].content).toContain('Add project guidance');
        expect(
            generateWorkspace(rich, 'agents-md', 'copilot').files.some((file) =>
                file.path.includes('.github/instructions/'),
            ),
        ).toBe(true);
        const provisional = generateWorkspace(rich, 'agents-md', 'antigravity');
        expect(provisional.report.warnings.length).toBeGreaterThan(0);
        const nonOpenClaw = generateWorkspace(rich, 'agents-md', 'codex');
        expect(nonOpenClaw.report.approximated.length).toBeGreaterThan(0);
        const noEvidence = { ...rich, sourceEvidence: [] };
        expect(suggestRefinements(noEvidence, 'cursor').some((suggestion) => suggestion.kind === 'evidence')).toBe(
            true,
        );
        expect(evaluateWorkspace(noEvidence).dimensions.evidence).toBe(45);
        expect(
            evaluateWorkspace({
                ...rich,
                sourceEvidence: [{ title: 'x', url: 'x', verifiedOn: 'x', confidence: 'medium' }],
            }).dimensions.evidence,
        ).toBe(75);
        expect(evaluateWorkspace(workspace(`# Project\n\n${'x'.repeat(6000)}`)).dimensions.maintainability).toBe(55);
    });
});
