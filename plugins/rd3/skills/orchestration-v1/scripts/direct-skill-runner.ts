#!/usr/bin/env bun
/**
 * direct-skill-runner.ts — Native direct-skill phase runner
 *
 * Executes phases 1-4 and 8-9 by delegating directly to their
 * underlying skills on the `current` channel. Unlike worker-agent
 * phases (5-7) that use prompt-based acpx delegation with JSON
 * worker envelopes, direct-skill phases execute the prompt locally
 * and surface the execution result directly.
 *
 * Constraint: Direct-skill phases ONLY execute on the `current` channel.
 */

import { createExecutorForChannel } from './executors';
import type { Phase, PhaseNumber } from './model';
import type { PhaseEvidence, PhaseRunner, PhaseRunnerContext, PhaseRunnerResult } from './runtime';

type DirectSkillPhase = 1 | 2 | 3 | 4 | 8 | 9;

const DIRECT_SKILL_PHASES = new Set<DirectSkillPhase>([1, 2, 3, 4, 8, 9]);

interface DirectSkillPromptConfig {
    phase: DirectSkillPhase;
    skill: string;
    buildPrompt: (phase: Phase, context: PhaseRunnerContext) => string;
}

const DIRECT_SKILL_PROMPTS: Record<DirectSkillPhase, DirectSkillPromptConfig> = {
    1: {
        phase: 1,
        skill: 'rd3:request-intake',
        buildPrompt: (phase, context) =>
            [
                `Execute Phase 1 (${phase.name}) via skill \`${phase.skill}\`.`,
                `Task ref: ${context.plan.task_ref}`,
                context.state.refine_mode ? 'Mode: refine' : '',
                '',
                'Analyze the task requirements and produce enriched Background, Requirements, Constraints, and Profile sections.',
                'Return a structured result with background, requirements, constraints, and profile fields.',
                '',
                context.rework_feedback ? `Rework feedback from previous attempt:\n${context.rework_feedback}` : '',
            ]
                .filter(Boolean)
                .join('\n'),
    },
    2: {
        phase: 2,
        skill: 'rd3:backend-architect',
        buildPrompt: (phase, context) =>
            [
                `Execute Phase 2 (${phase.name}) via skill \`${phase.skill}\`.`,
                `Task ref: ${context.plan.task_ref}`,
                '',
                'Design the architecture for the task based on requirements.',
                'Return a structured architecture document with system boundaries and key decisions.',
                '',
                context.rework_feedback ? `Rework feedback from previous attempt:\n${context.rework_feedback}` : '',
            ]
                .filter(Boolean)
                .join('\n'),
    },
    3: {
        phase: 3,
        skill: 'rd3:backend-design',
        buildPrompt: (phase, context) =>
            [
                `Execute Phase 3 (${phase.name}) via skill \`${phase.skill}\`.`,
                `Task ref: ${context.plan.task_ref}`,
                '',
                'Produce detailed design specifications based on the architecture.',
                'Return structured design specs with interfaces, data models, and implementation details.',
                '',
                context.rework_feedback ? `Rework feedback from previous attempt:\n${context.rework_feedback}` : '',
            ]
                .filter(Boolean)
                .join('\n'),
    },
    4: {
        phase: 4,
        skill: 'rd3:task-decomposition',
        buildPrompt: (phase, context) =>
            [
                `Execute Phase 4 (${phase.name}) via skill \`${phase.skill}\`.`,
                `Task ref: ${context.plan.task_ref}`,
                '',
                '## Step 1: Evaluate Decomposition Need',
                '',
                'Read the task file — especially Background and Requirements sections — and apply these decision rules:',
                '',
                '**DECOMPOSE when ANY condition is met:**',
                '- D1: Requirements list 3+ distinct deliverables targeting different components/files',
                '- D2: Implementation touches 3+ source files across different modules/directories',
                '- D3: Estimated effort exceeds 4 hours (half-day threshold)',
                '- D4: Task spans multiple layers (e.g., backend + frontend, DB + API + UI)',
                '',
                '**Do NOT decompose when ALL are true:**',
                '- S1: Single deliverable targeting 1-2 files in the same module',
                '- S2: Estimated effort under 4 hours',
                '- S3: No cross-layer or cross-module dependencies',
                '',
                'If skipping decomposition, write a justification in the Solution section:',
                '"No decomposition needed: [reason], ~Xh estimated effort, no cross-module dependencies."',
                '',
                '## Step 2: Decompose (if needed)',
                '',
                'Break the task into subtasks at 2-8 hour granularity. Create subtask files via `tasks create`.',
                'Then write the subtask list into the parent task Solution section using this exact format:',
                '',
                '```',
                '### Solution',
                '',
                '#### Subtasks',
                '',
                '- [ ] [0101 - Subtask description](0101_0100_subtask_name.md)',
                '- [ ] [0102 - Another subtask](0102_0100_another_subtask.md)',
                '',
                '**Dependency order:** 0101 → 0102',
                '**Estimated total effort:** X-Y hours',
                '```',
                '',
                '## Step 3: Update Parent Status',
                '',
                'After writing subtasks, run: `tasks update <parent-WBS> decomposed` (maps to Done).',
                'This signals the task has been decomposed into subtasks.',
                '',
                context.rework_feedback ? `## Rework Feedback\n${context.rework_feedback}` : '',
            ]
                .filter(Boolean)
                .join('\n'),
    },
    8: {
        phase: 8,
        skill: 'rd3:bdd-workflow',
        buildPrompt: (phase, context) =>
            [
                `Execute Phase 8 (${phase.name}) via skills \`${phase.skill}\`.`,
                `Task ref: ${context.plan.task_ref}`,
                '',
                'Generate and execute BDD scenarios, then perform requirements traceability review.',
                'Return a verdict (pass/partial/fail) with covered and missing requirements.',
                '',
                context.rework_feedback ? `Rework feedback from previous attempt:\n${context.rework_feedback}` : '',
            ]
                .filter(Boolean)
                .join('\n'),
    },
    9: {
        phase: 9,
        skill: 'rd3:code-docs',
        buildPrompt: (phase, context) =>
            [
                `Execute Phase 9 (${phase.name}) via skill \`${phase.skill}\`.`,
                `Task ref: ${context.plan.task_ref}`,
                '',
                'Refresh cumulative project documentation affected by this task.',
                'Return a summary of refreshed docs.',
                '',
                context.rework_feedback ? `Rework feedback from previous attempt:\n${context.rework_feedback}` : '',
            ]
                .filter(Boolean)
                .join('\n'),
    },
};

