/**
 * orchestration-v2 — Gate Evaluator
 *
 * Extracted gate evaluation logic from PipelineRunner.
 * Handles command, auto, and human gate types with proper state management.
 */

import type {
    GateConfig,
    GateResult,
    ChainState,
    OrchestratorEvent,
    PhaseEvidence,
    VerificationDriver,
    ChainManifest,
} from '../model';
import type { StateManager } from '../state/manager';
import type { EventBus } from '../observability/event-bus';
import { parseYamlString } from '../config/parser';
import { logger } from '../../../../scripts/logger';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_AUTO_GATE_PROMPT_TEMPLATE = `You are a verification checker. For each item in the checklist, determine if it PASSES or FAILS.

Checklist:
{items}

For each item, output exactly one line in this format:
[PASS] criterion: reason
[FAIL] criterion: reason

Be strict in your evaluation.`;

export interface GateEvaluatorDependencies {
    readonly state: StateManager;
    readonly verificationDriver: VerificationDriver;
    readonly eventBus: EventBus;
}

export class GateEvaluator {
    private readonly state: StateManager;
    private readonly verificationDriver: VerificationDriver;
    private readonly eventBus: EventBus;

    constructor({ state, verificationDriver, eventBus }: GateEvaluatorDependencies) {
        this.state = state;
        this.verificationDriver = verificationDriver;
        this.eventBus = eventBus;
    }

    async evaluate(
        runId: string,
        phaseName: string,
        gate?: GateConfig,
        taskRef?: string,
        phaseEvidence?: PhaseEvidence,
        phaseSkill?: string,
        auto?: boolean,
    ): Promise<ChainState> {
        if (!gate) {
            return { status: 'pass', results: [] };
        }

        let result: ChainState;
        if (gate.type === 'command') {
            result = await this.checkCommandGate(runId, phaseName, gate, taskRef);
        } else if (gate.type === 'auto') {
            result = await this.checkAutoGate(runId, phaseName, gate, phaseEvidence, phaseSkill);
        } else if (gate.type === 'human') {
            result = this.checkHumanGate(runId, phaseName, gate, phaseEvidence, auto);
        } else {
            return { status: 'pass', results: [] };
        }

        for (const gateResult of result.results) {
            await this.state.saveGateResult(gateResult);
        }

        if (result.results.length > 0) {
            await this.emitEvent(runId, 'gate.evaluated', {
                phase: phaseName,
                gate_type: gate.type,
                passed: result.status === 'pass',
                duration_ms: result.results.reduce((total, item) => total + (item.duration_ms ?? 0), 0),
            });
        }

        return result;
    }

    /**
     * Resolve checklist for auto gate using precedence:
     * 1. Pipeline YAML explicit checklist
     * 2. Engine defaults
     */
    private resolveAutoChecklist(
        gate: GateConfig,
        skillRef?: string,
    ): { checklist: string[]; source: 'yaml' | 'skill' | 'engine' } {
        if (gate.checklist && gate.checklist.length > 0) {
            return { checklist: [...gate.checklist], source: 'yaml' };
        }

        const skillDefaults = skillRef ? this.loadSkillAutoGateDefaults(skillRef) : null;
        if (skillDefaults?.checklist && skillDefaults.checklist.length > 0) {
            return { checklist: [...skillDefaults.checklist], source: 'skill' };
        }
        return {
            checklist: ['Phase completed successfully without errors', 'Output is consistent with task requirements'],
            source: 'engine',
        };
    }

