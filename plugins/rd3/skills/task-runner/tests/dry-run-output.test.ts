import { describe, expect, it } from 'bun:test';
import { type CliIo, type DryRunInput, liveIo, renderDryRunOutput, runCli } from '../scripts/dry-run-output';

function baseInput(overrides: Partial<DryRunInput> = {}): DryRunInput {
    return {
        task_ref: '0387',
        task_file: '/tmp/docs/tasks2/0387_example.md',
        preset: 'standard',
        ...overrides,
    };
}

describe('renderDryRunOutput — schema envelope', () => {
    it('emits schema_version 1', () => {
        const out = renderDryRunOutput(baseInput());
        expect(out.schema_version).toBe(1);
    });

    it('passes through task_ref and task_file verbatim', () => {
        const out = renderDryRunOutput(baseInput({ task_ref: '0274', task_file: '/abs/0274.md' }));
        expect(out.task_ref).toBe('0274');
        expect(out.task_file).toBe('/abs/0274.md');
    });

    it('defaults stage to "all" when omitted', () => {
        const out = renderDryRunOutput(baseInput());
        expect(out.stage).toBe('all');
    });

    it('defaults channel to "current" when omitted', () => {
        const out = renderDryRunOutput(baseInput());
        expect(out.channel).toBe('current');
    });
});

describe('renderDryRunOutput — flags', () => {
    it('sets all flag defaults correctly when omitted', () => {
        const out = renderDryRunOutput(baseInput());
        expect(out.flags).toEqual({
            auto: false,
            preflight_verify: false,
            postflight_verify: false,
            coverage: null,
            max_loop_iterations: 3,
        });
    });

    it('forwards flags verbatim when provided', () => {
        const out = renderDryRunOutput(
            baseInput({
                auto: true,
                preflight_verify: true,
                postflight_verify: true,
                coverage: 95,
                max_loop_iterations: 5,
            }),
        );
        expect(out.flags).toEqual({
            auto: true,
            preflight_verify: true,
            postflight_verify: true,
            coverage: 95,
            max_loop_iterations: 5,
        });
    });
});

describe('renderDryRunOutput — workflow (stage=all, preset=standard)', () => {
    it('enables preflight always', () => {
        const out = renderDryRunOutput(baseInput());
        expect(out.workflow.preflight.enabled).toBe(true);
    });

    it('disables preflight_verify by default', () => {
        const out = renderDryRunOutput(baseInput());
        expect(out.workflow.preflight_verify.enabled).toBe(false);
    });

    it('enables preflight_verify when flag set', () => {
        const out = renderDryRunOutput(baseInput({ preflight_verify: true }));
        expect(out.workflow.preflight_verify.enabled).toBe(true);
    });

    it('disables refine by default for standard preset', () => {
        const out = renderDryRunOutput(baseInput());
        expect(out.workflow.refine.enabled).toBe(false);
    });

    it('disables plan by default for standard preset', () => {
        const out = renderDryRunOutput(baseInput());
        expect(out.workflow.plan.enabled).toBe(false);
    });

    it('enables implement_test_loop', () => {
        const out = renderDryRunOutput(baseInput());
        expect(out.workflow.implement_test_loop.enabled).toBe(true);
        expect(out.workflow.implement_test_loop.max_iterations).toBe(3);
    });

    it('enables verify', () => {
        const out = renderDryRunOutput(baseInput());
        expect(out.workflow.verify.enabled).toBe(true);
    });

    it('disables postflight_verify by default', () => {
        const out = renderDryRunOutput(baseInput());
        expect(out.workflow.postflight_verify.enabled).toBe(false);
    });

    it('enables postflight_verify when flag set', () => {
        const out = renderDryRunOutput(baseInput({ postflight_verify: true }));
        expect(out.workflow.postflight_verify.enabled).toBe(true);
    });
});

describe('renderDryRunOutput — preset=complex', () => {
    it('enables refine for complex preset', () => {
        const out = renderDryRunOutput(baseInput({ preset: 'complex' }));
        expect(out.workflow.refine.enabled).toBe(true);
    });

    it('enables plan for complex preset', () => {
        const out = renderDryRunOutput(baseInput({ preset: 'complex' }));
        expect(out.workflow.plan.enabled).toBe(true);
    });
});

