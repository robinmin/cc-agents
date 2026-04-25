/**
 * ai-runner.test.ts — Tests for scripts/lib/ai-runner.ts
 *
 * Tests core parity behaviors without relying on real installed agents.
 * Uses stub binaries and temporary PATH overrides for agent detection tests.
 */

import { afterEach, describe, expect, it } from 'bun:test';
import { setGlobalSilent } from '../logger';
import {
    buildAgentCommand,
    doctor,
    isAgentAuthenticated,
    isAgentUsable,
    isClaudeStyleSlashCommand,
    isTier2,
    normalizeAlias,
    resolveChannel,
    translateSlashCommand,
    type AgentName,
} from '../lib/ai-runner';

// Suppress logger output during tests
setGlobalSilent(true);

const ORIGINAL_PATH = process.env.PATH;
const ORIGINAL_HOME = process.env.HOME;
const ORIGINAL_CODEX_AUTH_OUTPUT = process.env.CODEX_AUTH_OUTPUT;
const CODEX_AUTH_STATUS_FILE = '/tmp/ai-runner-codex-auth-status';

async function makeStubBin(name: string, body: string): Promise<string> {
    const dir = await Bun.$`mktemp -d`.text();
    const trimmedDir = dir.trim();
    const path = `${trimmedDir}/${name}`;
    await Bun.write(path, `#!/usr/bin/env bash\n${body}`);
    await Bun.$`chmod +x ${path}`;
    return trimmedDir;
}

function restoreEnv(): void {
    process.env.PATH = ORIGINAL_PATH;
    if (ORIGINAL_HOME === undefined) {
        delete process.env.HOME;
    } else {
        process.env.HOME = ORIGINAL_HOME;
    }
    if (ORIGINAL_CODEX_AUTH_OUTPUT === undefined) {
        delete process.env.CODEX_AUTH_OUTPUT;
    } else {
        process.env.CODEX_AUTH_OUTPUT = ORIGINAL_CODEX_AUTH_OUTPUT;
    }
    Bun.file(CODEX_AUTH_STATUS_FILE)
        .delete()
        .catch(() => undefined);
}

// ============================================================================
// Slash-Command Translation
// ============================================================================

describe('translateSlashCommand', () => {
    const cases: Array<[AgentName | 'claude-code', string, string]> = [
        // Claude: no change
        ['claude', '/rd3:dev-run', '/rd3:dev-run'],
        ['claude', '/rd3:dev-run 0274', '/rd3:dev-run 0274'],
        ['claude-code', '/rd3:dev-run', '/rd3:dev-run'],
        // Codex: $plugin-cmd
        ['codex', '/rd3:dev-run', '$rd3-dev-run'],
        ['codex', '/rd3:dev-run 0274', '$rd3-dev-run 0274'],
        // Pi: /skill:plugin-cmd
        ['pi', '/rd3:dev-run', '/skill:rd3-dev-run'],
        ['pi', '/rd3:dev-run 0274 --auto', '/skill:rd3-dev-run 0274 --auto'],
        // All others: /plugin-cmd
        ['gemini', '/rd3:dev-run', '/rd3-dev-run'],
        ['opencode', '/rd3:dev-run', '/rd3-dev-run'],
        ['antigravity', '/rd3:dev-run', '/rd3-dev-run'],
        ['openclaw', '/rd3:dev-run', '/rd3-dev-run'],
        // With underscores and dots in plugin name
        ['codex', '/my_plugin.sub:cmd-name', '$my_plugin.sub-cmd-name'],
        ['pi', '/my_plugin.sub:cmd-name', '/skill:my_plugin.sub-cmd-name'],
        // Non-matching: pass through unchanged
        ['codex', '/simple-command', '/simple-command'],
        ['claude', 'regular text prompt', 'regular text prompt'],
        ['codex', 'no slash prefix', 'no slash prefix'],
        ['gemini', '/single', '/single'],
    ];

    for (const [agent, input, expected] of cases) {
        it(`${agent}: "${input}" → "${expected}"`, () => {
            expect(translateSlashCommand(agent, input)).toBe(expected);
        });
    }
});

// ============================================================================
// Slash-Command Detection
// ============================================================================