    /**
     * Real auto gate: uses verification-chain llm checker.
     * Builds LlmCheckerConfig from gate config + evidence, runs LLM check,
     * normalizes results into orchestration-v2 ChainState.
     */
    private async checkAutoGate(
        runId: string,
        phaseName: string,
        gate: GateConfig,
        phaseEvidence?: PhaseEvidence,
        skillRef?: string,
    ): Promise<ChainState> {
        const resolvedChecklist = this.resolveAutoChecklist(gate, skillRef);

        const severity = gate.severity ?? 'blocking';
        const promptTemplate = this.buildAutoGatePromptTemplate(
            gate.prompt_template ?? this.loadSkillAutoGateDefaults(skillRef ?? '')?.prompt_template,
            phaseEvidence,
        );

        const manifest: ChainManifest = {
            run_id: runId,
            phase_name: phaseName,
            checks: [
                {
                    name: 'auto-gate',
                    method: 'llm',
                    params: {
                        checklist: resolvedChecklist.checklist,
                        ...(promptTemplate && { prompt_template: promptTemplate }),
                    },
                },
            ],
        };

        const chainState = await this.verificationDriver.runChain(manifest);
        const driverResult = chainState.results[0];

        // Construct new gate evidence with runner-specific context
        const gateEvidence: Record<string, unknown> = {
            ...(driverResult.evidence ?? {}),
            severity,
            source: resolvedChecklist.source,
        };
        if (phaseEvidence) {
            gateEvidence.phase_evidence = phaseEvidence;
        }

        const passed = driverResult.passed;
        const isAdvisory = !passed && severity === 'advisory';

        const gateResult: GateResult = {
            ...driverResult,
            evidence: gateEvidence,
            ...(isAdvisory && { advisory: true }),
        };

        let status = chainState.status;
        if (isAdvisory) {
            logger.warn(
                `[gate] Advisory failure for phase ${phaseName}: ${driverResult.evidence?.error ?? 'checklist items failed'}`,
            );
            await this.emitEvent(runId, 'gate.advisory_fail', {
                phase: phaseName,
                checklist_failures: ((driverResult.evidence?.checklist as { item: string; passed: boolean }[]) ?? [])
                    .filter((r) => !r.passed)
                    .map((r) => r.item),
            });
            // Advisory failure still counts as pass for pipeline flow
            status = 'pass';
        }

        return {
            status,
            results: [gateResult],
        };
    }

    /**
     * Check human gate with blocking/advisory logic.
     *
     * Human gates with `blocking: true` MUST pause pipeline regardless of --auto flag.
     * Human gates with `blocking: false` (default) can be bypassed by --auto flag.
     *
     * Design decision: Human gates are blocking by default (safer defaults).
     * Explicit `blocking: false` is needed for advisory gates where LLM review suffices.
     */
    private checkHumanGate(
        runId: string,
        phaseName: string,
        gate: GateConfig,
        phaseEvidence?: PhaseEvidence,
        auto?: boolean,
    ): ChainState {
        // Blocking human gates ALWAYS pause regardless of --auto flag
        // Use case: PR review gate where human approval is mandatory
        if (gate.blocking === true) {
            return {
                status: 'pending',
                results: [
                    {
                        run_id: runId,
                        phase_name: phaseName,
                        step_name: 'human-gate',
                        checker_method: 'human',
                        passed: false,
                        evidence: {
                            blocking: true,
                            prompt: gate.prompt ?? `Approval required for phase ${phaseName}`,
                            ...(phaseEvidence ? { phase_evidence: phaseEvidence } : {}),
                        },
                        duration_ms: 0,
                        created_at: new Date(),
                    },
                ],
            };
        }

        // Advisory human gates: bypass if --auto is set
        // Use case: Optional review where LLM review is sufficient
        if (auto === true) {
            logger.info(`[gate] Human gate for phase ${phaseName} bypassed (advisory, --auto set)`);
            return {
                status: 'pass',
                results: [
                    {
                        run_id: runId,
                        phase_name: phaseName,
                        step_name: 'human-gate',
                        checker_method: 'human',
                        passed: true,
                        advisory: true,
                        evidence: {
                            blocking: false,
                            auto_bypassed: true,
                            prompt: gate.prompt ?? `Approval required for phase ${phaseName}`,
                            ...(phaseEvidence ? { phase_evidence: phaseEvidence } : {}),
                        },
                        duration_ms: 0,
                        created_at: new Date(),
                    },
                ],
            };
        }

        // Non-blocking gate without --auto: pause for human approval
        return {
            status: 'pending',
            results: [
                {
                    run_id: runId,
                    phase_name: phaseName,
                    step_name: 'human-gate',
                    checker_method: 'human',
                    passed: false,
                    evidence: {
                        blocking: false,
                        prompt: gate.prompt ?? `Approval required for phase ${phaseName}`,
                        ...(phaseEvidence ? { phase_evidence: phaseEvidence } : {}),
                    },
                    duration_ms: 0,
                    created_at: new Date(),
                },
            ],
        };
    }

