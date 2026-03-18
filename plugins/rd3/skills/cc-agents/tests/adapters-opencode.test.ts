#!/usr/bin/env bun
import { describe, expect, it } from 'bun:test';
import { createAgentAdapterContext } from '../scripts/adapters';
import { OpenCodeAgentAdapter } from '../scripts/adapters/opencode';
import type { UniversalAgent } from '../scripts/types';

const sampleAgent: UniversalAgent = {
    name: 'opencode-test-agent',
    description: 'Test agent for OpenCode adapter',
    body: '# Test Agent\n\nA test agent body.',
    tools: ['Read', 'Grep'],
    disallowedTools: ['Bash'],
    model: 'claude-sonnet-4-20250514',
    temperature: 0.5,
    color: 'blue',
    hidden: true,
    maxTurns: 10,
};

describe('OpenCodeAgentAdapter', () => {
    const adapter = new OpenCodeAgentAdapter();

    describe('parse - Markdown format', () => {
        it('should parse valid OpenCode frontmatter', async () => {
            const input = `---
name: test-agent
description: A test agent
model: claude-sonnet-4-20250514
temperature: 0.5
color: blue
hidden: true
steps: 10
tools:
  Read: true
  Grep: true
  Bash: false
---

# Agent Body`;

            const result = await adapter.parse(input, '/tmp/test-agent.md');
            expect(result.success).toBe(true);
            expect(result.agent?.name).toBe('test-agent');
            expect(result.agent?.description).toBe('A test agent');
            expect(result.agent?.model).toBe('claude-sonnet-4-20250514');
            expect(result.agent?.temperature).toBe(0.5);
            expect(result.agent?.color).toBe('blue');
            expect(result.agent?.hidden).toBe(true);
            expect(result.agent?.maxTurns).toBe(10);
            expect(result.agent?.tools).toEqual(['Read', 'Grep']);
            expect(result.agent?.disallowedTools).toEqual(['Bash']);
        });

        it('should handle prompt field as body', async () => {
            const input = `---
name: test-agent
description: A test agent
prompt: This is the prompt body
---

`;

            const result = await adapter.parse(input, '/tmp/test-agent.md');
            expect(result.success).toBe(true);
            expect(result.agent?.body).toBe('This is the prompt body');
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
    });

    describe('parse - JSON format', () => {
        it('should parse valid JSON config', async () => {
            const input = JSON.stringify({
                name: 'json-agent',
                description: 'A JSON agent',
                model: 'claude-sonnet',
                temperature: 0.3,
                color: 'red',
                hidden: false,
                steps: 5,
                tools: {
                    Read: true,
                    Write: false,
                },
            });

            const result = await adapter.parse(input, '/tmp/json-agent.json');
            expect(result.success).toBe(true);
            expect(result.agent?.name).toBe('json-agent');
            expect(result.agent?.description).toBe('A JSON agent');
            expect(result.agent?.model).toBe('claude-sonnet');
            expect(result.agent?.temperature).toBe(0.3);
            expect(result.agent?.color).toBe('red');
            expect(result.agent?.hidden).toBe(false);
            expect(result.agent?.maxTurns).toBe(5);
            expect(result.agent?.tools).toEqual(['Read']);
            expect(result.agent?.disallowedTools).toEqual(['Write']);
        });

        it('should use filename as name when not in JSON', async () => {
            const input = JSON.stringify({
                description: 'A JSON agent',
            });

            const result = await adapter.parse(input, '/tmp/my-agent.json');
            expect(result.success).toBe(true);
            expect(result.agent?.name).toBe('my-agent');
        });

        it('should warn when no prompt in JSON', async () => {
            const input = JSON.stringify({
                description: 'A JSON agent',
            });

            const result = await adapter.parse(input, '/tmp/test.json');
            expect(result.warnings).toContain(
                'No body/prompt found in JSON config -- agent will have empty system prompt',
            );
        });

        it('should fail for invalid JSON', async () => {
            const input = '{ invalid json }';
            const result = await adapter.parse(input, '/tmp/test.json');
            expect(result.success).toBe(false);
            expect(result.errors[0]).toContain('JSON parse error');
        });

        it('should fail when description missing in JSON', async () => {
            const input = JSON.stringify({ name: 'test' });
            const result = await adapter.parse(input, '/tmp/test.json');
            expect(result.success).toBe(false);
            expect(result.errors).toContain('Missing required field: description');
        });
    });

    describe('validate', () => {
        it('should validate a complete agent', async () => {
            const result = await adapter.validate(sampleAgent);
            expect(result.success).toBe(true);
            expect(result.messages).toContain('Agent uses 2 allowed tools');
            expect(result.messages).toContain('Agent disallows 1 tools (will use tools: {X: false} format)');
        });

        it('should warn about hidden flag', async () => {
            const result = await adapter.validate(sampleAgent);
            expect(result.messages).toContain('Agent hidden: true');
        });

        it('should warn about permissions', async () => {
            const agent = { ...sampleAgent, permissions: { allow: ['Read'] } };
            const result = await adapter.validate(agent);
            expect(result.messages).toContain('Agent has permission configuration');
        });

        it('should warn about dropped fields', async () => {
            const agent: UniversalAgent = {
                ...sampleAgent,
                permissionMode: 'ask',
                skills: ['skill1'],
                mcpServers: ['server1'],
                hooks: { preToolUse: 'test' },
                memory: 'memory',
                background: true,
                isolation: 'worktree',
                kind: 'local',
                timeout: 30,
                sandboxMode: 'read-only',
                reasoningEffort: 'high',
            };
            const result = await adapter.validate(agent);
            expect(result.warnings.some((w) => w.includes('Fields not supported by OpenCode'))).toBe(true);
        });
    });

    describe('generate', () => {
        it('should generate OpenCode frontmatter with tools map', async () => {
            const context = createAgentAdapterContext(sampleAgent, '/tmp', 'opencode');
            const result = await adapter.generate(sampleAgent, context);
            expect(result.success).toBe(true);
            expect(result.output).toContain('name:');
            expect(result.output).toContain('opencode-test-agent');
            expect(result.output).toContain('tools:');
            expect(result.output).toContain('Read: true');
            expect(result.output).toContain('Grep: true');
            expect(result.output).toContain('Bash: false');
        });

        it('should generate both .md and .json files', async () => {
            const context = createAgentAdapterContext(sampleAgent, '/tmp', 'opencode');
            const result = await adapter.generate(sampleAgent, context);
            const fileKeys = Object.keys(result.files || {});
            expect(fileKeys.some((k) => k.endsWith('.md'))).toBe(true);
            expect(fileKeys.some((k) => k.endsWith('.json'))).toBe(true);
            expect(result.companions).toContain('/tmp/opencode-test-agent.md');
            expect(result.companions).toContain('/tmp/opencode-test-agent.opencode.json');
        });

        it('should include permissions in output', async () => {
            const agent = { ...sampleAgent, permissions: { allow: ['Read'] } };
            const context = createAgentAdapterContext(agent, '/tmp', 'opencode');
            const result = await adapter.generate(agent, context);
            expect(result.files?.['/tmp/opencode-test-agent.opencode.json']).toContain('permissions');
        });

        it('should note dropped fields', async () => {
            const agent = { ...sampleAgent, skills: ['skill1'] };
            const context = createAgentAdapterContext(agent, '/tmp', 'opencode');
            const result = await adapter.generate(agent, context);
            expect(result.warnings.some((w) => w.includes('Fields not supported by OpenCode (dropped)'))).toBe(true);
        });
    });

    describe('detectFeatures', () => {
        it('should detect hidden feature', async () => {
            const features = adapter.detectFeatures(sampleAgent);
            expect(features).toContain('opencode-hidden');
        });

        it('should detect permissions feature', async () => {
            const agent = { ...sampleAgent, permissions: { allow: ['Read'] } };
            const features = adapter.detectFeatures(agent);
            expect(features).toContain('opencode-permissions');
        });

        it('should detect steps feature', async () => {
            const features = adapter.detectFeatures(sampleAgent);
            expect(features).toContain('opencode-steps');
        });

        it('should detect temperature feature', async () => {
            const features = adapter.detectFeatures(sampleAgent);
            expect(features).toContain('opencode-temperature');
        });

        it('should detect color feature', async () => {
            const features = adapter.detectFeatures(sampleAgent);
            expect(features).toContain('opencode-color');
        });

        it('should detect denied tools feature', async () => {
            const features = adapter.detectFeatures(sampleAgent);
            expect(features).toContain('opencode-tools-deny');
        });
    });
});

describe('OpenCodeAgentAdapter - options', () => {
    it('should disable tools map validation', async () => {
        const adapter = new OpenCodeAgentAdapter({ validateToolsMap: false });
        const result = await adapter.validate(sampleAgent);
        expect(result.messages).not.toContain('Agent uses 2 allowed tools');
    });

    it('should disable dropped field warnings', async () => {
        const adapter = new OpenCodeAgentAdapter({ warnDroppedFields: false });
        const agent: UniversalAgent = {
            ...sampleAgent,
            skills: ['skill1'],
        };
        const result = await adapter.validate(agent);
        expect(result.warnings.some((w) => w.includes('Fields not supported by OpenCode'))).toBe(false);
    });
});
