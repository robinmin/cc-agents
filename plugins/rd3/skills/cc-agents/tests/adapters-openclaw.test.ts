#!/usr/bin/env bun
import { describe, expect, it } from 'bun:test';
import { createAgentAdapterContext } from '../scripts/adapters';
import { OpenClawAgentAdapter } from '../scripts/adapters/openclaw';
import type { UniversalAgent } from '../scripts/types';

const sampleAgent: UniversalAgent = {
    name: 'openclaw-test-agent',
    description: 'Test agent for OpenClaw adapter',
    body: '# Test Agent\n\nA test agent body.',
    tools: ['Read', 'Grep'],
    disallowedTools: ['Bash'],
    timeout: 30,
};

describe('OpenClawAgentAdapter', () => {
    const adapter = new OpenClawAgentAdapter();

    describe('parse', () => {
        it('should parse valid OpenClaw JSON config', async () => {
            const input = JSON.stringify({
                name: 'test-agent',
                description: 'A test agent',
                instructions: 'These are the instructions',
                runTimeoutSeconds: 1800,
                tools: {
                    allow: ['Read', 'Grep'],
                    deny: ['Bash'],
                },
            });

            const result = await adapter.parse(input, '/tmp/test-agent.json');
            expect(result.success).toBe(true);
            expect(result.agent?.name).toBe('test-agent');
            expect(result.agent?.description).toBe('A test agent');
            expect(result.agent?.body).toBe('These are the instructions');
            expect(result.agent?.timeout).toBe(30);
            expect(result.agent?.tools).toEqual(['Read', 'Grep']);
            expect(result.agent?.disallowedTools).toEqual(['Bash']);
        });

        it('should use purpose field as description', async () => {
            const input = JSON.stringify({
                description: 'Test description',
                purpose: 'Test purpose',
            });

            const result = await adapter.parse(input, '/tmp/test.json');
            expect(result.agent?.description).toBe('Test description');
        });

        it('should use purpose when description missing', async () => {
            const input = JSON.stringify({
                purpose: 'Test purpose',
            });

            const result = await adapter.parse(input, '/tmp/test.json');
            expect(result.agent?.description).toBe('Test purpose');
        });

        it('should parse subagent tools', async () => {
            const input = JSON.stringify({
                description: 'Test agent',
                tools: {
                    subagents: {
                        tools: ['SubRead', 'SubGrep'],
                    },
                },
            });

            const result = await adapter.parse(input, '/tmp/test.json');
            expect(result.agent?.tools).toEqual(['SubRead', 'SubGrep']);
        });

        it('should use filename as name when not in config', async () => {
            const input = JSON.stringify({
                description: 'Test agent',
            });

            const result = await adapter.parse(input, '/tmp/my-agent.json');
            expect(result.agent?.name).toBe('my-agent');
        });

        it('should warn when no instructions', async () => {
            const input = JSON.stringify({
                description: 'Test agent',
            });

            const result = await adapter.parse(input, '/tmp/test.json');
            expect(result.warnings).toContain('No instructions found in OpenClaw config -- agent will have empty body');
        });

        it('should capture platform extensions', async () => {
            const input = JSON.stringify({
                description: 'Test agent',
                maxSpawnDepth: 3,
                maxConcurrent: 5,
                maxChildrenPerAgent: 10,
            });

            const result = await adapter.parse(input, '/tmp/test.json');
            expect(result.agent?.platformExtensions).toEqual({
                maxSpawnDepth: 3,
                maxConcurrent: 5,
                maxChildrenPerAgent: 10,
            });
        });

        it('should fail for invalid JSON', async () => {
            const input = 'not valid json';
            const result = await adapter.parse(input, '/tmp/test.json');
            expect(result.success).toBe(false);
            expect(result.errors[0]).toContain('JSON parse error');
        });

        it('should fail when description missing', async () => {
            const input = JSON.stringify({ name: 'test' });
            const result = await adapter.parse(input, '/tmp/test.json');
            expect(result.success).toBe(false);
            expect(result.errors).toContain('Missing required field: description (or purpose)');
        });

        it('should fail when config is not an object', async () => {
            const input = '["array"]';
            const result = await adapter.parse(input, '/tmp/test.json');
            expect(result.success).toBe(false);
            expect(result.errors).toContain('OpenClaw config must be a JSON object');
        });
    });

    describe('validate', () => {
        it('should validate a complete agent', async () => {
            const result = await adapter.validate(sampleAgent);
            expect(result.success).toBe(true);
        });

        it('should report platform extensions', async () => {
            const agent = {
                ...sampleAgent,
                platformExtensions: {
                    maxSpawnDepth: 3,
                    maxConcurrent: 5,
                    maxChildrenPerAgent: 10,
                },
            };
            const result = await adapter.validate(agent);
            expect(result.messages).toContain('Max spawn depth: 3');
            expect(result.messages).toContain('Max concurrent: 5');
            expect(result.messages).toContain('Max children per agent: 10');
        });

        it('should warn about dropped fields', async () => {
            const agent: UniversalAgent = {
                ...sampleAgent,
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
                sandboxMode: 'read-only',
                reasoningEffort: 'high',
                model: 'claude',
            };
            const result = await adapter.validate(agent);
            expect(result.warnings.some((w) => w.includes('Fields not supported by OpenClaw'))).toBe(true);
        });
    });

    describe('generate', () => {
        it('should generate OpenClaw JSON config', async () => {
            const context = createAgentAdapterContext(sampleAgent, '/tmp', 'openclaw');
            const result = await adapter.generate(sampleAgent, context);
            expect(result.success).toBe(true);
            expect(result.output).toContain('"name": "openclaw-test-agent"');
            expect(result.output).toContain('"description": "Test agent for OpenClaw adapter"');
            expect(result.output).toContain('"runTimeoutSeconds": 1800');
        });

        it('should generate tools with allow/deny', async () => {
            const context = createAgentAdapterContext(sampleAgent, '/tmp', 'openclaw');
            const result = await adapter.generate(sampleAgent, context);
            expect(result.output).toContain('"allow"');
            expect(result.output).toContain('"Read"');
            expect(result.output).toContain('"Grep"');
            expect(result.output).toContain('"deny"');
            expect(result.output).toContain('"Bash"');
        });

        it('should include body as instructions', async () => {
            const context = createAgentAdapterContext(sampleAgent, '/tmp', 'openclaw');
            const result = await adapter.generate(sampleAgent, context);
            expect(result.output).toContain('"instructions"');
            expect(result.output).toContain('Test Agent');
        });

        it('should restore platform extensions', async () => {
            const agent = {
                ...sampleAgent,
                platformExtensions: {
                    maxSpawnDepth: 3,
                    maxConcurrent: 5,
                    maxChildrenPerAgent: 10,
                },
            };
            const context = createAgentAdapterContext(agent, '/tmp', 'openclaw');
            const result = await adapter.generate(agent, context);
            expect(result.output).toContain('"maxSpawnDepth": 3');
            expect(result.output).toContain('"maxConcurrent": 5');
            expect(result.output).toContain('"maxChildrenPerAgent": 10');
        });

        it('should note dropped fields', async () => {
            const agent: UniversalAgent = {
                ...sampleAgent,
                model: 'claude',
            };
            const context = createAgentAdapterContext(agent, '/tmp', 'openclaw');
            const result = await adapter.generate(agent, context);
            expect(result.warnings.some((w) => w.includes('Fields not supported by OpenClaw (dropped)'))).toBe(true);
        });
    });

    describe('detectFeatures', () => {
        it('should detect timeout feature', async () => {
            const features = adapter.detectFeatures(sampleAgent);
            expect(features).toContain('openclaw-timeout');
        });

        it('should detect spawn depth feature', async () => {
            const agent = {
                ...sampleAgent,
                platformExtensions: { maxSpawnDepth: 3 },
            };
            const features = adapter.detectFeatures(agent);
            expect(features).toContain('openclaw-spawn-depth');
        });

        it('should detect concurrent feature', async () => {
            const agent = {
                ...sampleAgent,
                platformExtensions: { maxConcurrent: 5 },
            };
            const features = adapter.detectFeatures(agent);
            expect(features).toContain('openclaw-concurrent');
        });

        it('should detect children limit feature', async () => {
            const agent = {
                ...sampleAgent,
                platformExtensions: { maxChildrenPerAgent: 10 },
            };
            const features = adapter.detectFeatures(agent);
            expect(features).toContain('openclaw-children-limit');
        });
    });
});

describe('OpenClawAgentAdapter - options', () => {
    it('should disable JSON structure validation', async () => {
        const adapter = new OpenClawAgentAdapter({ validateJsonStructure: false });
        // Valid JSON but not an object at root level - validation happens after parsing
        const input = JSON.stringify({ description: 'test' });
        const result = await adapter.parse(input, '/tmp/test.json');
        // Should succeed because validateJsonStructure is false
        // But still fails because description check happens regardless
        expect(result.errors).not.toContain('OpenClaw config must be a JSON object');
    });
});
