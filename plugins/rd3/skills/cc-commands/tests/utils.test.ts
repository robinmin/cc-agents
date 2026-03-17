/**
 * Unit tests for rd3:cc-commands utils functions
 */

import { describe, expect, it } from 'bun:test';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SCRIPTS_DIR = join(__dirname, '..', 'scripts');

describe('Unit: utils functions', () => {
    it('should validate model values', async () => {
        const { isValidModel } = await import(join(SCRIPTS_DIR, 'utils.ts'));

        expect(isValidModel('sonnet')).toBe(true);
        expect(isValidModel('opus')).toBe(true);
        expect(isValidModel('haiku')).toBe(true);
        expect(isValidModel('invalid')).toBe(false);
        expect(isValidModel(123)).toBe(false);
    });

    it('should validate allowed-tools values', async () => {
        const { isValidAllowedTools } = await import(join(SCRIPTS_DIR, 'utils.ts'));

        expect(isValidAllowedTools('Read')).toBe(true);
        expect(isValidAllowedTools('Read,Write')).toBe(true);
        expect(isValidAllowedTools(['Read', 'Write'])).toBe(true);
        expect(isValidAllowedTools([123])).toBe(false);
        expect(isValidAllowedTools('')).toBe(false);
        expect(isValidAllowedTools(null)).toBe(false);
    });

    it('should validate descriptions', async () => {
        const { validateDescription } = await import(join(SCRIPTS_DIR, 'utils.ts'));

        const valid = validateDescription('A short description');
        expect(valid.valid).toBe(true);
        expect(valid.issues.length).toBe(0);

        const long = validateDescription('This is a very long description that definitely exceeds sixty characters');
        expect(long.issues.length).toBeGreaterThan(0);

        const empty = validateDescription('');
        expect(empty.valid).toBe(false);
        expect(empty.issues).toContain('Description is empty');

        const thisCommand = validateDescription('This command does something');
        expect(thisCommand.issues).toContain('Description should not start with "This command" -- start with a verb');
    });

    it('should normalize command names', async () => {
        const { normalizeCommandName } = await import(join(SCRIPTS_DIR, 'utils.ts'));

        expect(normalizeCommandName('test-command')).toBe('test-command');
        expect(normalizeCommandName('Test-Command')).toBe('test-command');
        expect(normalizeCommandName('TEST_COMMAND')).toBe('test-command');
    });

    it('should detect naming patterns', async () => {
        const { detectNamingPattern } = await import(join(SCRIPTS_DIR, 'utils.ts'));

        expect(detectNamingPattern('code-review')).toBe('noun-verb');
        expect(detectNamingPattern('review-code')).toBe('verb-noun');
        expect(detectNamingPattern('test')).toBe('unknown');
    });

    it('should check argument consistency', async () => {
        const { checkArgumentConsistency } = await import(join(SCRIPTS_DIR, 'utils.ts'));

        // No args
        const noArgs = checkArgumentConsistency(undefined, {
            lineCount: 1,
            hasPseudocode: false,
            pseudocodeConstructs: [],
            argumentRefs: [],
            usesPluginRoot: false,
            hasSecondPerson: false,
            sections: [],
        });
        expect(noArgs.length).toBe(0);

        // Consistent args
        const consistent = checkArgumentConsistency('$1 $2', {
            lineCount: 1,
            hasPseudocode: false,
            pseudocodeConstructs: [],
            argumentRefs: ['$1', '$2'],
            usesPluginRoot: false,
            hasSecondPerson: false,
            sections: [],
        });
        expect(consistent.length).toBe(0);

        // Inconsistent - arg hint but not used
        const unused = checkArgumentConsistency('$1', {
            lineCount: 1,
            hasPseudocode: false,
            pseudocodeConstructs: [],
            argumentRefs: [],
            usesPluginRoot: false,
            hasSecondPerson: false,
            sections: [],
        });
        expect(unused.length).toBeGreaterThan(0);

        // Inconsistent - arg used but not defined
        const usedUndef = checkArgumentConsistency(undefined, {
            lineCount: 1,
            hasPseudocode: false,
            pseudocodeConstructs: [],
            argumentRefs: ['$1'],
            usesPluginRoot: false,
            hasSecondPerson: false,
            sections: [],
        });
        expect(usedUndef.length).toBeGreaterThan(0);
    });

    it('should parse frontmatter', async () => {
        const { parseFrontmatter } = await import(join(SCRIPTS_DIR, 'utils.ts'));

        const result = parseFrontmatter(`---
description: Test command
model: sonnet
---`);
        expect(result.frontmatter?.description).toBe('Test command');
        expect(result.frontmatter?.model).toBe('sonnet');
    });

    it('should analyze body content', async () => {
        const { analyzeBody } = await import(join(SCRIPTS_DIR, 'utils.ts'));

        const result = analyzeBody(`# Test
Task(subagent_type="super-coder")
Use $ARGUMENTS here`);
        expect(result.lineCount).toBe(3);
        expect(result.hasPseudocode).toBe(true);
        expect(result.pseudocodeConstructs).toContain('Task()');
        expect(result.argumentRefs).toContain('$ARGUMENTS');
    });

    it('should handle content without frontmatter', async () => {
        const { parseFrontmatter } = await import(join(SCRIPTS_DIR, 'utils.ts'));

        const result = parseFrontmatter('# Just content');
        expect(result.frontmatter).toBeNull();
        expect(result.body).toBe('# Just content');
        expect(result.unknownFields).toEqual([]);
        expect(result.invalidFields).toEqual([]);
    });

    it('should handle invalid YAML in frontmatter', async () => {
        const { parseFrontmatter } = await import(join(SCRIPTS_DIR, 'utils.ts'));

        const result = parseFrontmatter(`---
invalid: yaml: content:
---`);
        expect(result.frontmatter).toBeNull();
    });

    it('should detect unknown and invalid fields', async () => {
        const { parseFrontmatter } = await import(join(SCRIPTS_DIR, 'utils.ts'));

        const result = parseFrontmatter(`---
description: Test
name: bad-field
unknown-field: value
---`);
        expect(result.frontmatter?.description).toBe('Test');
        expect(result.invalidFields).toContain('name');
        expect(result.unknownFields).toContain('unknown-field');
    });

    it('should handle parse errors gracefully', async () => {
        const { parseFrontmatter } = await import(join(SCRIPTS_DIR, 'utils.ts'));

        const result = parseFrontmatter(`---
description: Test
invalid yaml: : :
---`);
        expect(result.parseError).toBeDefined();
    });

    it('should handle non-object YAML parsing result', async () => {
        const { parseFrontmatter } = await import(join(SCRIPTS_DIR, 'utils.ts'));

        // YAML that parses to null or undefined
        const result = parseFrontmatter(`---
null
---`);
        expect(result.frontmatter).toBeNull();
    });

    it('should parse all frontmatter fields including disable-model-invocation', async () => {
        const { parseFrontmatter } = await import(join(SCRIPTS_DIR, 'utils.ts'));

        const result = parseFrontmatter(`---
description: Test command
model: sonnet
allowed-tools: Read,Write
argument-hint: $1
disable-model-invocation: true
---`);
        expect(result.frontmatter?.description).toBe('Test command');
        expect(result.frontmatter?.model).toBe('sonnet');
        expect(result.frontmatter?.['allowed-tools']).toBe('Read,Write');
        expect(result.frontmatter?.['argument-hint']).toBe('$1');
        expect(result.frontmatter?.['disable-model-invocation']).toBe(true);
    });
});
