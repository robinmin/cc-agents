#!/usr/bin/env bun
/**
 * airunner.ts — CLI wrapper for AI coding agent dispatch
 *
 * TypeScript equivalent of scripts/airunner.sh with identical behavior.
 * Thin wrapper: argument parsing, formatting, stderr/stdout writes, exit codes.
 */

import {
    doctor,
    resolveChannel,
    isTier2,
    isAgentInstalled,
    isClaudeStyleSlashCommand,
    executeAgentInput,
    executeSlashCommand,
    type AgentName,
    type OutputMode,
} from './lib/ai-runner';

const VERSION = '1.0.0';

// ============================================================================
// ANSI Colors
// ============================================================================

const RED = '\x1b[0;31m';
const YELLOW = '\x1b[1;33m';
const BOLD = '\x1b[1m';
const NC = '\x1b[0m';

// ============================================================================
// Output Helpers
// ============================================================================

function warn(msg: string): void {
    process.stderr.write(`${YELLOW}⚠️  ${msg}${NC}\n`);
}

function error(msg: string): void {
    process.stderr.write(`${RED}❌ ${msg}${NC}\n`);
}

function requireOptionValue(option: string, value: string | undefined): string {
    if (!value || value.startsWith('-')) {
        error(`Option requires a value: ${option}`);
        process.exit(2);
    }
    return value;
}

// ============================================================================
// Subcommand: run
// ============================================================================

async function cmdRun(args: string[]): Promise<void> {
    let prompt = '';
    let channel: string = 'auto';
    let cont = false;
    let model = '';
    let mode: string = 'text';

    let i = 0;
    while (i < args.length) {
        const arg = args[i];
        switch (arg) {
            case '--channel':
                channel = requireOptionValue(arg, args[++i]);
                break;
            case '-c':
                cont = true;
                break;
            case '--model':
                model = requireOptionValue(arg, args[++i]);
                break;
            case '--mode':
                mode = requireOptionValue(arg, args[++i]);
                break;
            default:
                if (arg.startsWith('-')) {
                    error(`Unknown option: ${arg}`);
                    process.exit(2);
                }
                if (prompt) {
                    error(`Unexpected argument: ${arg}`);
                    process.exit(2);
                }
                prompt = arg;
                break;
        }
        i++;
    }

    if (mode !== 'text' && mode !== 'json') {
        error(`Invalid mode: ${mode} (must be text or json)`);
        process.exit(2);
    }

    let resolved: AgentName;
    try {
        resolved = await resolveChannel(channel as never);
    } catch (e: unknown) {
        const msg = (e as Error).message || '';
        if (msg.includes('No usable Tier-1 agent found')) {
            error(msg);
            process.exit(1);
        }
        error(msg);
        process.exit(2);
    }

    if (!prompt && !(cont && resolved === 'codex')) {
        error('Prompt is required');
        process.exit(2);
    }

    // Tier 2 warning
    if (isTier2(resolved)) {
        warn(`${resolved} is a Tier-2 agent (TUI/gateway only)`);
    }

    // Verify agent is installed
    if (!(await isAgentInstalled(resolved))) {
        const cmds: Record<string, string> = {
            claude: 'claude',
            codex: 'codex',
            gemini: 'gemini',
            pi: 'pi',
            opencode: 'opencode',
            antigravity: 'agy',
            openclaw: 'openclaw',
        };
        error(`Agent not installed: ${resolved} (${cmds[resolved]})`);
        process.exit(1);
    }

    const modeTyped = mode as OutputMode;
    const execOptions = {
        resolvedAgent: resolved,
        input: prompt || undefined,
        continue: cont,
        model: model || undefined,
        mode: modeTyped,
    };

    let agentExit = 0;
    try {
        if (prompt && isClaudeStyleSlashCommand(prompt)) {
            agentExit = (
                await executeSlashCommand({
                    ...execOptions,
                    input: prompt,
                })
            ).exitCode;
        } else if (prompt) {
            agentExit = (await executeAgentInput(execOptions)).exitCode;
        } else {
            agentExit = (await executeAgentInput(execOptions)).exitCode;
        }
    } catch (e: unknown) {
        const err = e as { message?: string; exitCode?: number; code?: string };
        if (err.exitCode === 2) {
            error(err.message || 'Invalid arguments');
            process.exit(2);
        }
        const detail =
            err.exitCode !== undefined ? `exit ${err.exitCode}` : err.code || err.message || `exit ${agentExit}`;
        error(`Agent execution failed: ${resolved} (${detail})`);
        process.exit(3);
    }

    if (agentExit !== 0) {
        error(`Agent execution failed: ${resolved} (exit ${agentExit})`);
        process.exit(3);
    }
}

