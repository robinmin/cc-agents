/**
 * ai-runner.ts — Reusable TypeScript library for AI coding agent dispatch
 *
 * Provides agent detection, slash-command translation, channel resolution,
 * doctor diagnostics, and command execution across 7 AI coding agents.
 * Feature-parity with scripts/airunner.sh.
 */

// ============================================================================
// Types
// ============================================================================

export type AgentName = 'claude' | 'codex' | 'gemini' | 'pi' | 'opencode' | 'antigravity' | 'openclaw';

export type OutputMode = 'text' | 'json';

export interface AgentInfo {
    name: AgentName;
    installed: boolean;
    version: string;
    authenticated: boolean;
    usable: boolean;
    tier: 1 | 2;
}

export interface RunOptions {
    prompt?: string;
    channel: 'auto' | 'current' | AgentName | 'claude-code' | 'agy';
    continue?: boolean;
    model?: string;
    mode?: OutputMode;
}

export interface DispatchResult {
    exitCode: number;
    resolvedAgent: AgentName;
}

// ============================================================================
// Constants
// ============================================================================

const TIER1_PRIORITY: AgentName[] = ['pi', 'codex', 'gemini', 'claude', 'opencode'];
const TIER2_AGENTS: Set<AgentName> = new Set(['antigravity', 'openclaw']);
const DISPLAY_ORDER: AgentName[] = ['claude', 'codex', 'gemini', 'pi', 'opencode', 'antigravity', 'openclaw'];

const AGENT_COMMANDS: Record<AgentName, string> = {
    claude: 'claude',
    codex: 'codex',
    gemini: 'gemini',
    pi: 'pi',
    opencode: 'opencode',
    antigravity: 'agy',
    openclaw: 'openclaw',
};

const VALID_AGENTS = new Set<string>(['claude', 'codex', 'gemini', 'pi', 'opencode', 'antigravity', 'openclaw']);

// ============================================================================
// Agent Detection
// ============================================================================

function agentCmd(agent: AgentName): string {
    return AGENT_COMMANDS[agent];
}

async function commandExists(cmd: string): Promise<boolean> {
    try {
        const proc = Bun.spawn(['command', '-v', cmd], {
            stdout: 'pipe',
            stderr: 'pipe',
        });
        const exitCode = await Promise.race([
            proc.exited,
            new Promise<number>((_, reject) =>
                setTimeout(() => {
                    proc.kill();
                    reject(new Error('timeout'));
                }, 3000),
            ),
        ]);
        return exitCode === 0;
    } catch {
        return false;
    }
}

export async function isAgentInstalled(agent: AgentName): Promise<boolean> {
    const cmd = agentCmd(agent);
    return commandExists(cmd);
}

export async function getAgentVersion(agent: AgentName): Promise<string> {
    const cmd = agentCmd(agent);
    try {
        const proc = Bun.spawn([cmd, '--version'], {
            stdout: 'pipe',
            stderr: 'pipe',
        });
        const exitCode = await Promise.race([
            proc.exited,
            new Promise<number>((_, reject) =>
                setTimeout(() => {
                    proc.kill();
                    reject(new Error('timeout'));
                }, 3000),
            ),
        ]);
        if (exitCode !== 0) return '-';
        const [stdout, stderr] = await Promise.all([
            new Response(proc.stdout).text(),
            new Response(proc.stderr).text(),
        ]);
        const text = `${stdout}\n${stderr}`;
        return text.split('\n')[0] || '-';
    } catch {
        return '-';
    }
}

async function probeOutputStatus(
    positivePattern: RegExp,
    negativePattern: RegExp | null,
    ...cmd: string[]
): Promise<boolean | null> {
    try {
        const proc = Bun.spawn(cmd, {
            stdout: 'pipe',
            stderr: 'pipe',
        });
        const exitCode = await proc.exited;
        if (exitCode !== 0) return false;

        const [stdout, stderr] = await Promise.all([
            new Response(proc.stdout).text(),
            new Response(proc.stderr).text(),
        ]);
        const text = `${stdout}\n${stderr}`;

        if (negativePattern?.test(text)) return false;
        if (positivePattern.test(text)) return true;
        return null;
    } catch {
        return null;
    }
}

