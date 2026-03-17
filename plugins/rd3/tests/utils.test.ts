/**
 * Unit tests for rd3 utilities
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    ALLOWED_RESOURCE_TYPES,
    MAX_DESCRIPTION_LENGTH,
    MAX_SKILL_NAME_LENGTH,
    SKILL_FILE_NAME,
    type SkillFrontmatter,
    ensureDir,
    generateFrontmatter,
    getSkillMdPath,
    getSkillNameFromPath,
    isDirectory,
    isFile,
    isValidSkillName,
    listFiles,
    normalizeSkillName,
    parseFrontmatter,
    parseResourceTypes,
    pathExists,
    readFile,
    resolveSkillPath,
    titleCaseSkillName,
    validateFrontmatter,
    validateResourceTypes,
    writeFile,
} from '../scripts/utils';

const TEST_DIR = '/tmp/rd3-utils-test';

describe('String Utilities', () => {
    describe('normalizeSkillName', () => {
        it('should convert to lowercase', () => {
            expect(normalizeSkillName('MySkill')).toBe('myskill');
        });

        it('should replace spaces with hyphens', () => {
            expect(normalizeSkillName('my skill name')).toBe('my-skill-name');
        });

        it('should replace underscores with hyphens', () => {
            expect(normalizeSkillName('my_skill')).toBe('my-skill');
        });

        it('should remove special characters', () => {
            expect(normalizeSkillName('my_skill@123')).toBe('my-skill-123');
        });

        it('should trim leading/trailing hyphens', () => {
            expect(normalizeSkillName('-my-skill-')).toBe('my-skill');
        });

        it('should collapse multiple hyphens', () => {
            expect(normalizeSkillName('my--skill')).toBe('my-skill');
        });

        it('should handle empty string', () => {
            expect(normalizeSkillName('')).toBe('');
        });
    });

    describe('titleCaseSkillName', () => {
        it('should convert hyphenated to title case', () => {
            expect(titleCaseSkillName('my-skill-name')).toBe('My Skill Name');
        });

        it('should handle single word', () => {
            expect(titleCaseSkillName('skill')).toBe('Skill');
        });

        it('should handle empty string', () => {
            expect(titleCaseSkillName('')).toBe('');
        });
    });

    describe('isValidSkillName', () => {
        it('should accept valid name', () => {
            const result = isValidSkillName('my-skill');
            expect(result.valid).toBe(true);
        });

        it('should reject empty name', () => {
            const result = isValidSkillName('');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Skill name cannot be empty');
        });

        it('should reject name starting with number', () => {
            const result = isValidSkillName('123-skill');
            expect(result.valid).toBe(false);
        });

        it('should warn about normalization', () => {
            const result = isValidSkillName('My Skill');
            expect(result.warnings.length).toBeGreaterThan(0);
        });

        it('should reject name exceeding max length', () => {
            const longName = 'a'.repeat(MAX_SKILL_NAME_LENGTH + 1);
            const result = isValidSkillName(longName);
            expect(result.valid).toBe(false);
        });
    });
});

describe('File System Utilities', () => {
    beforeEach(() => {
        rmSync(TEST_DIR, { recursive: true, force: true });
    });

    afterEach(() => {
        rmSync(TEST_DIR, { recursive: true, force: true });
    });

    describe('ensureDir', () => {
        it('should create directory', () => {
            ensureDir(TEST_DIR);
            expect(existsSync(TEST_DIR)).toBe(true);
        });

        it('should not fail for existing directory', () => {
            mkdirSync(TEST_DIR, { recursive: true });
            expect(() => ensureDir(TEST_DIR)).not.toThrow();
        });
    });

    describe('pathExists', () => {
        it('should return true for existing path', () => {
            mkdirSync(TEST_DIR, { recursive: true });
            expect(pathExists(TEST_DIR)).toBe(true);
        });

        it('should return false for non-existing path', () => {
            expect(pathExists('/non/existent/path')).toBe(false);
        });
    });

    describe('readFile', () => {
        it('should read file content', () => {
            mkdirSync(TEST_DIR, { recursive: true });
            writeFileSync(join(TEST_DIR, 'test.txt'), 'hello world', 'utf-8');
            expect(readFile(join(TEST_DIR, 'test.txt'))).toBe('hello world');
        });
    });

    describe('writeFile', () => {
        it('should write file and create parent directories', () => {
            writeFile(join(TEST_DIR, 'subdir', 'test.txt'), 'content');
            expect(readFile(join(TEST_DIR, 'subdir', 'test.txt'))).toBe('content');
        });
    });

    describe('listFiles', () => {
        it('should list files in directory', () => {
            mkdirSync(TEST_DIR, { recursive: true });
            writeFileSync(join(TEST_DIR, 'file1.txt'), '', 'utf-8');
            writeFileSync(join(TEST_DIR, 'file2.txt'), '', 'utf-8');
            const files = listFiles(TEST_DIR);
            expect(files.length).toBe(2);
        });

        it('should filter files with pattern', () => {
            mkdirSync(TEST_DIR, { recursive: true });
            writeFileSync(join(TEST_DIR, 'file1.txt'), '', 'utf-8');
            writeFileSync(join(TEST_DIR, 'file2.md'), '', 'utf-8');
            const files = listFiles(TEST_DIR, /\.txt$/);
            expect(files.length).toBe(1);
            expect(files[0]).toBe('file1.txt');
        });

        it('should return empty array for non-existent directory', () => {
            expect(listFiles('/non/existent')).toEqual([]);
        });
    });

    describe('isDirectory', () => {
        it('should return true for directory', () => {
            mkdirSync(TEST_DIR, { recursive: true });
            expect(isDirectory(TEST_DIR)).toBe(true);
        });

        it('should return false for file', () => {
            mkdirSync(TEST_DIR, { recursive: true });
            writeFileSync(join(TEST_DIR, 'file.txt'), '', 'utf-8');
            expect(isDirectory(join(TEST_DIR, 'file.txt'))).toBe(false);
        });
    });

    describe('isFile', () => {
        it('should return true for file', () => {
            mkdirSync(TEST_DIR, { recursive: true });
            writeFileSync(join(TEST_DIR, 'file.txt'), '', 'utf-8');
            expect(isFile(join(TEST_DIR, 'file.txt'))).toBe(true);
        });

        it('should return false for directory', () => {
            mkdirSync(TEST_DIR, { recursive: true });
            expect(isFile(TEST_DIR)).toBe(false);
        });
    });
});

describe('YAML/Markdown Parsing', () => {
    describe('parseFrontmatter', () => {
        it('should parse valid frontmatter', () => {
            const content = `---
name: test-skill
description: A test skill
---

# Body content`;

            const result = parseFrontmatter(content);
            expect(result).not.toBeNull();
            expect(result?.frontmatter.name).toBe('test-skill');
            expect(result?.frontmatter.description).toBe('A test skill');
            expect(result?.body).toContain('Body content');
        });

        it('should return null for missing frontmatter', () => {
            const content = '# Just a header';
            expect(parseFrontmatter(content)).toBeNull();
        });

        it('should parse metadata', () => {
            const content = `---
name: test
description: test
metadata:
  author: John
---

body`;

            const result = parseFrontmatter(content);
            expect(result?.frontmatter.metadata).toBeDefined();
        });

        it('should parse quoted values', () => {
            const content = `---
name: test
description: "quoted description"
---

body`;

            const result = parseFrontmatter(content);
            expect(result?.frontmatter.description).toBe('quoted description');
        });
    });

    describe('generateFrontmatter', () => {
        it('should generate frontmatter string', () => {
            const fm: SkillFrontmatter = {
                name: 'test-skill',
                description: 'A test skill',
            };

            const result = generateFrontmatter(fm);
            expect(result).toContain('name: test-skill');
            expect(result).toContain('description: A test skill');
            expect(result).toContain('---');
        });

        it('should include metadata when present', () => {
            const fm: SkillFrontmatter = {
                name: 'test',
                description: 'test',
                metadata: { author: 'John' },
            };

            const result = generateFrontmatter(fm);
            expect(result).toContain('metadata:');
            expect(result).toContain('author: John');
        });
    });

    describe('validateFrontmatter', () => {
        it('should validate valid frontmatter', () => {
            const fm: SkillFrontmatter = {
                name: 'valid-skill',
                description: 'A valid skill',
            };

            const result = validateFrontmatter(fm);
            expect(result.valid).toBe(true);
        });

        it('should reject missing name', () => {
            const fm: SkillFrontmatter = {
                name: '',
                description: 'test',
            };

            const result = validateFrontmatter(fm);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain("Missing required field: 'name'");
        });

        it('should reject missing description', () => {
            const fm: SkillFrontmatter = {
                name: 'test',
                description: '',
            };

            const result = validateFrontmatter(fm);
            expect(result.valid).toBe(false);
        });

        it('should warn about long description', () => {
            const fm: SkillFrontmatter = {
                name: 'test',
                description: 'a'.repeat(MAX_DESCRIPTION_LENGTH + 1),
            };

            const result = validateFrontmatter(fm);
            expect(result.warnings.length).toBeGreaterThan(0);
        });

        it('should reject name that is too long', () => {
            const fm: SkillFrontmatter = {
                name: 'a'.repeat(100),
                description: 'test',
            };

            const result = validateFrontmatter(fm);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should reject invalid name format', () => {
            const fm: SkillFrontmatter = {
                name: 'Invalid-Name',
                description: 'test',
            };

            const result = validateFrontmatter(fm);
            expect(result.errors).toContain("'name' must be lowercase hyphen-case starting with a letter");
        });
    });

    describe('generateFrontmatter', () => {
        it('should generate basic frontmatter', () => {
            const fm: SkillFrontmatter = {
                name: 'test-skill',
                description: 'A test skill',
            };

            const result = generateFrontmatter(fm);
            expect(result).toContain('name: test-skill');
            expect(result).toContain('description: A test skill');
        });

        it('should include metadata in generated frontmatter', () => {
            const fm: SkillFrontmatter = {
                name: 'test-skill',
                description: 'A test skill',
                metadata: {
                    version: '1.0.0',
                    author: 'test',
                },
            };

            const result = generateFrontmatter(fm);
            expect(result).toContain('metadata:');
            expect(result).toContain('version: 1.0.0');
        });

        it('should quote strings with special characters', () => {
            const fm: SkillFrontmatter = {
                name: 'test-skill',
                description: 'A test: with #special chars and "quotes"',
            };

            const result = generateFrontmatter(fm);
            // Should contain quoted string
            expect(result).toMatch(/"[^"]*"/);
        });
    });
});

describe('Path Resolution', () => {
    describe('resolveSkillPath', () => {
        it('should resolve skill path', () => {
            const path = resolveSkillPath('my-skill', '/base');
            expect(path).toBe('/base/my-skill');
        });
    });

    describe('getSkillNameFromPath', () => {
        it('should extract skill name from path', () => {
            expect(getSkillNameFromPath('/path/to/my-skill')).toBe('my-skill');
        });
    });

    describe('getSkillMdPath', () => {
        it('should return path to SKILL.md', () => {
            expect(getSkillMdPath('/path/to/skill')).toBe('/path/to/skill/SKILL.md');
        });
    });
});

describe('Resource Handling', () => {
    describe('parseResourceTypes', () => {
        it('should parse valid resource types', () => {
            expect(parseResourceTypes('scripts,references')).toEqual(['scripts', 'references']);
        });

        it('should filter invalid types', () => {
            expect(parseResourceTypes('scripts,invalid,references')).toEqual(['scripts', 'references']);
        });

        it('should return empty array for empty input', () => {
            expect(parseResourceTypes('')).toEqual([]);
            expect(parseResourceTypes(undefined)).toEqual([]);
        });

        it('should remove duplicates', () => {
            expect(parseResourceTypes('scripts,scripts')).toEqual(['scripts']);
        });
    });

    describe('validateResourceTypes', () => {
        it('should validate valid types', () => {
            const result = validateResourceTypes('scripts,references');
            expect(result.valid).toBe(true);
        });

        it('should reject invalid types', () => {
            const result = validateResourceTypes('scripts,invalid');
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('Unknown resource type(s): invalid');
        });

        it('should accept empty input', () => {
            const result = validateResourceTypes('');
            expect(result.valid).toBe(true);
        });
    });
});

describe('Constants', () => {
    it('should have correct MAX_SKILL_NAME_LENGTH', () => {
        expect(MAX_SKILL_NAME_LENGTH).toBe(64);
    });

    it('should have correct MAX_DESCRIPTION_LENGTH', () => {
        expect(MAX_DESCRIPTION_LENGTH).toBe(1024);
    });

    it('should have correct ALLOWED_RESOURCE_TYPES', () => {
        expect(ALLOWED_RESOURCE_TYPES).toEqual(['scripts', 'references', 'assets']);
    });

    it('should have correct SKILL_FILE_NAME', () => {
        expect(SKILL_FILE_NAME).toBe('SKILL.md');
    });
});