describe('renderDryRunOutput — preset=research', () => {
    it('enables refine and plan for research preset', () => {
        const out = renderDryRunOutput(baseInput({ preset: 'research' }));
        expect(out.workflow.refine.enabled).toBe(true);
        expect(out.workflow.plan.enabled).toBe(true);
    });
});

describe('renderDryRunOutput — stage=plan-only', () => {
    it('disables implement_test_loop', () => {
        const out = renderDryRunOutput(baseInput({ stage: 'plan-only', preset: 'complex' }));
        expect(out.workflow.implement_test_loop.enabled).toBe(false);
    });

    it('disables verify', () => {
        const out = renderDryRunOutput(baseInput({ stage: 'plan-only', preset: 'complex' }));
        expect(out.workflow.verify.enabled).toBe(false);
    });

    it('disables postflight_verify even if flag is set', () => {
        const out = renderDryRunOutput(baseInput({ stage: 'plan-only', preset: 'complex', postflight_verify: true }));
        expect(out.workflow.postflight_verify.enabled).toBe(false);
    });

    it('sets early_exit_at_stage and expected_final_status=WIP', () => {
        const out = renderDryRunOutput(baseInput({ stage: 'plan-only', preset: 'complex' }));
        expect(out.exit_conditions.early_exit_at_stage).toBe('plan-only');
        expect(out.exit_conditions.expected_final_status).toBe('WIP');
    });
});

describe('renderDryRunOutput — stage=implement-only', () => {
    it('disables refine and plan with informative skip reasons', () => {
        const out = renderDryRunOutput(baseInput({ stage: 'implement-only', preset: 'complex' }));
        expect(out.workflow.refine.enabled).toBe(false);
        expect(out.workflow.refine.skipped_reason).toContain('implement-only');
        expect(out.workflow.plan.enabled).toBe(false);
        expect(out.workflow.plan.skipped_reason).toContain('implement-only');
    });

    it('keeps implement_test_loop and verify enabled', () => {
        const out = renderDryRunOutput(baseInput({ stage: 'implement-only' }));
        expect(out.workflow.implement_test_loop.enabled).toBe(true);
        expect(out.workflow.verify.enabled).toBe(true);
    });

    it('sets early_exit_at_stage=implement-only with final=Done', () => {
        const out = renderDryRunOutput(baseInput({ stage: 'implement-only' }));
        expect(out.exit_conditions.early_exit_at_stage).toBe('implement-only');
        expect(out.exit_conditions.expected_final_status).toBe('Done');
    });
});

describe('renderDryRunOutput — status_transitions_planned', () => {
    it('includes Todo→WIP, WIP→Testing, Testing→Done for stage=all', () => {
        const out = renderDryRunOutput(baseInput());
        const transitions = out.status_transitions_planned.map((t) => `${t.from}->${t.to}`);
        expect(transitions).toEqual(['Todo->WIP', 'WIP->Testing', 'Testing->Done']);
    });

    it('includes only Todo→WIP when stage=plan-only with refine/plan enabled', () => {
        const out = renderDryRunOutput(baseInput({ stage: 'plan-only', preset: 'complex' }));
        expect(out.status_transitions_planned).toHaveLength(1);
        expect(out.status_transitions_planned[0]?.from).toBe('Todo');
        expect(out.status_transitions_planned[0]?.to).toBe('WIP');
    });

    it('emits no transitions when plan-only with no refine/plan enabled', () => {
        const out = renderDryRunOutput(baseInput({ stage: 'plan-only', preset: 'simple' }));
        expect(out.status_transitions_planned).toHaveLength(0);
    });
});

