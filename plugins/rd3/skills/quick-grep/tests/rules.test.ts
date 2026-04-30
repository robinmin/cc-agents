import { afterEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = join(__dirname, '..');
const RULES_DIR = join(SKILL_DIR, 'references', 'rules');
const tempDirs: string[] = [];
const hasSg = Bun.spawnSync(['which', 'sg']).exitCode === 0;

if (!hasSg) {
    throw new Error('quick-grep ast-grep rule tests require the `sg` CLI on PATH');
}

function createFixture(files: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), 'quick-grep-'));
    tempDirs.push(dir);

    for (const [name, content] of Object.entries(files)) {
        writeFileSync(join(dir, name), content, 'utf8');
    }

    return dir;
}

async function runRule(ruleFile: string, fixtureDir: string): Promise<{ exitCode: number; output: string }> {
    const proc = Bun.spawn(['sg', 'scan', '--report-style=short', '--rule', join(RULES_DIR, ruleFile), fixtureDir], {
        stdout: 'pipe',
        stderr: 'pipe',
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    return {
        exitCode,
        output: `${stdout}${stderr}`,
    };
}

afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
        rmSync(dir, { recursive: true, force: true });
    }
});

describe('quick-grep companion files', () => {
    it('ships Codex and OpenClaw metadata', () => {
        const codexPath = join(SKILL_DIR, 'agents', 'openai.yaml');
        const openClawPath = join(SKILL_DIR, 'metadata.openclaw');

        expect(existsSync(codexPath)).toBe(true);
        expect(existsSync(openClawPath)).toBe(true);
        expect(readFileSync(codexPath, 'utf8')).toContain('name: quick-grep');
        expect(readFileSync(openClawPath, 'utf8')).toContain('name: quick-grep');
    });
});

describe('quick-grep rule files', () => {
    it('parses bundled rules as valid multi-document YAML streams', async () => {
        const ruleFiles = [
            'async-no-trycatch.yml',
            'console-log.yml',
            'hardcoded-secret.yml',
            'impure-pipe.yml',
            'todo-no-error.yml',
        ];

        for (const ruleFile of ruleFiles) {
            const content = await Bun.file(join(RULES_DIR, ruleFile)).text();
            const documents = YAML.parseAllDocuments(content);

            expect(documents).toHaveLength(2);
            expect(documents.flatMap((document) => document.errors)).toHaveLength(0);
        }
    });
});

describe('quick-grep ast-grep rules', () => {
    it('detects console usage in both JavaScript and TypeScript', async () => {
        const dir = createFixture({
            'sample.js': "console.trace('js');\nconsole.table(['js']);\n",
            'sample.ts': 'console.dir({ ts: true });\nconsole.assert(true);\n',
        });

        const { exitCode, output } = await runRule('console-log.yml', dir);

        expect(exitCode).toBe(0);
        expect(output).toContain('console-log-javascript');
        expect(output).toContain('console-log-typescript');
        expect(output).toContain('sample.js');
        expect(output).toContain('sample.ts');
    });

    it('flags only unprotected awaits in async functions, arrows, expressions, and methods', async () => {
        const dir = createFixture({
            'sample.js': [
                'async function unsafeJs() { await foo(); }',
                'async function safeJs() { try { await foo(); } catch (error) { handle(error); } }',
                'const unsafeArrowJs = async () => { await foo(); };',
                'const safeArrowJs = async () => { try { await foo(); } catch (error) { handle(error); } };',
                'const unsafeExpressionJs = async function () { await foo(); };',
                'class ServiceJs { async unsafeMethod() { await foo(); } async safeMethod() { try { await foo(); } catch (error) { handle(error); } } }',
                'async function nestedCatchOnlyJs() { try { await bar(); } catch (error) { handle(error); } await foo(); }',
            ].join('\n'),
            'sample.ts': [
                'async function unsafeTs(): Promise<void> { await foo(); }',
                'async function safeTs(): Promise<void> { try { await foo(); } catch (error) { handle(error); } }',
                'const unsafeArrowTs = async (): Promise<void> => { await foo(); };',
                'const safeArrowTs = async (): Promise<void> => { try { await foo(); } catch (error) { handle(error); } };',
                'const unsafeExpressionTs = async function (): Promise<void> { await foo(); };',
                'class ServiceTs { async unsafeMethod(): Promise<void> { await foo(); } async safeMethod(): Promise<void> { try { await foo(); } catch (error) { handle(error); } } }',
                'async function nestedCatchOnlyTs(): Promise<void> { try { await bar(); } catch (error) { handle(error); } await foo(); }',
            ].join('\n'),
        });

        const { exitCode, output } = await runRule('async-no-trycatch.yml', dir);

        expect(exitCode).toBe(0);
        expect(output).toContain('sample.js:1');
        expect(output).toContain('sample.js:3');
        expect(output).toContain('sample.js:5');
        expect(output).toContain('sample.js:6');
        expect(output).toContain('sample.js:7');
        expect(output).toContain('sample.ts:1');
        expect(output).toContain('sample.ts:3');
        expect(output).toContain('sample.ts:5');
        expect(output).toContain('sample.ts:6');
        expect(output).toContain('sample.ts:7');
        expect(output).not.toContain('sample.js:2');
        expect(output).not.toContain('sample.js:4');
        expect(output).not.toContain('sample.ts:2');
        expect(output).not.toContain('sample.ts:4');
    });

    it('flags only promise chains without catch handlers', async () => {
        const dir = createFixture({
            'sample.js': [
                'Promise.resolve(1).then((value) => value + 1);',
                'Promise.resolve(1).then((value) => value + 1).catch((error) => error);',
                'Promise.resolve(1).then((value) => value + 1).then((value) => value * 2).catch((error) => error);',
            ].join('\n'),
            'sample.ts': [
                'Promise.resolve(1).then((value) => value + 1);',
                'Promise.resolve(1).then((value) => value + 1).catch((error) => error);',
                'Promise.resolve(1).then((value) => value + 1).then((value) => value * 2).catch((error) => error);',
            ].join('\n'),
        });

        const { exitCode, output } = await runRule('impure-pipe.yml', dir);

        expect(exitCode).toBe(0);
        expect(output).toContain('sample.js:1');
        expect(output).toContain('sample.ts:1');
        expect(output).not.toContain('sample.js:2');
        expect(output).not.toContain('sample.js:3');
        expect(output).not.toContain('sample.ts:2');
        expect(output).not.toContain('sample.ts:3');
    });

    it('detects hardcoded secrets in both JavaScript and TypeScript', async () => {
        const dir = createFixture({
            'sample.js': "const token = 'sk-proj-1234567890-ABCDEFGHIJ';\n",
            'sample.ts': 'const token: string = `ghp_1234567890ABCDEFGHIJ`;\n',
        });

        const { exitCode, output } = await runRule('hardcoded-secret.yml', dir);

        expect(exitCode).toBe(1);
        expect(output).toContain('hardcoded-secret-javascript');
        expect(output).toContain('hardcoded-secret-typescript');
        expect(output).toContain('sample.js');
        expect(output).toContain('sample.ts');
    });

    it('detects TODO-style comments in both JavaScript and TypeScript', async () => {
        const dir = createFixture({
            'sample.js': '// TODO: remove this\n',
            'sample.ts': '// FIXME: replace this\n',
        });

        const { exitCode, output } = await runRule('todo-no-error.yml', dir);

        expect(exitCode).toBe(0);
        expect(output).toContain('todo-no-error-javascript');
        expect(output).toContain('todo-no-error-typescript');
        expect(output).toContain('sample.js');
        expect(output).toContain('sample.ts');
    });
});