describe('isClaudeStyleSlashCommand', () => {
    const truthy = [
        '/rd3:dev-run',
        '/plugin:cmd',
        '/my_plugin.sub:cmd-name',
        '/a:b',
        '/rd3:dev-run 0274 --auto',
        '/plugin:cmd name with space',
    ];

    const falsy = ['/simple-command', 'regular text', '', '/single', 'no slash', '/plugin name:cmd'];

    for (const input of truthy) {
        it(`truthy: "${input}"`, () => {
            expect(isClaudeStyleSlashCommand(input)).toBe(true);
        });
    }

    for (const input of falsy) {
        it(`falsy: "${input}"`, () => {
            expect(isClaudeStyleSlashCommand(input)).toBe(false);
        });
    }
});

// ============================================================================
// Alias Normalization
// ============================================================================

describe('normalizeAlias', () => {
    const cases: Array<[string, string]> = [
        ['claude-code', 'claude'],
        ['agy', 'antigravity'],
        ['claude', 'claude'],
        ['codex', 'codex'],
        ['gemini', 'gemini'],
        ['pi', 'pi'],
        ['opencode', 'opencode'],
        ['antigravity', 'antigravity'],
        ['openclaw', 'openclaw'],
        ['unknown', 'unknown'],
    ];

    for (const [input, expected] of cases) {
        it(`normalizeAlias("${input}") → "${expected}"`, () => {
            expect(normalizeAlias(input)).toBe(expected);
        });
    }
});

// ============================================================================
// Tier Classification
// ============================================================================

describe('isTier2', () => {
    const tier2Agents: AgentName[] = ['antigravity', 'openclaw'];
    const tier1Agents: AgentName[] = ['claude', 'codex', 'gemini', 'pi', 'opencode'];

    for (const agent of tier2Agents) {
        it(`${agent} is Tier 2`, () => {
            expect(isTier2(agent)).toBe(true);
        });
    }

    for (const agent of tier1Agents) {
        it(`${agent} is NOT Tier 2`, () => {
            expect(isTier2(agent)).toBe(false);
        });
    }
});

// ============================================================================
// Agent Usability (Tier 1 only)
// ============================================================================

describe('isAgentUsable', () => {
    it('returns false for Tier 2 agents regardless', async () => {
        expect(await isAgentUsable('antigravity')).toBe(false);
        expect(await isAgentUsable('openclaw')).toBe(false);
    });
});

// ============================================================================
// Command Construction (buildAgentCommand)
// ============================================================================

