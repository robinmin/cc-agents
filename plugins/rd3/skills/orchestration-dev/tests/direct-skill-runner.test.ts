import { describe, expect, test } from 'bun:test';
import { createDirectSkillRunner, isDirectSkillPhase } from '../scripts/direct-skill-runner';
import type { Phase } from '../scripts/model';
import type { PhaseRunnerContext } from '../scripts/runtime';
import { generateExecutionPlan } from '../scripts/plan';

function makePhase(number: number): Phase {
    const plan = generateExecutionPlan('0292', 'complex');
    const phase = plan.phases.find((p) => p.number === number);
    if (!phase) {
        throw new Error(`Phase ${number} not found in complex profile`);
    }
    return phase;
}

function makeContext(overrides: Partial<PhaseRunnerContext> = {}): PhaseRunnerContext {
    const plan = generateExecutionPlan('0292', 'complex');
    return {
        plan,
        state: {
            task_ref: plan.task_ref,
            profile: plan.profile,
            execution_channel: 'current',
            coverage_threshold: plan.coverage_threshold,
            status: 'running',
            auto_approve_human_gates: false,
            refine_mode: false,
            dry_run: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            phases: [],
        },
        stateDir: '/tmp',
        projectRoot: '/tmp',
        ...overrides,
    };
}

describe('direct-skill-runner', () => {
    describe('isDirectSkillPhase', () => {
        test('returns true for phases 1-4 and 8-9', () => {
            expect(isDirectSkillPhase(1)).toBe(true);
            expect(isDirectSkillPhase(2)).toBe(true);
            expect(isDirectSkillPhase(3)).toBe(true);
            expect(isDirectSkillPhase(4)).toBe(true);
            expect(isDirectSkillPhase(8)).toBe(true);
            expect(isDirectSkillPhase(9)).toBe(true);
        });

        test('returns false for worker-agent phases 5-7', () => {
            expect(isDirectSkillPhase(5)).toBe(false);
            expect(isDirectSkillPhase(6)).toBe(false);
            expect(isDirectSkillPhase(7)).toBe(false);
        });
    });

    describe('createDirectSkillRunner', () => {
        function createRunner() {
            return createDirectSkillRunner({
                local: {
                    runPrompt: (prompt) => ({
                        status: 'completed',
                        backend: 'local-child',
                        normalized_channel: 'current',
                        stdout: JSON.stringify({
                            prompt_echo: prompt,
                        }),
                    }),
                },
            });
        }

        test('returns completed for phase 1 on current channel', async () => {
            const runner = createRunner();
            const result = await runner(makePhase(1), makeContext());

            expect(result.status).toBe('completed');
            expect(result.result?.phase).toBe(1);
            expect(result.result?.status).toBe('completed');
        });

        test('returns completed for phase 2 on current channel', async () => {
            const runner = createRunner();
            const result = await runner(makePhase(2), makeContext());

            expect(result.status).toBe('completed');
        });

        test('returns completed for phase 3 on current channel', async () => {
            const runner = createRunner();
            const result = await runner(makePhase(3), makeContext());

            expect(result.status).toBe('completed');
        });

        test('returns completed for phase 4 on current channel', async () => {
            const runner = createRunner();
            const result = await runner(makePhase(4), makeContext());

            expect(result.status).toBe('completed');
        });

        test('returns completed for phase 8 on current channel', async () => {
            const runner = createRunner();
            const result = await runner(makePhase(8), makeContext());

            expect(result.status).toBe('completed');
        });

        test('returns completed for phase 9 on current channel', async () => {
            const runner = createRunner();
            const result = await runner(makePhase(9), makeContext());

            expect(result.status).toBe('completed');
        });

        test('fails for non-current channel', async () => {
            const runner = createRunner();
            const result = await runner(
                makePhase(1),
                makeContext({
                    plan: {
                        ...makeContext().plan,
                        execution_channel: 'codex',
                    },
                }),
            );

            expect(result.status).toBe('failed');
            expect(result.error).toContain("only execute on the 'current' channel");
        });

        test('fails for worker-agent phases', async () => {
            const runner = createRunner();
            const result = await runner(makePhase(5), makeContext());

            expect(result.status).toBe('failed');
            expect(result.error).toContain('does not support phase 5');
        });

        test('includes direct-skill-dispatch evidence', async () => {
            const runner = createRunner();
            const result = await runner(makePhase(1), makeContext());

            expect(result.evidence?.[0]?.kind).toBe('direct-skill-dispatch');
            expect(result.evidence?.[0]?.payload).toHaveProperty('skill');
        });

        test('includes prompt in result', async () => {
            const runner = createRunner();
            const result = await runner(makePhase(1), makeContext());

            expect(typeof result.result?.prompt).toBe('string');
            expect((result.result?.prompt as string).length).toBeGreaterThan(0);
        });

        test('includes rework feedback in prompt when present', async () => {
            const runner = createRunner();
            const ctx = makeContext();
            ctx.rework_feedback = 'Previous attempt failed: missing requirements';
            const result = await runner(makePhase(1), ctx);

            expect(result.status).toBe('completed');
            expect(result.result?.prompt).toContain('Previous attempt failed');
        });

        test('uses refine mode in phase 1 prompt', async () => {
            const runner = createRunner();
            const ctx = makeContext();
            ctx.state.refine_mode = true;
            const result = await runner(makePhase(1), ctx);

            expect(result.status).toBe('completed');
            expect(result.result?.prompt).toContain('Mode: refine');
        });

        test('fails when the underlying direct-skill execution fails', async () => {
            const runner = createDirectSkillRunner({
                local: {
                    runPrompt: () => ({
                        status: 'failed',
                        backend: 'local-child',
                        normalized_channel: 'current',
                        error: 'prompt execution failed',
                    }),
                },
            });

            const result = await runner(makePhase(1), makeContext());

            expect(result.status).toBe('failed');
            expect(result.error).toContain('prompt execution failed');
            expect(result.evidence?.[1]?.kind).toBe('direct-skill-execution');
        });
    });
});
