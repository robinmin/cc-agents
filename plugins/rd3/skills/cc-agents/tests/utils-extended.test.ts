#!/usr/bin/env bun
import { describe, expect, it } from 'bun:test';
import { resolve } from 'node:path';
import type { UniversalAgent } from '../scripts/types';
import {
    ANATOMY_SECTIONS,
    analyzeBody,
    detectTemplateTier,
    detectWeightProfile,
    extractAllSections,
    extractSection,
    generateAgentMarkdown,
    generateClaudeFrontmatter,
    isValidAgentName,
    normalizeAgentName,
    parseAgent,
    parseFrontmatter,
    readAgent,
    serializeFrontmatter,
} from '../scripts/utils';

describe('parseFrontmatter', () => {
    it('should parse valid YAML frontmatter', () => {
        const input = '---\nname: test-agent\ndescription: "A test agent"\n---\n\n# Body';
        const result = parseFrontmatter(input);
        expect(result.frontmatter?.name).toBe('test-agent');
        expect(result.frontmatter?.description).toBe('A test agent');
        expect(result.body).toContain('# Body');
    });

    it('should handle missing frontmatter', () => {
        const input = '# No frontmatter here';
        const result = parseFrontmatter(input);
        expect(result.frontmatter).toBeNull();
        expect(result.body).toContain('# No frontmatter here');
    });

    it('should handle empty YAML', () => {
        const input = '---\n\n---\n\nBody';
        const result = parseFrontmatter(input);
        expect(result.frontmatter).toBeNull();
    });

    it('should detect unknown fields', () => {
        const input = '---\nname: test\nflavor: chocolate\n---\n\nBody';
        const result = parseFrontmatter(input, ['name', 'description']);
        expect(result.unknownFields).toContain('flavor');
    });

    it('should not report known fields as unknown', () => {
        const input = '---\nname: test\ndescription: test\n---\n\nBody';
        const result = parseFrontmatter(input, ['name', 'description']);
        expect(result.unknownFields).toHaveLength(0);
    });

    it('should handle parse errors gracefully', () => {
        const input = '---\nname: test\n  bad indent\n---\n\nBody';
        const result = parseFrontmatter(input);
        // YAML might parse this with a warning, check for parseError or null frontmatter
        if (result.parseError) {
            expect(result.frontmatter).toBeNull();
        }
    });

    it('should handle CRLF line endings', () => {
        const input = '---\r\nname: test\r\ndescription: test\r\n---\r\n\r\nBody';
        const result = parseFrontmatter(input);
        expect(result.frontmatter?.name).toBe('test');
    });
});

describe('serializeFrontmatter', () => {
    it('should serialize frontmatter and body', () => {
        const fm = { name: 'test', description: 'A test' };
        const result = serializeFrontmatter(fm, '# Body');
        expect(result).toContain('---');
        expect(result).toContain('name:');
        expect(result).toContain('# Body');
    });

    it('should filter undefined values', () => {
        const fm = { name: 'test', value: undefined };
        const result = serializeFrontmatter(fm, 'body');
        expect(result).not.toContain('value');
    });

    it('should handle empty body', () => {
        const fm = { name: 'test' };
        const result = serializeFrontmatter(fm, '');
        expect(result).toContain('---');
    });
});

describe('parseAgent', () => {
    it('should parse agent from content', () => {
        const result = parseAgent('/path/to/test-agent.md', '---\nname: test\n---\n\n# Body');
        expect(result.filename).toBe('test-agent');
        expect(result.frontmatter?.name).toBe('test');
        expect(result.body).toContain('# Body');
        expect(result.sourcePlatform).toBe('claude');
    });

    it('should use custom source platform', () => {
        const result = parseAgent('/path/to/test.md', '---\nname: test\n---\n\n# Body', 'gemini');
        expect(result.sourcePlatform).toBe('gemini');
    });
});

describe('readAgent', () => {
    it('should return null for non-existent file', async () => {
        const result = await readAgent('/non/existent/file.md');
        expect(result).toBeNull();
    });

    it('should read existing agent file', async () => {
        const result = await readAgent(resolve(import.meta.dir, 'fixtures/specialist-agent.md'));
        expect(result).not.toBeNull();
        expect(result?.filename).toBe('specialist-agent');
    });
});

