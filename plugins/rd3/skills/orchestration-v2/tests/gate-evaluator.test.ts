/**
 * Unit tests for GateEvaluator
 *
 * Covers the private loadSkillAutoGateDefaults and resolveSkillDefinitionPath
 * methods via `as unknown as` casting, following the pattern established in
 * the original runner.test.ts test that was removed during extraction.
 */

import { describe, test, expect, beforeAll, beforeEach, afterEach, spyOn } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { GateEvaluator } from '../scripts/engine/gate-evaluator';
import { StateManager } from '../scripts/state/manager';
import { EventBus } from '../scripts/observability/event-bus';
import type { VerificationDriver, ChainState, ChainManifest, PhaseEvidence } from '../scripts/model';
import { setGlobalSilent } from '../../../scripts/logger';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Create a minimal VerificationDriver stub. */
function createMockDriver(): VerificationDriver {
    return {
        runChain: async (): Promise<ChainState> => ({ status: 'pass', results: [] }),
        resumeChain: async (): Promise<ChainState> => ({ status: 'pass', results: [] }),
    };
}

/** Cast evaluator to expose private methods for testing. */
type ExposedEvaluator = {
    resolveSkillDefinitionPath: (skillRef: string) => string | null;
    loadSkillAutoGateDefaults: (skillRef: string) => { checklist?: string[]; prompt_template?: string } | null;
    substituteTemplate: (template: string, vars: Record<string, string>) => string;
    buildAutoGatePromptTemplate: (promptTemplate: string | undefined, phaseEvidence?: PhaseEvidence) => string | undefined;
    emitEvent: (runId: string, eventType: string, payload: Record<string, unknown>) => Promise<void>;
};

function expose(evaluator: GateEvaluator): ExposedEvaluator {
    return evaluator as unknown as ExposedEvaluator;
}

/** Create a fresh GateEvaluator per test. */
function createEvaluator(): GateEvaluator {
    const state = new StateManager({ dbPath: ':memory:' });
    const driver = createMockDriver();
    const eventBus = new EventBus();
    return new GateEvaluator({ state, verificationDriver: driver, eventBus });
}

