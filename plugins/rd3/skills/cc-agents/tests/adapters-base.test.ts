#!/usr/bin/env bun
import { describe, expect, it } from 'bun:test';
import {
    AgentAdapterRegistry,
    ClaudeAgentAdapter,
    GeminiAgentAdapter,
    agentAdapterRegistry,
    createAgentAdapterContext,
    getAgentAdapter,
    hasAgentAdapter,
} from '../scripts/adapters';
import type { AgentAdapterContext, UniversalAgent } from '../scripts/types';

const sampleAgent: UniversalAgent = {
    name: 'test-agent',
    description: 'A test agent for adapter verification',
    body: '# Test Agent\n\nA simple test agent.',
    tools: ['Read', 'Grep'],
    model: 'claude-sonnet-4-20250514',
};

describe('createAgentAdapterContext', () => {
    it('should create context with all fields', () => {
        const context = createAgentAdapterContext(sampleAgent, '/output', 'claude');
        expect(context.agent).toBe(sampleAgent);
        expect(context.outputPath).toBe('/output');
        expect(context.targetPlatform).toBe('claude');
    });
});

describe('AgentAdapterRegistry', () => {
    it('should have all 6 platform adapters', () => {
        expect(agentAdapterRegistry.has('claude')).toBe(true);
        expect(agentAdapterRegistry.has('gemini')).toBe(true);
        expect(agentAdapterRegistry.has('opencode')).toBe(true);
        expect(agentAdapterRegistry.has('codex')).toBe(true);
        expect(agentAdapterRegistry.has('openclaw')).toBe(true);
        expect(agentAdapterRegistry.has('antigravity')).toBe(true);
    });

    it('should get adapters for each platform', () => {
        const claude = agentAdapterRegistry.get('claude');
        expect(claude.platform).toBe('claude');

        const gemini = agentAdapterRegistry.get('gemini');
        expect(gemini.platform).toBe('gemini');

        const opencode = agentAdapterRegistry.get('opencode');
        expect(opencode.platform).toBe('opencode');

        const codex = agentAdapterRegistry.get('codex');
        expect(codex.platform).toBe('codex');

        const openclaw = agentAdapterRegistry.get('openclaw');
        expect(openclaw.platform).toBe('openclaw');

        const antigravity = agentAdapterRegistry.get('antigravity');
        expect(antigravity.platform).toBe('antigravity');
    });

    it('should throw for unknown platform', () => {
        const invalidPlatform = 'unknown';
        // Using unknown cast for testing invalid platform
        expect(() =>
            agentAdapterRegistry.get(invalidPlatform as unknown as import('../scripts/types').AgentPlatform),
        ).toThrow();
    });

    it('should cache adapters', () => {
        const adapter1 = agentAdapterRegistry.get('claude');
        const adapter2 = agentAdapterRegistry.get('claude');
        expect(adapter1).toBe(adapter2);
    });

    it('should get all platforms', () => {
        const platforms = agentAdapterRegistry.platforms;
        expect(platforms).toContain('claude');
        expect(platforms).toContain('gemini');
        expect(platforms).toContain('opencode');
        expect(platforms).toContain('codex');
        expect(platforms).toContain('openclaw');
        expect(platforms).toContain('antigravity');
    });

    it('should get all adapters', () => {
        const all = agentAdapterRegistry.getAll();
        expect(all.claude).toBeDefined();
        expect(all.gemini).toBeDefined();
        expect(all.opencode).toBeDefined();
        expect(all.codex).toBeDefined();
        expect(all.openclaw).toBeDefined();
        expect(all.antigravity).toBeDefined();
    });

    it('should register new adapter', () => {
        const registry = new AgentAdapterRegistry();
        const customAdapter = new ClaudeAgentAdapter();
        registry.register('claude', () => customAdapter);
        expect(registry.has('claude')).toBe(true);
    });

    it('should register and clear cache for existing platform', () => {
        const registry = new AgentAdapterRegistry();
        // First get to populate cache
        const adapter1 = registry.get('claude');
        // Register new adapter - should clear cache
        const customAdapter = new ClaudeAgentAdapter();
        registry.register('claude', () => customAdapter);
        // Get again should return new adapter
        const adapter2 = registry.get('claude');
        expect(adapter2).toBe(customAdapter);
    });

    it('should clear cache', () => {
        const registry = new AgentAdapterRegistry();
        // Get an adapter to populate cache
        registry.get('claude');
        // Clear the cache
        registry.clear();
        // Get again - should work
        const adapter = registry.get('claude');
        expect(adapter).toBeDefined();
    });
});