describe('analyzeBody', () => {
    it('should analyze simple body', () => {
        const body = '# Header\n\nSome text\n\n## Section 1\n\nContent\n\n## Section 2\n\nMore content';
        const analysis = analyzeBody(body);
        expect(analysis.lineCount).toBeGreaterThan(0);
        expect(analysis.sections.length).toBeGreaterThanOrEqual(2);
    });

    it('should detect 8-section anatomy', () => {
        const body =
            '# 1. METADATA\n\nContent\n\n# 2. PERSONA\n\nContent\n\n# 3. PHILOSOPHY\n\nContent\n\n# 4. VERIFICATION\n\nContent\n\n# 5. COMPETENCIES\n\nContent\n\n# 6. PROCESS\n\nContent\n\n# 7. RULES\n\nContent\n\n# 8. OUTPUT FORMAT\n\nContent';
        const analysis = analyzeBody(body);
        expect(analysis.has8SectionAnatomy).toBe(true);
        expect(analysis.anatomySections.length).toBeGreaterThanOrEqual(6);
    });

    it('should detect second-person language', () => {
        const body = 'You should do this.\nYour code is good.';
        const analysis = analyzeBody(body);
        expect(analysis.hasSecondPerson).toBe(true);
    });

    it('should detect skill references', () => {
        const body = 'Use rd2:skill-name for this.\nOr use Skill(skill="test").';
        const analysis = analyzeBody(body);
        expect(analysis.referencesSkills).toBe(true);
    });

    it('should detect rules sections', () => {
        const body = "## Rules\n\n- Do this\n- Do that\n- Don't do this";
        const analysis = analyzeBody(body);
        expect(analysis.hasRules).toBe(true);
    });

    it('should detect output format', () => {
        const body = '## Output Format\n\nReturn this format.';
        const analysis = analyzeBody(body);
        expect(analysis.hasOutputFormat).toBe(true);
    });

    it('should handle empty body', () => {
        const analysis = analyzeBody('');
        expect(analysis.lineCount).toBe(1); // split('\n') always returns at least ['']
    });
});

describe('detectTemplateTier', () => {
    it('should detect minimal tier', () => {
        expect(detectTemplateTier('# Agent\n\nShort body.')).toBe('minimal');
    });

    it('should detect standard tier for longer body', () => {
        const body = Array.from({ length: 60 }, (_, i) => `Line ${i}`).join('\n');
        expect(detectTemplateTier(body)).toBe('standard');
    });

    it('should detect standard tier for multiple sections', () => {
        const body = '# Header\n\n## Section 1\n\nContent\n\n## Section 2\n\nMore';
        expect(detectTemplateTier(body)).toBe('standard');
    });

    it('should detect specialist tier for 8-section anatomy', () => {
        const body =
            '# 1. METADATA\n\nContent\n\n# 2. PERSONA\n\nContent\n\n# 3. PHILOSOPHY\n\nContent\n\n# 4. VERIFICATION\n\nContent\n\n# 5. COMPETENCIES\n\nContent\n\n# 6. PROCESS\n\nContent\n\n# 7. RULES\n\nContent\n\n# 8. OUTPUT FORMAT\n\nContent';
        expect(detectTemplateTier(body)).toBe('specialist');
    });

    it('should detect specialist tier for long body', () => {
        const body = Array.from({ length: 250 }, (_, i) => `Line ${i}`).join('\n');
        expect(detectTemplateTier(body)).toBe('specialist');
    });
});

describe('detectWeightProfile', () => {
    it('should detect thin-wrapper for short body', () => {
        expect(detectWeightProfile('Short body\nRules')).toBe('thin-wrapper');
    });

    it('should detect thin-wrapper for skill references', () => {
        const body = '# Agent\n\nUse rd2:skill-example for this task.';
        expect(detectWeightProfile(body)).toBe('thin-wrapper');
    });

    it('should detect specialist for specialist tier', () => {
        const body = Array.from({ length: 250 }, (_, i) => `Line ${i}`).join('\n');
        expect(detectWeightProfile(body)).toBe('specialist');
    });
});

describe('extractSection', () => {
    it('should extract section by name', () => {
        const body = '# Section 1\n\nContent 1\n\n## Section 2\n\nContent 2';
        const result = extractSection(body, 'Section 1');
        expect(result).toContain('Content 1');
    });

    it('should return null for non-existent section', () => {
        const body = '# Section 1\n\nContent';
        const result = extractSection(body, 'NonExistent');
        expect(result).toBeNull();
    });

    it('should handle numbered sections', () => {
        const body = '# 1. METADATA\n\nContent\n\n# 2. PERSONA\n\nPersona';
        const result = extractSection(body, 'METADATA');
        expect(result).toContain('Content');
    });
});

describe('extractAllSections', () => {
    it('should extract all sections', () => {
        const body = '# Section 1\n\nContent 1\n\n## Section 2\n\nContent 2\n\n# Section 3\n\nContent 3';
        const result = extractAllSections(body);
        expect(result.size).toBe(3);
        expect(result.get('Section 1')).toContain('Content 1');
        expect(result.get('Section 2')).toContain('Content 2');
    });

    it('should handle empty body', () => {
        const result = extractAllSections('');
        expect(result.size).toBe(0);
    });
});