async function createHarness(
    overrides: Partial<VerificationDriver> = {},
): Promise<{ evaluator: GateEvaluator; state: StateManager; eventBus: EventBus }> {
    const state = new StateManager({ dbPath: ':memory:' });
    await state.init();
    const verificationDriver: VerificationDriver = {
        ...createMockDriver(),
        ...overrides,
    };
    const eventBus = new EventBus();
    const evaluator = new GateEvaluator({ state, verificationDriver, eventBus });
    return { evaluator, state, eventBus };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('GateEvaluator', () => {
    beforeAll(() => {
        setGlobalSilent(true);
    });

    // ── resolveSkillDefinitionPath ──────────────────────────────────────────

    describe('resolveSkillDefinitionPath', () => {
        const evaluator = createEvaluator();
        const priv = expose(evaluator);

        test('should resolve valid plugin:skill format', () => {
            const result = priv.resolveSkillDefinitionPath('rd3:my-skill');
            expect(result).toContain('plugins/rd3/skills/my-skill/SKILL.md');
        });

        test('should return null for missing plugin', () => {
            expect(priv.resolveSkillDefinitionPath(':my-skill')).toBeNull();
        });

        test('should return null for missing skill name', () => {
            expect(priv.resolveSkillDefinitionPath('rd3:')).toBeNull();
        });

        test('should return null for empty string', () => {
            expect(priv.resolveSkillDefinitionPath('')).toBeNull();
        });

        test('should return null for string without colon', () => {
            expect(priv.resolveSkillDefinitionPath('nocolon')).toBeNull();
        });
    });

    // ── loadSkillAutoGateDefaults ───────────────────────────────────────────

    describe('loadSkillAutoGateDefaults', () => {
        let tempDirs: string[] = [];
        let evaluator: GateEvaluator;
        let priv: ExposedEvaluator;
        let resolveSpy: ReturnType<typeof spyOn>;

        beforeEach(() => {
            evaluator = createEvaluator();
            priv = expose(evaluator);
            tempDirs = [];
        });

        afterEach(() => {
            resolveSpy?.mockRestore();
            for (const dir of tempDirs) {
                rmSync(dir, { recursive: true, force: true });
            }
        });

        function createSkillFile(content: string): string {
            const tempDir = mkdtempSync(join(tmpdir(), 'gate-eval-skill-'));
            tempDirs.push(tempDir);
            const skillFile = join(tempDir, 'SKILL.md');
            writeFileSync(skillFile, content);
            return skillFile;
        }

        function mockResolveTo(skillFile: string) {
            resolveSpy = spyOn(
                priv as unknown as { resolveSkillDefinitionPath: (s: string) => string | null },
                'resolveSkillDefinitionPath',
            ).mockReturnValue(skillFile);
        }

        test('should filter out non-string and empty checklist items', () => {
            const skillFile = createSkillFile(`---
metadata:
  gate_defaults:
    auto:
      checklist:
        - "Keep me"
        - ""
        - 42
      prompt_template: "Custom prompt"
---
body
`);
            mockResolveTo(skillFile);

            const defaults = priv.loadSkillAutoGateDefaults('rd3:test-skill');

            expect(defaults).toEqual({
                checklist: ['Keep me'],
                prompt_template: 'Custom prompt',
            });
        });

        test('should return checklist and prompt_template from valid SKILL.md', () => {
            const skillFile = createSkillFile(`---
metadata:
  gate_defaults:
    auto:
      checklist:
        - "Item A"
        - "Item B"
      prompt_template: "Check these items"
---
Some body
`);
            mockResolveTo(skillFile);

            const defaults = priv.loadSkillAutoGateDefaults('rd3:test-skill');

            expect(defaults).toEqual({
                checklist: ['Item A', 'Item B'],
                prompt_template: 'Check these items',
            });
        });

        test('should return null when skill file does not exist', () => {
            mockResolveTo('/nonexistent/path/SKILL.md');

            const defaults = priv.loadSkillAutoGateDefaults('rd3:missing');

            expect(defaults).toBeNull();
        });

        test('should return null when resolveSkillDefinitionPath returns null', () => {
            resolveSpy = spyOn(
                priv as unknown as { resolveSkillDefinitionPath: (s: string) => string | null },
                'resolveSkillDefinitionPath',
            ).mockReturnValue(null);

            const defaults = priv.loadSkillAutoGateDefaults('invalid');

            expect(defaults).toBeNull();
        });

        test('should return null for file without frontmatter', () => {
            const skillFile = createSkillFile('No frontmatter here, just body text.');
            mockResolveTo(skillFile);

            const defaults = priv.loadSkillAutoGateDefaults('rd3:test-skill');

            expect(defaults).toBeNull();
        });

        test('should return null for malformed YAML in frontmatter', () => {
            const skillFile = createSkillFile(`---
metadata:
  gate_defaults:
    auto:
      checklist: [unbalanced brackets
---
body
`);
            mockResolveTo(skillFile);

            // parseYamlString returns {} for invalid YAML in some cases,
            // or the loadSkillAutoGateDefaults catch handles the error.
            // Either way, the result should be null.
            const defaults = priv.loadSkillAutoGateDefaults('rd3:test-skill');
            expect(defaults).toBeNull();
        });

        test('should return null when auto defaults are missing', () => {
            const skillFile = createSkillFile(`---
metadata:
  gate_defaults: {}
---
body
`);
            mockResolveTo(skillFile);

            const defaults = priv.loadSkillAutoGateDefaults('rd3:test-skill');

            expect(defaults).toBeNull();
        });

        test('should return null when metadata is missing', () => {
            const skillFile = createSkillFile(`---
something_else: true
---
body
`);
            mockResolveTo(skillFile);

            const defaults = priv.loadSkillAutoGateDefaults('rd3:test-skill');

            expect(defaults).toBeNull();
        });

        test('should return object without checklist when checklist array is all invalid', () => {
            const skillFile = createSkillFile(`---
metadata:
  gate_defaults:
    auto:
      checklist:
        - ""
        - 123
        - null
      prompt_template: "Only prompt"
---
body
`);
            mockResolveTo(skillFile);

            const defaults = priv.loadSkillAutoGateDefaults('rd3:test-skill');

            // Empty checklist is filtered out, so only prompt_template remains
            expect(defaults).toEqual({
                prompt_template: 'Only prompt',
            });
        });

        test('should return object without prompt_template when prompt_template is not a string', () => {
            const skillFile = createSkillFile(`---
metadata:
  gate_defaults:
    auto:
      checklist:
        - "Valid item"
      prompt_template: 42
---
body
`);
            mockResolveTo(skillFile);

            const defaults = priv.loadSkillAutoGateDefaults('rd3:test-skill');

            expect(defaults).toEqual({
                checklist: ['Valid item'],
            });
        });

        test('should return empty object when auto defaults have neither checklist nor prompt_template', () => {
            const skillFile = createSkillFile(`---
metadata:
  gate_defaults:
    auto:
      other_field: "ignored"
---
body
`);
            mockResolveTo(skillFile);

            // When auto defaults exist but contain no valid checklist or prompt_template,
            // the method returns an empty object (both spreads produce nothing).
            const defaults = priv.loadSkillAutoGateDefaults('rd3:test-skill');

            expect(defaults).toEqual({});
        });
    });

    describe('private helpers', () => {
        test('substituteTemplate replaces all known template variables', () => {
            const evaluator = createEvaluator();
            const priv = expose(evaluator);

            expect(
                priv.substituteTemplate('run={{run_id}} phase={{phase}} task={{task_ref}}', {
                    run_id: 'run-123',
                    phase: 'review',
                    task_ref: 'TASK-123',
                }),
            ).toBe('run=run-123 phase=review task=TASK-123');
        });

        test('buildAutoGatePromptTemplate injects evidence into placeholder templates', () => {
            const evaluator = createEvaluator();
            const priv = expose(evaluator);
            const phaseEvidence: PhaseEvidence = {
                success: true,
                exitCode: 0,
                duration_ms: 5,
                files_changed: [],
                files_added: [],
                task_ref: 'TASK-PLACEHOLDER',
                phase_name: 'review',
                run_id: 'run-placeholder',
                rework_iteration: 0,
            };

            const prompt = priv.buildAutoGatePromptTemplate('Evidence block:\n{evidence}', phaseEvidence);

            expect(prompt).toContain('Evidence block:');
            expect(prompt).toContain('"task_ref": "TASK-PLACEHOLDER"');
            expect(prompt).not.toContain('{evidence}');
        });

        test('emitEvent forwards payloads to the event bus', async () => {
            const { evaluator, state, eventBus } = await createHarness();
            const priv = expose(evaluator);
            const emitSpy = spyOn(eventBus, 'emit');

            try {
                await priv.emitEvent('run-event-1', 'gate.evaluated', { phase: 'review', passed: true });

                expect(emitSpy).toHaveBeenCalledWith(
                    expect.objectContaining({
                        run_id: 'run-event-1',
                        event_type: 'gate.evaluated',
                        payload: { phase: 'review', passed: true },
                    }),
                );
            } finally {
                emitSpy.mockRestore();
                await state.close();
            }
        });
    });

    describe('evaluate', () => {
        test('runs command gates with template substitution, persistence, and event emission', async () => {
            const { evaluator, state, eventBus } = await createHarness();
            const emitSpy = spyOn(eventBus, 'emit');

            try {
                const result = await evaluator.evaluate(
                    'run-command-1',
                    'verify',
                    { type: 'command', command: 'test "{{task_ref}} {{phase}} {{run_id}}" = "TASK-77 verify run-command-1"' },
                    'TASK-77',
                );

                expect(result.status).toBe('pass');
                expect(result.results).toHaveLength(1);
                expect(result.results[0]?.checker_method).toBe('command');
                expect(result.results[0]?.passed).toBe(true);
                expect(result.results[0]?.evidence).toMatchObject({
                    command: 'test "TASK-77 verify run-command-1" = "TASK-77 verify run-command-1"',
                    exitCode: 0,
                });

                const stored = await state.getGateResults('run-command-1', 'verify');
                expect(stored).toHaveLength(1);
                expect(stored[0]?.checker_method).toBe('command');
                expect(emitSpy).toHaveBeenCalledWith(
                    expect.objectContaining({
                        run_id: 'run-command-1',
                        event_type: 'gate.evaluated',
                    }),
                );
            } finally {
                emitSpy.mockRestore();
                await state.close();
            }
        });

        test('runs auto gates with engine defaults and injects phase evidence into the prompt', async () => {
            let capturedManifest: ChainManifest | undefined;
            const phaseEvidence: PhaseEvidence = {
                success: true,
                exitCode: 0,
                stdout: 'verification complete',
                duration_ms: 42,
                files_changed: ['src/example.ts'],
                files_added: [],
                task_ref: 'TASK-88',
                phase_name: 'review',
                run_id: 'run-auto-1',
                rework_iteration: 0,
            };

            const { evaluator, state } = await createHarness({
                runChain: async (manifest) => {
                    capturedManifest = manifest;
                    return {
                        status: 'pass',
                        results: [
                            {
                                run_id: manifest.run_id,
                                phase_name: manifest.phase_name,
                                step_name: 'auto-gate',
                                checker_method: 'llm',
                                passed: true,
                                evidence: {
                                    checklist: [{ item: 'Phase completed successfully without errors', passed: true }],
                                },
                                duration_ms: 12,
                                created_at: new Date(),
                            },
                        ],
                    };
                },
            });

            try {
                const result = await evaluator.evaluate(
                    'run-auto-1',
                    'review',
                    { type: 'auto' },
                    'TASK-88',
                    phaseEvidence,
                );

                expect(result.status).toBe('pass');
                expect(capturedManifest?.checks).toHaveLength(1);
                expect(capturedManifest?.checks[0]?.params?.checklist).toEqual([
                    'Phase completed successfully without errors',
                    'Output is consistent with task requirements',
                ]);
                expect(String(capturedManifest?.checks[0]?.params?.prompt_template)).toContain(
                    '"phase_name": "review"',
                );
                expect(String(capturedManifest?.checks[0]?.params?.prompt_template)).toContain(
                    'Evaluate each checklist item against the evidence above.',
                );

                const stored = await state.getGateResults('run-auto-1', 'review');
                expect(stored).toHaveLength(1);
                expect(stored[0]?.checker_method).toBe('llm');
                expect(stored[0]?.evidence).toMatchObject({
                    source: 'engine',
                    phase_evidence: phaseEvidence,
                });
            } finally {
                await state.close();
            }
        });

        test('treats advisory auto-gate failures as pass and emits checklist failure details', async () => {
            const { evaluator, state, eventBus } = await createHarness({
                runChain: async (manifest) => ({
                    status: 'fail',
                    results: [
                        {
                            run_id: manifest.run_id,
                            phase_name: manifest.phase_name,
                            step_name: 'auto-gate',
                            checker_method: 'llm',
                            passed: false,
                            evidence: {
                                checklist: [
                                    { item: 'criterion-a', passed: false },
                                    { item: 'criterion-b', passed: true },
                                ],
                            },
                            duration_ms: 9,
                            created_at: new Date(),
                        },
                    ],
                }),
            });
            const emitSpy = spyOn(eventBus, 'emit');

            try {
                const result = await evaluator.evaluate(
                    'run-auto-advisory-1',
                    'review',
                    { type: 'auto', severity: 'advisory' },
                    'TASK-ADVISORY',
                );

                expect(result.status).toBe('pass');
                expect(result.results[0]).toMatchObject({
                    checker_method: 'llm',
                    advisory: true,
                    passed: false,
                    evidence: {
                        severity: 'advisory',
                        source: 'engine',
                    },
                });
                expect(emitSpy).toHaveBeenCalledWith(
                    expect.objectContaining({
                        run_id: 'run-auto-advisory-1',
                        event_type: 'gate.advisory_fail',
                        payload: {
                            phase: 'review',
                            checklist_failures: ['criterion-a'],
                        },
                    }),
                );
            } finally {
                emitSpy.mockRestore();
                await state.close();
            }
        });

        test('returns pending for blocking human gates even when auto is enabled', async () => {
            const phaseEvidence: PhaseEvidence = {
                success: true,
                exitCode: 0,
                duration_ms: 7,
                files_changed: [],
                files_added: [],
                task_ref: 'TASK-99',
                phase_name: 'review',
                run_id: 'run-human-1',
                rework_iteration: 0,
            };

            const { evaluator, state } = await createHarness();

            try {
                const result = await evaluator.evaluate(
                    'run-human-1',
                    'review',
                    { type: 'human', blocking: true, prompt: 'Manual approval required' },
                    'TASK-99',
                    phaseEvidence,
                    undefined,
                    true,
                );

                expect(result.status).toBe('pending');
                expect(result.results[0]).toMatchObject({
                    checker_method: 'human',
                    passed: false,
                    evidence: {
                        blocking: true,
                        prompt: 'Manual approval required',
                        phase_evidence: phaseEvidence,
                    },
                });
            } finally {
                await state.close();
            }
        });

        test('bypasses advisory human gates when auto is enabled', async () => {
            const { evaluator, state } = await createHarness();

            try {
                const result = await evaluator.evaluate(
                    'run-human-2',
                    'review',
                    { type: 'human', blocking: false, prompt: 'Optional review' },
                    'TASK-100',
                    undefined,
                    undefined,
                    true,
                );

                expect(result.status).toBe('pass');
                expect(result.results[0]).toMatchObject({
                    checker_method: 'human',
                    passed: true,
                    advisory: true,
                    evidence: {
                        blocking: false,
                        auto_bypassed: true,
                        prompt: 'Optional review',
                    },
                });
            } finally {
                await state.close();
            }
        });
    });
});
