#!/usr/bin/env bun
import { describe, expect, it } from 'bun:test';
import { createAgentAdapterContext } from '../scripts/adapters';
import { AntigravityAgentAdapter } from '../scripts/adapters/antigravity';
import type { UniversalAgent } from '../scripts/types';

const sampleAgent: UniversalAgent = {
    name: 'antigravity-test-agent',
    description: 'Test agent for Antigravity adapter',
    body: '# Test Agent\n\nA test agent body.\n\nFollow these rules:\n- Do this\n- Do that',
    tools: ['Read', 'Grep'],
    disallowedTools: ['Bash'],
    model: 'claude-sonnet-4-20250514',
    maxTurns: 10,
    timeout: 30,
    temperature: 0.5,
    permissionMode: 'ask',
    skills: ['skill1'],
    mcpServers: ['server1'],
    hooks: { preToolUse: 'test' },
    memory: 'memory',
    background: true,
    isolation: 'worktree',
    color: 'blue',
    kind: 'local',
    hidden: true,
    permissions: { allow: ['Read'] },
    sandboxMode: 'read-only',
    reasoningEffort: 'high',
};

describe('AntigravityAgentAdapter', () => {
    const adapter = new AntigravityAgentAdapter();

    describe('parse', () => {
        it('should return error - Antigravity has no formal format', async () => {
            const result = await adapter.parse('some input', '/tmp/test.md');
            expect(result.success).toBe(false);
            expect(result.errors[0]).toContain('Antigravity does not have a formal agent definition format');
        });
    });

    describe('validate', () => {
        it('should validate agent', async () => {
            const result = await adapter.validate(sampleAgent);
            expect(result.success).toBe(true);
            expect(result.messages).toContain(
                'Antigravity uses policy-based dispatch, not structured agent definitions',
            );
            expect(result.messages).toContain('Generated output will be an advisory document, not a runnable config');
        });

        it('should warn about all unsupported fields', async () => {
            const result = await adapter.validate(sampleAgent);
            expect(result.warnings.some((w) => w.includes('Antigravity has no formal config'))).toBe(true);
        });

        it('should warn about Claude-specific syntax', async () => {
            const agent = { ...sampleAgent, body: 'Use !`command` syntax and $ARGUMENTS and context: fork' };
            const result = await adapter.validate(agent);
            expect(result.warnings).toContain(
                'Body uses Claude-specific !`cmd` syntax -- not compatible with Antigravity',
            );
            expect(result.warnings).toContain('Body uses Claude-specific $ARGUMENTS syntax');
            expect(result.warnings).toContain('Body uses Claude-specific context: fork');
        });
    });

    describe('generate', () => {
        it('should generate advisory document', async () => {
            const context = createAgentAdapterContext(sampleAgent, '/tmp', 'antigravity');
            const result = await adapter.generate(sampleAgent, context);
            expect(result.success).toBe(true);
            expect(result.output).toContain('# Antigravity Advisory: antigravity-test-agent');
            expect(result.output).toContain('Agent Overview');
            expect(result.output).toContain('- **Name:** antigravity-test-agent');
            expect(result.output).toContain('- **Description:** Test agent for Antigravity adapter');
        });

        it('should generate tool sections', async () => {
            const context = createAgentAdapterContext(sampleAgent, '/tmp', 'antigravity');
            const result = await adapter.generate(sampleAgent, context);
            expect(result.output).toContain('### Allowed Tools');
            expect(result.output).toContain('- Read');
            expect(result.output).toContain('- Grep');
            expect(result.output).toContain('### Disallowed Tools');
            expect(result.output).toContain('- Bash');
        });

        it('should generate timeout and turn limit sections', async () => {
            const context = createAgentAdapterContext(sampleAgent, '/tmp', 'antigravity');
            const result = await adapter.generate(sampleAgent, context);
            expect(result.output).toContain('### Timeout');
            expect(result.output).toContain('Configure timeout to approximately 30 minutes.');
            expect(result.output).toContain('### Turn Limit');
            expect(result.output).toContain('Limit conversations to approximately 10 turns.');
        });

        it('should generate natural language dispatch', async () => {
            const context = createAgentAdapterContext(sampleAgent, '/tmp', 'antigravity');
            const result = await adapter.generate(sampleAgent, context);
            expect(result.output).toContain('## Natural Language Dispatch');
            expect(result.output).toContain('@antigravity-test-agent <task description>');
        });

        it('should generate limitations section', async () => {
            const context = createAgentAdapterContext(sampleAgent, '/tmp', 'antigravity');
            const result = await adapter.generate(sampleAgent, context);
            expect(result.output).toContain('## Limitations');
            expect(result.output).toContain('permissionMode');
            expect(result.output).toContain('skills');
            expect(result.output).toContain('mcpServers');
            expect(result.output).toContain('hooks');
            expect(result.output).toContain('memory');
            expect(result.output).toContain('background');
            expect(result.output).toContain('isolation');
        });

        it('should warn about advisory nature', async () => {
            const context = createAgentAdapterContext(sampleAgent, '/tmp', 'antigravity');
            const result = await adapter.generate(sampleAgent, context);
            expect(result.warnings).toContain('Antigravity output is advisory documentation, not a runnable config');
        });
    });

    describe('detectFeatures', () => {
        it('should return advisory-only feature', async () => {
            const features = adapter.detectFeatures(sampleAgent);
            expect(features).toContain('antigravity-advisory-only');
        });
    });
});

describe('AntigravityAgentAdapter - options', () => {
    it('should disable detailed advisory', async () => {
        const adapter = new AntigravityAgentAdapter({ detailedAdvisory: false });
        const context = createAgentAdapterContext(sampleAgent, '/tmp', 'antigravity');
        const result = await adapter.generate(sampleAgent, context);
        expect(result.output).not.toContain('## System Prompt');
    });
});
