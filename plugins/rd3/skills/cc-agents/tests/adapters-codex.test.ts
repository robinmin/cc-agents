#!/usr/bin/env bun
import { describe, expect, it } from 'bun:test';
import { createAgentAdapterContext } from '../scripts/adapters';
import { CODEX_AGENT_DESCRIPTION_MAX_LENGTH } from '../scripts/description-constraints';
import { CodexAgentAdapter } from '../scripts/adapters/codex';
import type { UniversalAgent } from '../scripts/types';

const sampleAgent: UniversalAgent = {
    name: 'codex-test-agent',
    description: 'Test agent for Codex adapter',
    body: '# Test Agent\n\nA test agent body.',
    tools: ['Read', 'Grep'],
    model: 'claude-sonnet-4-20250514',
    sandboxMode: 'workspace-write',
    reasoningEffort: 'high',
    nicknameCandidates: ['TestBot', 'Agent-T'],
};

describe('CodexAgentAdapter', () => {
    const adapter = new CodexAgentAdapter();

    // ========================================================================
    // Parse - Official TOML format (root-level fields)
    // ========================================================================

    describe('parse - official TOML format', () => {
        it('should parse standalone TOML with root-level fields', async () => {
            const input = `name = "test-agent"
description = "A test agent"
model = "claude-sonnet-4-20250514"
model_reasoning_effort = "high"
sandbox_mode = "read-only"
nickname_candidates = ["Atlas", "Echo"]

developer_instructions = """
# Test Agent

This is the body.
"""`;

            const result = await adapter.parse(input, '/tmp/test-agent.toml');
            expect(result.success).toBe(true);
            expect(result.agent?.name).toBe('test-agent');
            expect(result.agent?.description).toBe('A test agent');
            expect(result.agent?.model).toBe('claude-sonnet-4-20250514');
            expect(result.agent?.sandboxMode).toBe('read-only');
            expect(result.agent?.reasoningEffort).toBe('high');
            expect(result.agent?.nicknameCandidates).toEqual(['Atlas', 'Echo']);
            expect(result.agent?.body).toContain('Test Agent');
        });

        it('should use explicit name field over filename', async () => {
            const input = `name = "my-custom-name"
description = "Test"`;
            const result = await adapter.parse(input, '/tmp/different-file.toml');
            expect(result.agent?.name).toBe('my-custom-name');
        });

        it('should use filename as name when no name field', async () => {
            const input = `description = "Test"`;
            const result = await adapter.parse(input, '/tmp/my-agent.toml');
            expect(result.agent?.name).toBe('my-agent');
        });

        it('should parse triple-quoted multiline strings', async () => {
            const input = `name = "test"
description = "Test"
developer_instructions = """
Line 1
Line 2
Line 3
"""`;
            const result = await adapter.parse(input, '/tmp/test.toml');
            expect(result.agent?.body).toContain('Line 1');
            expect(result.agent?.body).toContain('Line 2');
            expect(result.agent?.body).toContain('Line 3');
        });

        it('should parse single-line triple-quoted strings', async () => {
            const input = `name = "test"
description = """Short multi-line"""`;
            const result = await adapter.parse(input, '/tmp/test.toml');
            expect(result.agent?.description).toBe('Short multi-line');
        });

        it('should parse nickname_candidates array', async () => {
            const input = `name = "test"
description = "Test"
nickname_candidates = ["Alpha", "Bravo", "Charlie"]`;
            const result = await adapter.parse(input, '/tmp/test.toml');
            expect(result.agent?.nicknameCandidates).toEqual(['Alpha', 'Bravo', 'Charlie']);
        });

        it('should parse boolean values', async () => {
            const input = `name = "test"
description = "Test"
enabled = true`;
            const result = await adapter.parse(input, '/tmp/test.toml');
            expect(result.agent?.description).toBe('Test');
        });

        it('should parse number values', async () => {
            const input = `name = "test"
description = "Test"
some_number = 42`;
            const result = await adapter.parse(input, '/tmp/test.toml');
            expect(result.success).toBe(true);
        });

        it('should fail when description missing', async () => {
            const input = 'name = "test"';
            const result = await adapter.parse(input, '/tmp/test.toml');
            expect(result.success).toBe(false);
            expect(result.errors).toContain('Missing required field: description');
        });

        it('should warn when developer_instructions missing', async () => {
            const input = `name = "test"
description = "Test"`;
            const result = await adapter.parse(input, '/tmp/test.toml');
            expect(result.warnings.some((w) => w.includes('developer_instructions'))).toBe(true);
        });

        it('should skip comment lines', async () => {
            const input = `# This is a comment
name = "test"
# Another comment
description = "Test"`;
            const result = await adapter.parse(input, '/tmp/test.toml');
            expect(result.agent?.name).toBe('test');
            expect(result.agent?.description).toBe('Test');
        });
    });

    // ========================================================================
    // Parse - MCP servers (nested TOML tables)
    // ========================================================================

    describe('parse - mcp_servers', () => {
        it('should parse nested mcp_servers tables', async () => {
            const input = `name = "test"
description = "Test"
developer_instructions = "Body"

[mcp_servers.docs]
url = "https://docs.example.com/mcp"

[mcp_servers.search]
url = "https://search.example.com/mcp"`;

            const result = await adapter.parse(input, '/tmp/test.toml');
            expect(result.success).toBe(true);
            expect(result.agent?.mcpServers).toBeDefined();
            expect(result.agent?.mcpServers?.length).toBe(2);

            const servers = result.agent?.mcpServers as Record<string, unknown>[];
            const docsServer = servers.find((s) => s.name === 'docs');
            expect(docsServer).toBeDefined();
            expect(docsServer?.url).toBe('https://docs.example.com/mcp');
        });

        it('should handle mcp_servers with extra fields', async () => {
            const input = `name = "test"
description = "Test"

[mcp_servers.custom]
url = "https://custom.example.com/mcp"
enabled = true`;

            const result = await adapter.parse(input, '/tmp/test.toml');
            expect(result.success).toBe(true);
            const servers = result.agent?.mcpServers as Record<string, unknown>[];
            const server = servers.find((s) => s.name === 'custom');
            expect(server?.enabled).toBe(true);
        });
    });

    // ========================================================================
    // Parse - Legacy format (backward compatibility)
    // ========================================================================

    describe('parse - legacy [agents.NAME] format', () => {
        it('should parse legacy format with deprecation warning', async () => {
            const input = `[agents.legacy-agent]
description = "A legacy agent"
model = "gpt-5.4"
developer_instructions = """
Legacy body content.
"""`;

            const result = await adapter.parse(input, '/tmp/legacy.toml');
            expect(result.success).toBe(true);
            expect(result.agent?.name).toBe('legacy-agent');
            expect(result.agent?.description).toBe('A legacy agent');
            expect(result.warnings.some((w) => w.includes('Legacy'))).toBe(true);
            expect(result.warnings.some((w) => w.includes('developers.openai.com'))).toBe(true);
        });

        it('should parse legacy format with .settings subsection', async () => {
            const input = `[agents.old-agent]
description = "Old agent"
developer_instructions = "Body"

[agents.old-agent.settings]
sandbox_mode = "read-only"`;

            const result = await adapter.parse(input, '/tmp/old.toml');
            expect(result.success).toBe(true);
            expect(result.agent?.name).toBe('old-agent');
            expect(result.agent?.sandboxMode).toBe('read-only');
        });
    });

    // ========================================================================
    // Parse - JSON format
    // ========================================================================

    describe('parse - JSON format', () => {
        it('should parse JSON representation', async () => {
            const input = JSON.stringify({
                name: 'json-agent',
                description: 'A test agent',
                model: 'claude-sonnet',
                developer_instructions: 'Body text',
                sandbox_mode: 'read-only',
                model_reasoning_effort: 'medium',
                nickname_candidates: ['Bot-A'],
            });
            const result = await adapter.parse(input, '/tmp/test.json');
            expect(result.success).toBe(true);
            expect(result.agent?.name).toBe('json-agent');
            expect(result.agent?.description).toBe('A test agent');
            expect(result.agent?.reasoningEffort).toBe('medium');
            expect(result.agent?.nicknameCandidates).toEqual(['Bot-A']);
        });

        it('should fail for invalid JSON', async () => {
            const input = '{ invalid json }';
            const result = await adapter.parse(input, '/tmp/test.json');
            expect(result.success).toBe(false);
            expect(result.errors[0]).toContain('JSON parse error');
        });
    });

    // ========================================================================
    // Validate
    // ========================================================================

    describe('validate', () => {
        it('should validate a complete agent', async () => {
            const result = await adapter.validate(sampleAgent);
            expect(result.success).toBe(true);
            expect(result.messages).toContain('Sandbox mode: workspace-write');
            expect(result.messages).toContain('Reasoning effort: high');
        });

        it('should warn about unknown sandbox mode', async () => {
            const agent = { ...sampleAgent, sandboxMode: 'invalid' };
            const result = await adapter.validate(agent);
            expect(
                result.warnings.some(
                    (w) => w.includes("Unknown sandbox_mode 'invalid'") && w.includes('workspace-write'),
                ),
            ).toBe(true);
        });

        it('should accept valid sandbox modes', async () => {
            for (const mode of ['read-only', 'workspace-write', 'danger-full-access']) {
                const agent = { ...sampleAgent, sandboxMode: mode };
                const result = await adapter.validate(agent);
                expect(result.messages).toContain(`Sandbox mode: ${mode}`);
            }
        });

        it('should warn about unknown reasoning effort', async () => {
            const agent = { ...sampleAgent, reasoningEffort: 'invalid' };
            const result = await adapter.validate(agent);
            expect(
                result.warnings.some(
                    (w) => w.includes("Unknown model_reasoning_effort 'invalid'") && w.includes('low, medium, high'),
                ),
            ).toBe(true);
        });

        it('should validate nickname_candidates', async () => {
            const result = await adapter.validate(sampleAgent);
            expect(result.messages?.some((m) => m.includes('Nickname candidates'))).toBe(true);
        });

        it('should warn about non-ASCII nickname candidates', async () => {
            const agent = { ...sampleAgent, nicknameCandidates: ['Valid', 'Inv@lid!'] };
            const result = await adapter.validate(agent);
            expect(result.warnings.some((w) => w.includes('non-ASCII'))).toBe(true);
        });

        it('should warn about duplicate nickname candidates', async () => {
            const agent = { ...sampleAgent, nicknameCandidates: ['Same', 'Same'] };
            const result = await adapter.validate(agent);
            expect(result.warnings.some((w) => w.includes('Duplicate'))).toBe(true);
        });

        it('should warn about dropped fields', async () => {
            const agent: UniversalAgent = {
                ...sampleAgent,
                tools: ['Read'],
                disallowedTools: ['Bash'],
                maxTurns: 10,
                timeout: 30,
                temperature: 0.5,
                permissionMode: 'ask',
                skills: ['skill1'],
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

        it('should reject descriptions that exceed the Codex hard limit', async () => {
            const agent: UniversalAgent = {
                ...sampleAgent,
                description: 'x'.repeat(CODEX_AGENT_DESCRIPTION_MAX_LENGTH + 10),
            };

            const result = await adapter.validate(agent);

            expect(result.success).toBe(false);
            expect(result.errors).toContain(
                `Agent description exceeds Codex maximum length of ${CODEX_AGENT_DESCRIPTION_MAX_LENGTH} characters`,
            );
        });

        it('should NOT warn about mcpServers (now supported)', async () => {
            const agent: UniversalAgent = {
                ...sampleAgent,
                mcpServers: [{ name: 'docs', url: 'https://example.com/mcp' } as unknown as string],
            };
            const result = await adapter.validate(agent);
            expect(result.messages?.some((m) => m.includes('MCP servers'))).toBe(true);
            // mcpServers should NOT appear in dropped fields
            const droppedWarning = result.warnings.find((w) => w.includes('Fields not supported'));
            if (droppedWarning) {
                expect(droppedWarning).not.toContain('mcpServers');
            }
        });
    });

    // ========================================================================
    // Generate
    // ========================================================================

    describe('generate', () => {
        it('should generate standalone TOML with root-level fields', async () => {
            const context = createAgentAdapterContext(sampleAgent, '/tmp', 'codex');
            const result = await adapter.generate(sampleAgent, context);
            expect(result.success).toBe(true);
            expect(result.output).toContain('name = "codex-test-agent"');
            expect(result.output).toContain('description =');
            expect(result.output).toContain('model =');
            expect(result.output).toContain('model_reasoning_effort = "high"');
            expect(result.output).toContain('sandbox_mode = "workspace-write"');
            expect(result.output).toContain('nickname_candidates = ["TestBot", "Agent-T"]');
            expect(result.output).toContain('developer_instructions =');
        });

        it('should NOT use [agents.NAME] section format', async () => {
            const context = createAgentAdapterContext(sampleAgent, '/tmp', 'codex');
            const result = await adapter.generate(sampleAgent, context);
            expect(result.output).not.toContain('[agents.');
        });

        it('should include model when present', async () => {
            const context = createAgentAdapterContext(sampleAgent, '/tmp', 'codex');
            const result = await adapter.generate(sampleAgent, context);
            expect(result.output).toContain('model = "claude-sonnet-4-20250514"');
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
            expect(result.output).not.toContain('model_reasoning_effort =');
            expect(result.output).not.toContain('nickname_candidates =');
        });

        it('should generate mcp_servers as nested tables', async () => {
            const agent: UniversalAgent = {
                ...sampleAgent,
                mcpServers: [
                    { name: 'docs', url: 'https://docs.example.com/mcp' } as unknown as string,
                    { name: 'search', url: 'https://search.example.com/mcp' } as unknown as string,
                ],
            };
            const context = createAgentAdapterContext(agent, '/tmp', 'codex');
            const result = await adapter.generate(agent, context);
            expect(result.output).toContain('[mcp_servers.docs]');
            expect(result.output).toContain('url = "https://docs.example.com/mcp"');
            expect(result.output).toContain('[mcp_servers.search]');
        });

        it('should note dropped fields', async () => {
            const agent: UniversalAgent = {
                ...sampleAgent,
                tools: ['Read'],
                timeout: 30,
            };
            const context = createAgentAdapterContext(agent, '/tmp', 'codex');
            const result = await adapter.generate(agent, context);
            expect(result.warnings.some((w) => w.includes('Fields not supported by Codex (dropped)'))).toBe(true);
        });

        it('should truncate generated descriptions to the Codex hard limit', async () => {
            const agent: UniversalAgent = {
                ...sampleAgent,
                description: `Use PROACTIVELY for ${'x'.repeat(1200)}

<example>
user: "Create a new subagent"
assistant: "Route to scaffold and explain the next validation steps."
</example>`,
            };
            const context = createAgentAdapterContext(agent, '/tmp', 'codex');
            const result = await adapter.generate(agent, context);

            expect(result.success).toBe(true);
            expect(result.warnings).toContain(
                `Description truncated to ${CODEX_AGENT_DESCRIPTION_MAX_LENGTH} characters for Codex compatibility`,
            );
            const parsed = await adapter.parse(result.output || '', '/tmp/truncated-agent.toml');
            expect(parsed.success).toBe(true);
            expect(parsed.agent?.description.length).toBeLessThanOrEqual(CODEX_AGENT_DESCRIPTION_MAX_LENGTH);
        });

        it('should output file with agent name', async () => {
            const context = createAgentAdapterContext(sampleAgent, '/tmp/output', 'codex');
            const result = await adapter.generate(sampleAgent, context);
            expect(result.companions).toContain('/tmp/output/codex-test-agent.toml');
        });
    });

    // ========================================================================
    // Feature Detection
    // ========================================================================

    describe('detectFeatures', () => {
        it('should detect sandbox mode feature', () => {
            const features = adapter.detectFeatures(sampleAgent);
            expect(features).toContain('codex-sandbox-workspace-write');
        });

        it('should detect reasoning effort feature', () => {
            const features = adapter.detectFeatures(sampleAgent);
            expect(features).toContain('codex-reasoning-high');
        });

        it('should detect nicknames feature', () => {
            const features = adapter.detectFeatures(sampleAgent);
            expect(features).toContain('codex-nicknames');
        });

        it('should detect mcp-servers feature', () => {
            const agent: UniversalAgent = {
                ...sampleAgent,
                mcpServers: [{ name: 'docs', url: 'https://example.com' } as unknown as string],
            };
            const features = adapter.detectFeatures(agent);
            expect(features).toContain('codex-mcp-servers');
        });
    });
});

describe('CodexAgentAdapter - options', () => {
    it('should disable sandbox mode validation', async () => {
        const adapter = new CodexAgentAdapter({ validateSandboxMode: false });
        const agent = { ...sampleAgent, sandboxMode: 'invalid' };
        const result = await adapter.validate(agent);
        expect(result.warnings.every((w) => !w.includes("Unknown sandbox_mode 'invalid'"))).toBe(true);
    });
});