describe('getAgentAdapter', () => {
    it('should return adapter for platform', () => {
        const adapter = getAgentAdapter('claude');
        expect(adapter.platform).toBe('claude');
    });
});

describe('hasAgentAdapter', () => {
    it('should return true for existing platform', () => {
        expect(hasAgentAdapter('claude')).toBe(true);
    });

    it('should return false for non-existing platform', () => {
        const invalidPlatform = 'nonexistent';
        expect(hasAgentAdapter(invalidPlatform as unknown as import('../scripts/types').AgentPlatform)).toBe(false);
    });
});

describe('ClaudeAgentAdapter - validate', () => {
    const adapter = new ClaudeAgentAdapter();

    it('should validate agent with required fields', async () => {
        const result = await adapter.validate(sampleAgent);
        expect(result.success).toBe(true);
    });

    it('should fail validation when name is missing', async () => {
        const invalidAgent = { ...sampleAgent, name: '' };
        const result = await adapter.validate(invalidAgent);
        expect(result.success).toBe(false);
        expect(result.errors).toContain('Agent name is required');
    });

    it('should fail validation when description is missing', async () => {
        const invalidAgent = { ...sampleAgent, description: '' };
        const result = await adapter.validate(invalidAgent);
        expect(result.success).toBe(false);
        expect(result.errors).toContain('Agent description is required');
    });

    it('should fail validation when body is missing', async () => {
        const invalidAgent = { ...sampleAgent, body: '' };
        const result = await adapter.validate(invalidAgent);
        expect(result.success).toBe(false);
        expect(result.errors).toContain('Agent body (system prompt) is required');
    });

    it('should warn for invalid name format', async () => {
        const invalidAgent = { ...sampleAgent, name: 'InvalidName' };
        const result = await adapter.validate(invalidAgent);
        expect(result.warnings).toContain("Agent name 'InvalidName' should be lowercase hyphen-case");
    });

    it('should generate output when agent is valid', async () => {
        const context = createAgentAdapterContext(sampleAgent, '/tmp', 'claude');
        const result = await adapter.generate(sampleAgent, context);
        expect(result.success).toBe(true);
    });

    it('should fail generate when name is missing', async () => {
        const context = createAgentAdapterContext(sampleAgent, '/tmp', 'claude');
        const result = await adapter.generate({ ...sampleAgent, name: '' }, context);
        expect(result.success).toBe(false);
        expect(result.errors).toContain('Cannot generate: agent name is missing');
    });

    it('should fail generate when body is missing', async () => {
        const context = createAgentAdapterContext(sampleAgent, '/tmp', 'claude');
        const result = await adapter.generate({ ...sampleAgent, body: '' }, context);
        expect(result.success).toBe(false);
        expect(result.errors).toContain('Cannot generate: agent body is missing');
    });

    it('should detect features', () => {
        const features = adapter.detectFeatures(sampleAgent);
        expect(features).toContain('tools');
        expect(features).toContain('model');
    });

    it('should detect no tools feature', () => {
        const agentNoTools = { name: 'test', description: 'test', body: 'body' };
        const features = adapter.detectFeatures(agentNoTools);
        expect(features).not.toContain('tools');
    });

    it('should return empty features for agent without tools or model', () => {
        // Base class detectPlatformFeatures returns empty array
        const agentNoFeatures = { name: 'test', description: 'test', body: 'body' };
        const features = adapter.detectFeatures(agentNoFeatures);
        // No tools or model means empty features
        expect(features).toEqual([]);
    });

    it('should validate platform returns empty errors and warnings by default', async () => {
        // Access via generate to test the validate flow
        const context = createAgentAdapterContext(sampleAgent, '/tmp', 'claude');
        const result = await adapter.generate(sampleAgent, context);
        expect(result.success).toBe(true);
    });
});

