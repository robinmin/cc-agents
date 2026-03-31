/**
 * Unit tests for rd3:cc-skills adapters
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AntigravityAdapter } from '../scripts/adapters/antigravity';
import { ClaudeAdapter } from '../scripts/adapters/claude';
import { CodexAdapter, createCodexAdapter } from '../scripts/adapters/codex';
import { OpenClawAdapter, createOpenClawAdapter } from '../scripts/adapters/openclaw';
import { OpenCodeAdapter, createOpenCodeAdapter } from '../scripts/adapters/opencode';
import type { Skill } from '../scripts/types';

let TEST_DIR = '';

function createTestDir(): string {
    return mkdtempSync(join(tmpdir(), 'cc-skills-adapters-'));
}

function createMockSkill(overrides: Partial<Skill> = {}): Skill {
    return {
        frontmatter: {
            name: 'test-skill',
            description: 'A test skill for unit testing',
        },
        body: '# Test Skill\n\nThis is a test skill.',
        raw: `---
name: test-skill
description: A test skill for unit testing
---

# Test Skill

This is a test skill.`,
        path: join(TEST_DIR, 'SKILL.md'),
        directory: TEST_DIR,
        resources: {},
        ...overrides,
    };
}

function createTestSkillFiles() {
    // Create the SKILL.md file
    writeFileSync(
        join(TEST_DIR, 'SKILL.md'),
        `---
name: test-skill
description: A test skill for unit testing
---

# Test Skill

This is a test skill.`,
        'utf-8',
    );
}

describe('ClaudeAdapter', () => {
    let adapter: ClaudeAdapter;

    beforeEach(() => {
        adapter = new ClaudeAdapter();
        TEST_DIR = createTestDir();
        createTestSkillFiles();
    });

    afterEach(() => {
        if (existsSync(TEST_DIR)) {
            rmSync(TEST_DIR, { recursive: true, force: true });
        }
        TEST_DIR = '';
    });

    it('should have correct platform', () => {
        expect(adapter.platform).toBe('claude');
        expect(adapter.displayName).toBe('Claude Code');
    });

    it('should validate skill with existing SKILL.md', async () => {
        const skill = createMockSkill();
        const result = await adapter.validate(skill);

        // Should not have errors
        expect(result.errors.length).toBe(0);
    });

    it('should validate skill without SKILL.md', async () => {
        rmSync(TEST_DIR, { recursive: true, force: true });
        mkdirSync(TEST_DIR, { recursive: true });
        const skill = createMockSkill();
        const result = await adapter.validate(skill);

        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should generate companions', async () => {
        const skill = createMockSkill();
        const result = await adapter.generateCompanions({
            skill,
            options: { name: 'test-skill', path: TEST_DIR },
            outputPath: TEST_DIR,
            skillPath: TEST_DIR,
            skillName: 'test-skill',
            frontmatter: skill.frontmatter,
            body: skill.body,
            resources: {},
        });

        // Should succeed or have warnings, not critical errors
        expect(result.success).toBe(true);
    });

    it('should detect Claude-specific features in content', () => {
        const skill = createMockSkill({
            body: '# Test\n\nUse !`cmd` for commands.\n\nUse $ARGUMENTS for args.\n\nUse context: fork for parallel.',
        });
        const features = adapter.detectPlatformFeatures(skill);
        expect(features).toContain('claude-commands');
        expect(features).toContain('claude-arguments');
        expect(features).toContain('claude-context-fork');
    });
});

describe('CodexAdapter', () => {
    let adapter: CodexAdapter;

    beforeEach(() => {
        adapter = createCodexAdapter();
        TEST_DIR = createTestDir();
        createTestSkillFiles();
    });

    afterEach(() => {
        if (existsSync(TEST_DIR)) {
            rmSync(TEST_DIR, { recursive: true, force: true });
        }
        TEST_DIR = '';
    });

    it('should have correct platform', () => {
        expect(adapter.platform).toBe('codex');
        expect(adapter.displayName).toBe('Codex');
    });

    it('should validate skill', async () => {
        const skill = createMockSkill();
        const result = await adapter.validate(skill);

        expect(result.errors.length).toBe(0);
    });

    it('should generate openai.yaml', async () => {
        const skill = createMockSkill({
            frontmatter: {
                name: 'test-skill',
                description: 'A test skill',
            },
        });

        const result = await adapter.generateCompanions({
            skill,
            options: { name: 'test-skill', path: TEST_DIR },
            outputPath: TEST_DIR,
            skillPath: TEST_DIR,
            skillName: 'test-skill',
            frontmatter: skill.frontmatter,
            body: skill.body,
            resources: {},
        });

        expect(result.success).toBe(true);
        expect(existsSync(join(TEST_DIR, 'agents'))).toBe(true);
        expect(existsSync(join(TEST_DIR, 'agents', 'openai.yaml'))).toBe(true);
    });

    it('should accept rd3 taxonomy categories in openai.yaml', async () => {
        mkdirSync(join(TEST_DIR, 'agents'), { recursive: true });
        writeFileSync(
            join(TEST_DIR, 'agents', 'openai.yaml'),
            `name: test-skill
description: A test skill
category: engineering-core
`,
            'utf-8',
        );

        const skill = createMockSkill();
        const result = await adapter.validate(skill);

        expect(result.warnings).not.toContain('Unusual category: engineering-core');
    });

    it('should detect platform features', () => {
        const skill = createMockSkill();
        const features = adapter.detectPlatformFeatures(skill);
        expect(Array.isArray(features)).toBe(true);
    });
});

describe('OpenClawAdapter', () => {
    let adapter: OpenClawAdapter;

    beforeEach(() => {
        adapter = createOpenClawAdapter();
        TEST_DIR = createTestDir();
        createTestSkillFiles();
    });

    afterEach(() => {
        if (existsSync(TEST_DIR)) {
            rmSync(TEST_DIR, { recursive: true, force: true });
        }
        TEST_DIR = '';
    });

    it('should have correct platform', () => {
        expect(adapter.platform).toBe('openclaw');
        expect(adapter.displayName).toBe('OpenClaw');
    });

    it('should validate skill with openclaw metadata', async () => {
        const skill = createMockSkill({
            frontmatter: {
                name: 'test-skill',
                description: 'A test skill',
                metadata: {
                    openclaw: {
                        emoji: '🛠️',
                        requires: {
                            bins: ['git'],
                            env: ['NODE_ENV'],
                        },
                    },
                },
            },
        });

        const result = await adapter.validate(skill);
        expect(result.success).toBe(true);
    });

    it('should generate metadata.openclaw', async () => {
        const skill = createMockSkill();

        const result = await adapter.generateCompanions({
            skill,
            options: { name: 'test-skill', path: TEST_DIR },
            outputPath: TEST_DIR,
            skillPath: TEST_DIR,
            skillName: 'test-skill',
            frontmatter: skill.frontmatter,
            body: skill.body,
            resources: {},
        });

        expect(result.success).toBe(true);
        expect(existsSync(join(TEST_DIR, 'metadata.openclaw'))).toBe(true);
    });

    it('should detect platform features', () => {
        const skill = createMockSkill();
        const features = adapter.detectPlatformFeatures(skill);
        expect(Array.isArray(features)).toBe(true);
    });
});

describe('OpenCodeAdapter', () => {
    let adapter: OpenCodeAdapter;

    beforeEach(() => {
        adapter = createOpenCodeAdapter();
        TEST_DIR = createTestDir();
        createTestSkillFiles();
    });

    afterEach(() => {
        if (existsSync(TEST_DIR)) {
            rmSync(TEST_DIR, { recursive: true, force: true });
        }
        TEST_DIR = '';
    });

    it('should have correct platform', () => {
        expect(adapter.platform).toBe('opencode');
        expect(adapter.displayName).toBe('OpenCode');
    });

    it('should validate skill', async () => {
        const skill = createMockSkill();
        const result = await adapter.validate(skill);

        expect(result.errors.length).toBe(0);
    });

    it('should detect platform features', () => {
        const skill = createMockSkill();
        const features = adapter.detectPlatformFeatures(skill);
        expect(Array.isArray(features)).toBe(true);
    });

    it('should generate companions', async () => {
        const skill = createMockSkill();
        const result = await adapter.generateCompanions({
            skill,
            options: { name: 'test-skill', path: TEST_DIR },
            outputPath: TEST_DIR,
            skillPath: TEST_DIR,
            skillName: 'test-skill',
            frontmatter: skill.frontmatter,
            body: skill.body,
            resources: {},
        });

        expect(result.success).toBe(true);
    });

    it('should not warn on bash blocks when permissions are documented in platform notes', async () => {
        const skill = createMockSkill({
            body: `# Test

## Platform Notes

### Permissions

These bash examples only require normal local developer permissions.

\`\`\`bash
git status
\`\`\`
`,
        });

        const result = await adapter.validate(skill);
        expect(result.warnings).not.toContain('Skill uses bash blocks - consider documenting required permissions');
    });

    it('should detect permission features', () => {
        const skill = createMockSkill({
            body: '# Test\n\nSet permission: read in config.',
        });
        const features = adapter.detectPlatformFeatures(skill);
        expect(features).toContain('opencode-permissions');
    });
});

describe('AntigravityAdapter', () => {
    let adapter: AntigravityAdapter;

    beforeEach(() => {
        adapter = new AntigravityAdapter();
        TEST_DIR = createTestDir();
        createTestSkillFiles();
    });

    afterEach(() => {
        if (existsSync(TEST_DIR)) {
            rmSync(TEST_DIR, { recursive: true, force: true });
        }
        TEST_DIR = '';
    });

    it('should have correct platform', () => {
        expect(adapter.platform).toBe('antigravity');
        expect(adapter.displayName).toBe('Antigravity');
    });

    it('should validate skill', async () => {
        const skill = createMockSkill();
        const result = await adapter.validate(skill);

        expect(result.errors.length).toBe(0);
    });

    it('should detect platform features', () => {
        const skill = createMockSkill();
        const features = adapter.detectPlatformFeatures(skill);

        expect(Array.isArray(features)).toBe(true);
    });

    it('should generate companions without errors', async () => {
        const skill = createMockSkill();
        const result = await adapter.generateCompanions({
            skill,
            options: { name: 'test-skill', path: TEST_DIR },
            outputPath: TEST_DIR,
            skillPath: TEST_DIR,
            skillName: 'test-skill',
            frontmatter: skill.frontmatter,
            body: skill.body,
            resources: {},
        });

        expect(result.success).toBe(true);
    });

    it('should detect incompatible Claude features', () => {
        const skill = createMockSkill({
            body: '# Test\n\nUse !`cmd` for commands.\n\nUse $ARGUMENTS.\n\nUse context: fork.\n\nInclude hooks: in YAML.',
        });
        const features = adapter.detectPlatformFeatures(skill);
        expect(features).toContain('incompatible-claude-commands');
        expect(features).toContain('incompatible-claude-arguments');
        expect(features).toContain('incompatible-claude-context');
        expect(features).toContain('incompatible-claude-hooks');
    });
});

describe('Adapter Factory Functions', () => {
    it('createCodexAdapter should return CodexAdapter instance', () => {
        const adapter = createCodexAdapter();
        expect(adapter).toBeInstanceOf(CodexAdapter);
    });

    it('createOpenClawAdapter should return OpenClawAdapter instance', () => {
        const adapter = createOpenClawAdapter();
        expect(adapter).toBeInstanceOf(OpenClawAdapter);
    });

    it('createOpenCodeAdapter should return OpenCodeAdapter instance', () => {
        const adapter = createOpenCodeAdapter();
        expect(adapter).toBeInstanceOf(OpenCodeAdapter);
    });

    it('createClaudeAdapter should return ClaudeAdapter instance', () => {
        const { createClaudeAdapter } = require('../scripts/adapters/claude');
        const adapter = createClaudeAdapter();
        expect(adapter.platform).toBe('claude');
    });

    it('createAntigravityAdapter should return AntigravityAdapter instance', () => {
        const { createAntigravityAdapter } = require('../scripts/adapters/antigravity');
        const adapter = createAntigravityAdapter();
        expect(adapter.platform).toBe('antigravity');
    });
});
