#!/usr/bin/env bun
import { describe, expect, it } from 'bun:test';
import { createAgentAdapterContext } from '../scripts/adapters';
import { GeminiAgentAdapter } from '../scripts/adapters/gemini';
import type { UniversalAgent } from '../scripts/types';

const sampleAgent: UniversalAgent = {
    name: 'gemini-test-agent',
    description: 'Test agent for Gemini adapter',
    body: '# Test Agent\n\nA test agent body.',
    tools: ['Read', 'Grep'],
    model: 'gemini-2.0-flash',
    maxTurns: 10,
    timeout: 30,
    temperature: 0.7,
    kind: 'local',
};

describe('GeminiAgentAdapter', () => {
    const adapter = new GeminiAgentAdapter();

    describe('parse', () => {
        it('should parse valid Gemini frontmatter', async () => {
            const input = `---
name: test-agent
description: A test agent
model: gemini-2.0-flash
max_turns: 10
timeout_mins: 30
temperature: 0.7
kind: local
tools:
  - Read
  - Grep
---

# Agent Body`;

            const result = await adapter.parse(input, '/tmp/test-agent.md');
            expect(result.success).toBe(true);
            expect(result.agent?.name).toBe('test-agent');
            expect(result.agent?.description).toBe('A test agent');
            expect(result.agent?.model).toBe('gemini-2.0-flash');
            expect(result.agent?.maxTurns).toBe(10);
            expect(result.agent?.timeout).toBe(30);
            expect(result.agent?.temperature).toBe(0.7);
            expect(result.agent?.kind).toBe('local');
            expect(result.agent?.tools).toEqual(['Read', 'Grep']);
            expect(result.agent?.body).toContain('Agent Body');
        });

        it('should fail when no frontmatter', async () => {
            const input = '# No frontmatter here';
            const result = await adapter.parse(input, '/tmp/test.md');
            expect(result.success).toBe(false);
            expect(result.errors).toContain('No frontmatter found in agent file');
        });

        it('should fail when name is missing', async () => {
            const input = `---
description: A test agent
---

Body`;
            const result = await adapter.parse(input, '/tmp/test.md');
            expect(result.success).toBe(false);
            expect(result.errors).toContain('Missing required field: name');
        });

        it('should fail when description is missing', async () => {
            const input = `---
name: test
---

Body`;
            const result = await adapter.parse(input, '/tmp/test.md');
            expect(result.success).toBe(false);
            expect(result.errors).toContain('Missing required field: description');
        });

        it('should fail when body is empty', async () => {
            const input = `---
name: test
description: Test
---

`;
            const result = await adapter.parse(input, '/tmp/test.md');
            expect(result.success).toBe(false);
            expect(result.errors).toContain('Agent body (system prompt) is empty');
        });

        it('should warn about unknown fields', async () => {
            const input = `---
name: test
description: Test
unknown_field: value
---

Body`;
            const result = await adapter.parse(input, '/tmp/test.md');
            expect(result.warnings).toContain('Unknown frontmatter fields: unknown_field');
        });

        it('should capture platform extensions', async () => {
            const input = `---
name: test
description: Test
custom_field: value
---

Body`;
            const result = await adapter.parse(input, '/tmp/test.md');
            expect(result.success).toBe(true);
            expect(result.agent?.platformExtensions).toEqual({ custom_field: 'value' });
        });
    });

    describe('validate', () => {
        it('should validate a complete agent', async () => {
            const result = await adapter.validate(sampleAgent);
            expect(result.success).toBe(true);
        });

        it('should warn about invalid kind', async () => {
            const agent = { ...sampleAgent, kind: 'invalid' as unknown as 'local' | 'remote' };
            const result = await adapter.validate(agent);
            expect(result.warnings).toContain("Unknown kind 'invalid' -- valid values: local, remote");
        });

        it('should warn about Claude-specific syntax', async () => {
            const agent = { ...sampleAgent, body: 'Use !`command` syntax and $ARGUMENTS' };
            const result = await adapter.validate(agent);
            expect(result.warnings).toContain(
                'Body uses Claude-specific !`cmd` syntax -- not compatible with Gemini CLI',
            );
            expect(result.warnings).toContain('Body uses Claude-specific $ARGUMENTS syntax');
        });

        it('should warn about context: fork', async () => {
            const agent = { ...sampleAgent, body: 'Use context: fork pattern' };
            const result = await adapter.validate(agent);
            expect(result.warnings).toContain('Body uses Claude-specific context: fork');
        });

        it('should warn about dropped Claude-only fields', async () => {
            const agent: UniversalAgent = {
                ...sampleAgent,
                skills: ['skill1'],
                mcpServers: ['server1'],
                hooks: { preToolUse: 'test' },
                memory: 'memory',
                background: true,
                isolation: 'worktree',
                color: 'blue',
                sandboxMode: 'read-only',
                reasoningEffort: 'high',
                hidden: true,
                permissions: { allow: ['Read'] },
                disallowedTools: ['Bash'],
                permissionMode: 'ask',
            };
            const result = await adapter.validate(agent);
            expect(result.warnings.some((w) => w.includes('Fields not supported by Gemini CLI'))).toBe(true);
        });
    });

    describe('generate', () => {
        it('should generate Gemini frontmatter', async () => {
            const context = createAgentAdapterContext(sampleAgent, '/tmp', 'gemini');
            const result = await adapter.generate(sampleAgent, context);
            expect(result.success).toBe(true);
            expect(result.output).toContain('name:');
            expect(result.output).toContain('gemini-test-agent');
            expect(result.output).toContain('description:');
            expect(result.output).toContain('max_turns: 10');
            expect(result.output).toContain('timeout_mins: 30');
            expect(result.output).toContain('temperature: 0.7');
            expect(result.output).toContain('kind:');
        });

        it('should generate tools array', async () => {
            const context = createAgentAdapterContext(sampleAgent, '/tmp', 'gemini');
            const result = await adapter.generate(sampleAgent, context);
            expect(result.output).toContain('tools:');
            expect(result.output).toContain('Read');
            expect(result.output).toContain('Grep');
        });

        it('should note dropped fields in warnings', async () => {
            const agent: UniversalAgent = {
                ...sampleAgent,
                skills: ['skill1'],
            };
            const context = createAgentAdapterContext(agent, '/tmp', 'gemini');
            const result = await adapter.generate(agent, context);
            expect(result.warnings.some((w) => w.includes('Fields not supported by Gemini CLI (dropped)'))).toBe(true);
        });

        it('should detect platform features', async () => {
            const context = createAgentAdapterContext(sampleAgent, '/tmp', 'gemini');
            const result = await adapter.generate(sampleAgent, context);
            expect(result.messages).toContain('Generated Gemini CLI agent: /tmp/gemini-test-agent.md');
        });
    });
});