describe('GeminiAgentAdapter - validate', () => {
    const adapter = new GeminiAgentAdapter();

    it('should validate agent with required fields', async () => {
        const result = await adapter.validate(sampleAgent);
        expect(result.success).toBe(true);
    });
});

describe('ClaudeAgentAdapter - generate tests', () => {
    const adapter = new ClaudeAgentAdapter();

    it('should generate output when agent is valid', async () => {
        const context = createAgentAdapterContext(sampleAgent, '/tmp', 'claude');
        const result = await adapter.generate(sampleAgent, context);
        expect(result.success).toBe(true);
        expect(result.output).toContain('name:');
    });

    it('should generate with multiple tools', async () => {
        const agent = { ...sampleAgent, tools: ['Read', 'Grep', 'Glob'] };
        const context = createAgentAdapterContext(agent, '/tmp', 'claude');
        const result = await adapter.generate(agent, context);
        expect(result.output).toContain('tools:');
    });

    it('should generate with disallowed tools', async () => {
        const agent = { ...sampleAgent, disallowedTools: ['Bash', 'Shell'] };
        const context = createAgentAdapterContext(agent, '/tmp', 'claude');
        const result = await adapter.generate(agent, context);
        expect(result.output).toContain('disallowedTools:');
    });

    it('should generate with skills', async () => {
        const agent = { ...sampleAgent, skills: ['rd2:skill-example'] };
        const context = createAgentAdapterContext(agent, '/tmp', 'claude');
        const result = await adapter.generate(agent, context);
        expect(result.output).toContain('skills:');
    });

    it('should generate with MCP servers', async () => {
        const agent = { ...sampleAgent, mcpServers: ['server1', 'server2'] };
        const context = createAgentAdapterContext(agent, '/tmp', 'claude');
        const result = await adapter.generate(agent, context);
        expect(result.output).toContain('mcpServers:');
    });

    it('should generate with hooks', async () => {
        const agent = {
            ...sampleAgent,
            hooks: { preToolUse: 'echo test', postToolUse: 'echo done' },
        };
        const context = createAgentAdapterContext(agent, '/tmp', 'claude');
        const result = await adapter.generate(agent, context);
        expect(result.output).toContain('hooks:');
    });

    it('should generate with memory', async () => {
        const agent = { ...sampleAgent, memory: 'file ./memory' };
        const context = createAgentAdapterContext(agent, '/tmp', 'claude');
        const result = await adapter.generate(agent, context);
        expect(result.output).toContain('memory:');
    });

    it('should generate with background flag', async () => {
        const agent = { ...sampleAgent, background: true };
        const context = createAgentAdapterContext(agent, '/tmp', 'claude');
        const result = await adapter.generate(agent, context);
        expect(result.output).toContain('background:');
    });

    it('should generate with isolation', async () => {
        const agent = { ...sampleAgent, isolation: 'worktree' };
        const context = createAgentAdapterContext(agent, '/tmp', 'claude');
        const result = await adapter.generate(agent, context);
        expect(result.output).toContain('isolation:');
    });

    it('should generate with color', async () => {
        const agent = { ...sampleAgent, color: 'blue' };
        const context = createAgentAdapterContext(agent, '/tmp', 'claude');
        const result = await adapter.generate(agent, context);
        expect(result.output).toContain('color:');
    });
});
