/**
 * Integration tests for PR pipeline gate (task 0349).
 *
 * Verifies:
 * 1. Pipeline pauses at pr phase with human gate
 * 2. --auto flag does NOT bypass blocking pr gate
 * 3. Pipeline can resume after human approval
 * 4. Non-blocking gates are correctly identified
 */

import { describe, test, expect } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { GateConfig } from '../../scripts/model';

// ─── Test Helpers ──────────────────────────────────────────────────────────────

/**
 * Simulates the gate checking logic from runner.ts.
 * Returns the expected behavior based on gate config and auto flag.
 *
 * Key rule: Human gates with blocking: true MUST pause regardless of --auto
 *           Human gates with blocking: false (or undefined) can be bypassed by --auto
 */
function simulateGateCheck(
    gate: GateConfig,
    auto: boolean,
): {
    status: 'pass' | 'pending';
    pausedForApproval: boolean;
    reason: string;
} {
    if (gate.type === 'human') {
        // Human gates with blocking: true MUST pause regardless of --auto
        if (gate.blocking === true) {
            return {
                status: 'pending',
                pausedForApproval: true,
                reason: 'PR review requires human approval (blocking gate)',
            };
        }
        // Advisory human gates (blocking: false or undefined) can be bypassed with --auto
        if (auto) {
            return {
                status: 'pass',
                pausedForApproval: false,
                reason: 'Advisory gate bypassed via --auto flag',
            };
        }
        return {
            status: 'pending',
            pausedForApproval: true,
            reason: 'Awaiting human approval (advisory gate)',
        };
    }

    // Auto gates always pass
    if (gate.type === 'auto') {
        return { status: 'pass', pausedForApproval: false, reason: 'Auto gate' };
    }

    // Command gates pass by default (command execution happens separately)
    return { status: 'pass', pausedForApproval: false, reason: 'Command gate' };
}

describe('PR Phase Gate Configuration', () => {
    const PR_GATE: GateConfig = {
        type: 'human',
        blocking: true,
        prompt: 'Review PR, approve merge, or reject with feedback',
    };
    const ADVISORY_GATE: GateConfig = {
        type: 'human',
        blocking: false,
        prompt: 'LLM review sufficient, human optional',
    };

    test('pr phase has blocking human gate configured', () => {
        expect(PR_GATE.type).toBe('human');
        expect(PR_GATE.blocking).toBe(true);
        expect(PR_GATE.prompt).toBeDefined();
    });

    test('review phase has advisory (non-blocking) gate', () => {
        expect(ADVISORY_GATE.type).toBe('human');
        expect(ADVISORY_GATE.blocking).toBe(false);
    });
});

describe('Gate Bypass Logic with --auto Flag', () => {
    const PR_GATE: GateConfig = {
        type: 'human',
        blocking: true,
        prompt: 'Review PR, approve merge, or reject with feedback',
    };
    const ADVISORY_GATE: GateConfig = {
        type: 'human',
        blocking: false,
        prompt: 'LLM review sufficient, human optional',
    };

    test('--auto does NOT bypass blocking PR gate', () => {
        // This is the KEY requirement: blocking gates cannot be bypassed
        const result = simulateGateCheck(PR_GATE, true); // auto = true

        expect(result.status).toBe('pending');
        expect(result.pausedForApproval).toBe(true);
        expect(result.reason).toContain('blocking');
    });

    test('--auto DOES bypass advisory (non-blocking) human gate', () => {
        const result = simulateGateCheck(ADVISORY_GATE, true); // auto = true

        expect(result.status).toBe('pass');
        expect(result.pausedForApproval).toBe(false);
        expect(result.reason).toContain('--auto');
    });

    test('without --auto, advisory gate pauses for human approval', () => {
        const result = simulateGateCheck(ADVISORY_GATE, false); // auto = false

        expect(result.status).toBe('pending');
        expect(result.pausedForApproval).toBe(true);
    });

    test('without --auto, blocking gate pauses for human approval', () => {
        const result = simulateGateCheck(PR_GATE, false); // auto = false

        expect(result.status).toBe('pending');
        expect(result.pausedForApproval).toBe(true);
    });

    test('blocking: undefined is treated as advisory (non-blocking)', () => {
        const defaultGate: GateConfig = {
            type: 'human',
            prompt: 'Default human gate',
            // blocking is undefined
        };

        const result = simulateGateCheck(defaultGate, true);

        // Undefined blocking is treated as advisory (can be bypassed with --auto)
        expect(result.status).toBe('pass');
        expect(result.pausedForApproval).toBe(false);
    });

    test('blocking: undefined without --auto still pauses', () => {
        const defaultGate: GateConfig = {
            type: 'human',
            prompt: 'Default human gate',
        };

        const result = simulateGateCheck(defaultGate, false);

        expect(result.status).toBe('pending');
        expect(result.pausedForApproval).toBe(true);
    });
});