describe('generateClaudeFrontmatter', () => {
    it('should generate frontmatter with all fields', () => {
        const agent: UniversalAgent = {
            name: 'test-agent',
            description: 'Test agent',
            body: 'body',
            tools: ['Read', 'Grep'],
            disallowedTools: ['Bash'],
            model: 'claude',
            maxTurns: 10,
            permissionMode: 'auto',
            skills: ['skill1'],
            mcpServers: ['server1'],
            hooks: { preToolUse: 'test' },
            memory: 'memory',
            background: true,
            isolation: 'worktree',
            color: 'blue',
        };
        const fm = generateClaudeFrontmatter(agent);
        expect(fm.name).toBe('test-agent');
        expect(fm.description).toBe('Test agent');
        expect(fm.tools).toEqual(['Read', 'Grep']);
        expect(fm.disallowedTools).toEqual(['Bash']);
        expect(fm.model).toBe('claude');
        expect(fm.maxTurns).toBe(10);
        expect(fm.permissionMode).toBe('auto');
        expect(fm.skills).toEqual(['skill1']);
        expect(fm.mcpServers).toEqual(['server1']);
        expect(fm.hooks).toEqual({ preToolUse: 'test' });
        expect(fm.memory).toBe('memory');
        expect(fm.background).toBe(true);
        expect(fm.isolation).toBe('worktree');
        expect(fm.color).toBe('blue');
    });

    it('should omit undefined fields', () => {
        const agent: UniversalAgent = {
            name: 'test',
            description: 'test',
            body: 'body',
        };
        const fm = generateClaudeFrontmatter(agent);
        expect(fm.tools).toBeUndefined();
        expect(fm.model).toBeUndefined();
    });
});

describe('generateAgentMarkdown', () => {
    it('should generate complete markdown', () => {
        const fm = { name: 'test', description: 'Test' };
        const result = generateAgentMarkdown(fm, '# Body');
        expect(result).toContain('---');
        expect(result).toContain('name:');
        expect(result).toContain('# Body');
    });
});

describe('normalizeAgentName', () => {
    it('should convert PascalCase', () => {
        expect(normalizeAgentName('MyAgent')).toBe('my-agent');
    });

    it('should convert camelCase', () => {
        expect(normalizeAgentName('myAgent')).toBe('my-agent');
    });

    it('should convert snake_case', () => {
        expect(normalizeAgentName('my_agent')).toBe('my-agent');
    });

    it('should convert spaces', () => {
        expect(normalizeAgentName('MY AGENT')).toBe('my-agent');
    });

    it('should handle already normalized names', () => {
        expect(normalizeAgentName('my-agent')).toBe('my-agent');
    });

    it('should handle consecutive hyphens', () => {
        expect(normalizeAgentName('my--agent')).toBe('my-agent');
    });

    it('should handle leading/trailing hyphens', () => {
        expect(normalizeAgentName('-my-agent-')).toBe('my-agent');
    });

    it('should remove special characters', () => {
        expect(normalizeAgentName('test@agent#')).toBe('testagent');
    });
});

describe('isValidAgentName', () => {
    it('should accept valid hyphen-case names', () => {
        expect(isValidAgentName('my-agent')).toBe(true);
        expect(isValidAgentName('code-reviewer')).toBe(true);
        expect(isValidAgentName('a1b')).toBe(true);
        expect(isValidAgentName('a123')).toBe(true);
    });

    it('should reject single character', () => {
        expect(isValidAgentName('a')).toBe(false);
    });

    it('should reject uppercase', () => {
        expect(isValidAgentName('My-Agent')).toBe(false);
    });

    it('should reject underscores', () => {
        expect(isValidAgentName('my_agent')).toBe(false);
    });

    it('should reject consecutive hyphens', () => {
        expect(isValidAgentName('my--agent')).toBe(false);
    });
});

describe('ANATOMY_SECTIONS', () => {
    it('should have all 8 sections', () => {
        expect(ANATOMY_SECTIONS).toContain('METADATA');
        expect(ANATOMY_SECTIONS).toContain('PERSONA');
        expect(ANATOMY_SECTIONS).toContain('PHILOSOPHY');
        expect(ANATOMY_SECTIONS).toContain('VERIFICATION');
        expect(ANATOMY_SECTIONS).toContain('COMPETENCIES');
        expect(ANATOMY_SECTIONS).toContain('PROCESS');
        expect(ANATOMY_SECTIONS).toContain('RULES');
        expect(ANATOMY_SECTIONS).toContain('OUTPUT');
    });
});
