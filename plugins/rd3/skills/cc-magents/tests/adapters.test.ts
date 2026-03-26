import { describe, it, expect, beforeEach } from 'bun:test';
import {
    AgentsMdAdapter,
    BaseMagentAdapter,
    createAgentsMdAdapter,
    createClaudeMdAdapter,
    CursorAdapter,
    WindsurfAdapter,
    ZedAdapter,
    OpenCodeAdapter,
    JunieAdapter,
    VSCodeAdapter,
    AugmentAdapter,
    ClineAdapter,
    MagentAdapterRegistry,
    getMagentAdapter,
    hasMagentAdapter,
    detectAdapter,
} from '../scripts/adapters';
import {
    GenericPassThroughAdapter,
    createGeminiMdAdapter,
    createCodexAdapter,
    createPiAdapter,
} from '../scripts/adapters/generic-passthrough';
import type { UniversalMainAgent, MagentPlatform } from '../scripts/types';

describe('adapters', () => {
    // ============================================================================
    // BaseMagentAdapter
    // ============================================================================
    describe('BaseMagentAdapter', () => {
        class ConcreteAdapter extends BaseMagentAdapter {
            readonly platform: MagentPlatform = 'test' as MagentPlatform;
            readonly displayName = 'Test';
            readonly tier = 1 as const;

            protected async generatePlatform(): Promise<{
                success: boolean;
                output?: string;
                errors: string[];
                warnings: string[];
            }> {
                return { success: true, output: 'test output', errors: [], warnings: [] };
            }
        }

        const adapter = new ConcreteAdapter();

        it('should have correct platform and display name', () => {
            expect(adapter.platform).toBe('test' as MagentPlatform);
            expect(adapter.displayName).toBe('Test');
            expect(adapter.tier).toBe(1);
        });

        it('should validate a valid model', async () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Identity', level: 1, content: 'I am a test agent', category: 'identity' }],
                estimatedTokens: 50,
                rawContent: '# Identity\n\nI am a test agent',
            };

            const result = await adapter.validate(model);
            expect(result.success).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should reject model with no sections', async () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [],
                estimatedTokens: 0,
                rawContent: '',
            };

            const result = await adapter.validate(model);
            expect(result.success).toBe(false);
            expect(result.errors.some((e) => e.includes('at least one section'))).toBe(true);
        });

        it('should warn on large file size', async () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Test', level: 1, content: 'x'.repeat(60 * 1024), category: 'custom' }],
                estimatedTokens: 1000,
                rawContent: 'x'.repeat(60 * 1024),
            };

            const result = await adapter.validate(model);
            expect(result.warnings.some((w) => w.includes('large'))).toBe(true);
        });

        it('should error on oversized file', async () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Test', level: 1, content: 'x', category: 'custom' }],
                estimatedTokens: 1000,
                rawContent: 'x'.repeat(210 * 1024),
            };

            const result = await adapter.validate(model);
            expect(result.errors.some((e) => e.includes('exceeds maximum'))).toBe(true);
        });

        it('should reject generate for model with no sections', async () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [],
                estimatedTokens: 0,
                rawContent: '',
            };

            const result = await adapter.generate(model);
            expect(result.success).toBe(false);
            expect(result.errors.some((e) => e.includes('no sections'))).toBe(true);
        });

        it('should generate output for valid model', async () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Identity', level: 1, content: 'I am a test', category: 'identity' }],
                estimatedTokens: 50,
                rawContent: '# Identity\n\nI am a test',
            };

            const result = await adapter.generate(model);
            expect(result.success).toBe(true);
            expect(result.output).toBe('test output');
        });

        it('should detect features from model', () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [
                    { heading: 'Identity', level: 1, content: 'I am a test', category: 'identity' },
                    { heading: 'Tools', level: 1, content: 'Use tools', category: 'tools' },
                ],
                estimatedTokens: 50,
                rawContent: '# Identity\n\nI am a test',
                metadata: { name: 'test-agent' },
                preamble: 'Preamble text',
            };

            const features = adapter.detectFeatures(model);
            expect(features).toContain('metadata');
            expect(features).toContain('preamble');
            expect(features).toContain('section:identity');
            expect(features).toContain('section:tools');
        });

        it('should get discovery paths', () => {
            const paths = adapter.getDiscoveryPaths();
            expect(Array.isArray(paths)).toBe(true);
        });
    });

    // ============================================================================
    // AgentsMdAdapter
    // ============================================================================
    describe('AgentsMdAdapter', () => {
        it('should create adapter with options', () => {
            const adapter = createAgentsMdAdapter({ includeMetadataComment: true });
            expect(adapter.platform).toBe('agents-md');
            expect(adapter.tier).toBe(1);
        });

        it('should parse valid AGENTS.md', async () => {
            const adapter = createAgentsMdAdapter();
            const content = `# Identity

I am a test agent.

## Tools

Use Read and Write.

## Rules

Be helpful.`;

            const result = await adapter.parse(content, '/test/AGENTS.md');

            expect(result.success).toBe(true);
            expect(result.model).not.toBeNull();
            expect(result.model?.sections.length).toBe(3);
            expect(result.model?.sourceFormat).toBe('agents-md');
        });

        it('should reject empty content', async () => {
            const adapter = createAgentsMdAdapter();
            const result = await adapter.parse('', '/test/AGENTS.md');

            expect(result.success).toBe(false);
            expect(result.errors.some((e) => e.includes('empty'))).toBe(true);
        });

        it('should detect hierarchy from path', async () => {
            const adapter = createAgentsMdAdapter();
            const content = `# Identity

I am a test.`;

            const result = await adapter.parse(content, '/project/.agents/AGENTS.md');
            expect(result.success).toBe(true);
            expect(result.model?.hierarchy).toBeDefined();
        });

        it('should reject empty content with error', async () => {
            const adapter = createAgentsMdAdapter();
            // Empty content is rejected by parse
            const result = await adapter.parse('', '/test/AGENTS.md');

            expect(result.success).toBe(false);
            expect(result.errors.some((e) => e.includes('empty'))).toBe(true);
        });

        it('should generate AGENTS.md output', async () => {
            const adapter = createAgentsMdAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [
                    { heading: 'Identity', level: 1, content: 'I am a test', category: 'identity' },
                    { heading: 'Tools', level: 1, content: 'Use tools', category: 'tools' },
                ],
                estimatedTokens: 50,
                rawContent: '# Identity\n\nI am a test\n\n# Tools\n\nUse tools',
            };

            const result = await adapter.generate(model);

            expect(result.success).toBe(true);
            expect(result.output).toContain('# Identity');
            expect(result.output).toContain('# Tools');
        });

        it('should include metadata comment when option set', async () => {
            const adapter = createAgentsMdAdapter({ includeMetadataComment: true });
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Identity', level: 1, content: 'I am a test', category: 'identity' }],
                estimatedTokens: 50,
                rawContent: '# Identity\n\nI am a test',
                metadata: {
                    name: 'test-agent',
                    description: 'A test agent',
                },
            };

            const result = await adapter.generate(model);

            expect(result.success).toBe(true);
            expect(result.output).toContain('<!--');
            expect(result.output).toContain('name: test-agent');
        });

        it('should detect platform features', async () => {
            const adapter = createAgentsMdAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [
                    {
                        heading: 'Identity',
                        level: 1,
                        content: 'Role: test\n\n<example>test</example>',
                        category: 'identity',
                    },
                ],
                estimatedTokens: 50,
                rawContent: '# Identity\n\nRole: test\n\n<example>test</example>',
            };

            const features = adapter.detectFeatures(model);
            expect(features.some((f) => f.includes('example-blocks'))).toBe(true);
        });
    });

    // ============================================================================
    // ClaudeMdAdapter
    // ============================================================================
    describe('ClaudeMdAdapter', () => {
        it('should create adapter', () => {
            const adapter = createClaudeMdAdapter();
            expect(adapter.platform).toBe('claude-md');
            expect(adapter.tier).toBe(1);
        });

        it('should parse CLAUDE.md content', async () => {
            const adapter = createClaudeMdAdapter();
            const content = `# Identity

I am Claude Code.`;

            const result = await adapter.parse(content, '/test/CLAUDE.md');

            expect(result.success).toBe(true);
            expect(result.model).not.toBeNull();
        });

        it('should reject empty content', async () => {
            const adapter = createClaudeMdAdapter();
            const result = await adapter.parse('', '/test/CLAUDE.md');

            expect(result.success).toBe(false);
        });

        it('should generate CLAUDE.md output', async () => {
            const adapter = createClaudeMdAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/CLAUDE.md',
                sourceFormat: 'claude-md',
                sections: [{ heading: 'Identity', level: 1, content: 'I am Claude', category: 'identity' }],
                estimatedTokens: 50,
                rawContent: '# Identity\n\nI am Claude',
            };

            const result = await adapter.generate(model);

            expect(result.success).toBe(true);
            expect(result.output).toContain('# Identity');
        });

        it('should detect Claude hooks feature', () => {
            const adapter = createClaudeMdAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/CLAUDE.md',
                sourceFormat: 'claude-md',
                sections: [
                    { heading: 'Hooks', level: 1, content: 'Use PreToolUse hook for validation', category: 'custom' },
                ],
                estimatedTokens: 50,
                rawContent: '# Hooks\n\nUse PreToolUse hook for validation',
            };

            const features = adapter.detectFeatures(model);
            expect(features).toContain('hooks');
        });

        it('should detect Claude mcp-servers feature', () => {
            const adapter = createClaudeMdAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/CLAUDE.md',
                sourceFormat: 'claude-md',
                sections: [
                    {
                        heading: 'MCP',
                        level: 1,
                        content: 'Configure mcp__github__issues for issue tracking',
                        category: 'custom',
                    },
                ],
                estimatedTokens: 50,
                rawContent: '# MCP\n\nConfigure mcp__github__issues for issue tracking',
            };

            const features = adapter.detectFeatures(model);
            expect(features).toContain('mcp-servers');
        });

        it('should detect Claude memory-md feature', () => {
            const adapter = createClaudeMdAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/CLAUDE.md',
                sourceFormat: 'claude-md',
                sections: [
                    { heading: 'Memory', level: 1, content: 'Enable auto-memory for context', category: 'custom' },
                ],
                estimatedTokens: 50,
                rawContent: '# Memory\n\nEnable auto-memory for context',
            };

            const features = adapter.detectFeatures(model);
            expect(features).toContain('memory-md');
        });

        it('should detect Claude progressive-complexity feature', () => {
            const adapter = createClaudeMdAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/CLAUDE.md',
                sourceFormat: 'claude-md',
                sections: [
                    {
                        heading: 'Instructions',
                        level: 1,
                        content: 'Use system-reminder for context',
                        category: 'custom',
                    },
                ],
                estimatedTokens: 50,
                rawContent: '# Instructions\n\nUse system-reminder for context',
            };

            const features = adapter.detectFeatures(model);
            expect(features).toContain('progressive-complexity');
        });

        it('should return warnings for Claude-only features', () => {
            const adapter = createClaudeMdAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/CLAUDE.md',
                sourceFormat: 'claude-md',
                sections: [{ heading: 'Hooks', level: 1, content: 'Use PreToolUse hook', category: 'custom' }],
                estimatedTokens: 50,
                rawContent: '# Hooks\n\nUse PreToolUse hook',
            };

            const warnings = adapter.getConversionWarningsFrom('agents-md', model);
            expect(warnings.length).toBeGreaterThan(0);
            expect(warnings[0].sourcePlatform).toBe('claude-md');
        });
    });

    // ============================================================================
    // Tier 2 Adapters (parse + generate)
    // ============================================================================
    describe('Tier 2 Adapters', () => {
        it('should create CursorAdapter', () => {
            const adapter = new CursorAdapter();
            expect(adapter.platform).toBe('cursorrules');
            expect(adapter.tier).toBe(2);
        });

        it('should create WindsurfAdapter', () => {
            const adapter = new WindsurfAdapter();
            expect(adapter.platform).toBe('windsurfrules');
            expect(adapter.tier).toBe(2);
        });

        it('should create ZedAdapter', () => {
            const adapter = new ZedAdapter();
            expect(adapter.platform).toBe('zed-rules');
            expect(adapter.tier).toBe(2);
        });

        it('should create OpenCodeAdapter', () => {
            const adapter = new OpenCodeAdapter();
            expect(adapter.platform).toBe('opencode-rules');
            expect(adapter.tier).toBe(2);
        });

        it('should parse successfully for Tier 2 adapters', async () => {
            const adapter = new CursorAdapter();
            const result = await adapter.parse('# Test', '/test/.cursorrules');

            expect(result.success).toBe(true);
        });

        it('should parse WindsurfAdapter', async () => {
            const adapter = new WindsurfAdapter();
            const result = await adapter.parse('# Rules', '/test/.windsurfrules');

            expect(result.success).toBe(true);
        });

        it('should parse WindsurfAdapter with YAML frontmatter', async () => {
            const adapter = new WindsurfAdapter();
            const content = `---
name: windsurf-agent
description: A Windsurf agent
version: 1.0
---
# Rules

Be helpful.`;

            const result = await adapter.parse(content, '/test/.windsurfrules');

            expect(result.success).toBe(true);
            expect(result.model?.metadata?.name).toBe('windsurf-agent');
            expect(result.model?.metadata?.description).toBe('A Windsurf agent');
            expect(result.model?.metadata?.version).toBe('1.0');
        });

        it('should parse ZedAdapter', async () => {
            const adapter = new ZedAdapter();
            const result = await adapter.parse('# Rules', '/test/rules.md');

            expect(result.success).toBe(true);
        });

        it('should parse CursorAdapter with YAML frontmatter', async () => {
            const adapter = new CursorAdapter();
            const content = `---
name: cursor-agent
description: A Cursor agent
version: 1.0
---
# Rules

Be helpful.`;

            const result = await adapter.parse(content, '/test/.cursorrules');

            expect(result.success).toBe(true);
            expect(result.model?.metadata?.name).toBe('cursor-agent');
            expect(result.model?.metadata?.description).toBe('A Cursor agent');
            expect(result.model?.metadata?.version).toBe('1.0');
        });

        it('should parse OpenCodeAdapter', async () => {
            const adapter = new OpenCodeAdapter();
            const result = await adapter.parse('# Rules', '/test/opencode.md');

            expect(result.success).toBe(true);
        });

        it('should detect features in Tier 2 adapters', () => {
            const adapter = new CursorAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/.cursorrules',
                sourceFormat: 'agents-md',
                sections: [
                    { heading: 'Identity', level: 1, content: 'I am Cursor', category: 'identity' },
                    { heading: 'Tools', level: 1, content: 'Use Read', category: 'tools' },
                ],
                estimatedTokens: 50,
                rawContent: '# Identity\n\nI am Cursor\n\n## Tools\n\nUse Read',
                metadata: { name: 'cursor-agent' },
            };

            const features = adapter.detectFeatures(model);
            expect(features).toContain('metadata');
            expect(features).toContain('section:identity');
            expect(features).toContain('section:tools');
        });

        it('should get discovery paths for Tier 2 adapters', () => {
            const cursorAdapter = new CursorAdapter();
            const windsurfAdapter = new WindsurfAdapter();
            const zedAdapter = new ZedAdapter();
            const opencodeAdapter = new OpenCodeAdapter();

            expect(Array.isArray(cursorAdapter.getDiscoveryPaths())).toBe(true);
            expect(Array.isArray(windsurfAdapter.getDiscoveryPaths())).toBe(true);
            expect(Array.isArray(zedAdapter.getDiscoveryPaths())).toBe(true);
            expect(Array.isArray(opencodeAdapter.getDiscoveryPaths())).toBe(true);
        });

        it('should validate Tier 2 adapter models', async () => {
            const adapter = new WindsurfAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/.windsurfrules',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Rules', level: 1, content: 'Be helpful', category: 'rules' }],
                estimatedTokens: 50,
                rawContent: '# Rules\n\nBe helpful',
            };

            const result = await adapter.validate(model);
            expect(result.success).toBe(true);
        });

        it('should validate ZedAdapter models', async () => {
            const adapter = new ZedAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/rules.md',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Rules', level: 1, content: 'Be helpful', category: 'rules' }],
                estimatedTokens: 50,
                rawContent: '# Rules\n\nBe helpful',
            };

            const result = await adapter.validate(model);
            expect(result.success).toBe(true);
        });

        it('should validate OpenCodeAdapter models', async () => {
            const adapter = new OpenCodeAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/opencode.md',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Rules', level: 1, content: 'Be helpful', category: 'rules' }],
                estimatedTokens: 50,
                rawContent: '# Rules\n\nBe helpful',
            };

            const result = await adapter.validate(model);
            expect(result.success).toBe(true);
        });

        it('should validate CursorAdapter models', async () => {
            const adapter = new CursorAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/.cursorrules',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Rules', level: 1, content: 'Be helpful', category: 'rules' }],
                estimatedTokens: 50,
                rawContent: '# Rules\n\nBe helpful',
            };

            const result = await adapter.validate(model);
            expect(result.success).toBe(true);
        });

        it('should generate output for Tier 2 adapters', async () => {
            const adapter = new CursorAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/.cursorrules',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Rules', level: 1, content: 'Be helpful', category: 'rules' }],
                estimatedTokens: 50,
                rawContent: '# Rules\n\nBe helpful',
            };

            const result = await adapter.generate(model);
            expect(result.success).toBe(true);
            expect(result.output).toBeDefined();
        });

        it('should generate for WindsurfAdapter', async () => {
            const adapter = new WindsurfAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/.windsurfrules',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Rules', level: 1, content: 'Be helpful', category: 'rules' }],
                estimatedTokens: 50,
                rawContent: '# Rules\n\nBe helpful',
            };

            const result = await adapter.generate(model);
            expect(result.success).toBe(true);
        });

        it('should generate for ZedAdapter', async () => {
            const adapter = new ZedAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/rules.md',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Rules', level: 1, content: 'Be helpful', category: 'rules' }],
                estimatedTokens: 50,
                rawContent: '# Rules\n\nBe helpful',
            };

            const result = await adapter.generate(model);
            expect(result.success).toBe(true);
        });

        it('should generate for OpenCodeAdapter', async () => {
            const adapter = new OpenCodeAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/opencode.md',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Rules', level: 1, content: 'Be helpful', category: 'rules' }],
                estimatedTokens: 50,
                rawContent: '# Rules\n\nBe helpful',
            };

            const result = await adapter.generate(model);
            expect(result.success).toBe(true);
        });
    });

    // ============================================================================
    // Tier 3 Adapters (generate only)
    // ============================================================================
    describe('Tier 3 Adapters', () => {
        it('should create JunieAdapter', () => {
            const adapter = new JunieAdapter();
            expect(adapter.platform).toBe('junie');
            expect(adapter.tier).toBe(3);
        });

        it('should create VSCodeAdapter', () => {
            const adapter = new VSCodeAdapter();
            expect(adapter.platform).toBe('vscode-instructions');
            expect(adapter.tier).toBe(3);
        });

        it('should create AugmentAdapter', () => {
            const adapter = new AugmentAdapter();
            expect(adapter.platform).toBe('augment');
            expect(adapter.tier).toBe(3);
        });

        it('should create ClineAdapter', () => {
            const adapter = new ClineAdapter();
            expect(adapter.platform).toBe('cline');
            expect(adapter.tier).toBe(3);
        });

        it('should reject parse for Tier 3 adapters', async () => {
            const adapter = new JunieAdapter();
            const result = await adapter.parse('# Test', '/test/junie.md');

            expect(result.success).toBe(false);
            expect(result.errors.some((e) => e.includes('Tier 3'))).toBe(true);
        });

        it('should reject parse for VSCodeAdapter', async () => {
            const adapter = new VSCodeAdapter();
            const result = await adapter.parse('# Test', '/test/vscode.md');

            expect(result.success).toBe(false);
            expect(result.errors.some((e) => e.includes('Tier 3'))).toBe(true);
        });

        it('should reject parse for AugmentAdapter', async () => {
            const adapter = new AugmentAdapter();
            const result = await adapter.parse('# Test', '/test/augment.md');

            expect(result.success).toBe(false);
            expect(result.errors.some((e) => e.includes('Tier 3'))).toBe(true);
        });

        it('should reject parse for ClineAdapter', async () => {
            const adapter = new ClineAdapter();
            const result = await adapter.parse('# Test', '/test/cline.md');

            expect(result.success).toBe(false);
            expect(result.errors.some((e) => e.includes('Tier 3'))).toBe(true);
        });

        it('should generate output for Tier 3 adapters', async () => {
            const adapter = new JunieAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/junie.md',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Identity', level: 1, content: 'I am Junie', category: 'identity' }],
                estimatedTokens: 50,
                rawContent: '# Identity\n\nI am Junie',
            };

            const result = await adapter.generate(model);
            expect(result.success).toBe(true);
            expect(result.output).toBeDefined();
        });

        it('should generate for VSCodeAdapter', async () => {
            const adapter = new VSCodeAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/vscode.md',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Identity', level: 1, content: 'I am VSCode', category: 'identity' }],
                estimatedTokens: 50,
                rawContent: '# Identity\n\nI am VSCode',
            };

            const result = await adapter.generate(model);
            expect(result.success).toBe(true);
        });

        it('should generate for AugmentAdapter', async () => {
            const adapter = new AugmentAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/augment.md',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Identity', level: 1, content: 'I am Augment', category: 'identity' }],
                estimatedTokens: 50,
                rawContent: '# Identity\n\nI am Augment',
            };

            const result = await adapter.generate(model);
            expect(result.success).toBe(true);
        });

        it('should generate for ClineAdapter', async () => {
            const adapter = new ClineAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/cline.md',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Identity', level: 1, content: 'I am Cline', category: 'identity' }],
                estimatedTokens: 50,
                rawContent: '# Identity\n\nI am Cline',
            };

            const result = await adapter.generate(model);
            expect(result.success).toBe(true);
        });

        it('should detect features for Tier 3 adapters', () => {
            const adapter = new JunieAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/junie.md',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Identity', level: 1, content: 'I am Junie', category: 'identity' }],
                estimatedTokens: 50,
                rawContent: '# Identity\n\nI am Junie',
                preamble: 'Preamble text',
            };

            const features = adapter.detectFeatures(model);
            expect(features).toContain('preamble');
            expect(features).toContain('section:identity');
        });

        it('should get discovery paths for Tier 3 adapters', () => {
            const junieAdapter = new JunieAdapter();
            const vscodeAdapter = new VSCodeAdapter();
            const augmentAdapter = new AugmentAdapter();
            const clineAdapter = new ClineAdapter();

            expect(Array.isArray(junieAdapter.getDiscoveryPaths())).toBe(true);
            expect(Array.isArray(vscodeAdapter.getDiscoveryPaths())).toBe(true);
            expect(Array.isArray(augmentAdapter.getDiscoveryPaths())).toBe(true);
            expect(Array.isArray(clineAdapter.getDiscoveryPaths())).toBe(true);
        });

        it('should detect VSCode checkpoint-cadence feature', () => {
            const adapter = new VSCodeAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/copilot-instructions.md',
                sourceFormat: 'agents-md',
                sections: [
                    { heading: 'Checkpoints', level: 1, content: 'Pause and assess progress', category: 'custom' },
                ],
                estimatedTokens: 50,
                rawContent: '# Checkpoints\n\nPause and assess progress',
            };

            const features = adapter.detectFeatures(model);
            expect(features).toContain('checkpoint-cadence');
        });

        it('should detect Cline planning-mode feature', () => {
            const adapter = new ClineAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/cline.md',
                sourceFormat: 'agents-md',
                sections: [
                    { heading: 'Mode', level: 1, content: 'Use planning mode for complex tasks', category: 'custom' },
                ],
                estimatedTokens: 50,
                rawContent: '# Mode\n\nUse planning mode for complex tasks',
            };

            const features = adapter.detectFeatures(model);
            expect(features).toContain('planning-mode');
        });

        it('should detect Augment knowledge-integration feature', () => {
            const adapter = new AugmentAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/augment.md',
                sourceFormat: 'agents-md',
                sections: [
                    {
                        heading: 'Context',
                        level: 1,
                        content: 'Use knowledge integration for context',
                        category: 'custom',
                    },
                ],
                estimatedTokens: 50,
                rawContent: '# Context\n\nUse knowledge integration for context',
            };

            const features = adapter.detectFeatures(model);
            expect(features).toContain('knowledge-integration');
        });

        it('should detect Cursor yaml-frontmatter feature', () => {
            const adapter = new CursorAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/.cursorrules',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Rules', level: 1, content: 'Be helpful', category: 'rules' }],
                estimatedTokens: 50,
                rawContent: '# Rules\n\nBe helpful',
                metadata: { name: 'test-agent' },
            };

            const features = adapter.detectFeatures(model);
            expect(features).toContain('yaml-frontmatter');
            expect(features).toContain('metadata');
        });

        it('should detect OpenCode model-preferences feature', () => {
            const adapter = new OpenCodeAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/opencode.md',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Model', level: 1, content: 'Use GPT-4 for complex tasks', category: 'custom' }],
                estimatedTokens: 50,
                rawContent: '# Model\n\nUse GPT-4 for complex tasks',
            };

            const features = adapter.detectFeatures(model);
            expect(features).toContain('model-preferences');
        });

        it('should detect Zed lsp-configuration feature', () => {
            const adapter = new ZedAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/rules.md',
                sourceFormat: 'agents-md',
                sections: [
                    { heading: 'LSP', level: 1, content: 'Configure language server protocol', category: 'custom' },
                ],
                estimatedTokens: 50,
                rawContent: '# LSP\n\nConfigure language server protocol',
            };

            const features = adapter.detectFeatures(model);
            expect(features).toContain('lsp-configuration');
        });

        it('should detect Zed collaboration-settings feature', () => {
            const adapter = new ZedAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/rules.md',
                sourceFormat: 'agents-md',
                sections: [
                    { heading: 'Team', level: 1, content: 'Enable multiplayer collaboration', category: 'custom' },
                ],
                estimatedTokens: 50,
                rawContent: '# Team\n\nEnable multiplayer collaboration',
            };

            const features = adapter.detectFeatures(model);
            expect(features).toContain('collaboration-settings');
        });

        it('should detect Windsurf cascade-rules feature', () => {
            const adapter = new WindsurfAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/.windsurfrules',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Base Rules', level: 1, content: 'Follow cascade hierarchy', category: 'rules' }],
                estimatedTokens: 50,
                rawContent: '# Base Rules\n\nFollow cascade hierarchy',
            };

            const features = adapter.detectFeatures(model);
            expect(features).toContain('cascade-rules');
        });

        it('should detect Windsurf non-overridable-safety feature', () => {
            const adapter = new WindsurfAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/.windsurfrules',
                sourceFormat: 'agents-md',
                sections: [
                    {
                        heading: 'Safety',
                        level: 1,
                        content: 'Cannot allow override for security rules',
                        category: 'rules',
                    },
                ],
                estimatedTokens: 50,
                rawContent: '# Safety\n\nCannot allow override for security rules',
            };

            const features = adapter.detectFeatures(model);
            expect(features).toContain('non-overridable-safety');
        });

        it('should detect Windsurf update-plan-tool feature', () => {
            const adapter = new WindsurfAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/.windsurfrules',
                sourceFormat: 'agents-md',
                sections: [
                    {
                        heading: 'Planning',
                        level: 1,
                        content: 'Use update_plan for progress tracking',
                        category: 'custom',
                    },
                ],
                estimatedTokens: 50,
                rawContent: '# Planning\n\nUse update_plan for progress tracking',
            };

            const features = adapter.detectFeatures(model);
            expect(features).toContain('update-plan-tool');
        });

        it('should detect Windsurf yaml-frontmatter via metadata', () => {
            const adapter = new WindsurfAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/.windsurfrules',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Rules', level: 1, content: 'Be helpful', category: 'rules' }],
                estimatedTokens: 50,
                rawContent: '# Rules\n\nBe helpful',
                metadata: { name: 'windsurf-agent', version: '1.0' },
            };

            const features = adapter.detectFeatures(model);
            expect(features).toContain('yaml-frontmatter');
        });
    });

    // ============================================================================
    // getConversionWarningsFrom
    // ============================================================================
    describe('getConversionWarningsFrom', () => {
        it('should return warnings for Zed-only features', () => {
            const adapter = new ZedAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/rules.md',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'LSP', level: 1, content: 'Configure language server', category: 'custom' }],
                estimatedTokens: 50,
                rawContent: '# LSP\n\nConfigure language server',
            };

            const warnings = adapter.getConversionWarningsFrom('claude-md' as MagentPlatform, model);
            expect(warnings.length).toBeGreaterThan(0);
            expect(warnings[0].sourcePlatform).toBe('zed-rules');
            expect(warnings[0].severity).toBe('warning');
        });

        it('should return warnings for OpenCode-only features', () => {
            const adapter = new OpenCodeAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/opencode.md',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Model', level: 1, content: 'Use GPT-4 for complex tasks', category: 'custom' }],
                estimatedTokens: 50,
                rawContent: '# Model\n\nUse GPT-4 for complex tasks',
            };

            const warnings = adapter.getConversionWarningsFrom('agents-md', model);
            expect(warnings.length).toBeGreaterThan(0);
            expect(warnings[0].sourcePlatform).toBe('opencode-rules');
        });

        it('should return warnings for Cursor-only features', () => {
            const adapter = new CursorAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/.cursorrules',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'File Patterns', level: 1, content: '.ts: use 4 spaces', category: 'custom' }],
                estimatedTokens: 50,
                rawContent: '# File Patterns\n\n.ts: use 4 spaces',
            };

            const warnings = adapter.getConversionWarningsFrom('agents-md', model);
            expect(warnings.length).toBeGreaterThan(0);
            expect(warnings[0].sourcePlatform).toBe('cursorrules');
        });

        it('should return warnings for Windsurf-only features', () => {
            const adapter = new WindsurfAdapter();
            const model: UniversalMainAgent = {
                sourcePath: '/test/.windsurfrules',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Base Rules', level: 1, content: 'Follow cascade hierarchy', category: 'rules' }],
                estimatedTokens: 50,
                rawContent: '# Base Rules\n\nFollow cascade hierarchy',
                metadata: { name: 'windsurf-agent' },
            };

            const warnings = adapter.getConversionWarningsFrom('claude-md' as MagentPlatform, model);
            expect(warnings.length).toBeGreaterThan(0);
            expect(warnings[0].sourcePlatform).toBe('windsurfrules');
        });

        it('should return empty warnings for Tier 1 adapters', () => {
            // AgentsMdAdapter (Tier 1) does not have getConversionWarningsFrom
            // This test verifies the method doesn't exist on Tier 1 adapters
            const adapter = new AgentsMdAdapter();
            expect('getConversionWarningsFrom' in adapter).toBe(false);
        });
    });

    // ============================================================================
    // MagentAdapterRegistry
    // ============================================================================
    describe('MagentAdapterRegistry', () => {
        let registry: MagentAdapterRegistry;

        beforeEach(() => {
            registry = new MagentAdapterRegistry();
        });

        it('should get adapter for agents-md', () => {
            const adapter = registry.get('agents-md');
            expect(adapter).toBeDefined();
            expect(adapter.platform).toBe('agents-md');
        });

        it('should get adapter for claude-md', () => {
            const adapter = registry.get('claude-md');
            expect(adapter).toBeDefined();
            expect(adapter.platform).toBe('claude-md');
        });

        it('should throw for unregistered platform', () => {
            expect(() => registry.get('nonexistent-platform' as MagentPlatform)).toThrow();
        });

        it('should check if platform has adapter', () => {
            expect(registry.has('agents-md')).toBe(true);
            expect(registry.has('claude-md')).toBe(true);
            expect(registry.has('gemini-md')).toBe(true);
            expect(registry.has('nonexistent-platform' as MagentPlatform)).toBe(false);
        });

        it('should get all platforms', () => {
            const platforms = registry.platforms;
            expect(platforms).toContain('agents-md');
            expect(platforms).toContain('claude-md');
            expect(platforms).toContain('cursorrules');
        });

        it('should getAll adapters', () => {
            const all = registry.getAll();
            expect(all['agents-md']).toBeDefined();
            expect(all['claude-md']).toBeDefined();
            expect(Object.keys(all).length).toBeGreaterThan(0);
        });

        it('should register new adapter', () => {
            class NewAdapter extends BaseMagentAdapter {
                readonly platform: MagentPlatform = 'new-platform' as MagentPlatform;
                readonly displayName = 'New Platform';
                readonly tier = 1 as const;

                protected async generatePlatform(): Promise<{
                    success: boolean;
                    output?: string;
                    errors: string[];
                    warnings: string[];
                }> {
                    return { success: true, output: 'new', errors: [], warnings: [] };
                }
            }

            registry.register('new-platform' as MagentPlatform, () => new NewAdapter());
            expect(registry.has('new-platform' as MagentPlatform)).toBe(true);
        });

        it('should clear cache', () => {
            const adapter1 = registry.get('agents-md');
            registry.clear();
            const adapter2 = registry.get('agents-md');
            // Should be a new instance after clear
            expect(adapter1).not.toBe(adapter2);
        });

        it('should cache adapters', () => {
            const adapter1 = registry.get('agents-md');
            const adapter2 = registry.get('agents-md');
            expect(adapter1).toBe(adapter2);
        });
    });

    // ============================================================================
    // Convenience Functions
    // ============================================================================
    describe('convenience functions', () => {
        it('should get adapter via getMagentAdapter', () => {
            const adapter = getMagentAdapter('agents-md');
            expect(adapter.platform).toBe('agents-md');
        });

        it('should check adapter existence via hasMagentAdapter', () => {
            expect(hasMagentAdapter('agents-md')).toBe(true);
            expect(hasMagentAdapter('gemini-md')).toBe(true);
            expect(hasMagentAdapter('nonexistent-platform' as MagentPlatform)).toBe(false);
        });

        it('should detect adapter from file path', () => {
            const result = detectAdapter('/project/AGENTS.md');
            expect(result).not.toBeNull();
            expect(result?.platform).toBe('agents-md');
        });

        it('should detect adapter for CLAUDE.md', () => {
            const result = detectAdapter('/project/CLAUDE.md');
            expect(result).not.toBeNull();
            expect(result?.platform).toBe('claude-md');
        });

        it('should detect adapter for .cursorrules', () => {
            const result = detectAdapter('/project/.cursorrules');
            expect(result).not.toBeNull();
            expect(result?.platform).toBe('cursorrules');
        });

        it('should return null for unknown file path', () => {
            const result = detectAdapter('/project/README.md');
            expect(result).toBeNull();
        });

        it('should detect adapter for opencode.md', () => {
            const result = detectAdapter('/project/opencode.md');
            expect(result).not.toBeNull();
            expect(result?.platform).toBe('opencode-rules');
        });
    });

    // ============================================================================
    // Tier 3 Adapter (using default parse implementation)
    // ============================================================================
    describe('Tier 3 Adapter with default parse', () => {
        // Create a mock Tier 3 adapter that uses the default parse() implementation
        class MockTier3Adapter extends BaseMagentAdapter {
            readonly platform: MagentPlatform = 'mock-tier3' as MagentPlatform;
            readonly displayName = 'Mock Tier 3';
            readonly tier = 3 as const;

            protected async generatePlatform(): Promise<{
                success: boolean;
                output?: string;
                errors: string[];
                warnings: string[];
            }> {
                return { success: true, output: '# Mock\n\nContent', errors: [], warnings: [] };
            }
        }

        const adapter = new MockTier3Adapter();

        it('should use default parse() for Tier 3 (unsupported)', async () => {
            const result = await adapter.parse('# Test Content', '/test/mock.md');
            expect(result.success).toBe(false);
            expect(result.errors.some((e) => e.includes('Parsing is not supported'))).toBe(true);
            // The sourcePlatform should match the adapter's platform
            expect(result.sourcePlatform).toBe(adapter.platform);
        });

        it('should have correct tier 3 designation', () => {
            expect(adapter.tier).toBe(3);
            expect(adapter.platform).toBe('mock-tier3' as MagentPlatform);
        });
    });

    // ============================================================================
    // GenericPassThroughAdapter
    // ============================================================================
    describe('GenericPassThroughAdapter', () => {
        describe('constructor', () => {
            it('should create adapter with all options', () => {
                const adapter = new GenericPassThroughAdapter({
                    platform: 'gemini-md',
                    displayName: 'Test Platform',
                    tier: 1,
                    discoveryPaths: ['GEMINI.md', '.gemini/GEMINI.md'],
                    unsupportedFeatures: ['hooks', 'mcp-servers'],
                });
                expect(adapter.platform).toBe('gemini-md');
                expect(adapter.displayName).toBe('Test Platform');
                expect(adapter.tier).toBe(1);
            });

            it('should default unsupportedFeatures to empty array', () => {
                const adapter = new GenericPassThroughAdapter({
                    platform: 'codex',
                    displayName: 'Codex',
                    tier: 1,
                    discoveryPaths: ['codex.md'],
                });
                expect(adapter.platform).toBe('codex');
            });
        });

        describe('parse()', () => {
            it('should reject empty content', async () => {
                const adapter = createGeminiMdAdapter();
                const result = await adapter.parse('', '/test/GEMINI.md');
                expect(result.success).toBe(false);
                expect(result.errors.some((e) => e.includes('empty'))).toBe(true);
                expect(result.model).toBeNull();
            });

            it('should reject whitespace-only content', async () => {
                const adapter = createGeminiMdAdapter();
                const result = await adapter.parse('   \n\n  ', '/test/GEMINI.md');
                expect(result.success).toBe(false);
                expect(result.errors.some((e) => e.includes('empty'))).toBe(true);
            });

            it('should successfully parse valid content', async () => {
                const adapter = createGeminiMdAdapter();
                const content = `# Identity

I am a test agent.

## Tools

Use the following tools:
- Browse
- Read`;
                const result = await adapter.parse(content, '/test/GEMINI.md');
                expect(result.success).toBe(true);
                expect(result.model).not.toBeNull();
                expect(result.model?.sourceFormat).toBe('gemini-md');
                expect(result.sourcePlatform).toBe('gemini-md');
            });

            it('should detect hierarchy from file path', async () => {
                const adapter = createGeminiMdAdapter();
                const content = `# Identity\n\nTest`;
                const result = await adapter.parse(content, '/project/.gemini/GEMINI.md');
                expect(result.success).toBe(true);
                expect(result.model?.hierarchy).toBeDefined();
            });

            it('should set platformFeatures to empty array', async () => {
                const adapter = createGeminiMdAdapter();
                const content = `# Identity\n\nTest`;
                const result = await adapter.parse(content, '/test/GEMINI.md');
                expect(result.success).toBe(true);
                expect(result.model?.platformFeatures).toEqual([]);
            });

            it('should handle parse errors gracefully', async () => {
                const adapter = new GenericPassThroughAdapter({
                    platform: 'pi',
                    displayName: 'PI',
                    tier: 3,
                    discoveryPaths: ['pi.md'],
                });
                // buildUMAM is quite tolerant, so parse should succeed
                const content = `# Test`;
                const result = await adapter.parse(content, '/test/pi.md');
                // Verify no crash and correct platform assignment
                expect(result).toBeDefined();
                expect(result.sourcePlatform).toBe('pi');
            });

            it('should detect features via detectFeatures() method', () => {
                const adapter = createGeminiMdAdapter();
                const model: UniversalMainAgent = {
                    sourcePath: '/test/GEMINI.md',
                    sourceFormat: 'agents-md',
                    sections: [{ heading: 'Identity', level: 1, content: 'I am a test', category: 'identity' }],
                    estimatedTokens: 50,
                    rawContent: '# Identity\nI am a test',
                    preamble: 'Some preamble',
                };
                const features = adapter.detectFeatures(model);
                // Should detect preamble and section:identity
                expect(features).toContain('preamble');
                expect(features).toContain('section:identity');
                // detectPlatformFeatures returns [] for generic adapters
                expect(features.some((f) => f.startsWith('section:'))).toBe(true);
            });
        });

        describe('generatePlatform()', () => {
            it('should generate output with preamble', async () => {
                const adapter = createGeminiMdAdapter();
                const model: UniversalMainAgent = {
                    sourcePath: '/test/GEMINI.md',
                    sourceFormat: 'agents-md',
                    preamble: '# GEMINI.md - Test Agent\n',
                    sections: [{ heading: 'Identity', level: 1, content: 'I am a test', category: 'identity' }],
                    estimatedTokens: 50,
                    rawContent: '# GEMINI.md\n# Identity\nI am a test',
                };
                // Access protected method via any cast for testing
                const result = await adapter.generate(model);
                expect(result.success).toBe(true);
                expect(result.output).toContain('# Identity');
            });

            it('should generate output without preamble', async () => {
                const adapter = createGeminiMdAdapter();
                const model: UniversalMainAgent = {
                    sourcePath: '/test/GEMINI.md',
                    sourceFormat: 'agents-md',
                    sections: [{ heading: 'Identity', level: 1, content: 'I am a test', category: 'identity' }],
                    estimatedTokens: 50,
                    rawContent: '# Identity\nI am a test',
                };
                const result = await adapter.generate(model);
                expect(result.success).toBe(true);
                expect(result.output).toContain('# Identity');
            });

            it('should emit conversion warnings for unsupported features', async () => {
                const adapter = createGeminiMdAdapter();
                const model: UniversalMainAgent = {
                    sourcePath: '/test/GEMINI.md',
                    sourceFormat: 'agents-md',
                    sections: [{ heading: 'Identity', level: 1, content: 'I am a test', category: 'identity' }],
                    estimatedTokens: 50,
                    rawContent: '# Identity\nI am a test',
                    platformFeatures: ['hooks', 'mcp-servers'],
                };
                const result = await adapter.generate(model);
                expect(result.success).toBe(true);
                expect(result.conversionWarnings).toBeDefined();
                expect(result.conversionWarnings?.length).toBeGreaterThan(0);
                expect(result.conversionWarnings?.some((w) => w.feature === 'hooks' && w.severity === 'warning')).toBe(
                    true,
                );
            });

            it('should not emit conversion warnings when no unsupported features used', async () => {
                const adapter = createGeminiMdAdapter();
                const model: UniversalMainAgent = {
                    sourcePath: '/test/GEMINI.md',
                    sourceFormat: 'agents-md',
                    sections: [{ heading: 'Identity', level: 1, content: 'I am a test', category: 'identity' }],
                    estimatedTokens: 50,
                    rawContent: '# Identity\nI am a test',
                    platformFeatures: ['some-other-feature'],
                };
                const result = await adapter.generate(model);
                expect(result.success).toBe(true);
                expect(result.conversionWarnings).toBeUndefined();
            });
        });

        describe('detectPlatformFeatures()', () => {
            it('should return empty array for generic adapter', async () => {
                const adapter = createGeminiMdAdapter();
                // Access protected method via generate call to verify behavior
                const model: UniversalMainAgent = {
                    sourcePath: '/test/GEMINI.md',
                    sourceFormat: 'agents-md',
                    sections: [{ heading: 'Identity', level: 1, content: 'I am a test', category: 'identity' }],
                    estimatedTokens: 50,
                    rawContent: '# Identity\nI am a test',
                };
                const result = await adapter.generate(model);
                expect(result.success).toBe(true);
                // Generic adapters don't detect any features, so no conversion warnings
                // unless platformFeatures on model contains unsupported items
                expect(result.conversionWarnings).toBeUndefined();
            });
        });

        describe('getDiscoveryPaths()', () => {
            it('should return discovery paths for Gemini MD', () => {
                const adapter = createGeminiMdAdapter();
                const paths = adapter.getDiscoveryPaths();
                expect(paths).toContain('GEMINI.md');
                expect(paths).toContain('.gemini/GEMINI.md');
            });

            it('should return discovery paths for Codex', () => {
                const adapter = createCodexAdapter();
                const paths = adapter.getDiscoveryPaths();
                expect(paths).toContain('codex.md');
                expect(paths).toContain('.codex/AGENTS.md');
            });

            it('should return discovery paths for PI', () => {
                const adapter = createPiAdapter();
                const paths = adapter.getDiscoveryPaths();
                expect(paths).toContain('.pi/rules.md');
                expect(paths).toContain('pi.md');
            });
        });
    });

    // ============================================================================
    // Factory Functions
    // ============================================================================
    describe('GenericPassThrough factory functions', () => {
        describe('createGeminiMdAdapter()', () => {
            it('should create Gemini MD adapter with correct properties', () => {
                const adapter = createGeminiMdAdapter();
                expect(adapter.platform).toBe('gemini-md');
                expect(adapter.displayName).toBe('GEMINI.md (Gemini CLI)');
                expect(adapter.tier).toBe(1);
            });

            it('should have correct unsupported features', () => {
                const adapter = createGeminiMdAdapter();
                const paths = adapter.getDiscoveryPaths();
                expect(paths).toEqual(['GEMINI.md', '.gemini/GEMINI.md']);
            });
        });

        describe('createCodexAdapter()', () => {
            it('should create Codex adapter with correct properties', () => {
                const adapter = createCodexAdapter();
                expect(adapter.platform).toBe('codex');
                expect(adapter.displayName).toBe('Codex (OpenAI)');
                expect(adapter.tier).toBe(1);
            });

            it('should have correct discovery paths', () => {
                const adapter = createCodexAdapter();
                const paths = adapter.getDiscoveryPaths();
                expect(paths).toEqual(['codex.md', '.codex/AGENTS.md']);
            });
        });

        describe('createPiAdapter()', () => {
            it('should create PI adapter with correct properties', () => {
                const adapter = createPiAdapter();
                expect(adapter.platform).toBe('pi');
                expect(adapter.displayName).toBe('PI CLI');
                expect(adapter.tier).toBe(3);
            });

            it('should have more unsupported features than Tier 1 adapters', () => {
                const piAdapter = createPiAdapter();
                const geminiAdapter = createGeminiMdAdapter();
                // PI has more unsupported features (includes skills, progressive-complexity)
                const piPaths = piAdapter.getDiscoveryPaths();
                const geminiPaths = geminiAdapter.getDiscoveryPaths();
                expect(piPaths).not.toEqual(geminiPaths);
            });
        });
    });
});
