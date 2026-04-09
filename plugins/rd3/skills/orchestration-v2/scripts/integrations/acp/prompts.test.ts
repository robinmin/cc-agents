/**
 * prompts.ts tests
 *
 * Tests for ACP prompt shaping.
 */

import { describe, it, expect } from 'bun:test';
import type { ExecutionRequest } from '../../model';
import {
    buildAcpPrompt,
    buildPromptFromRequest,
    buildLegacyPrompt,
    getPromptTemplate,
    STANDARD_TEMPLATE,
    MINIMAL_TEMPLATE,
    DEBUG_TEMPLATE,
} from './prompts';

describe('buildAcpPrompt', () => {
    it('builds basic prompt with skill and phase', () => {
        const prompt = buildAcpPrompt({
            skill: 'rd3:test',
            phase: 'implement',
        });

        expect(prompt).toContain('Skill execution: "rd3:test"');
        expect(prompt).toContain('phase: implement');
        expect(prompt).toContain('Invoke Skill("rd3:test")');
    });

    it('includes task ref in context', () => {
        const prompt = buildAcpPrompt({
            skill: 'rd3:test',
            phase: 'implement',
            taskRef: 'docs/tasks/001.md',
        });

        expect(prompt).toContain('task: docs/tasks/001.md');
    });

    it('includes payload in context', () => {
        const prompt = buildAcpPrompt({
            skill: 'rd3:test',
            phase: 'implement',
            payload: { custom_field: 'value' },
        });

        expect(prompt).toContain('custom_field');
        expect(prompt).toContain('value');
    });

    it('excludes redundant fields from payload', () => {
        const prompt = buildAcpPrompt({
            skill: 'rd3:test',
            phase: 'implement',
            taskRef: 'task.md',
            payload: { phase: 'implement', task_ref: 'task.md', custom: 'data' },
        });

        // phase and task_ref are in context separately, so payload should only have custom
        expect(prompt).toContain('payload');
        expect(prompt).toContain('{"custom":"data"}');
    });

    it('includes rework feedback when provided', () => {
        const prompt = buildAcpPrompt({
            skill: 'rd3:test',
            phase: 'implement',
            feedback: 'Fix the error in line 42',
            reworkIteration: 2,
            reworkMax: 3,
        });

        expect(prompt).toContain('Rework Feedback:');
        expect(prompt).toContain('Fix the error in line 42');
        expect(prompt).toContain('iteration: 2/3');
    });

    it('formats prompt for tool invocation', () => {
        const prompt = buildAcpPrompt({
            skill: 'rd3:test',
            phase: 'implement',
        });

        expect(prompt).toContain('Invoke Skill("rd3:test") now with phase="implement"');
        expect(prompt).toContain('```json\\n{...}\\n```');
    });
});

describe('buildPromptFromRequest', () => {
    it('converts ExecutionRequest to prompt', () => {
        const req: ExecutionRequest = {
            skill: 'rd3:request-intake',
            phase: 'request-intake',
            prompt: 'test',
            payload: { task_ref: 'test' },
            channel: 'pi',
            timeoutMs: 60000,
            taskRef: 'docs/tasks/001.md',
            feedback: 'Previous attempt failed',
            reworkIteration: 1,
            reworkMax: 3,
        };

        const prompt = buildPromptFromRequest(req);

        expect(prompt).toContain('Skill execution: "rd3:request-intake"');
        expect(prompt).toContain('task: docs/tasks/001.md');
        expect(prompt).toContain('Rework Feedback:');
        expect(prompt).toContain('iteration: 1/3');
    });
});

describe('buildLegacyPrompt', () => {
    it('matches original AcpExecutor prompt format', () => {
        const req: ExecutionRequest = {
            skill: 'rd3:request-intake',
            phase: 'request-intake',
            prompt: 'test',
            payload: {},
            channel: 'pi',
            timeoutMs: 60000,
            taskRef: 'test-task',
        };

        const legacy = buildLegacyPrompt(req);

        // Original format check
        expect(legacy).toContain('Skill execution: "rd3:request-intake"');
        expect(legacy).toContain('Context:');
        expect(legacy).toContain('phase: request-intake');
        expect(legacy).toContain('task: test-task');
    });
});

describe('Prompt Templates', () => {
    it('STANDARD_TEMPLATE has all required fields', () => {
        expect(STANDARD_TEMPLATE.header).toBeDefined();
        expect(STANDARD_TEMPLATE.contextFormat).toBe('simple');
        expect(STANDARD_TEMPLATE.includePayload).toBe(true);
        expect(STANDARD_TEMPLATE.includeRework).toBe(true);
        expect(STANDARD_TEMPLATE.footer).toBeDefined();
    });

    it('MINIMAL_TEMPLATE has reduced context', () => {
        expect(MINIMAL_TEMPLATE.includePayload).toBe(false);
        expect(MINIMAL_TEMPLATE.includeRework).toBe(false);
    });

    it('DEBUG_TEMPLATE has enhanced context', () => {
        expect(MINIMAL_TEMPLATE.contextFormat).toBe('simple');
    });

    it('getPromptTemplate returns correct templates', () => {
        expect(getPromptTemplate('standard')).toBe(STANDARD_TEMPLATE);
        expect(getPromptTemplate('minimal')).toBe(MINIMAL_TEMPLATE);
        expect(getPromptTemplate('debug')).toBe(DEBUG_TEMPLATE);
    });
});
