#!/usr/bin/env bun
/**
 * gates.ts — Universal CoV-backed gate evaluator
 *
 * Generalizes the Phase 6 CoV manifest pattern to all phases and replaces
 * placeholder "true" gates with deterministic checks against persisted phase
 * evidence, task-file sections, and CoV human checker nodes.
 */

import { join } from 'node:path';
import type { ChainManifest, Checker, CheckerConfig } from '../../verification-chain/scripts/types';
import type { Phase, PhaseNumber } from './model';

interface GateCheckerDef {
    method: 'cli' | 'file-exists' | 'content-match' | 'compound' | 'human';
    config: Record<string, unknown>;
}

interface GateStepDef {
    name: string;
    command?: string;
    prompt?: string;
    skill?: string;
    expect_worker_envelope?: boolean;
    timeout_seconds?: number;
    execution_channel?: string;
    checker?: GateCheckerDef;
}

interface GateProfileDef {
    id: string;
    label: string;
    required_files?: string[];
    steps: GateStepDef[];
}

export interface PhaseManifestContext {
    project_root: string;
    task_path?: string;
    auto_approve_human_gates: boolean;
    run_artifact_root: string;
}

const GATE_PROFILES: Record<PhaseNumber, GateProfileDef> = {
    1: {
        id: 'phase1-request-intake',
        label: 'Phase 1 Gate (Request Intake)',
        steps: [{ name: 'validate-requirements' }],
    },
    2: {
        id: 'phase2-architecture',
        label: 'Phase 2 Gate (Architecture)',
        steps: [{ name: 'validate-architecture' }],
    },
    3: {
        id: 'phase3-design',
        label: 'Phase 3 Gate (Design)',
        steps: [{ name: 'validate-design' }],
    },
    4: {
        id: 'phase4-decomposition',
        label: 'Phase 4 Gate (Task Decomposition)',
        steps: [{ name: 'validate-decomposition' }],
    },
    5: {
        id: 'phase5-implementation',
        label: 'Phase 5 Gate (Implementation)',
        steps: [{ name: 'validate-artifacts' }],
    },
    6: {
        id: 'phase6-unit-testing',
        label: 'Phase 6 Gate (Unit Testing)',
        steps: [{ name: 'validate-tests' }],
    },
    7: {
        id: 'phase7-code-review',
        label: 'Phase 7 Gate (Code Review)',
        steps: [{ name: 'validate-review' }],
    },
    8: {
        id: 'phase8-functional-review',
        label: 'Phase 8 Gate (Functional Review)',
        steps: [{ name: 'validate-functional' }],
    },
    9: {
        id: 'phase9-documentation',
        label: 'Phase 9 Gate (Documentation)',
        steps: [{ name: 'validate-docs' }],
    },
};

function sanitizeForPath(value: string): string {
    return value.replace(/[^\w.-]+/g, '_');
}

export function getGateEvidencePath(
    _taskRef: string,
    phaseNumber: PhaseNumber,
    stepName: string,
    context: Pick<PhaseManifestContext, 'run_artifact_root'>,
): string {
    const fileName = `phase-${phaseNumber}-${sanitizeForPath(stepName)}.json`;
    return join(context.run_artifact_root, 'gates', fileName);
}

function fileExists(paths: string[]): Checker {
    return {
        method: 'file-exists',
        config: { paths },
    };
}

function contentMatch(file: string, pattern: string, mustExist = true): Checker {
    return {
        method: 'content-match',
        config: { file, pattern, must_exist: mustExist },
    };
}

function compoundAnd(checks: Checker[]): Checker {
    return {
        method: 'compound',
        config: {
            operator: 'and',
            checks,
        } as CheckerConfig,
    };
}

function buildBaseEvidenceChecks(evidencePath: string, phaseNumber: PhaseNumber): Checker[] {
    return [
        fileExists([evidencePath]),
        contentMatch(evidencePath, `"phase"\\s*:\\s*${phaseNumber}`),
        contentMatch(evidencePath, `"status"\\s*:\\s*"completed"`),
    ];
}

function buildTaskSectionPattern(section: string, minimumChars = 10): string {
    return `### ${section}\\n(?:\\n)?(?!\\[)[\\s\\S]{${minimumChars},}?(?=\\n### |$)`;
}