// ============================================================================
// Subcommand: doctor
// ============================================================================

async function cmdDoctor(): Promise<void> {
    const header = `${BOLD}${'AGENT'.padEnd(15)} ${'INSTALLED'.padEnd(12)} ${'VERSION'.padEnd(15)} ${'AUTHENTICATED'.padEnd(15)} ${'USABLE'.padEnd(8)}${NC}`;
    const separator = `${'-----'.padEnd(15)} ${'---------'.padEnd(12)} ${'-------'.padEnd(15)} ${'-------------'.padEnd(15)} ${'------'.padEnd(8)}`;

    process.stdout.write(`${header}\n`);
    process.stdout.write(`${separator}\n`);

    let hasUsableTier1 = false;

    const agents = await doctor();
    for (const info of agents) {
        const installed = info.installed ? 'yes' : 'no';
        const version = info.installed ? info.version : '-';
        const auth = info.installed ? (info.authenticated ? 'yes' : 'no') : '-';

        let usable: string;
        if (info.tier === 2) {
            usable = info.installed && info.authenticated ? 'yes*' : 'no*';
        } else {
            usable = info.usable ? 'yes' : 'no';
            if (info.usable) hasUsableTier1 = true;
        }

        process.stdout.write(
            `${info.name.padEnd(15)} ${installed.padEnd(12)} ${version.padEnd(15)} ${auth.padEnd(15)} ${usable.padEnd(8)}\n`,
        );
    }

    process.stdout.write('\n');
    process.stdout.write('* = Tier 2 (TUI only or gateway required)\n');

    if (hasUsableTier1) {
        process.exit(0);
    } else {
        error('No usable Tier-1 agent found');
        process.exit(1);
    }
}

// ============================================================================
// Subcommand: help
// ============================================================================

function cmdHelp(): void {
    const name = 'airunner.ts';
    process.stdout.write(
        `${BOLD}${name}${NC} v${VERSION} - Lightweight wrapper for AI coding agents

${BOLD}USAGE${NC}
    ${name} <command> [options]

${BOLD}COMMANDS${NC}
    run       Execute a prompt or slash command via a coding agent
    doctor    Health-check all installed agents
    help      Show this help message

${BOLD}RUN OPTIONS${NC}
    [prompt]                        Prompt or slash command to execute
    --channel <channel>             Agent channel (default: auto)
        auto                        First usable Tier-1 agent (priority: pi > codex > gemini > claude > opencode)
        current                     Read from $AIRUNNER_CHANNEL env var
        claude|codex|gemini|pi|opencode|antigravity|openclaw
    -c                              Continue previous session (Codex resume accepts no new prompt)
    --model <model>                 Model to use (pass-through to agent)
    --mode <text|json>              Output format (normalized per agent)

${BOLD}EXAMPLES${NC}
    ${name} run "Fix the login bug"
    ${name} run "/rd3:dev-run 0274" --channel codex
    ${name} run "Refactor auth module" --model claude-sonnet-4-6 --mode json
    ${name} run --channel codex -c
    ${name} doctor

${BOLD}EXIT CODES${NC}
    0   Success
    1   No usable Tier-1 agent found
    2   Invalid arguments
    3   Agent execution failed

${BOLD}SLASH-COMMAND TRANSLATION${NC}
    Input format (Claude Code standard): /[plugin]:[command] [args]
    Codex:       $[plugin]-[command] [args]
    Pi:          /skill:[plugin]-[command] [args]
    All others:  /[plugin]-[command] [args]
`,
    );
    process.exit(0);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
    const subcommand = process.argv[2] || 'help';
    const rest = process.argv.slice(3);

    switch (subcommand) {
        case 'run':
            await cmdRun(rest);
            break;
        case 'doctor':
            await cmdDoctor();
            break;
        case 'help':
        case '--help':
        case '-h':
            cmdHelp();
            break;
        default:
            error(`Unknown subcommand: ${subcommand}`);
            process.stderr.write(`Run 'airunner.ts help' for usage.\n`);
            process.exit(2);
    }
}

main().catch((e: unknown) => {
    error(`Unexpected error: ${(e as Error).message}`);
    process.exit(3);
});
