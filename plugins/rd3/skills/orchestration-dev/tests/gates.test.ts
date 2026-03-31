import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { buildPhaseManifest, GATE_PROFILES, getGateEvidencePath } from '../scripts/gates';
import type { Phase } from '../scripts/model';
import type { SingleNode } from '../../verification-chain/scripts/types';

function makePhase(number: number, overrides: Partial<Phase> = {}): Phase {
    return {
        number: number as Phase['number'],
        name: `Phase ${number}`,
        skill: `rd3:skill-${number}`,
        executor: `rd3:skill-${number}`,
        execution_mode: 'direct-skill',
        inputs: [],
        outputs: [],
        gate: 'auto',
        ...overrides,
    };
}

function makeContext() {
    return {
        project_root: process.cwd(),
        auto_approve_human_gates: false,
        task_path: 'docs/tasks2/0292_Implement_Orchestration_Pipeline_v2_Target_Requirements.md',
        run_artifact_root: join(process.cwd(), 'docs', '.workflow-runs', 'rd3-orchestration-dev', '0292', 'run-123'),
    };
}

describe('gates', () => {
    describe('GATE_PROFILES', () => {
        test('defines profiles for all 9 phases', () => {
            for (let i = 1; i <= 9; i++) {
                expect(GATE_PROFILES[i as keyof typeof GATE_PROFILES]).toBeDefined();
                expect(GATE_PROFILES[i as keyof typeof GATE_PROFILES].steps.length).toBeGreaterThan(0);
            }
        });

        test('each profile has an id and label', () => {
            for (let i = 1; i <= 9; i++) {
                const profile = GATE_PROFILES[i as keyof typeof GATE_PROFILES];
                expect(profile.id).toBeTruthy();
                expect(profile.label).toBeTruthy();
            }
        });
    });

    describe('buildPhaseManifest', () => {
        test('creates a manifest with chain_id containing task ref', () => {
            const phase = makePhase(1);
            const manifest = buildPhaseManifest(phase, '0292', makeContext());

            expect(manifest.chain_id).toContain('0292');
            expect(manifest.task_wbs).toBe('0292');
            expect(manifest.on_node_fail).toBe('halt');
        });

        test('includes steps from the phase profile', () => {
            const phase = makePhase(1);
            const manifest = buildPhaseManifest(phase, '0292', makeContext());

            expect(manifest.nodes.length).toBeGreaterThan(0);
        });

        test('uses default profile when none specified', () => {
            const phase = makePhase(5);
            const manifest = buildPhaseManifest(phase, '0292', makeContext());

            expect(manifest.chain_name).toContain('Phase 5');
        });

        test('uses custom gate profile when provided', () => {
            const phase = makePhase(1);
            const customProfile = {
                id: 'custom',
                label: 'Custom Gate',
                steps: [
                    {
                        name: 'custom-check',
                        checker: { method: 'cli' as const, config: { command: 'true', exit_codes: [0] } },
                    },
                ],
            };
            const manifest = buildPhaseManifest(phase, '0292', makeContext(), customProfile);

            expect(manifest.chain_id).toContain('custom');
            expect(manifest.nodes[0].name).toBe('custom-check');
        });

        test('includes required_files node when specified in profile', () => {
            const phase = makePhase(1);
            const profile = {
                id: 'with-files',
                label: 'With Required Files',
                required_files: ['docs/architecture.md', 'docs/design.md'],
                steps: [
                    {
                        name: 'check',
                        checker: { method: 'cli' as const, config: { command: 'true', exit_codes: [0] } },
                    },
                ],
            };
            const manifest = buildPhaseManifest(phase, '0292', makeContext(), profile);

            expect(manifest.nodes[0].name).toBe('required-files');
            expect(manifest.nodes.length).toBe(2);
        });

        test('global retry is set to 1', () => {
            const phase = makePhase(1);
            const manifest = buildPhaseManifest(phase, '0292', makeContext());

            expect(manifest.global_retry).toEqual({ remaining: 1, total: 1 });
        });

        test('maker includes delegate_to for worker-agent phases', () => {
            const phase = makePhase(5, {
                execution_mode: 'worker-agent',
                executor: 'rd3:super-coder',
            });
            const manifest = buildPhaseManifest(phase, '0292', makeContext());

            const stepNode = manifest.nodes.find((n) => n.name !== 'required-files') as SingleNode | undefined;
            expect(stepNode).toBeDefined();
            expect(stepNode?.maker).toEqual({});
        });

        test('maker includes delegate_to with command in args', () => {
            const phase = makePhase(1);
            const profile = {
                id: 'cmd-test',
                label: 'Command Test',
                steps: [
                    {
                        name: 'run-command',
                        command: 'bun test',
                        checker: { method: 'cli' as const, config: { command: 'true', exit_codes: [0] } },
                    },
                ],
            };
            const manifest = buildPhaseManifest(phase, '0292', makeContext(), profile);
            const node = manifest.nodes[0] as SingleNode;

            expect(node.maker).toHaveProperty('delegate_to');
            expect(node.maker.args).toHaveProperty('command', 'bun test');
            expect(node.maker.args).toHaveProperty('phase', 1);
            expect(node.maker.args).toHaveProperty('step', 'run-command');
        });

        test('maker includes delegate_to with prompt and skill in args', () => {
            const phase = makePhase(2, { executor: 'rd3:backend-architect' });
            const profile = {
                id: 'prompt-test',
                label: 'Prompt Test',
                steps: [
                    {
                        name: 'run-prompt',
                        prompt: 'Design the architecture',
                        skill: 'rd3:backend-architect',
                        timeout_seconds: 120,
                        checker: { method: 'cli' as const, config: { command: 'true', exit_codes: [0] } },
                    },
                ],
            };
            const manifest = buildPhaseManifest(phase, '0292', makeContext(), profile);
            const node = manifest.nodes[0] as SingleNode;

            expect(node.maker).toHaveProperty('delegate_to');
            expect(node.maker.args).toHaveProperty('prompt', 'Design the architecture');
            expect(node.maker.args).toHaveProperty('downstream_skill', 'rd3:backend-architect');
            expect(node.maker).toHaveProperty('timeout', 120);
        });

        test('step without checker gets a deterministic compound checker', () => {
            const phase = makePhase(3);
            const profile = {
                id: 'no-checker',
                label: 'No Checker Test',
                steps: [{ name: 'no-checker-step' }],
            };
            const manifest = buildPhaseManifest(phase, '0292', makeContext(), profile);
            const node = manifest.nodes[0] as SingleNode;

            expect(node.checker.method).toBe('compound');
        });

        test('writes gate evidence under the run artifact directory for canonical runs', () => {
            const evidencePath = getGateEvidencePath('0292', 3, 'validate-design', makeContext());

            expect(evidencePath).toBe(
                join(
                    process.cwd(),
                    'docs',
                    '.workflow-runs',
                    'rd3-orchestration-dev',
                    '0292',
                    'run-123',
                    'gates',
                    'phase-3-validate-design.json',
                ),
            );
        });

        test('step without command or prompt has empty maker', () => {
            const phase = makePhase(4);
            const profile = {
                id: 'empty-maker',
                label: 'Empty Maker Test',
                steps: [
                    {
                        name: 'empty-maker-step',
                        checker: { method: 'cli' as const, config: { command: 'true', exit_codes: [0] } },
                    },
                ],
            };
            const manifest = buildPhaseManifest(phase, '0292', makeContext(), profile);
            const node = manifest.nodes[0] as SingleNode;

            expect(node.maker).toEqual({});
        });

        test('adds a human approval node for human-gated phases when auto approval is disabled', () => {
            const phase = makePhase(7, { gate: 'human' });
            const manifest = buildPhaseManifest(phase, '0292', makeContext());

            expect(manifest.nodes.some((node) => node.name === 'human-approval')).toBe(true);
        });

        test('omits the human approval node when auto approval is enabled', () => {
            const phase = makePhase(7, { gate: 'human' });
            const manifest = buildPhaseManifest(phase, '0292', {
                ...makeContext(),
                auto_approve_human_gates: true,
            });

            expect(manifest.nodes.some((node) => node.name === 'human-approval')).toBe(false);
        });
    });
});