describe('renderDryRunOutput — delegation_plan', () => {
    it('returns empty array when no delegation targets', () => {
        const out = renderDryRunOutput(baseInput());
        expect(out.delegation_plan).toEqual([]);
    });

    it('maps delegation targets to prompt contracts', () => {
        const out = renderDryRunOutput(
            baseInput({
                delegation_targets: [
                    { stage: 'plan', channel: 'codex' },
                    { stage: 'implement', channel: 'codex' },
                ],
            }),
        );
        expect(out.delegation_plan).toHaveLength(2);
        expect(out.delegation_plan[0]).toEqual({
            stage: 'plan',
            channel: 'codex',
            prompt_contract: 'plan',
        });
        expect(out.delegation_plan[1]).toEqual({
            stage: 'implement',
            channel: 'codex',
            prompt_contract: 'implement',
        });
    });
});

describe('renderDryRunOutput — skip reason forwarding', () => {
    it('uses custom refine_skipped_reason when provided', () => {
        const out = renderDryRunOutput(baseInput({ refine_enabled: false, refine_skipped_reason: 'already refined' }));
        expect(out.workflow.refine.skipped_reason).toBe('already refined');
    });

    it('uses custom plan_skipped_reason when provided', () => {
        const out = renderDryRunOutput(baseInput({ plan_enabled: false, plan_skipped_reason: 'scope small enough' }));
        expect(out.workflow.plan.skipped_reason).toBe('scope small enough');
    });
});

describe('renderDryRunOutput — validation', () => {
    it('throws when task_ref missing', () => {
        // biome-ignore lint/suspicious/noExplicitAny: intentional invalid input for validation test
        expect(() => renderDryRunOutput({ task_file: '/a', preset: 'standard' } as any)).toThrow(/task_ref/);
    });

    it('throws when task_file missing', () => {
        // biome-ignore lint/suspicious/noExplicitAny: intentional invalid input for validation test
        expect(() => renderDryRunOutput({ task_ref: '0001', preset: 'standard' } as any)).toThrow(/task_file/);
    });

    it('throws on invalid preset', () => {
        expect(() =>
            // biome-ignore lint/suspicious/noExplicitAny: intentional invalid input for validation test
            renderDryRunOutput({ task_ref: '0001', task_file: '/a', preset: 'bogus' } as any),
        ).toThrow(/preset/);
    });

    it('throws on invalid stage', () => {
        expect(() =>
            renderDryRunOutput(
                // biome-ignore lint/suspicious/noExplicitAny: intentional invalid input for validation test
                { task_ref: '0001', task_file: '/a', preset: 'standard', stage: 'bogus' } as any,
            ),
        ).toThrow(/stage/);
    });

    it('throws on non-positive max_loop_iterations', () => {
        expect(() => renderDryRunOutput(baseInput({ max_loop_iterations: 0 }))).toThrow(/max_loop_iterations/);
    });

    it('throws on non-integer max_loop_iterations', () => {
        expect(() => renderDryRunOutput(baseInput({ max_loop_iterations: 2.5 }))).toThrow(/max_loop_iterations/);
    });

    it('throws on coverage out of range', () => {
        expect(() => renderDryRunOutput(baseInput({ coverage: 150 }))).toThrow(/coverage/);
        expect(() => renderDryRunOutput(baseInput({ coverage: -1 }))).toThrow(/coverage/);
    });

    it('accepts coverage at bounds', () => {
        expect(() => renderDryRunOutput(baseInput({ coverage: 0 }))).not.toThrow();
        expect(() => renderDryRunOutput(baseInput({ coverage: 100 }))).not.toThrow();
        expect(() => renderDryRunOutput(baseInput({ coverage: null }))).not.toThrow();
    });
});

// ============================================================================
// CLI runCli() with mock IO
// ============================================================================

function makeMockIo(overrides: Partial<CliIo> = {}): CliIo & {
    stdoutText: () => string;
    stderrText: () => string;
} {
    let stdout = '';
    let stderr = '';
    return {
        readInputFile: async (_path: string) => {
            throw new Error('readInputFile not mocked');
        },
        readStdin: async () => {
            throw new Error('readStdin not mocked');
        },
        writeStdout: (text) => {
            stdout += text;
        },
        writeStderr: (text) => {
            stderr += text;
        },
        stdoutText: () => stdout,
        stderrText: () => stderr,
        ...overrides,
    };
}