function buildPhaseChecker(phase: Phase, evidencePath: string, context: PhaseManifestContext): Checker {
    const checks = buildBaseEvidenceChecks(evidencePath, phase.number);
    const taskPath = context.task_path;

    switch (phase.number) {
        case 1:
            checks.push(contentMatch(evidencePath, `"has_output"\\s*:\\s*true`));
            if (taskPath && taskPath !== '.') {
                checks.push(
                    contentMatch(
                        taskPath,
                        `(?:^|\\n)profile:\\s*"?(${['simple', 'standard', 'complex', 'research'].join('|')})"?\\s*(?:\\n|$)`,
                    ),
                );
                checks.push(contentMatch(taskPath, buildTaskSectionPattern('Background', 100)));
                checks.push(contentMatch(taskPath, buildTaskSectionPattern('Requirements', 10)));
                checks.push(contentMatch(taskPath, buildTaskSectionPattern('Constraints', 10)));
            }
            break;
        case 2:
        case 3:
        case 8:
        case 9:
            checks.push(contentMatch(evidencePath, `"has_output"\\s*:\\s*true`));
            break;
        case 4:
            checks.push(contentMatch(evidencePath, `"has_output"\\s*:\\s*true`));
            // Verify subtask links in Solution section OR a skip justification
            if (taskPath && taskPath !== '.') {
                checks.push(contentMatch(taskPath, `(?:#### Subtasks|No decomposition needed)`));
            }
            break;
        case 5:
            checks.push(contentMatch(evidencePath, `"has_structured_output"\\s*:\\s*true`));
            checks.push(contentMatch(evidencePath, `"artifacts"\\s*:`));
            checks.push(contentMatch(evidencePath, `"next_step_recommendation"\\s*:`));
            break;
        case 7:
            checks.push(contentMatch(evidencePath, `"has_structured_output"\\s*:\\s*true`));
            checks.push(contentMatch(evidencePath, `"findings"\\s*:`));
            checks.push(contentMatch(evidencePath, `"next_step_recommendation"\\s*:`));
            break;
        default:
            checks.push(contentMatch(evidencePath, `"has_output"\\s*:\\s*true`));
            break;
    }

    return compoundAnd(checks);
}

function buildHumanGateNode(phase: Phase) {
    return {
        name: 'human-approval',
        type: 'single' as const,
        maker: {},
        checker: {
            method: 'human' as const,
            config: {
                prompt: `Phase ${phase.number} (${phase.name}) completed. Approve continuation or reject the phase output.`,
                choices: ['approve', 'reject', 'request_changes'],
            },
        },
    };
}

export function buildPhaseManifest(
    phase: Phase,
    taskRef: string,
    context: PhaseManifestContext,
    gateProfile?: GateProfileDef,
): ChainManifest {
    const profile = gateProfile ?? GATE_PROFILES[phase.number];
    const nodes = [
        ...(profile.required_files
            ? [
                  {
                      name: 'required-files',
                      type: 'single' as const,
                      maker: {},
                      checker: {
                          method: 'file-exists' as const,
                          config: { paths: profile.required_files },
                      },
                  },
              ]
            : []),
        ...profile.steps.map((step) => {
            const evidenceOutputPath = getGateEvidencePath(taskRef, phase.number, step.name, context);
            const checker = step.checker
                ? {
                      method: step.checker.method,
                      config: step.checker.config as unknown as CheckerConfig,
                  }
                : buildPhaseChecker(phase, evidenceOutputPath, context);

            return {
                name: step.name,
                type: 'single' as const,
                maker: {
                    ...(step.command || step.prompt
                        ? {
                              delegate_to: phase.executor,
                              args: {
                                  phase: phase.number,
                                  ...(step.command ? { command: step.command } : {}),
                                  ...(step.prompt ? { prompt: step.prompt } : {}),
                                  step: step.name,
                                  evidence_output_path: evidenceOutputPath,
                                  ...(step.skill ? { downstream_skill: step.skill } : {}),
                                  ...(step.expect_worker_envelope ? { expect_worker_envelope: true } : {}),
                              },
                              ...(step.execution_channel ? { execution_channel: step.execution_channel } : {}),
                              timeout: step.timeout_seconds ?? 3600,
                          }
                        : {}),
                },
                checker,
            };
        }),
    ];

    if ((phase.gate === 'human' || phase.gate === 'auto/human') && !context.auto_approve_human_gates) {
        nodes.push(buildHumanGateNode(phase));
    }

    return {
        chain_id: `${profile.id}-${taskRef}`,
        chain_name: `${profile.label} for ${taskRef}`,
        task_wbs: taskRef,
        on_node_fail: 'halt',
        global_retry: {
            remaining: 1,
            total: 1,
        },
        nodes,
    };
}

export { GATE_PROFILES, type GateProfileDef };