export async function isAgentAuthenticated(agent: AgentName): Promise<boolean> {
    const home = process.env.HOME || '';

    switch (agent) {
        case 'claude':
            return (await probeOutputStatus(
                /authenticated|logged[\s_-]*in|"loggedIn"\s*:\s*true/i,
                /not[\s_-]*authenticated|not[\s_-]*logged[\s_-]*in|logged[\s_-]*out|unauthenticated|"loggedIn"\s*:\s*false/i,
                'claude',
                'auth',
                'status',
            )) === true;

        case 'codex': {
            const probeStatus = await probeOutputStatus(
                /logged[\s_-]*in|authenticated/i,
                /not[\s_-]*authenticated|not[\s_-]*logged[\s_-]*in|logged[\s_-]*out|unauthenticated/i,
                'codex',
                'login',
                'status',
            );
            if (probeStatus !== null) return probeStatus;
            const { existsSync } = await import('node:fs');
            return existsSync(`${home}/.codex/auth.json`) || existsSync(`${home}/.codex/auth`);
        }

        case 'gemini': {
            const { existsSync, readFileSync } = await import('node:fs');
            const settingsPath = `${home}/.gemini/settings.json`;
            if (!existsSync(settingsPath)) return false;
            try {
                const content = readFileSync(settingsPath, 'utf-8');
                return /auth|token|key/i.test(content);
            } catch {
                return false;
            }
        }

        case 'pi':
            if (process.env.GOOGLE_API_KEY || process.env.ANTHROPIC_API_KEY) return true;
            try {
                const proc = Bun.spawn(['pi', '--list-models'], {
                    stdout: 'pipe',
                    stderr: 'pipe',
                });
                const exitCode = await proc.exited;
                return exitCode === 0;
            } catch {
                return false;
            }

        case 'opencode':
            return (await probeOutputStatus(
                /configured|available/i,
                /not[\s_-]*configured|no[\s_-]+providers?[\s_-]+available|unavailable/i,
                'opencode',
                'providers',
            )) === true;

        case 'antigravity':
            return false;

        case 'openclaw':
            return (await probeOutputStatus(
                /(^|[^a-z])ok([^a-z]|$)|healthy/i,
                /not[\s_-]*healthy|unhealthy|not[\s_-]*ok/i,
                'openclaw',
                'health',
            )) === true;
    }
}

export function isTier2(agent: AgentName): boolean {
    return TIER2_AGENTS.has(agent);
}

export async function isAgentUsable(agent: AgentName): Promise<boolean> {
    if (isTier2(agent)) return false;
    return (await isAgentInstalled(agent)) && (await isAgentAuthenticated(agent));
}

// ============================================================================
// Doctor
// ============================================================================

export async function doctor(): Promise<AgentInfo[]> {
    const results: AgentInfo[] = [];

    for (const agent of DISPLAY_ORDER) {
        const installed = await isAgentInstalled(agent);
        const version = installed ? await getAgentVersion(agent) : '-';
        const authenticated = installed ? await isAgentAuthenticated(agent) : false;
        const tier = isTier2(agent) ? 2 : 1;

        let usable = false;
        if (isTier2(agent)) {
            usable = installed && authenticated;
        } else {
            usable = installed && authenticated;
        }

        results.push({
            name: agent,
            installed,
            version,
            authenticated,
            usable,
            tier,
        });
    }

    return results;
}

// ============================================================================
// Channel Resolution
// ============================================================================

export function normalizeAlias(channel: string): AgentName | string {
    switch (channel) {
        case 'claude-code':
            return 'claude';
        case 'agy':
            return 'antigravity';
        default:
            return channel;
    }
}

export async function resolveChannel(channel: RunOptions['channel']): Promise<AgentName> {
    const normalized = normalizeAlias(channel);

    switch (normalized) {
        case 'auto': {
            for (const agent of TIER1_PRIORITY) {
                if (await isAgentUsable(agent)) return agent;
            }
            throw new Error('No usable Tier-1 agent found');
        }

        case 'current': {
            const envChannel = process.env.AIRUNNER_CHANNEL;
            if (!envChannel) {
                throw new Error('AIRUNNER_CHANNEL env var is not set');
            }
            const resolved = normalizeAlias(envChannel);
            if (!VALID_AGENTS.has(resolved)) {
                throw new Error(`Invalid AIRUNNER_CHANNEL: ${envChannel}`);
            }
            return resolved as AgentName;
        }

        default:
            if (!VALID_AGENTS.has(normalized)) {
                throw new Error(`Unknown channel: ${normalized}`);
            }
            return normalized as AgentName;
    }
}