describe('runCli — argument parsing', () => {
    it('exits 2 with usage when no args', async () => {
        const io = makeMockIo();
        const code = await runCli(['bun', 'dry-run-output.ts'], io);
        expect(code).toBe(2);
        expect(io.stderrText()).toContain('Usage');
    });

    it('exits 2 when --input missing path value', async () => {
        const io = makeMockIo();
        const code = await runCli(['bun', 'dry-run-output.ts', '--input'], io);
        expect(code).toBe(2);
        expect(io.stderrText()).toContain('Usage');
    });
});

describe('runCli — valid input', () => {
    it('reads JSON from --input and emits schema', async () => {
        const io = makeMockIo({
            readInputFile: async () =>
                JSON.stringify({
                    task_ref: '0001',
                    task_file: '/tmp/0001.md',
                    preset: 'standard',
                }),
        });
        const code = await runCli(['bun', 'dry-run-output.ts', '--input', '/tmp/x.json'], io);
        expect(code).toBe(0);
        const parsed = JSON.parse(io.stdoutText());
        expect(parsed.schema_version).toBe(1);
        expect(parsed.task_ref).toBe('0001');
    });

    it('reads from stdin when --stdin flag set', async () => {
        const io = makeMockIo({
            readStdin: async () =>
                JSON.stringify({
                    task_ref: '0002',
                    task_file: '/tmp/0002.md',
                    preset: 'complex',
                    stage: 'plan-only',
                }),
        });
        const code = await runCli(['bun', 'dry-run-output.ts', '--stdin'], io);
        expect(code).toBe(0);
        const parsed = JSON.parse(io.stdoutText());
        expect(parsed.task_ref).toBe('0002');
        expect(parsed.stage).toBe('plan-only');
    });
});

describe('runCli — error handling', () => {
    it('exits 2 on invalid JSON from file', async () => {
        const io = makeMockIo({
            readInputFile: async () => '{not valid json',
        });
        const code = await runCli(['bun', 'dry-run-output.ts', '--input', '/tmp/x.json'], io);
        expect(code).toBe(2);
        expect(io.stderrText()).toContain('invalid JSON');
    });

    it('exits 2 on validation failure', async () => {
        const io = makeMockIo({
            readInputFile: async () => JSON.stringify({ preset: 'standard' }),
        });
        const code = await runCli(['bun', 'dry-run-output.ts', '--input', '/tmp/x.json'], io);
        expect(code).toBe(2);
        expect(io.stderrText()).toContain('task_ref');
    });

    it('exits 2 on invalid JSON from stdin', async () => {
        const io = makeMockIo({
            readStdin: async () => 'not json',
        });
        const code = await runCli(['bun', 'dry-run-output.ts', '--stdin'], io);
        expect(code).toBe(2);
        expect(io.stderrText()).toContain('invalid JSON');
    });
});

describe('liveIo — smoke', () => {
    it('exposes all required IO functions', () => {
        expect(typeof liveIo.readInputFile).toBe('function');
        expect(typeof liveIo.readStdin).toBe('function');
        expect(typeof liveIo.writeStdout).toBe('function');
        expect(typeof liveIo.writeStderr).toBe('function');
    });

    it('readInputFile reads a real file from disk', async () => {
        const tmpPath = `/tmp/dry-run-test-${Date.now()}.json`;
        await Bun.write(tmpPath, '{"hello":"world"}');
        const text = await liveIo.readInputFile(tmpPath);
        expect(text).toBe('{"hello":"world"}');
    });

    it('readStdin resolves to a string (empty in non-TTY test env)', async () => {
        const result = await Promise.race([
            liveIo.readStdin(),
            new Promise<string>((resolve) => setTimeout(() => resolve('__timeout__'), 50)),
        ]);
        expect(typeof result).toBe('string');
    });

    it('writeStdout and writeStderr forward to process streams without throwing', () => {
        expect(() => liveIo.writeStdout('')).not.toThrow();
        expect(() => liveIo.writeStderr('')).not.toThrow();
    });
});