describe('buildAgentCommand', () => {
    it('claude: basic prompt', () => {
        const { cmd, args } = buildAgentCommand({
            resolvedAgent: 'claude',
            input: 'Fix the bug',
        });
        expect(cmd).toBe('claude');
        expect(args).toEqual(['-p', 'Fix the bug', '--output-format', 'text']);
    });

    it('claude: with continue and model', () => {
        const { cmd, args } = buildAgentCommand({
            resolvedAgent: 'claude',
            input: 'Continue this',
            continue: true,
            model: 'claude-sonnet-4-6',
            mode: 'json',
        });
        expect(cmd).toBe('claude');
        expect(args).toEqual([
            '-p',
            'Continue this',
            '--continue',
            '--model',
            'claude-sonnet-4-6',
            '--output-format',
            'json',
        ]);
    });

    it('codex: basic prompt', () => {
        const { cmd, args } = buildAgentCommand({
            resolvedAgent: 'codex',
            input: 'Fix the bug',
        });
        expect(cmd).toBe('codex');
        expect(args).toEqual(['exec', 'Fix the bug']);
    });

    it('codex: with model and json mode', () => {
        const { cmd, args } = buildAgentCommand({
            resolvedAgent: 'codex',
            input: 'Fix the bug',
            model: 'o3',
            mode: 'json',
        });
        expect(cmd).toBe('codex');
        expect(args).toEqual(['exec', 'Fix the bug', '-m', 'o3', '--json']);
    });

    it('codex: continue (resume) without prompt', () => {
        const { cmd, args } = buildAgentCommand({
            resolvedAgent: 'codex',
            continue: true,
        });
        expect(cmd).toBe('codex');
        expect(args).toEqual(['exec', 'resume', '--last']);
    });

    it('codex: continue with model', () => {
        const { cmd, args } = buildAgentCommand({
            resolvedAgent: 'codex',
            continue: true,
            model: 'o3',
        });
        expect(cmd).toBe('codex');
        expect(args).toEqual(['exec', 'resume', '--last', '-m', 'o3']);
    });

    it('gemini: basic prompt', () => {
        const { cmd, args } = buildAgentCommand({
            resolvedAgent: 'gemini',
            input: 'Fix the bug',
        });
        expect(cmd).toBe('gemini');
        expect(args).toEqual(['-p', 'Fix the bug', '-o', 'text']);
    });

    it('gemini: continue mode', () => {
        const { cmd, args } = buildAgentCommand({
            resolvedAgent: 'gemini',
            input: 'Continue',
            continue: true,
            model: 'gemini-2.5-pro',
        });
        expect(cmd).toBe('gemini');
        expect(args).toEqual(['-p', 'Continue', '-r', 'latest', '-m', 'gemini-2.5-pro', '-o', 'text']);
    });

    it('pi: basic prompt', () => {
        const { cmd, args } = buildAgentCommand({
            resolvedAgent: 'pi',
            input: 'Fix the bug',
        });
        expect(cmd).toBe('pi');
        expect(args).toEqual(['-p', 'Fix the bug', '--mode', 'text']);
    });

    it('pi: with continue, model, json mode', () => {
        const { cmd, args } = buildAgentCommand({
            resolvedAgent: 'pi',
            input: 'Continue',
            continue: true,
            model: 'opus',
            mode: 'json',
        });
        expect(cmd).toBe('pi');
        expect(args).toEqual(['-p', 'Continue', '-c', '--model', 'opus', '--mode', 'json']);
    });

    it('opencode: basic prompt', () => {
        const { cmd, args } = buildAgentCommand({
            resolvedAgent: 'opencode',
            input: 'Fix the bug',
        });
        expect(cmd).toBe('opencode');
        expect(args).toEqual(['run', 'Fix the bug']);
    });

    it('opencode: with json mode', () => {
        const { cmd, args } = buildAgentCommand({
            resolvedAgent: 'opencode',
            input: 'Fix the bug',
            mode: 'json',
        });
        expect(cmd).toBe('opencode');
        expect(args).toEqual(['run', 'Fix the bug', '--format', 'json']);
    });

    it('opencode: with continue and model', () => {
        const { cmd, args } = buildAgentCommand({
            resolvedAgent: 'opencode',
            input: 'Continue',
            continue: true,
            model: 'anthropic/claude-sonnet-4-6',
        });
        expect(cmd).toBe('opencode');
        expect(args).toEqual(['run', 'Continue', '-c', '-m', 'anthropic/claude-sonnet-4-6']);
    });

    it('antigravity: TUI dispatch', () => {
        const { cmd, args } = buildAgentCommand({
            resolvedAgent: 'antigravity',
            input: 'Fix the bug',
        });
        expect(cmd).toBe('agy');
        expect(args).toEqual(['chat', 'Fix the bug']);
    });

    it('openclaw: local dispatch', () => {
        const { cmd, args } = buildAgentCommand({
            resolvedAgent: 'openclaw',
            input: 'Fix the bug',
        });
        expect(cmd).toBe('openclaw');
        expect(args).toEqual(['agent', '--local', '-m', 'Fix the bug']);
    });

    it('codex text mode does NOT add --json', () => {
        const { args } = buildAgentCommand({
            resolvedAgent: 'codex',
            input: 'test',
            mode: 'text',
        });
        expect(args).not.toContain('--json');
    });

    it('opencode text mode does NOT add --format json', () => {
        const { args } = buildAgentCommand({
            resolvedAgent: 'opencode',
            input: 'test',
            mode: 'text',
        });
        expect(args).not.toContain('--format');
        expect(args).not.toContain('json');
    });
});

// ============================================================================
// Channel Resolution
// ============================================================================

describe.serial('resolveChannel', () => {
    const originalEnv = process.env.AIRUNNER_CHANNEL;

    afterEach(() => {
        if (originalEnv !== undefined) {
            process.env.AIRUNNER_CHANNEL = originalEnv;
        } else {
            delete process.env.AIRUNNER_CHANNEL;
        }
    });

    it('resolves known agent names directly', async () => {
        const agents: AgentName[] = ['claude', 'codex', 'gemini', 'pi', 'opencode', 'antigravity', 'openclaw'];
        for (const agent of agents) {
            expect(await resolveChannel(agent)).toBe(agent);
        }
    });

    it('resolves claude-code alias to claude', async () => {
        expect(await resolveChannel('claude-code')).toBe('claude');
    });

    it('resolves agy alias to antigravity', async () => {
        expect(await resolveChannel('agy')).toBe('antigravity');
    });

    it('rejects unknown channels', async () => {
        expect(resolveChannel('unknown-agent' as never)).rejects.toThrow('Unknown channel: unknown-agent');
    });

    it("rejects 'current' when AIRUNNER_CHANNEL is not set", async () => {
        delete process.env.AIRUNNER_CHANNEL;
        expect(resolveChannel('current')).rejects.toThrow('AIRUNNER_CHANNEL env var is not set');
    });

    it("resolves 'current' from AIRUNNER_CHANNEL env var", async () => {
        process.env.AIRUNNER_CHANNEL = 'codex';
        expect(await resolveChannel('current')).toBe('codex');
    });

    it("resolves 'current' with alias in AIRUNNER_CHANNEL", async () => {
        process.env.AIRUNNER_CHANNEL = 'claude-code';
        expect(await resolveChannel('current')).toBe('claude');
    });

    it('rejects invalid AIRUNNER_CHANNEL value', async () => {
        process.env.AIRUNNER_CHANNEL = 'nonexistent';
        expect(resolveChannel('current')).rejects.toThrow('Invalid AIRUNNER_CHANNEL: nonexistent');
    });
});

