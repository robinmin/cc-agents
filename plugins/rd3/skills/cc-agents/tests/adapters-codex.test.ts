#!/usr/bin/env bun
import { describe, expect, it } from 'bun:test';
import { createAgentAdapterContext } from '../scripts/adapters';
import { CodexAgentAdapter } from '../scripts/adapters/codex';
import type { UniversalAgent } from '../scripts/types';

const sampleAgent: UniversalAgent = {
    name: 'codex-test-agent',
    description: 'Test agent for Codex adapter',
    body: '# Test Agent\n\nA test agent body.',
    tools: ['Read', 'Grep'],
    model: 'claude-sonnet-4-20250514',
    sandboxMode: 'read-write',
    reasoningEffort: 'high',
    timeout: 30,
};

describe('CodexAgentAdapter', () => {
    const adapter = new CodexAgentAdapter();

    describe('parse - TOML format', () => {
        it('should parse valid TOML agent config', async () => {
            const input = `[agents.test-agent]
description = "A test agent"
model = "claude-sonnet-4-20250514"
sandbox_mode = "read-write"
reasoning_effort = "high"
job_max_runtime_seconds = 1800

developer_instructions = """
# Test Agent

This is the body.
"""`;

            const result = await adapter.parse(input, '/tmp/test-agent.toml');
            expect(result.success).toBe(true);
            expect(result.agent?.name).toBe('test-agent');
            expect(result.agent?.description).toBe('A test agent');
            expect(result.agent?.model).toBe('claude-sonnet-4-20250514');
            expect(result.agent?.sandboxMode).toBe('read-write');
            expect(result.agent?.reasoningEffort).toBe('high');
            expect(result.agent?.timeout).toBe(30);
            expect(result.agent?.body).toContain('Test Agent');
        });

        it('should use section name as agent name', async () => {
            const input = `[agents.my-agent]
description = "Test"`;
            const result = await adapter.parse(input, '/tmp/test.toml');
            expect(result.agent?.name).toBe('my-agent');
        });

        it('should use filename as name when no section', async () => {
            const input = `description = "Test"`;
            const result = await adapter.parse(input, '/tmp/my-agent.toml');
            expect(result.agent?.name).toBe('my-agent');
        });

        it('should parse triple-quoted strings', async () => {
            const input = `[agents.test]
description = """Multi-line
description"""`;
            const result = await adapter.parse(input, '/tmp/test.toml');
            expect(result.agent?.description).toContain('Multi-line');
        });

        it('should parse array values', async () => {
            const input = `[agents.test]
description = "Test"
model = "test-model"
tools = ["Read", "Grep"]`;
            const result = await adapter.parse(input, '/tmp/test.toml');
            // tools is not in CodexAgentConfig so should be dropped
            expect(result.agent?.description).toBe('Test');
        });

        it('should parse boolean values', async () => {
            const input = `[agents.test]
description = "Test"
enabled = true`;
            const result = await adapter.parse(input, '/tmp/test.toml');
            expect(result.agent?.description).toBe('Test');
        });

        it('should fail when description missing', async () => {
            const input = '[agents.test]';
            const result = await adapter.parse(input, '/tmp/test.toml');
            expect(result.success).toBe(false);
            expect(result.errors).toContain('Missing required field: description');
        });

        it('should warn when body missing', async () => {
            const input = `[agents.test]
description = "Test"`;
            const result = await adapter.parse(input, '/tmp/test.toml');
            expect(result.warnings.some((w) => w.includes('developer_instructions'))).toBe(true);
        });
    });

    describe('parse - JSON format', () => {
        it('should parse JSON representation', async () => {
            const input = JSON.stringify({
                description: 'A test agent',
                model: 'claude-sonnet',
                developer_instructions: 'Body text',
                sandbox_mode: 'read-only',
                reasoning_effort: 'medium',
            });
            const result = await adapter.parse(input, '/tmp/test.json');
            expect(result.success).toBe(true);
            expect(result.agent?.description).toBe('A test agent');
        });

        it('should fail for invalid JSON', async () => {
            const input = '{ invalid json }';
            const result = await adapter.parse(input, '/tmp/test.json');
            expect(result.success).toBe(false);
            expect(result.errors[0]).toContain('JSON parse error');
        });
    });

    describe('validate', () => {
        it('should validate a complete agent', async () => {
            const result = await adapter.validate(sampleAgent);
            expect(result.success).toBe(true);
            expect(result.messages).toContain('Sandbox mode: read-write');
            expect(result.messages).toContain('Reasoning effort: high');
        });

        it('should warn about unknown sandbox mode', async () => {
            const agent = { ...sampleAgent, sandboxMode: 'invalid' };
            const result = await adapter.validate(agent);
            expect(result.warnings).toContain(
                "Unknown sandbox_mode 'invalid' -- valid values: read-only, read-write, full, none",
            );
        });

        it('should warn about unknown reasoning effort', async () => {
            const agent = { ...sampleAgent, reasoningEffort: 'invalid' };
            const result = await adapter.validate(agent);
            expect(result.warnings).toContain("Unknown reasoning_effort 'invalid' -- valid values: low, medium, high");
        });

        it('should warn about dropped fields', async () => {
            const agent: UniversalAgent = {
                ...sampleAgent,
                tools: ['Read'],
                disallowedTools: ['Bash'],
                maxTurns: 10,
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
            };
            const result = await adapter.validate(agent);
            expect(result.warnings.some((w) => w.includes('Fields not supported by Codex'))).toBe(true);
        });
    });

    describe('generate', () => {
        it('should generate TOML config', async () => {
            const context = createAgentAdapterContext(sampleAgent, '/tmp', 'codex');
            const result = await adapter.generate(sampleAgent, context);
            expect(result.success).toBe(true);
            expect(result.output).toContain('[agents.codex-test-agent]');
            expect(result.output).toContain('description =');
            expect(result.output).toContain('sandbox_mode =');
            expect(result.output).toContain('reasoning_effort =');
            expect(result.output).toContain('job_max_runtime_seconds =');
            expect(result.output).toContain('developer_instructions =');
        });

        it('should include model when present', async () => {
            const context = createAgentAdapterContext(sampleAgent, '/tmp', 'codex');
            const result = await adapter.generate(sampleAgent, context);
            expect(result.output).toContain('model =');
        });

        it('should not include undefined fields', async () => {
            const agent: UniversalAgent = {
                name: 'test',
                description: 'Test',
                body: 'Body',
            };
            const context = createAgentAdapterContext(agent, '/tmp', 'codex');
            const result = await adapter.generate(agent, context);
            expect(result.output).not.toContain('model =');
            expect(result.output).not.toContain('sandbox_mode =');
        });

        it('should note dropped fields', async () => {
            const agent: UniversalAgent = {
                ...sampleAgent,
                tools: ['Read'],
            };
            const context = createAgentAdapterContext(agent, '/tmp', 'codex');
            const result = await adapter.generate(agent, context);
            expect(result.warnings.some((w) => w.includes('Fields not supported by Codex (dropped)'))).toBe(true);
        });
    });

    describe('detectFeatures', () => {
        it('should detect sandbox mode feature', () => {
            const features = adapter.detectFeatures(sampleAgent);
            expect(features).toContain('codex-sandbox-read-write');
        });

        it('should detect reasoning effort feature', () => {
            const features = adapter.detectFeatures(sampleAgent);
            expect(features).toContain('codex-reasoning-high');
        });

        it('should detect runtime limit feature', () => {
            const features = adapter.detectFeatures(sampleAgent);
            expect(features).toContain('codex-runtime-limit');
        });
    });
});

describe('CodexAgentAdapter - options', () => {
    it('should disable sandbox mode validation', async () => {
        const adapter = new CodexAgentAdapter({ validateSandboxMode: false });
        const agent = { ...sampleAgent, sandboxMode: 'invalid' };
        const result = await adapter.validate(agent);
        expect(result.warnings).not.toContain("Unknown sandbox_mode 'invalid'");
    });
});
