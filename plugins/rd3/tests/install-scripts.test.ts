import { afterEach, describe, expect, it } from 'bun:test';
import { spawnSync } from 'node:child_process';
import {
    chmodSync,
    copyFileSync,
    existsSync,
    lstatSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    readlinkSync,
    readdirSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dir, '..', '..', '..');

const createdPaths: string[] = [];

function makeTempDir(prefix: string): string {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    createdPaths.push(dir);
    return dir;
}

function writeText(filePath: string, content: string): void {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content, 'utf-8');
}

function createFixtureRepo(): string {
    const repoRoot = makeTempDir('install-scripts-fixture-');

    mkdirSync(join(repoRoot, 'scripts'), { recursive: true });
    copyFileSync(join(REPO_ROOT, 'scripts', 'install-agents.sh'), join(repoRoot, 'scripts', 'install-agents.sh'));
    copyFileSync(join(REPO_ROOT, 'scripts', 'install-skills.sh'), join(repoRoot, 'scripts', 'install-skills.sh'));
    chmodSync(join(repoRoot, 'scripts', 'install-agents.sh'), 0o755);
    chmodSync(join(repoRoot, 'scripts', 'install-skills.sh'), 0o755);

    writeText(
        join(repoRoot, 'rulesync.jsonc'),
        JSON.stringify(
            {
                targets: ['codexcli'],
                features: ['commands', 'skills'],
                baseDirs: ['.'],
                delete: true,
                verbose: false,
                global: false,
                simulateCommands: false,
                simulateSubagents: false,
                simulateSkills: false,
                modularMcp: false,
            },
            null,
            2,
        ),
    );

    writeText(join(repoRoot, '.rulesync', 'keep.txt'), 'preserve me\n');

    writeText(join(repoRoot, 'magents', 'team-stark-children', 'IDENTITY.md'), '# Identity\nUse rd3:quick-grep.\n');
    writeText(join(repoRoot, 'magents', 'team-stark-children', 'SOUL.md'), '# Soul\nKeep behavior tight.\n');
    writeText(join(repoRoot, 'magents', 'team-stark-children', 'AGENTS.md'), '# Agents\nUse wt:image-generate.\n');
    writeText(join(repoRoot, 'magents', 'team-stark-children', 'USER.md'), '# User\nDefault operator profile.\n');

    writeText(
        join(repoRoot, 'plugins', 'rd3', 'skills', 'quick-grep', 'SKILL.md'),
        `---
name: quick-grep
description: Test skill for install script coverage.
---

Use \`rd3:task-decomposition\` before large rewrites.
`,
    );
    writeText(
        join(repoRoot, 'plugins', 'rd3', 'skills', 'task-decomposition', 'SKILL.md'),
        `---
name: task-decomposition
description: Companion skill.
---

Return structured plans.
`,
    );
    writeText(
        join(repoRoot, 'plugins', 'rd3', 'commands', 'plan.md'),
        `---
description: Plan work with skill references.
disable-model-invocation: true
---

Use \`rd3:quick-grep\` first.
`,
    );

    writeText(
        join(repoRoot, 'plugins', 'wt', 'skills', 'image-generate', 'SKILL.md'),
        `---
name: image-generate
description: Base image generation skill.
---

Generate images.
`,
    );
    writeText(
        join(repoRoot, 'plugins', 'wt', 'skills', 'image-cover', 'SKILL.md'),
        `---
name: image-cover
description: Cover generation skill.
---

Compose \`wt:image-generate\` for article covers.
`,
    );
    writeText(
        join(repoRoot, 'plugins', 'wt', 'skills', 'image-cover', 'references', 'usage.md'),
        'Pair this flow with wt:image-generate for rendering.\n',
    );
    writeText(
        join(repoRoot, 'plugins', 'wt', 'commands', 'image-generate.md'),
        `---
description: Generate AI images with styles and templates
argument-hint: [prompt] [--template name] [--style style] [--output path]
---

# Image Generate

Use wt:image-generate for rendering.
`,
    );
    writeText(
        join(repoRoot, 'plugins', 'wt', 'commands', 'style-extractor.md'),
        `---
description: Extract writing style fingerprint from text files in a folder
allowed-tools: Read, Glob, Grep, Task, mcp__auggie-mcp__codebase-retrieval
argument-hint: <folder_path>
---

# Style Extractor

Use wt:image-cover for samples.
`,
    );

    return repoRoot;
}

