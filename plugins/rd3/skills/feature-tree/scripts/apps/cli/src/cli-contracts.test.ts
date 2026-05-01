import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const entrypoint = resolve(import.meta.dir, 'index.ts');
const tempDirs: string[] = [];

function createTempDir(prefix: string): string {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
}

async function runCli(
    args: string[],
    options: {
        cwd?: string;
        env?: Record<string, string>;
    } = {},
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const spawnOptions: Bun.SpawnOptions.OptionsObject<'ignore', 'pipe', 'pipe'> = {
        env: {
            ...process.env,
            NODE_ENV: 'development',
            ...options.env,
        },
        stderr: 'pipe',
        stdout: 'pipe',
    };

    if (options.cwd) {
        spawnOptions.cwd = options.cwd;
    }

    const proc = Bun.spawn([process.execPath, 'run', entrypoint, ...args], spawnOptions);

    const [exitCode, stdout, stderr] = await Promise.all([
        proc.exited,
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
    ]);

    return { exitCode, stdout, stderr };
}

afterEach(() => {
    while (tempDirs.length > 0) {
        const dir = tempDirs.pop();
        if (dir) {
            rmSync(dir, { force: true, recursive: true });
        }
    }
});

describe('ftree CLI contracts', () => {
    test('keeps add stdout machine-readable while logs go to stderr', async () => {
        const dir = createTempDir('ftree-cli-stdout-');
        const dbPath = join(dir, 'ftree.sqlite');

        const init = await runCli(['init', '--db', dbPath], { cwd: dir });
        expect(init.exitCode).toBe(0);

        const add = await runCli(['add', '--title', 'Root Feature', '--db', dbPath], { cwd: dir });
        expect(add.exitCode).toBe(0);

        const stdout = add.stdout.trim();
        expect(stdout).toMatch(/^[0-9a-f-]{36}$/);
        expect(stdout).not.toContain('Feature created');
        expect(add.stderr).toContain('Feature created');
    });

    test('resolves built-in templates independently of the caller cwd', async () => {
        const dir = createTempDir('ftree-cli-template-');
        const dbPath = join(dir, 'portable.sqlite');

        const result = await runCli(['init', '--template', 'web-app', '--db', dbPath], { cwd: dir });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Seeded');

        const list = await runCli(['ls', '--json', '--db', dbPath], { cwd: dir });
        expect(list.exitCode).toBe(0);

        const parsed = JSON.parse(list.stdout) as unknown[];
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.length).toBeGreaterThan(0);
    });

    test('returns child summaries in context brief output', async () => {
        const dir = createTempDir('ftree-cli-context-');
        const dbPath = join(dir, 'context.sqlite');

        await runCli(['init', '--db', dbPath], { cwd: dir });
        const parent = await runCli(['add', '--title', 'Parent Feature', '--db', dbPath], { cwd: dir });
        const parentId = parent.stdout.trim();

        const child = await runCli(['add', '--title', 'Child Feature', '--parent', parentId, '--db', dbPath], {
            cwd: dir,
        });
        const childId = child.stdout.trim();

        await runCli(['link', childId, '--wbs', 'WBS-101', '--db', dbPath], { cwd: dir });

        const context = await runCli(['context', parentId, '--format', 'brief', '--db', dbPath], { cwd: dir });
        expect(context.exitCode).toBe(0);

        const parsed = JSON.parse(context.stdout) as {
            children: Array<Record<string, unknown>>;
            linked_wbs: string[];
            node: Record<string, unknown>;
        };

        expect(parsed.node.title).toBe('Parent Feature');
        expect(parsed.linked_wbs).toEqual([]);
        expect(parsed.children).toHaveLength(1);
        expect(parsed.children[0]).toMatchObject({
            title: 'Child Feature',
            status: 'backlog',
            wbs_ids: ['WBS-101'],
        });
    });

    test('returns an array for ls --json at the root', async () => {
        const dir = createTempDir('ftree-cli-ls-');
        const dbPath = join(dir, 'ls.sqlite');

        await runCli(['init', '--db', dbPath], { cwd: dir });
        await runCli(['add', '--title', 'Root A', '--db', dbPath], { cwd: dir });
        await runCli(['add', '--title', 'Root B', '--db', dbPath], { cwd: dir });

        const list = await runCli(['ls', '--json', '--db', dbPath], { cwd: dir });
        expect(list.exitCode).toBe(0);

        const parsed = JSON.parse(list.stdout) as Array<Record<string, unknown>>;
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.map((item) => item.title)).toEqual(expect.arrayContaining(['Root A', 'Root B']));
    });

    test('rejects malformed imports without partially mutating the database', async () => {
        const dir = createTempDir('ftree-cli-import-');
        const dbPath = join(dir, 'import.sqlite');
        const templatePath = join(dir, 'invalid-template.json');

        writeFileSync(
            templatePath,
            JSON.stringify([{ title: 'Would Be Inserted' }, { title: 'Bad Node', status: 'not-a-real-status' }]),
        );

        await runCli(['init', '--db', dbPath], { cwd: dir });

        const result = await runCli(['import', templatePath, '--db', dbPath], { cwd: dir });
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('unknown status');

        const list = await runCli(['ls', '--json', '--db', dbPath], { cwd: dir });
        expect(list.exitCode).toBe(0);
        expect(JSON.parse(list.stdout)).toEqual([]);
    });

    test('show renders the full feature tree', async () => {
        const dir = createTempDir('ftree-cli-show-');
        const dbPath = join(dir, 'show.sqlite');

        await runCli(['init', '--db', dbPath], { cwd: dir });
        const parent = await runCli(['add', '--title', 'Root', '--db', dbPath], { cwd: dir });
        const parentId = parent.stdout.trim();

        await runCli(['add', '--title', 'Child A', '--parent', parentId, '--db', dbPath], { cwd: dir });
        await runCli(['add', '--title', 'Child B', '--parent', parentId, '--db', dbPath], { cwd: dir });

        const show = await runCli(['show', '--db', dbPath], { cwd: dir });
        expect(show.exitCode).toBe(0);
        expect(show.stdout).toContain('Root');
        expect(show.stdout).toContain('Child A');
        expect(show.stdout).toContain('Child B');
        expect(show.stdout).toContain('backlog');
    });

    test('show --json returns array of root nodes', async () => {
        const dir = createTempDir('ftree-cli-show-json-');
        const dbPath = join(dir, 'show-json.sqlite');

        await runCli(['init', '--db', dbPath], { cwd: dir });
        await runCli(['add', '--title', 'Alpha', '--db', dbPath], { cwd: dir });
        await runCli(['add', '--title', 'Beta', '--db', dbPath], { cwd: dir });

        const show = await runCli(['show', '--json', '--db', dbPath], { cwd: dir });
        expect(show.exitCode).toBe(0);

        const parsed = JSON.parse(show.stdout) as Array<Record<string, unknown>>;
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.map((item) => item.title)).toEqual(expect.arrayContaining(['Alpha', 'Beta']));
    });

    test('show with empty tree prints placeholder', async () => {
        const dir = createTempDir('ftree-cli-show-empty-');
        const dbPath = join(dir, 'show-empty.sqlite');

        await runCli(['init', '--db', dbPath], { cwd: dir });

        const show = await runCli(['show', '--db', dbPath], { cwd: dir });
        expect(show.exitCode).toBe(0);
        expect(show.stdout).toContain('(no features)');
    });

    test('show --root limits to subtree', async () => {
        const dir = createTempDir('ftree-cli-show-root-');
        const dbPath = join(dir, 'show-root.sqlite');

        await runCli(['init', '--db', dbPath], { cwd: dir });
        const rootA = await runCli(['add', '--title', 'Root A', '--db', dbPath], { cwd: dir });
        const rootAId = rootA.stdout.trim();
        await runCli(['add', '--title', 'Child A', '--parent', rootAId, '--db', dbPath], { cwd: dir });

        await runCli(['add', '--title', 'Root B', '--db', dbPath], { cwd: dir });

        const show = await runCli(['show', '--root', rootAId, '--db', dbPath], { cwd: dir });
        expect(show.exitCode).toBe(0);
        expect(show.stdout).toContain('Root A');
        expect(show.stdout).toContain('Child A');
        expect(show.stdout).not.toContain('Root B');
    });
});