// ============================================================================
// Slash-Command Translation
// ============================================================================

const CLAUDE_SLASH_RE = /^\/([a-zA-Z0-9._-]+):([a-zA-Z0-9._-]+)(\s.*)?$/;

export function isClaudeStyleSlashCommand(input: string): boolean {
    return CLAUDE_SLASH_RE.test(input);
}

export function translateSlashCommand(agent: AgentName | 'claude-code', input: string): string {
    if (agent === 'claude' || agent === 'claude-code') return input;

    const match = CLAUDE_SLASH_RE.exec(input);
    if (!match) return input;

    const pluginName = match[1];
    const cmdName = match[2];
    const args = match[3] || '';

    switch (agent) {
        case 'codex':
            return `$${pluginName}-${cmdName}${args}`;
        case 'pi':
            return `/skill:${pluginName}-${cmdName}${args}`;
        default:
            return `/${pluginName}-${cmdName}${args}`;
    }
}

// ============================================================================
// Command Construction
// ============================================================================

export function buildAgentCommand(options: {
    resolvedAgent: AgentName;
    input?: string;
    continue?: boolean;
    model?: string;
    mode?: OutputMode;
}): { cmd: string; args: string[] } {
    const { resolvedAgent, input, continue: cont, model, mode } = options;
    const modeValue = mode || 'text';
    const args: string[] = [];

    switch (resolvedAgent) {
        case 'claude':
            args.push('-p', input || '');
            if (cont) args.push('--continue');
            if (model) args.push('--model', model);
            args.push('--output-format', modeValue);
            return { cmd: 'claude', args };

        case 'codex':
            if (cont) {
                args.push('exec', 'resume', '--last');
            } else {
                args.push('exec', input || '');
            }
            if (model) args.push('-m', model);
            if (modeValue === 'json') args.push('--json');
            return { cmd: 'codex', args };

        case 'gemini':
            args.push('-p', input || '');
            if (cont) args.push('-r', 'latest');
            if (model) args.push('-m', model);
            args.push('-o', modeValue);
            return { cmd: 'gemini', args };

        case 'pi':
            args.push('-p', input || '');
            if (cont) args.push('-c');
            if (model) args.push('--model', model);
            args.push('--mode', modeValue);
            return { cmd: 'pi', args };

        case 'opencode':
            args.push('run', input || '');
            if (cont) args.push('-c');
            if (model) args.push('-m', model);
            if (modeValue === 'json') args.push('--format', 'json');
            return { cmd: 'opencode', args };

        case 'antigravity':
            args.push('chat', input || '');
            return { cmd: 'agy', args };

        case 'openclaw':
            args.push('agent', '--local', '-m', input || '');
            return { cmd: 'openclaw', args };
    }
}

// ============================================================================
// Execution
// ============================================================================

export async function executeAgentInput(options: {
    resolvedAgent: AgentName;
    input?: string;
    continue?: boolean;
    model?: string;
    mode?: OutputMode;
}): Promise<DispatchResult> {
    const { resolvedAgent } = options;

    // Codex resume with prompt is invalid
    if (resolvedAgent === 'codex' && options.continue && options.input) {
        throw Object.assign(new Error('Codex resume mode does not accept a new prompt; omit the prompt or drop -c'), {
            exitCode: 2,
        });
    }

    const { cmd, args } = buildAgentCommand({
        resolvedAgent,
        input: options.input,
        continue: options.continue,
        model: options.model,
        mode: options.mode,
    });

    const proc = Bun.spawn([cmd, ...args], {
        stdout: 'inherit',
        stderr: 'inherit',
    });

    const exitCode = await proc.exited;
    return { exitCode, resolvedAgent };
}

export async function executeSlashCommand(options: {
    resolvedAgent: AgentName;
    input: string;
    continue?: boolean;
    model?: string;
    mode?: OutputMode;
}): Promise<DispatchResult> {
    const translated = translateSlashCommand(options.resolvedAgent, options.input);
    return executeAgentInput({
        ...options,
        input: translated,
    });
}

// ============================================================================
// Exports for CLI
// ============================================================================

export { DISPLAY_ORDER, TIER1_PRIORITY, AGENT_COMMANDS };
