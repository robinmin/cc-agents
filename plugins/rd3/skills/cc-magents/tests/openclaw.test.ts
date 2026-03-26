/**
 * Tests for OpenClaw Adapter (Tier 1 — Multi-File)
 *
 * Covers: parse (single + multi-file), validate, generate,
 * detectFeatures, getDiscoveryPaths, and factory function.
 */

import { describe, it, expect } from 'bun:test';
import { OpenClawAdapter, createOpenClawAdapter } from '../scripts/adapters';
import type { UniversalMainAgent } from '../scripts/types';

// ============================================================================
// Helpers
// ============================================================================

function makeModel(overrides: Partial<UniversalMainAgent> = {}): UniversalMainAgent {
    return {
        sourcePath: '/test/workspace',
        sourceFormat: 'openclaw',
        sections: [
            { heading: 'Identity', level: 1, content: 'I am OpenClaw agent', category: 'identity' },
            { heading: 'Rules', level: 1, content: 'Be helpful and safe', category: 'rules' },
        ],
        estimatedTokens: 100,
        rawContent: '# Identity\n\nI am OpenClaw agent\n\n# Rules\n\nBe helpful and safe',
        ...overrides,
    };
}

// ============================================================================
// Tests
// ============================================================================

describe('OpenClawAdapter', () => {
    // --------------------------------------------------------------------------
    // Construction & metadata
    // --------------------------------------------------------------------------
    describe('construction', () => {
        it('should create with default options', () => {
            const adapter = new OpenClawAdapter();
            expect(adapter.platform).toBe('openclaw');
            expect(adapter.displayName).toBe('OpenClaw (Workspace Files)');
            expect(adapter.tier).toBe(1);
        });

        it('should create via factory function', () => {
            const adapter = createOpenClawAdapter();
            expect(adapter.platform).toBe('openclaw');
        });

        it('should accept custom options', () => {
            const adapter = createOpenClawAdapter({
                includeMetadataComment: true,
                skipEmptyFiles: false,
                includeFiles: ['SOUL.md', 'AGENTS.md'],
            });
            expect(adapter.platform).toBe('openclaw');
        });

        it('should return discovery paths', () => {
            const adapter = new OpenClawAdapter();
            const paths = adapter.getDiscoveryPaths();
            expect(paths.length).toBeGreaterThan(0);
        });
    });

    // --------------------------------------------------------------------------
    // Parse — single file
    // --------------------------------------------------------------------------
    describe('parse (single file)', () => {
        it('should parse a single workspace file', async () => {
            const adapter = new OpenClawAdapter();
            const content = '# Personality\n\nI am a helpful agent with a friendly tone.';
            const result = await adapter.parse(content, '/workspace/SOUL.md');

            expect(result.success).toBe(true);
            expect(result.model).not.toBeNull();
            expect(result.sourcePlatform).toBe('openclaw');
            expect(result.model?.platformFeatures).toContain('openclaw-workspace');
            expect(result.model?.platformFeatures).toContain('workspace-file:SOUL.md');
        });

        it('should assign category based on file name (single-category file)', async () => {
            const adapter = new OpenClawAdapter();
            const content = '# Soul\n\nPersonality traits.';
            const result = await adapter.parse(content, '/workspace/SOUL.md');

            expect(result.success).toBe(true);
            expect(result.model?.sections.some((s) => s.category === 'personality')).toBe(true);
        });

        it('should return error for empty input', async () => {
            const adapter = new OpenClawAdapter();
            const result = await adapter.parse('', '/workspace/SOUL.md');

            expect(result.success).toBe(false);
            expect(result.model).toBeNull();
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('empty');
        });

        it('should return error for whitespace-only input', async () => {
            const adapter = new OpenClawAdapter();
            const result = await adapter.parse('   \n  \n  ', '/workspace/SOUL.md');

            expect(result.success).toBe(false);
        });

        it('should handle AGENTS.md content (multi-category file)', async () => {
            const adapter = new OpenClawAdapter();
            const content = '# Workflow\n\nFollow TDD.\n\n# Standards\n\nUse TypeScript.';
            const result = await adapter.parse(content, '/workspace/AGENTS.md');

            expect(result.success).toBe(true);
            expect(result.model?.sections.length).toBeGreaterThanOrEqual(2);
        });

        it('should handle non-workspace filename gracefully', async () => {
            const adapter = new OpenClawAdapter();
            const content = '# Notes\n\nSome notes.';
            const result = await adapter.parse(content, '/workspace/README.md');

            expect(result.success).toBe(true);
            expect(result.model?.platformFeatures).toContain('workspace-file:README.md');
        });
    });

    // --------------------------------------------------------------------------
    // Parse — multi-file
    // --------------------------------------------------------------------------
    describe('parse (multi-file)', () => {
        it('should parse multi-file workspace format', async () => {
            const adapter = new OpenClawAdapter();
            const content = `<!-- FILE: SOUL.md -->
# Personality

Friendly and curious.

<!-- FILE: AGENTS.md -->
# Rules

Be safe and thorough.

<!-- FILE: MEMORY.md -->
# Memory

Remember user preferences.`;

            const result = await adapter.parse(content, '/workspace');

            expect(result.success).toBe(true);
            expect(result.model).not.toBeNull();
            expect(result.model?.sourceFormat).toBe('openclaw');
            expect(result.model?.platformFeatures).toContain('openclaw-workspace');
            expect(result.model?.platformFeatures).toContain('multi-file');
        });

        it('should assign categories correctly for single-category files', async () => {
            const adapter = new OpenClawAdapter();
            const content = `<!-- FILE: SOUL.md -->
# Soul Content

I am a personality.

<!-- FILE: MEMORY.md -->
# Memory Content

Remember things.`;

            const result = await adapter.parse(content, '/workspace');

            expect(result.success).toBe(true);
            const soulSections = result.model?.sections.filter((s) => s.category === 'personality');
            const memorySections = result.model?.sections.filter((s) => s.category === 'memory');
            expect(soulSections?.length).toBeGreaterThan(0);
            expect(memorySections?.length).toBeGreaterThan(0);
        });

        it('should preserve preamble from first file', async () => {
            const adapter = new OpenClawAdapter();
            const content = `<!-- FILE: SOUL.md -->
Preamble text before any heading.

# Soul

Content.`;

            const result = await adapter.parse(content, '/workspace');

            expect(result.success).toBe(true);
            expect(result.model?.preamble).toBeDefined();
        });

        it('should warn on unknown workspace files', async () => {
            const adapter = new OpenClawAdapter();
            const content = `<!-- FILE: UNKNOWN.md -->
# Unknown

Content.

<!-- FILE: SOUL.md -->
# Soul

Content.`;

            const result = await adapter.parse(content, '/workspace');

            expect(result.success).toBe(true);
            expect(result.warnings.some((w) => w.includes('Unknown workspace file'))).toBe(true);
        });

        it('should return error when no sections found in multi-file', async () => {
            const adapter = new OpenClawAdapter();
            const content = `<!-- FILE: SOUL.md -->

<!-- FILE: IDENTITY.md -->
`;

            const result = await adapter.parse(content, '/workspace');

            expect(result.success).toBe(false);
            expect(result.errors.some((e) => e.includes('No sections found'))).toBe(true);
        });

        it('should skip empty file blocks', async () => {
            const adapter = new OpenClawAdapter();
            const content = `<!-- FILE: SOUL.md -->

<!-- FILE: AGENTS.md -->
# Rules

Be helpful.`;

            const result = await adapter.parse(content, '/workspace');

            expect(result.success).toBe(true);
            expect(result.model?.sections.length).toBeGreaterThan(0);
        });
    });

    // --------------------------------------------------------------------------
    // Validate
    // --------------------------------------------------------------------------
    describe('validate', () => {
        it('should validate a well-formed model', async () => {
            const adapter = new OpenClawAdapter();
            const model = makeModel();
            const result = await adapter.validate(model);

            expect(result.success).toBe(true);
        });

        it('should warn when personality contains workflow content', async () => {
            const adapter = new OpenClawAdapter();
            const model = makeModel({
                sections: [
                    {
                        heading: 'Soul',
                        level: 1,
                        content: 'Step 1: do this.\nStep 2: do that.',
                        category: 'personality',
                    },
                    { heading: 'Rules', level: 1, content: 'Be safe', category: 'rules' },
                ],
            });

            const result = await adapter.validate(model);
            expect(result.success).toBe(true);
            expect(result.warnings?.some((w) => w.includes('workflow/procedure content'))).toBe(true);
        });

        it('should warn about possible secrets in sections', async () => {
            const adapter = new OpenClawAdapter();
            const model = makeModel({
                sections: [
                    { heading: 'Config', level: 1, content: 'api_key = sk-12345', category: 'tools' },
                    { heading: 'Rules', level: 1, content: 'Be safe', category: 'rules' },
                ],
            });

            const result = await adapter.validate(model);
            expect(result.success).toBe(true);
            expect(result.warnings?.some((w) => w.includes('secret'))).toBe(true);
        });

        it('should warn when no identity or personality section exists', async () => {
            const adapter = new OpenClawAdapter();
            const model = makeModel({
                sections: [{ heading: 'Rules', level: 1, content: 'Be safe', category: 'rules' }],
            });

            const result = await adapter.validate(model);
            expect(result.warnings?.some((w) => w.includes('identity or personality'))).toBe(true);
        });

        it('should warn when no rules section exists', async () => {
            const adapter = new OpenClawAdapter();
            const model = makeModel({
                sections: [{ heading: 'Identity', level: 1, content: 'I am', category: 'identity' }],
            });

            const result = await adapter.validate(model);
            expect(result.warnings?.some((w) => w.includes('No rules section'))).toBe(true);
        });

        it('should detect token secret pattern', async () => {
            const adapter = new OpenClawAdapter();
            const model = makeModel({
                sections: [
                    { heading: 'Config', level: 1, content: 'token: abc123', category: 'tools' },
                    { heading: 'Identity', level: 1, content: 'I am agent', category: 'identity' },
                    { heading: 'Rules', level: 1, content: 'Be safe', category: 'rules' },
                ],
            });

            const result = await adapter.validate(model);
            expect(result.warnings?.some((w) => w.includes('secret'))).toBe(true);
        });

        it('should detect password secret pattern', async () => {
            const adapter = new OpenClawAdapter();
            const model = makeModel({
                sections: [
                    { heading: 'Config', level: 1, content: 'password: hunter2', category: 'tools' },
                    { heading: 'Identity', level: 1, content: 'I am agent', category: 'identity' },
                    { heading: 'Rules', level: 1, content: 'Be safe', category: 'rules' },
                ],
            });

            const result = await adapter.validate(model);
            expect(result.warnings?.some((w) => w.includes('secret'))).toBe(true);
        });
    });

    // --------------------------------------------------------------------------
    // Generate
    // --------------------------------------------------------------------------
    describe('generate', () => {
        it('should generate multi-file output with FILE markers', async () => {
            const adapter = new OpenClawAdapter();
            const model = makeModel();

            const result = await adapter.generate(model);

            expect(result.success).toBe(true);
            expect(result.output).toBeDefined();
            expect(result.output).toContain('<!-- FILE:');
        });

        it('should route sections to correct workspace files', async () => {
            const adapter = new OpenClawAdapter();
            const model = makeModel({
                sections: [
                    { heading: 'Soul', level: 1, content: 'I am friendly', category: 'personality' },
                    { heading: 'Rules', level: 1, content: 'Be careful', category: 'rules' },
                    { heading: 'Memory', level: 1, content: 'Remember X', category: 'memory' },
                    { heading: 'Tools', level: 1, content: 'Use Read', category: 'tools' },
                ],
            });

            const result = await adapter.generate(model);

            expect(result.success).toBe(true);
            expect(result.output).toContain('<!-- FILE: SOUL.md -->');
            expect(result.output).toContain('<!-- FILE: AGENTS.md -->');
            expect(result.output).toContain('<!-- FILE: MEMORY.md -->');
            expect(result.output).toContain('<!-- FILE: TOOLS.md -->');
        });

        it('should skip empty files by default', async () => {
            const adapter = new OpenClawAdapter();
            const model = makeModel({
                sections: [{ heading: 'Rules', level: 1, content: 'Be safe', category: 'rules' }],
            });

            const result = await adapter.generate(model);

            expect(result.success).toBe(true);
            // HEARTBEAT.md should not appear since no heartbeat sections
            expect(result.output).not.toContain('<!-- FILE: HEARTBEAT.md -->');
        });

        it('should include empty files when skipEmptyFiles is false', async () => {
            const adapter = createOpenClawAdapter({ skipEmptyFiles: false });
            const model = makeModel({
                sections: [{ heading: 'Rules', level: 1, content: 'Be safe', category: 'rules' }],
            });

            const result = await adapter.generate(model);

            expect(result.success).toBe(true);
            // All workspace files should appear
            expect(result.output).toContain('<!-- FILE: HEARTBEAT.md -->');
            expect(result.output).toContain('<!-- No content yet -->');
        });

        it('should include metadata comments when requested', async () => {
            const adapter = createOpenClawAdapter({ includeMetadataComment: true });
            const model = makeModel();

            const result = await adapter.generate(model);

            expect(result.success).toBe(true);
            expect(result.output).toContain('<!-- OpenClaw Workspace File:');
            expect(result.output).toContain('<!-- Categories:');
        });

        it('should filter output to specified files only', async () => {
            const adapter = createOpenClawAdapter({ includeFiles: ['SOUL.md', 'AGENTS.md'] });
            const model = makeModel({
                sections: [
                    { heading: 'Soul', level: 1, content: 'Friendly', category: 'personality' },
                    { heading: 'Rules', level: 1, content: 'Be safe', category: 'rules' },
                    { heading: 'Memory', level: 1, content: 'Remember X', category: 'memory' },
                ],
            });

            const result = await adapter.generate(model);

            expect(result.success).toBe(true);
            expect(result.output).toContain('<!-- FILE: SOUL.md -->');
            expect(result.output).toContain('<!-- FILE: AGENTS.md -->');
            // MEMORY.md should NOT appear since it's not in includeFiles
            expect(result.output).not.toContain('<!-- FILE: MEMORY.md -->');
        });

        it('should produce multiFileOutput with correct structure', async () => {
            const adapter = new OpenClawAdapter();
            const model = makeModel({
                sections: [
                    { heading: 'Soul', level: 1, content: 'Friendly', category: 'personality' },
                    { heading: 'Rules', level: 1, content: 'Be safe', category: 'rules' },
                ],
            });

            const result = (await adapter.generate(model)) as {
                multiFileOutput?: {
                    platform: string;
                    files: Map<string, string>;
                    fileMappings: Array<{ category: string; filename: string }>;
                };
            };

            expect(result.multiFileOutput).toBeDefined();
            expect(result.multiFileOutput?.platform).toBe('openclaw');
            expect(result.multiFileOutput?.files).toBeDefined();
            expect(result.multiFileOutput?.fileMappings.length).toBeGreaterThan(0);
        });

        it('should route custom category sections to AGENTS.md', async () => {
            const adapter = new OpenClawAdapter();
            const model = makeModel({
                sections: [{ heading: 'Custom Section', level: 1, content: 'Some content', category: 'custom' }],
            });

            const result = await adapter.generate(model);

            expect(result.success).toBe(true);
            expect(result.output).toContain('<!-- FILE: AGENTS.md -->');
        });
    });

    // --------------------------------------------------------------------------
    // Detect Features
    // --------------------------------------------------------------------------
    describe('detectFeatures', () => {
        it('should detect openclaw-workspace feature', () => {
            const adapter = new OpenClawAdapter();
            const model = makeModel();

            const features = adapter.detectFeatures(model);
            expect(features).toContain('openclaw-workspace');
        });

        it('should detect workspace files from section categories', () => {
            const adapter = new OpenClawAdapter();
            const model = makeModel({
                sections: [
                    { heading: 'Soul', level: 1, content: 'Friendly', category: 'personality' },
                    { heading: 'Memory', level: 1, content: 'Remember', category: 'memory' },
                ],
            });

            const features = adapter.detectFeatures(model);
            expect(features).toContain('workspace-file:SOUL.md');
            expect(features).toContain('workspace-file:MEMORY.md');
        });

        it('should detect bootstrap pattern', () => {
            const adapter = new OpenClawAdapter();
            const model = makeModel({
                sections: [{ heading: 'Bootstrap', level: 1, content: 'First run setup', category: 'bootstrap' }],
            });

            const features = adapter.detectFeatures(model);
            expect(features).toContain('bootstrap-pattern');
        });

        it('should detect daily memory pattern', () => {
            const adapter = new OpenClawAdapter();
            const model = makeModel({
                sections: [
                    {
                        heading: 'Memory',
                        level: 1,
                        content: 'Use YYYY-MM-DD format for daily memory.',
                        category: 'memory',
                    },
                ],
            });

            const features = adapter.detectFeatures(model);
            expect(features).toContain('daily-memory');
        });

        it('should detect memory curation pattern', () => {
            const adapter = new OpenClawAdapter();
            const model = makeModel({
                sections: [{ heading: 'Memory', level: 1, content: 'Curate long-term facts.', category: 'memory' }],
            });

            const features = adapter.detectFeatures(model);
            expect(features).toContain('memory-curation');
        });

        it('should detect scheduled tasks (heartbeat)', () => {
            const adapter = new OpenClawAdapter();
            const model = makeModel({
                sections: [{ heading: 'Heartbeat', level: 1, content: 'Run every 5 minutes.', category: 'heartbeat' }],
            });

            const features = adapter.detectFeatures(model);
            expect(features).toContain('scheduled-tasks');
        });

        it('should not detect memory features without memory sections', () => {
            const adapter = new OpenClawAdapter();
            const model = makeModel({
                sections: [{ heading: 'Rules', level: 1, content: 'Be safe', category: 'rules' }],
            });

            const features = adapter.detectFeatures(model);
            expect(features).not.toContain('daily-memory');
            expect(features).not.toContain('memory-curation');
        });
    });
});
