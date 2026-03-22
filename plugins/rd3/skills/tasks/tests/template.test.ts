import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderTemplate, loadTemplate, getTemplateVars } from '../scripts/lib/template';
import type { TemplateVars } from '../scripts/lib/template';

const defaultVars: TemplateVars = {
    WBS: '0001',
    PROMPT_NAME: 'Test',
    DESCRIPTION: '',
    CREATED_AT: '',
    UPDATED_AT: '',
    FOLDER: 'docs/tasks',
};

describe('renderTemplate', () => {
    test('substitutes WBS placeholder', () => {
        const vars: TemplateVars = { ...defaultVars, WBS: '0047' };
        const result = renderTemplate('Task {{ WBS }}', vars);
        expect(result).toContain('0047');
    });

    test('substitutes PROMPT_NAME placeholder', () => {
        const vars: TemplateVars = { ...defaultVars, PROMPT_NAME: 'My Task' };
        const result = renderTemplate('Task {{ PROMPT_NAME }}', vars);
        expect(result).toContain('My Task');
    });

    test('substitutes multiple placeholders', () => {
        const vars: TemplateVars = { ...defaultVars, WBS: '0047', PROMPT_NAME: 'Test Task' };
        const result = renderTemplate('{{ WBS }}. {{ PROMPT_NAME }}', vars);
        expect(result).toBe('0047. Test Task');
    });

    test('leaves non-placeholder text unchanged', () => {
        const result = renderTemplate('### Background\n\nThis is a static task.', defaultVars);
        expect(result).toBe('### Background\n\nThis is a static task.');
    });

    test('removes unknown placeholders', () => {
        const vars: TemplateVars = { ...defaultVars, WBS: '0047' };
        const result = renderTemplate('Task {{ WBS }} - {{ UNKNOWN }}', vars);
        expect(result).toBe('Task 0047 - ');
    });

    test('substitutes FOLDER placeholder', () => {
        const vars: TemplateVars = { ...defaultVars, FOLDER: 'docs/tasks' };
        const result = renderTemplate('Folder: {{ FOLDER }}', vars);
        expect(result).toContain('docs/tasks');
    });

    test('substitutes DESCRIPTION placeholder', () => {
        const vars: TemplateVars = { ...defaultVars, DESCRIPTION: 'A test description' };
        const result = renderTemplate('Desc: {{ DESCRIPTION }}', vars);
        expect(result).toContain('A test description');
    });

    test('handles empty strings', () => {
        const vars: TemplateVars = {
            WBS: '',
            PROMPT_NAME: '',
            DESCRIPTION: '',
            CREATED_AT: '',
            UPDATED_AT: '',
            FOLDER: '',
        };
        const result = renderTemplate('Task {{ WBS }}', vars);
        expect(result).toBe('Task ');
    });

    test('substitutes CREATED_AT placeholder', () => {
        const vars: TemplateVars = { ...defaultVars, CREATED_AT: '2026-03-21T10:00:00.000Z' };
        const result = renderTemplate('Created: {{ CREATED_AT }}', vars);
        expect(result).toContain('2026-03-21T10:00:00.000Z');
    });

    test('substitutes UPDATED_AT placeholder', () => {
        const vars: TemplateVars = { ...defaultVars, UPDATED_AT: '2026-03-21T12:00:00.000Z' };
        const result = renderTemplate('Updated: {{ UPDATED_AT }}', vars);
        expect(result).toContain('2026-03-21T12:00:00.000Z');
    });

    test('substitutes all placeholders in full template', () => {
        const vars: TemplateVars = {
            WBS: '0047',
            PROMPT_NAME: 'My Task',
            DESCRIPTION: 'A description',
            CREATED_AT: '2026-03-21T10:00:00.000Z',
            UPDATED_AT: '2026-03-21T11:00:00.000Z',
            FOLDER: 'docs/tasks',
        };
        const result = renderTemplate(
            'WBS: {{ WBS }}\nName: {{ PROMPT_NAME }}\nDesc: {{ DESCRIPTION }}\nCreated: {{ CREATED_AT }}\nUpdated: {{ UPDATED_AT }}\nFolder: {{ FOLDER }}',
            vars,
        );
        expect(result).toContain('0047');
        expect(result).toContain('My Task');
        expect(result).toContain('A description');
        expect(result).toContain('2026-03-21T10:00:00.000Z');
        expect(result).toContain('2026-03-21T11:00:00.000Z');
        expect(result).toContain('docs/tasks');
    });
});

describe('loadTemplate', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `template-load-test-${Date.now()}`);

    beforeEach(() => {
        mkdirSync(tempDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    test('loads existing template file', () => {
        const templatePath = join(tempDir, 'template.md');
        writeFileSync(templatePath, 'Task {{ WBS }}: {{ PROMPT_NAME }}');
        const content = loadTemplate(templatePath);
        expect(content).toBe('Task {{ WBS }}: {{ PROMPT_NAME }}');
    });

    test('returns null for non-existent path', () => {
        const content = loadTemplate(join(tempDir, 'nonexistent.md'));
        expect(content).toBeNull();
    });
});

describe('getTemplateVars', () => {
    test('returns TemplateVars with all fields', () => {
        const vars = getTemplateVars('My Task', '0047', 'docs/tasks', 'A description');
        expect(vars.WBS).toBe('0047');
        expect(vars.PROMPT_NAME).toBe('My Task');
        expect(vars.DESCRIPTION).toBe('A description');
        expect(vars.FOLDER).toBe('docs/tasks');
        expect(vars.CREATED_AT).toBeTruthy();
        expect(vars.UPDATED_AT).toBeTruthy();
    });

    test('defaults description to empty string', () => {
        const vars = getTemplateVars('My Task', '0047', 'docs/tasks');
        expect(vars.DESCRIPTION).toBe('');
    });

    test('CREATED_AT and UPDATED_AT are ISO strings', () => {
        const vars = getTemplateVars('My Task', '0047', 'docs/tasks');
        // Should be valid ISO date strings
        expect(() => new Date(vars.CREATED_AT)).not.toThrow();
        expect(() => new Date(vars.UPDATED_AT)).not.toThrow();
    });
});