describe('GeminiAgentAdapter - options', () => {
    it('should disable unknown field warnings', async () => {
        const adapter = new GeminiAgentAdapter({ warnUnknownFields: false });
        const input = `---
name: test
description: Test
unknown_field: value
---

Body`;
        const result = await adapter.parse(input, '/tmp/test.md');
        expect(result.warnings).not.toContain('Unknown frontmatter fields: unknown_field');
    });

    it('should disable dropped field warnings', async () => {
        const adapter = new GeminiAgentAdapter({ warnDroppedFields: false });
        const agent: UniversalAgent = {
            ...sampleAgent,
            skills: ['skill1'],
        };
        const result = await adapter.validate(agent);
        expect(result.warnings.some((w) => w.includes('Fields not supported by Gemini CLI'))).toBe(false);
    });
});

describe('GeminiAgentAdapter - detectPlatformFeatures', () => {
    const adapter = new GeminiAgentAdapter();

    it('should detect remote agent feature', () => {
        const agent: UniversalAgent = { name: 'test', description: 'test', body: 'body', kind: 'remote' };
        const features = adapter.detectFeatures(agent);
        expect(features).toContain('gemini-remote-agent');
    });

    it('should detect local agent feature', () => {
        const agent: UniversalAgent = { name: 'test', description: 'test', body: 'body', kind: 'local' };
        const features = adapter.detectFeatures(agent);
        expect(features).toContain('gemini-local-agent');
    });

    it('should detect temperature feature', () => {
        const agent: UniversalAgent = { name: 'test', description: 'test', body: 'body', temperature: 0.5 };
        const features = adapter.detectFeatures(agent);
        expect(features).toContain('gemini-temperature');
    });

    it('should detect timeout feature', () => {
        const agent: UniversalAgent = { name: 'test', description: 'test', body: 'body', timeout: 60 };
        const features = adapter.detectFeatures(agent);
        expect(features).toContain('gemini-timeout');
    });

    it('should detect max turns feature', () => {
        const agent: UniversalAgent = { name: 'test', description: 'test', body: 'body', maxTurns: 20 };
        const features = adapter.detectFeatures(agent);
        expect(features).toContain('gemini-max-turns');
    });
});
