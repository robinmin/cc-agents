#!/usr/bin/env bun
import { describe, expect, it } from 'bun:test';
import { agentAdapterRegistry, createAgentAdapterContext } from '../scripts/adapters';
import type { UniversalAgent } from '../scripts/types';

const sampleAgent: UniversalAgent = {
    name: 'test-agent',
    description: 'Use PROACTIVELY for testing adapter roundtrips.',
    body: '# Test Agent\n\nA simple test agent for adapter verification.\n\n## Rules\n\n- Follow best practices\n- Report findings',
    tools: ['Read', 'Grep', 'Glob'],
    model: 'claude-sonnet-4-20250514',
};

describe('Adapter Registry', () => {
    it('should have all 6 platform adapters', () => {
        expect(agentAdapterRegistry.has('claude')).toBe(true);
        expect(agentAdapterRegistry.has('gemini')).toBe(true);
        expect(agentAdapterRegistry.has('opencode')).toBe(true);
        expect(agentAdapterRegistry.has('codex')).toBe(true);
        expect(agentAdapterRegistry.has('openclaw')).toBe(true);
        expect(agentAdapterRegistry.has('antigravity')).toBe(true);
    });
});

describe('Claude Adapter', () => {
    const adapter = agentAdapterRegistry.get('claude');

    it('should generate valid Claude agent markdown', async () => {
        const context = createAgentAdapterContext(sampleAgent, '/tmp', 'claude');
        const result = await adapter.generate(sampleAgent, context);
        expect(result.success).toBe(true);
        expect(result.output).toContain('name:');
        expect(result.output).toContain('# Test Agent');
    });

    it('should roundtrip parse -> generate', async () => {
        const context = createAgentAdapterContext(sampleAgent, '/tmp', 'claude');
        const genResult = await adapter.generate(sampleAgent, context);
        expect(genResult.success).toBe(true);

        const parseResult = await adapter.parse(genResult.output || '', '/tmp/test-agent.md');
        expect(parseResult.success).toBe(true);
        expect(parseResult.agent?.name).toBe('test-agent');
        expect(parseResult.agent?.description).toContain('testing');
    });
});

describe('Gemini Adapter', () => {
    const adapter = agentAdapterRegistry.get('gemini');

    it('should generate Gemini-format agent', async () => {
        const agentWithTurns = { ...sampleAgent, maxTurns: 10 };
        const context = createAgentAdapterContext(agentWithTurns, '/tmp', 'gemini');
        const result = await adapter.generate(agentWithTurns, context);
        expect(result.success).toBe(true);
        expect(result.output).toContain('max_turns:');
    });
});

describe('OpenCode Adapter', () => {
    const adapter = agentAdapterRegistry.get('opencode');

    it('should generate both Markdown and JSON', async () => {
        const context = createAgentAdapterContext(sampleAgent, '/tmp', 'opencode');
        const result = await adapter.generate(sampleAgent, context);
        expect(result.success).toBe(true);
        expect(result.files).toBeDefined();
        const fileKeys = Object.keys(result.files || {});
        expect(fileKeys.some((k) => k.endsWith('.md'))).toBe(true);
        expect(fileKeys.some((k) => k.endsWith('.json'))).toBe(true);
    });
});

describe('Codex Adapter', () => {
    const adapter = agentAdapterRegistry.get('codex');

    it('should generate TOML config', async () => {
        const context = createAgentAdapterContext(sampleAgent, '/tmp', 'codex');
        const result = await adapter.generate(sampleAgent, context);
        expect(result.success).toBe(true);
        expect(result.output).toContain('name = "test-agent"');
        expect(result.output).toContain('description =');
    });
});

describe('OpenClaw Adapter', () => {
    const adapter = agentAdapterRegistry.get('openclaw');

    it('should generate JSON config', async () => {
        const context = createAgentAdapterContext(sampleAgent, '/tmp', 'openclaw');
        const result = await adapter.generate(sampleAgent, context);
        expect(result.success).toBe(true);
        expect(result.output).toContain('"name"');
    });
});

describe('Antigravity Adapter', () => {
    const adapter = agentAdapterRegistry.get('antigravity');

    it('should generate advisory documentation', async () => {
        const context = createAgentAdapterContext(sampleAgent, '/tmp', 'antigravity');
        const result = await adapter.generate(sampleAgent, context);
        expect(result.success).toBe(true);
        expect(result.output).toBeTruthy();
    });
});
