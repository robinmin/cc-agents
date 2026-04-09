/**
 * orchestration-v2 — ACP Prompt Shaping
 *
 * Constructs execution prompts for the pi agent.
 *
 * This module is the boundary between orchestration and ACP prompt format.
 * It handles:
 * - Skill invocation prompts
 * - Context formatting
 * - Rework feedback injection
 * - Structured output expectations
 *
 * Design: Orchestration passes structured context. This module shapes
 * it into ACP-specific prompt format. This keeps executor core
 * transport-agnostic.
 */

import type { ExecutionRequest } from '../../model';

// ─── Prompt Builder ───────────────────────────────────────────────────────────

/**
 * ACP execution prompt options.
 */
export interface AcpPromptOptions {
    /** Skill name (e.g., "rd3:request-intake") */
    skill: string;

    /** Phase name */
    phase: string;

    /** Task reference */
    taskRef?: string;

    /** Structured payload */
    payload?: Record<string, unknown>;

    /** Rework feedback (if rework loop active) */
    feedback?: string;

    /** Rework iteration number */
    reworkIteration?: number;

    /** Maximum rework iterations */
    reworkMax?: number;
}

/**
 * Build execution prompt for ACP.
 *
 * Design goals:
 * 1. Tool-first: the agent must invoke Skill() immediately
 * 2. Deterministic: no ambiguity about what to call
 * 3. Structured: skill result should be JSON
 * 4. Contextual: includes phase, task, payload, feedback
 */
export function buildAcpPrompt(options: AcpPromptOptions): string {
    const { skill, phase, taskRef, payload, feedback, reworkIteration, reworkMax } = options;
    const parts: string[] = [];

    // Header with skill invocation
    parts.push(`Skill execution: "${skill}"`);
    parts.push('');

    // Context block
    parts.push('Context:');
    parts.push(`  phase: ${phase}`);

    if (taskRef) {
        parts.push(`  task: ${taskRef}`);
    }

    if (payload && Object.keys(payload).length > 0) {
        // Filter out redundant fields already in context
        const relevantPayload = { ...payload };
        delete (relevantPayload as Record<string, unknown>).phase;
        delete (relevantPayload as Record<string, unknown>).task_ref;

        if (Object.keys(relevantPayload).length > 0) {
            parts.push(`  payload: ${JSON.stringify(relevantPayload)}`);
        }
    }

    // Rework context (if rework loop active)
    if (feedback) {
        parts.push('');
        parts.push('Rework Feedback:');
        parts.push(`  ${feedback}`);
    }

    if (reworkIteration !== undefined) {
        parts.push(`  iteration: ${reworkIteration}/${reworkMax ?? 'unlimited'}`);
    }

    // Tool invocation instruction
    parts.push('');
    parts.push(
        `Invoke Skill("${skill}") now with phase="${phase}" and the above context. ` +
            'After the skill completes, output its final result as ```json\\n{...}\\n```.',
    );

    return parts.join('\n');
}

/**
 * Build prompt from ExecutionRequest.
 *
 * This is the main entry point for the ACP executor adapter.
 * Converts the generic ExecutionRequest into ACP-specific prompt format.
 */
export function buildPromptFromRequest(req: ExecutionRequest): string {
    return buildAcpPrompt({
        skill: req.skill,
        phase: req.phase,
        ...(req.taskRef && { taskRef: req.taskRef }),
        payload: req.payload,
        ...(req.feedback && { feedback: req.feedback }),
        ...(req.reworkIteration !== undefined && { reworkIteration: req.reworkIteration }),
        ...(req.reworkMax !== undefined && { reworkMax: req.reworkMax }),
    });
}

// ─── Prompt Templates ────────────────────────────────────────────────────────

/**
 * Prompt template variants for different execution modes.
 */
export interface PromptTemplate {
    /** Header text with skill invocation */
    header: string;

    /** Context formatting */
    contextFormat: 'yaml' | 'json' | 'simple';

    /** Whether to include payload */
    includePayload: boolean;

    /** Whether to include rework context */
    includeRework: boolean;

    /** Footer with output expectation */
    footer: string;
}

/**
 * Standard execution template.
 *
 * Balanced detail level for most phase executions.
 */
export const STANDARD_TEMPLATE: PromptTemplate = {
    header: 'Skill execution: "{{ skill }}"',
    contextFormat: 'simple',
    includePayload: true,
    includeRework: true,
    footer:
        'Invoke Skill("{{ skill }}") now with phase="{{ phase }}" and the above context. ' +
        'After the skill completes, output its final result as ```json\\n{...}\\n```.',
};

/**
 * Minimal execution template.
 *
 * Reduced overhead for simple phases.
 */
export const MINIMAL_TEMPLATE: PromptTemplate = {
    header: 'Execute: {{ skill }} ({{ phase }})',
    contextFormat: 'simple',
    includePayload: false,
    includeRework: false,
    footer: 'Output result as JSON.',
};

/**
 * Debug execution template.
 *
 * Enhanced context for troubleshooting.
 */
export const DEBUG_TEMPLATE: PromptTemplate = {
    header: '[DEBUG] Skill execution: "{{ skill }}"',
    contextFormat: 'json',
    includePayload: true,
    includeRework: true,
    footer:
        'Invoke Skill("{{ skill }}") now with phase="{{ phase }}" and the above context. ' +
        'After the skill completes, output its final result as ```json\\n{...}\\n```.',
};

/**
 * Get template by name.
 */
export function getPromptTemplate(name: 'standard' | 'minimal' | 'debug'): PromptTemplate {
    switch (name) {
        case 'minimal':
            return MINIMAL_TEMPLATE;
        case 'debug':
            return DEBUG_TEMPLATE;
        default:
            return STANDARD_TEMPLATE;
    }
}

// ─── Legacy Compatibility ────────────────────────────────────────────────────

/**
 * Build legacy prompt format for backward compatibility.
 *
 * This preserves the exact format from the original AcpExecutor
 * for compatibility with existing tests and workflows.
 *
 * @deprecated Use buildAcpPrompt() instead
 */
export function buildLegacyPrompt(req: ExecutionRequest): string {
    const skillName = req.skill; // e.g. "rd3:request-intake"
    const parts: string[] = [];

    parts.push(`Skill execution: "${skillName}"`);
    parts.push('');
    parts.push('Context:');
    parts.push(`  phase: ${req.phase}`);
    parts.push(`  task: ${req.taskRef ?? '(none)'}`);

    if (Object.keys(req.payload).length > 0) {
        parts.push(`  payload: ${JSON.stringify(req.payload)}`);
    }

    if (req.feedback) {
        parts.push(`  feedback: ${req.feedback}`);
    }

    if (req.reworkIteration !== undefined) {
        parts.push(`  rework: iteration ${req.reworkIteration}/${req.reworkMax ?? 'unlimited'}`);
    }

    parts.push('');
    parts.push(
        `Invoke Skill("${skillName}") now with phase="${req.phase}" and the above context. ` +
            'After the skill completes, output its final result as ```json\\n{...}\\n```.',
    );

    return parts.join('\n');
}