// ============================================================================
// Doctor
// ============================================================================

describe.serial('doctor', () => {
    afterEach(() => {
        restoreEnv();
    });

    async function useDoctorStubs(): Promise<void> {
        const dir = await Bun.$`mktemp -d`.text();
        const stubDir = dir.trim();
        const stubs: Array<[string, string]> = [
            [
                'claude',
                `if [ "$1" = "--version" ]; then echo "claude-stub"; exit 0; fi
if [ "$1 $2" = "auth status" ]; then echo "Authenticated"; exit 0; fi
exit 0`,
            ],
            [
                'codex',
                `if [ "$1" = "--version" ]; then echo "codex-stub"; exit 0; fi
if [ "$1 $2" = "login status" ]; then if [ -f "${CODEX_AUTH_STATUS_FILE}" ]; then cat "${CODEX_AUTH_STATUS_FILE}"; echo; else echo "Logged in using ChatGPT"; fi; exit 0; fi
exit 0`,
            ],
            [
                'gemini',
                `if [ "$1" = "--version" ]; then echo "gemini-stub"; exit 0; fi
exit 0`,
            ],
            [
                'pi',
                `if [ "$1" = "--version" ]; then echo "pi-stub"; exit 0; fi
if [ "$1" = "--list-models" ]; then echo "models"; exit 0; fi
exit 0`,
            ],
            [
                'opencode',
                `if [ "$1" = "--version" ]; then echo "opencode-stub"; exit 0; fi
if [ "$1" = "providers" ]; then echo "1 provider available"; exit 0; fi
exit 0`,
            ],
            [
                'agy',
                `if [ "$1" = "--version" ]; then echo "agy-stub"; exit 0; fi
exit 0`,
            ],
            [
                'openclaw',
                `if [ "$1" = "--version" ]; then echo "openclaw-stub"; exit 0; fi
if [ "$1" = "health" ]; then echo "healthy"; exit 0; fi
exit 0`,
            ],
        ];

        for (const [name, body] of stubs) {
            const path = `${stubDir}/${name}`;
            await Bun.write(path, `#!/usr/bin/env bash\n${body}`);
            await Bun.$`chmod +x ${path}`;
        }

        const home = await Bun.$`mktemp -d`.text();
        const trimmedHome = home.trim();
        await Bun.$`mkdir -p ${trimmedHome}/.gemini`;
        await Bun.write(`${trimmedHome}/.gemini/settings.json`, '{"auth": true}');
        process.env.HOME = trimmedHome;
        process.env.PATH = `${stubDir}:${ORIGINAL_PATH}`;
    }

    it('returns info for all 7 agents in display order', async () => {
        await useDoctorStubs();
        const results = await doctor();
        expect(results).toHaveLength(7);
        const names = results.map((r) => r.name);
        expect(names).toEqual(['claude', 'codex', 'gemini', 'pi', 'opencode', 'antigravity', 'openclaw']);
    }, 30000);

    it('each result has all required fields', async () => {
        await useDoctorStubs();
        const results = await doctor();
        for (const info of results) {
            expect(info).toHaveProperty('name');
            expect(info).toHaveProperty('installed');
            expect(info).toHaveProperty('version');
            expect(info).toHaveProperty('authenticated');
            expect(info).toHaveProperty('usable');
            expect(info).toHaveProperty('tier');
            expect(typeof info.installed).toBe('boolean');
            expect(typeof info.tier).toBe('number');
        }
    }, 30000);

    it('Tier 2 agents have tier=2, Tier 1 have tier=1', async () => {
        await useDoctorStubs();
        const results = await doctor();
        for (const info of results) {
            if (info.name === 'antigravity' || info.name === 'openclaw') {
                expect(info.tier).toBe(2);
            } else {
                expect(info.tier).toBe(1);
            }
        }
    }, 30000);

    it('marks stubbed usable agents without reading real local binaries', async () => {
        await useDoctorStubs();
        const results = await doctor();
        expect(results.find((info) => info.name === 'codex')?.usable).toBe(true);
        expect(results.find((info) => info.name === 'pi')?.usable).toBe(true);
    }, 30000);
});