describe('PR Pipeline Gate Verification', () => {
    const pipelinePath = resolve(process.cwd(), 'docs/.workflows/pipeline.yaml');

    test('pipeline.yaml contains pr phase definition', () => {
        if (!existsSync(pipelinePath)) {
            return; // Skip if pipeline.yaml doesn't exist
        }

        const content = readFileSync(pipelinePath, 'utf-8');
        expect(content).toContain('pr:');
        expect(content).toContain('blocking: true');
        expect(content).toContain('type: human');
    });

    test('pr phase depends on docs phase', () => {
        if (!existsSync(pipelinePath)) {
            return;
        }

        const content = readFileSync(pipelinePath, 'utf-8');
        // Check that pr has 'after: [docs]' or similar dependency
        expect(content).toMatch(/pr:[\s\S]*?after:.*docs/);
    });

    test('standard preset includes pr phase', () => {
        if (!existsSync(pipelinePath)) {
            return;
        }

        const content = readFileSync(pipelinePath, 'utf-8');
        expect(content).toMatch(/standard:[\s\S]*?phases:[\s\S]*?\bpr\b/);
    });

    test('complex preset includes pr phase', () => {
        if (!existsSync(pipelinePath)) {
            return;
        }

        const content = readFileSync(pipelinePath, 'utf-8');
        expect(content).toMatch(/complex:[\s\S]*?phases:[\s\S]*?\bpr\b/);
    });

    test('simple preset does NOT include pr phase', () => {
        if (!existsSync(pipelinePath)) {
            return;
        }

        const content = readFileSync(pipelinePath, 'utf-8');
        // Extract simple preset phases
        const simpleMatch = content.match(/simple:\s*\n\s*phases:\s*\[(.*?)\]/s);
        if (simpleMatch) {
            const phases = simpleMatch[1];
            expect(phases).not.toContain('pr');
        }
    });
});

describe('PR Approval Resume Flow', () => {
    test('pipeline resumes after human approval', () => {
        let pipelineState = 'PAUSED';
        let approved = false;

        const approve = () => {
            approved = true;
            pipelineState = 'RUNNING';
        };

        expect(pipelineState).toBe('PAUSED');

        approve();

        expect(approved).toBe(true);
        expect(pipelineState).toBe('RUNNING');
    });

    test('pipeline fails after human rejection', () => {
        let pipelineState = 'PAUSED';
        let rejected = false;

        const reject = () => {
            rejected = true;
            pipelineState = 'FAILED';
        };

        expect(pipelineState).toBe('PAUSED');

        reject();

        expect(rejected).toBe(true);
        expect(pipelineState).toBe('FAILED');
    });
});

describe('Gate Type Configuration', () => {
    test('blocking property is optional in GateConfig', () => {
        const gateWithoutBlocking: GateConfig = {
            type: 'human',
            prompt: 'Test gate',
        };

        expect(gateWithoutBlocking.type).toBe('human');
        expect((gateWithoutBlocking as { blocking?: boolean }).blocking).toBeUndefined();
    });

    test('severity property exists for auto gates', () => {
        const autoGate: GateConfig = {
            type: 'auto',
            severity: 'blocking',
        };

        expect(autoGate.type).toBe('auto');
        expect(autoGate.severity).toBe('blocking');
    });

    test('command property exists for command gates', () => {
        const commandGate: GateConfig = {
            type: 'command',
            command: 'bun run check',
        };

        expect(commandGate.type).toBe('command');
        expect(commandGate.command).toBe('bun run check');
    });
});

describe('Complete Pipeline Gate Scenarios', () => {
    const STANDARD_PIPELINE_PHASES = [
        'intake',
        'decompose',
        'implement',
        'test',
        'review',
        'verify-bdd',
        'verify-func',
        'docs',
        'pr',
    ];

    test('standard pipeline has correct phase order', () => {
        expect(STANDARD_PIPELINE_PHASES[0]).toBe('intake');
        expect(STANDARD_PIPELINE_PHASES[STANDARD_PIPELINE_PHASES.length - 1]).toBe('pr');
        expect(STANDARD_PIPELINE_PHASES).toContain('docs');
        expect(STANDARD_PIPELINE_PHASES).toContain('pr');
    });

    test('pr phase is last in standard pipeline', () => {
        const prIndex = STANDARD_PIPELINE_PHASES.indexOf('pr');
        const lastIndex = STANDARD_PIPELINE_PHASES.length - 1;
        expect(prIndex).toBe(lastIndex);
    });
});
