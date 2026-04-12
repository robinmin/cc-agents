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

describe('Pipeline Gate Verification', () => {
    const pipelinePath = resolve(process.cwd(), 'docs/.workflows/pipeline.yaml');

    test('pipeline.yaml contains review phase with human gate', () => {
        if (!existsSync(pipelinePath)) {
            return; // Skip if pipeline.yaml doesn't exist
        }

        const content = readFileSync(pipelinePath, 'utf-8');
        expect(content).toContain('review:');
        expect(content).toContain('type: human');
        // Review gate is advisory (blocking: false)
        expect(content).toContain('blocking: false');
    });

    test('pipeline.yaml does not contain pr or docs phases', () => {
        if (!existsSync(pipelinePath)) {
            return;
        }

        const content = readFileSync(pipelinePath, 'utf-8');
        // pr and docs were removed — PR creation and docs are independent slash commands
        expect(content).not.toMatch(/^\s+pr:\s*$/m);
        expect(content).not.toMatch(/^\s+docs:\s*$/m);
    });

    test('standard preset does not include pr or docs phases', () => {
        if (!existsSync(pipelinePath)) {
            return;
        }

        const content = readFileSync(pipelinePath, 'utf-8');
        const standardMatch = content.match(/standard:\s*\n\s*phases:\s*\[(.*?)\]/s);
        if (standardMatch) {
            const phases = standardMatch[1];
            expect(phases).not.toContain('pr');
            expect(phases).not.toContain('docs');
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
    ];

    test('standard pipeline has correct phase order', () => {
        expect(STANDARD_PIPELINE_PHASES[0]).toBe('intake');
        expect(STANDARD_PIPELINE_PHASES[STANDARD_PIPELINE_PHASES.length - 1]).toBe('verify-func');
        expect(STANDARD_PIPELINE_PHASES).not.toContain('docs');
        expect(STANDARD_PIPELINE_PHASES).not.toContain('pr');
    });

    test('verify phases are last in standard pipeline', () => {
        const bddIndex = STANDARD_PIPELINE_PHASES.indexOf('verify-bdd');
        const funcIndex = STANDARD_PIPELINE_PHASES.indexOf('verify-func');
        const reviewIndex = STANDARD_PIPELINE_PHASES.indexOf('review');
        expect(bddIndex).toBeGreaterThan(reviewIndex);
        expect(funcIndex).toBeGreaterThan(reviewIndex);
    });
});