export function isDirectSkillPhase(phaseNumber: PhaseNumber): phaseNumber is DirectSkillPhase {
    return DIRECT_SKILL_PHASES.has(phaseNumber as DirectSkillPhase);
}

export function buildDirectSkillPrompt(phase: Phase, context: PhaseRunnerContext): string {
    if (!isDirectSkillPhase(phase.number)) {
        throw new Error(`Direct-skill prompt requested for unsupported phase ${phase.number} (${phase.name})`);
    }

    return DIRECT_SKILL_PROMPTS[phase.number].buildPrompt(phase, context);
}

function parseDirectSkillOutput(stdout?: string): Record<string, unknown> | undefined {
    const trimmed = stdout?.trim();
    if (!trimmed) {
        return undefined;
    }

    try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
        }
    } catch {
        // Direct-skill phases may return plain text; keep it as output instead.
    }

    return { output: trimmed };
}

export function createDirectSkillRunner(
    executorOptions: Parameters<typeof createExecutorForChannel>[1] = {},
): PhaseRunner {
    return async (phase, context): Promise<PhaseRunnerResult> => {
        if (!isDirectSkillPhase(phase.number)) {
            return {
                status: 'failed',
                error: `Direct-skill runner does not support phase ${phase.number} (${phase.name})`,
            };
        }

        if (context.plan.execution_channel !== 'current') {
            return {
                status: 'failed',
                error: `Direct-skill phases only execute on the 'current' channel. Requested channel: '${context.plan.execution_channel}'`,
            };
        }

        const config = DIRECT_SKILL_PROMPTS[phase.number];
        const prompt = buildDirectSkillPrompt(phase, context);
        const executor = createExecutorForChannel(context.plan.execution_channel, executorOptions);
        const execution = await executor.execute({
            channel: context.plan.execution_channel,
            cwd: context.projectRoot,
            timeout_ms: 60 * 60 * 1000,
            prompt,
            metadata: {
                skill: config.skill,
                task_ref: context.plan.task_ref,
                phase: phase.number,
            },
        });

        const evidence: PhaseEvidence[] = [
            {
                kind: 'direct-skill-dispatch',
                detail: `phase ${phase.number} dispatched to ${config.skill} via direct-skill runner`,
                payload: {
                    phase: phase.number,
                    skill: config.skill,
                    execution_mode: 'direct-skill',
                },
            },
            {
                kind: 'direct-skill-execution',
                detail: `phase ${phase.number} direct-skill execution finished with status ${execution.status} via ${execution.backend}`,
                payload: {
                    backend: execution.backend,
                    normalized_channel: execution.normalized_channel,
                    ...(execution.prompt_agent ? { prompt_agent: execution.prompt_agent } : {}),
                    ...(execution.exit_code !== undefined ? { exit_code: execution.exit_code } : {}),
                },
            },
        ];

        if (execution.status !== 'completed') {
            return {
                status: execution.status,
                evidence,
                error:
                    execution.error ??
                    `Direct-skill execution returned status ${execution.status} for phase ${phase.number}`,
                result: {
                    phase: phase.number,
                    status: execution.status,
                    prompt,
                },
            };
        }

        const parsedOutput = parseDirectSkillOutput(execution.stdout);
        return {
            status: 'completed',
            evidence,
            result: {
                phase: phase.number,
                status: 'completed',
                evidence_summary: `Direct-skill phase ${phase.number} (${phase.name}) delegated to ${config.skill}`,
                next_step_recommendation: `Proceed to next phase after ${phase.name}`,
                prompt,
                ...(parsedOutput ?? {}),
            },
        };
    };
}