// ============================================================================
// Auth Probe Semantics
// ============================================================================

describe.serial('auth probe semantics', () => {
    afterEach(() => {
        restoreEnv();
    });

    it('reads stderr auth status and lets negative output win', async () => {
        await Bun.write(CODEX_AUTH_STATUS_FILE, 'Logged in using ChatGPT');
        const dir = await makeStubBin(
            'codex',
            `if [ "$1 $2" = "login status" ]; then cat "${CODEX_AUTH_STATUS_FILE}" >&2; echo >&2; exit 0; fi
exit 0`,
        );
        const home = await Bun.$`mktemp -d`.text();

        async function runAuthProbe(status: string): Promise<string> {
            await Bun.write(CODEX_AUTH_STATUS_FILE, status);
            const proc = Bun.spawn(
                [
                    process.execPath,
                    '-e',
                    'import { isAgentAuthenticated } from "./scripts/lib/ai-runner"; console.log(await isAgentAuthenticated("codex"));',
                ],
                {
                    stdout: 'pipe',
                    stderr: 'pipe',
                    env: {
                        ...process.env,
                        PATH: `${dir}:${ORIGINAL_PATH}`,
                        HOME: home.trim(),
                    },
                },
            );
            const exitCode = await proc.exited;
            expect(exitCode).toBe(0);
            return (await new Response(proc.stdout).text()).trim();
        }

        expect(await runAuthProbe('Logged in using ChatGPT')).toBe('true');
        expect(await runAuthProbe('Not authenticated')).toBe('false');
    });
});

// ============================================================================
// Codex Resume Validation
// ============================================================================

describe('Codex resume mode', () => {
    // Import dynamically to avoid side effects
    const { executeAgentInput } = require('../lib/ai-runner');

    it('rejects codex resume with prompt', async () => {
        try {
            await executeAgentInput({
                resolvedAgent: 'codex',
                input: '/rd3:dev-run 0274',
                continue: true,
            });
            expect.unreachable('Should have thrown');
        } catch (e: unknown) {
            const err = e as { message?: string; exitCode?: number };
            expect(err.exitCode).toBe(2);
            expect(err.message).toContain('Codex resume mode does not accept a new prompt');
        }
    });
});

// ============================================================================
// CLI Routing Logic (unit-level)
// ============================================================================

describe('CLI routing logic', () => {
    it('slash command input triggers slash path', () => {
        const input = '/rd3:dev-run 0274';
        expect(isClaudeStyleSlashCommand(input)).toBe(true);
    });

    it('plain prompt does not trigger slash path', () => {
        const input = 'Fix the login bug';
        expect(isClaudeStyleSlashCommand(input)).toBe(false);
    });

    it('codex slash command translation applied before dispatch', () => {
        const translated = translateSlashCommand('codex', '/rd3:dev-run 0274');
        const { cmd, args } = buildAgentCommand({
            resolvedAgent: 'codex',
            input: translated,
        });
        expect(cmd).toBe('codex');
        expect(args[0]).toBe('exec');
        expect(args[1]).toBe('$rd3-dev-run 0274');
    });
});

// ============================================================================
// CLI Spawn Failure Reporting
// ============================================================================

describe('airunner.ts CLI failures', () => {
    it('does not report exit 0 when final agent spawn throws', async () => {
        const dir = await makeStubBin(
            'command',
            `if [ "$1" = "-v" ] && [ "$2" = "claude" ]; then echo "/missing/claude"; exit 0; fi
exit 1`,
        );

        const proc = Bun.spawn([process.execPath, 'scripts/airunner.ts', 'run', 'test prompt', '--channel', 'claude'], {
            stdout: 'pipe',
            stderr: 'pipe',
            env: {
                ...process.env,
                PATH: `${dir}:/usr/bin:/bin`,
            },
        });

        const exitCode = await proc.exited;
        const stderr = await new Response(proc.stderr).text();

        expect(exitCode).toBe(3);
        expect(stderr).toContain('Agent execution failed: claude (');
        expect(stderr).not.toContain('(exit 0)');
    }, 30000);
});