    private async checkCommandGate(
        runId: string,
        phaseName: string,
        gate: GateConfig,
        taskRef?: string,
    ): Promise<ChainState> {
        const rawCommand = gate.command ?? '';
        if (!rawCommand) {
            return {
                status: 'fail',
                results: [
                    {
                        run_id: runId,
                        phase_name: phaseName,
                        step_name: 'command-gate',
                        checker_method: 'command',
                        passed: false,
                        evidence: { error: 'No command specified for command gate' },
                        duration_ms: 0,
                        created_at: new Date(),
                    },
                ],
            };
        }

        const command = this.substituteTemplate(rawCommand, {
            task_ref: taskRef ?? '',
            phase: phaseName,
            run_id: runId,
        });

        const startTime = Date.now();
        try {
            const proc = Bun.spawn(['sh', '-c', command], {
                stdout: 'pipe',
                stderr: 'pipe',
            });
            const exitCode = await proc.exited;
            const stdout = await new Response(proc.stdout).text();
            const stderr = await new Response(proc.stderr).text();
            const durationMs = Date.now() - startTime;

            const result: GateResult = {
                run_id: runId,
                phase_name: phaseName,
                step_name: 'command-gate',
                checker_method: 'command',
                passed: exitCode === 0,
                evidence: {
                    command,
                    exitCode,
                    ...(stdout.trim().length > 0 && { stdout: stdout.slice(0, 1000) }),
                    ...(stderr.trim().length > 0 && { stderr: stderr.slice(0, 1000) }),
                },
                duration_ms: durationMs,
                created_at: new Date(),
            };

            return {
                status: exitCode === 0 ? 'pass' : 'fail',
                results: [result],
            };
        } catch (err) {
            return {
                status: 'fail',
                results: [
                    {
                        run_id: runId,
                        phase_name: phaseName,
                        step_name: 'command-gate',
                        checker_method: 'command',
                        passed: false,
                        evidence: {
                            command,
                            error: err instanceof Error ? err.message : String(err),
                        },
                        duration_ms: Date.now() - startTime,
                        created_at: new Date(),
                    },
                ],
            };
        }
    }

    private substituteTemplate(template: string, vars: Record<string, string>): string {
        let result = template;
        for (const [key, value] of Object.entries(vars)) {
            result = result.replaceAll(`{{${key}}}`, value);
        }
        return result;
    }

    private buildAutoGatePromptTemplate(
        promptTemplate: string | undefined,
        phaseEvidence?: PhaseEvidence,
    ): string | undefined {
        if (!phaseEvidence) {
            return promptTemplate;
        }

        const baseTemplate = promptTemplate ?? DEFAULT_AUTO_GATE_PROMPT_TEMPLATE;
        const evidenceJson = JSON.stringify(phaseEvidence, null, 2);

        if (baseTemplate.includes('{evidence}')) {
            return baseTemplate.replaceAll('{evidence}', evidenceJson);
        }

        return `${baseTemplate}

Phase execution evidence:
${evidenceJson}

Evaluate each checklist item against the evidence above.`;
    }

    private loadSkillAutoGateDefaults(skillRef: string): { checklist?: string[]; prompt_template?: string } | null {
        const skillPath = this.resolveSkillDefinitionPath(skillRef);
        if (!skillPath || !existsSync(skillPath)) {
            return null;
        }

        try {
            const content = readFileSync(skillPath, 'utf-8');
            const match = content.match(/^---\n([\s\S]*?)\n---/);
            if (!match?.[1]) {
                return null;
            }

            const frontmatter = parseYamlString(match[1]);
            const metadata = frontmatter.metadata as Record<string, unknown> | undefined;
            const gateDefaults = metadata?.gate_defaults as Record<string, unknown> | undefined;
            const autoDefaults = gateDefaults?.auto as Record<string, unknown> | undefined;
            if (!autoDefaults) {
                return null;
            }

            const checklist = Array.isArray(autoDefaults.checklist)
                ? autoDefaults.checklist.filter(
                      (item): item is string => typeof item === 'string' && item.trim().length > 0,
                  )
                : undefined;
            const promptTemplate =
                typeof autoDefaults.prompt_template === 'string' ? autoDefaults.prompt_template : undefined;

            return {
                ...(checklist && checklist.length > 0 ? { checklist } : {}),
                ...(promptTemplate ? { prompt_template: promptTemplate } : {}),
            };
        } catch {
            return null;
        }
    }

    private resolveSkillDefinitionPath(skillRef: string): string | null {
        const [plugin, skillName] = skillRef.split(':');
        if (!plugin || !skillName) {
            return null;
        }
        return resolve(process.cwd(), 'plugins', plugin, 'skills', skillName, 'SKILL.md');
    }

    private async emitEvent(
        runId: string,
        eventType: OrchestratorEvent['event_type'],
        payload: Record<string, unknown>,
    ): Promise<void> {
        this.eventBus.emit({
            run_id: runId,
            event_type: eventType,
            payload,
            timestamp: new Date(),
        });
    }
}