function runScript(
    repoRoot: string,
    scriptName: string,
    args: string[],
    extraEnv: Record<string, string> = {},
): { status: number | null; output: string } {
    const result = spawnSync('bash', [join(repoRoot, 'scripts', scriptName), ...args], {
        cwd: repoRoot,
        encoding: 'utf-8',
        env: {
            ...process.env,
            TERM: 'dumb',
            ...extraEnv,
        },
    });

    return {
        status: result.status,
        output: `${result.stdout}${result.stderr}`,
    };
}

afterEach(() => {
    while (createdPaths.length > 0) {
        const target = createdPaths.pop();
        if (target) {
            rmSync(target, { recursive: true, force: true });
        }
    }
});

describe('install-agents.sh', () => {
    it('skips unsupported global OpenClaw installs without creating garbage filenames', () => {
        const repoRoot = createFixtureRepo();
        const tempHome = makeTempDir('install-agents-home-');

        const result = runScript(repoRoot, 'install-agents.sh', ['team-stark-children', 'codexcli,openclaw'], {
            HOME: tempHome,
        });

        expect(result.status).toBe(0);
        expect(existsSync(join(tempHome, '.codex', 'AGENTS.md'))).toBe(true);
        expect(
            readdirSync(repoRoot).some((entry) => entry.includes('OpenClaw does not support global installation')),
        ).toBe(false);
    });

    it('writes one canonical AGENTS.md plus symlinks for project installs', () => {
        const repoRoot = createFixtureRepo();
        const projectDir = makeTempDir('install-agents-project-');

        const result = runScript(repoRoot, 'install-agents.sh', [
            'team-stark-children',
            'claude,geminicli,opencode,codexcli',
            '--project',
            '--project-dir',
            projectDir,
        ]);

        expect(result.status).toBe(0);
        expect(existsSync(join(projectDir, 'AGENTS.md'))).toBe(true);
        expect(lstatSync(join(projectDir, '.claude', 'CLAUDE.md')).isSymbolicLink()).toBe(true);
        expect(lstatSync(join(projectDir, '.gemini', 'rules.md')).isSymbolicLink()).toBe(true);
        expect(lstatSync(join(projectDir, '.opencode', 'instructions.md')).isSymbolicLink()).toBe(true);
        expect(readlinkSync(join(projectDir, '.claude', 'CLAUDE.md'))).toBe('../AGENTS.md');
        expect(readlinkSync(join(projectDir, '.gemini', 'rules.md'))).toBe('../AGENTS.md');
        expect(readlinkSync(join(projectDir, '.opencode', 'instructions.md'))).toBe('../AGENTS.md');
        expect(readdirSync(projectDir).some((entry) => entry.startsWith('AGENTS.md.bak.'))).toBe(false);
        expect(result.output).not.toContain('Backed up:');

        const installedConfig = readFileSync(join(projectDir, 'AGENTS.md'), 'utf-8');
        expect(installedConfig).toContain('rd3-quick-grep');
        expect(installedConfig).toContain('wt-image-generate');
        expect(installedConfig).not.toContain('rd3:quick-grep');
        expect(installedConfig).not.toContain('wt:image-generate');
    });
});

describe('install-skills.sh', () => {
    it('installs into the requested project directory without polluting the source repo', () => {
        const repoRoot = createFixtureRepo();
        const projectDir = makeTempDir('install-skills-project-');

        const result = runScript(repoRoot, 'install-skills.sh', [
            'rd3',
            'codexcli,opencode',
            '--features=skills,commands',
            '--project-dir',
            projectDir,
        ]);

        expect(result.status).toBe(0);
        expect(existsSync(join(projectDir, '.codex', 'skills', 'rd3-quick-grep', 'SKILL.md'))).toBe(true);
        expect(existsSync(join(projectDir, '.opencode', 'skills', 'rd3-quick-grep', 'SKILL.md'))).toBe(true);
        expect(existsSync(join(projectDir, '.agents', 'skills', 'rd3-cmd-plan', 'SKILL.md'))).toBe(true);
        expect(existsSync(join(repoRoot, '.codex'))).toBe(false);
        expect(existsSync(join(repoRoot, '.opencode'))).toBe(false);
        expect(existsSync(join(repoRoot, '.agents'))).toBe(false);
    });

    it('rewrites plugin-prefixed references for non-rd3 plugins', () => {
        const repoRoot = createFixtureRepo();
        const projectDir = makeTempDir('install-skills-wt-project-');

        const result = runScript(repoRoot, 'install-skills.sh', [
            'wt',
            'opencode',
            '--features=skills',
            '--project-dir',
            projectDir,
        ]);

        expect(result.status).toBe(0);

        const installedSkill = readFileSync(
            join(projectDir, '.opencode', 'skills', 'wt-image-cover', 'SKILL.md'),
            'utf-8',
        );
        const installedReference = readFileSync(
            join(projectDir, '.opencode', 'skills', 'wt-image-cover', 'references', 'usage.md'),
            'utf-8',
        );

        expect(installedSkill).toContain('wt-image-generate');
        expect(installedSkill).not.toContain('wt:image-generate');
        expect(installedReference).toContain('wt-image-generate');
        expect(installedReference).not.toContain('wt:image-generate');
    });

    it('normalizes wt command frontmatter so rulesync can install command wrappers', () => {
        const repoRoot = createFixtureRepo();
        const projectDir = makeTempDir('install-skills-wt-commands-');

        const result = runScript(repoRoot, 'install-skills.sh', [
            'wt',
            'codexcli',
            '--features=skills,commands',
            '--project-dir',
            projectDir,
        ]);

        expect(result.status).toBe(0);

        const installedCommand = readFileSync(
            join(projectDir, '.codex', 'skills', 'wt-cmd-image-generate', 'SKILL.md'),
            'utf-8',
        );
        const installedStyleExtractor = readFileSync(
            join(projectDir, '.codex', 'skills', 'wt-cmd-style-extractor', 'SKILL.md'),
            'utf-8',
        );

        expect(installedCommand).toContain('name: wt-cmd-image-generate');
        expect(installedCommand).toContain('argument-hint: "[prompt] [--template name] [--style style] [--output path]"');
        expect(installedStyleExtractor).toContain(
            'allowed-tools: [Read, Glob, Grep, Task, mcp__auggie-mcp__codebase-retrieval]',
        );
        expect(installedStyleExtractor).toContain('argument-hint: "<folder_path>"');
    });

    it('keeps the source workspace untouched during dry runs', () => {
        const repoRoot = createFixtureRepo();
        const projectDir = makeTempDir('install-skills-dry-run-');

        const result = runScript(repoRoot, 'install-skills.sh', [
            'rd3',
            'codexcli',
            '--features=skills,commands',
            '--project-dir',
            projectDir,
            '--dry-run',
        ]);

        expect(result.status).toBe(0);
        expect(existsSync(join(repoRoot, '.rulesync', 'keep.txt'))).toBe(true);
        expect(existsSync(join(repoRoot, '.codex'))).toBe(false);
        expect(existsSync(join(projectDir, '.codex'))).toBe(false);
    });

    it('rejects unsupported subagent installs instead of succeeding silently', () => {
        const repoRoot = createFixtureRepo();

        const result = runScript(repoRoot, 'install-skills.sh', ['rd3', 'codexcli', '--features=subagents']);

        expect(result.status).toBe(1);
        expect(result.output).toContain('Subagent installation is not supported by install-skills.sh');
        expect(result.output).toContain('cc-agents/scripts/install.ts');
    });
});
