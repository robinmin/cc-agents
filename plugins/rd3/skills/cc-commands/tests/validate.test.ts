#!/usr/bin/env bun
import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFileSync, unlinkSync } from 'node:fs';

import { parseCommand } from '../scripts/utils';
import { validateCommand, validateCommandFile, parseCliArgs, printReport } from '../scripts/validate';
import type { CommandValidationReport } from '../scripts/types';
import type { ValidationSeverity } from '../scripts/types';
import { setGlobalSilent } from '../../../scripts/logger';

// ============================================================================
// Helper: make temp command file
// ============================================================================

function makeTempCommandFile(name: string, content: string): string {
    const path = join(tmpdir(), name);
    writeFileSync(path, content, 'utf-8');
    return path;
}

// ============================================================================
// validateCommand tests
// ============================================================================

describe('validateCommand', () => {
    // ---- Frontmatter presence / YAML parse error ----

    it('returns error when frontmatter YAML is invalid', () => {
        // Raw starts with --- but YAML parse fails (unclosed bracket)
        const command = parseCommand(
            '/test/invalid-yaml.md',
            `---
invalid: [[[
---

# Body
`,
        );

        const report = validateCommand(command);
        expect(report.valid).toBe(false);
        expect(report.errors.some((e) => e.includes('Frontmatter YAML syntax is invalid'))).toBe(true);
    });

    it('allows missing frontmatter (no YAML delimiters)', () => {
        const command = parseCommand('/test/no-frontmatter.md', `# Command\n\nImperative body here.`);
        const report = validateCommand(command);
        // No frontmatter errors - all fields are optional
        expect(report.errors).toHaveLength(0);
    });

    // ---- Invalid and unknown fields ----

    it('returns error for invalid fields (name, tools, arguments)', () => {
        const command = parseCommand(
            '/test/invalid-fields.md',
            `---
description: Test command
name: bad-field
tools: Read
arguments: <path>
---

Body
`,
        );

        const report = validateCommand(command);
        expect(report.valid).toBe(false);
        expect(report.errors.some((e) => e.includes("Invalid frontmatter field: 'name'"))).toBe(true);
        expect(report.errors.some((e) => e.includes("Invalid frontmatter field: 'tools'"))).toBe(true);
        expect(report.errors.some((e) => e.includes("Invalid frontmatter field: 'arguments'"))).toBe(true);
    });

    it('returns error for unknown fields (not in valid or invalid sets)', () => {
        const command = parseCommand(
            '/test/unknown-fields.md',
            `---
description: Test command
custom-field: value
another-unknown: 123
---

Body
`,
        );

        const report = validateCommand(command);
        expect(report.valid).toBe(false);
        expect(report.errors.some((e) => e.includes("Unknown frontmatter field: 'custom-field'"))).toBe(true);
        expect(report.errors.some((e) => e.includes("Unknown frontmatter field: 'another-unknown'"))).toBe(true);
    });

    it('tracks invalidFields in report', () => {
        const command = parseCommand(
            '/test/invalid-track.md',
            `---
description: Test
name: bad
---

Body
`,
        );

        const report = validateCommand(command);
        expect(report.invalidFields).toContain('name');
    });

    // ---- Field format: description ----

    it('returns error when description is not a string', () => {
        // This requires direct Command object manipulation since parseFrontmatter would coerce
        const command = parseCommand('/test/desc-type.md', `---\ndescription:\n  - list\n---\n\nBody\n`);
        const report = validateCommand(command);
        expect(report.errors.some((e) => e.includes('description must be a string'))).toBe(true);
    });

    it('returns error when description is not a string (null from YAML)', () => {
        // YAML `description:` parses as null, not empty string
        const command = parseCommand('/test/null-desc.md', `---\ndescription:\n---\n\nBody\n`);
        const report = validateCommand(command);
        expect(report.errors.some((e) => e.includes('description must be a string'))).toBe(true);
    });

    it('returns warning when description is too long (>60 chars)', () => {
        const longDesc = 'a'.repeat(70);
        const command = parseCommand('/test/long-desc.md', `---\ndescription: ${longDesc}\n---\n\nBody\n`);
        const report = validateCommand(command);
        expect(report.warnings.some((w) => w.includes('Description is 70 chars'))).toBe(true);
    });

    it('returns warning when description does not start with letter', () => {
        const command = parseCommand('/test/bad-start.md', `---\ndescription: 123 starts with number\n---\n\nBody\n`);
        const report = validateCommand(command);
        expect(report.warnings.some((w) => w.includes('should start with a letter'))).toBe(true);
    });

    it('returns warning when description starts with "This command"', () => {
        const command = parseCommand('/test/this-command.md', `---\ndescription: This command does X\n---\n\nBody\n`);
        const report = validateCommand(command);
        expect(report.warnings.some((w) => w.includes('should not start with "This command"'))).toBe(true);
    });

    // ---- Field format: model ----

    it('returns error for invalid model value', () => {
        const command = parseCommand('/test/bad-model.md', `---\nmodel: gpt-5\n---\n\nBody\n`);
        const report = validateCommand(command);
        expect(report.errors.some((e) => e.includes("Invalid model value: 'gpt-5'"))).toBe(true);
        expect(report.errors.some((e) => e.includes('sonnet, opus, haiku'))).toBe(true);
    });

    it('accepts valid model values (sonnet, opus, haiku)', () => {
        for (const model of ['sonnet', 'opus', 'haiku']) {
            const command = parseCommand(`/test/model-${model}.md`, `---\nmodel: ${model}\n---\n\nBody\n`);
            const report = validateCommand(command);
            const modelErrors = report.errors.filter((e) => e.includes('model'));
            expect(modelErrors).toHaveLength(0);
        }
    });

    // ---- Field format: allowed-tools ----

    it('returns error when allowed-tools is empty string', () => {
        const command = parseCommand('/test/empty-tools.md', `---\nallowed-tools:\n---\n\nBody\n`);
        const report = validateCommand(command);
        expect(report.errors.some((e) => e.includes('allowed-tools must be a non-empty string or array'))).toBe(true);
    });

    it('accepts empty allowed-tools array (every() on empty array returns true)', () => {
        // Note: isValidAllowedTools([]) returns true because [].every() is true vacuously
        const command = parseCommand('/test/empty-tools-array.md', `---\nallowed-tools: []\n---\n\nBody\n`);
        const report = validateCommand(command);
        const toolErrors = report.errors.filter((e) => e.includes('allowed-tools'));
        expect(toolErrors).toHaveLength(0);
    });

    it('accepts valid allowed-tools string', () => {
        const command = parseCommand('/test/valid-tools.md', `---\nallowed-tools: Read\n---\n\nBody\n`);
        const report = validateCommand(command);
        const toolErrors = report.errors.filter((e) => e.includes('allowed-tools'));
        expect(toolErrors).toHaveLength(0);
    });

    it('accepts valid allowed-tools array', () => {
        const command = parseCommand(
            '/test/valid-tools-array.md',
            `---\nallowed-tools:\n  - Read\n  - Write\n---\n\nBody\n`,
        );
        const report = validateCommand(command);
        const toolErrors = report.errors.filter((e) => e.includes('allowed-tools'));
        expect(toolErrors).toHaveLength(0);
    });

    // ---- Field format: argument-hint ----

    it('returns error when argument-hint is not a string', () => {
        const command = parseCommand('/test/bad-arg-hint.md', `---\nargument-hint:\n  - item\n---\n\nBody\n`);
        const report = validateCommand(command);
        expect(report.errors.some((e) => e.includes('argument-hint must be a string'))).toBe(true);
    });

    it('returns warning when argument-hint is empty string', () => {
        const command = parseCommand('/test/empty-arg-hint.md', `---\nargument-hint: "   "\n---\n\nBody\n`);
        const report = validateCommand(command);
        expect(report.warnings.some((w) => w.includes('argument-hint is empty'))).toBe(true);
    });

    // ---- Field format: disable-model-invocation ----

    it('returns error when disable-model-invocation is not boolean', () => {
        const command = parseCommand('/test/bad-disable.md', `---\ndisable-model-invocation: yes\n---\n\nBody\n`);
        const report = validateCommand(command);
        expect(report.errors.some((e) => e.includes('disable-model-invocation must be a boolean'))).toBe(true);
    });

    // ---- Body content: empty body ----

    it('returns error when body is empty', () => {
        const command = parseCommand('/test/empty-body.md', `---\ndescription: Test\n---\n\n   \n`);
        const report = validateCommand(command);
        expect(report.errors.some((e) => e.includes('Command body is empty'))).toBe(true);
    });

    // ---- Body content: long body (>150 lines) ----

    it('returns warning when body is over 150 lines', () => {
        const lines = Array.from({ length: 160 }, (_, i) => `Line ${i + 1}`).join('\n');
        const command = parseCommand('/test/long-body.md', `---\ndescription: Test\n---\n\n${lines}\n`);
        const report = validateCommand(command);
        expect(report.warnings.some((w) => w.includes('160 lines'))).toBe(true);
    });

    // ---- Body content: second-person language ----

    it('returns warning when body uses second-person language', () => {
        const command = parseCommand(
            '/test/second-person.md',
            `---
description: Test
---

You should review the code and check your work.
`,
        );
        const report = validateCommand(command);
        expect(report.warnings.some((w) => w.includes('second-person language'))).toBe(true);
    });

    // ---- Body content: TODO markers ----

    it('returns warning when body contains TODO markers', () => {
        const command = parseCommand(
            '/test/todo-body.md',
            `---
description: Test
---

# Body
TODO: implement this
Another TODO here
`,
        );
        const report = validateCommand(command);
        expect(report.warnings.some((w) => w.includes('TODO marker(s)'))).toBe(true);
    });

    // ---- Argument consistency ----

    it('warns when body uses arguments but no argument-hint defined', () => {
        const command = parseCommand(
            '/test/missing-arg-hint.md',
            `---
description: Test
---

Use $ARGUMENTS to specify the path.
`,
        );
        const report = validateCommand(command);
        expect(
            report.warnings.some((w) => w.includes('argument-hint is defined but no argument references found')),
        ).toBe(false);
        expect(report.warnings.some((w) => w.includes('no argument-hint is defined'))).toBe(true);
    });

    it('warns when argument-hint is defined but body has no argument refs', () => {
        const command = parseCommand(
            '/test/extra-arg-hint.md',
            `---
description: Test
argument-hint: <path>
---

Imperative body without any arguments.
`,
        );
        const report = validateCommand(command);
        expect(
            report.warnings.some((w) => w.includes('argument-hint "<path>" is defined but no argument references')),
        ).toBe(true);
    });

    // ---- Valid command ----

    it('returns valid for well-formed command', () => {
        const command = parseCommand(
            '/test/good-command.md',
            `---
description: Review code changes
model: sonnet
allowed-tools:
  - Read
  - Write
---

Imperative body that uses $ARGUMENTS correctly.
`,
        );
        const report = validateCommand(command);
        expect(report.valid).toBe(true);
        expect(report.errors).toHaveLength(0);
    });
});

// ============================================================================
// validateCommandFile tests
// ============================================================================

describe('validateCommandFile', () => {
    it('returns error when file does not exist', async () => {
        const report = await validateCommandFile('/nonexistent/path/command.md');
        expect(report.valid).toBe(false);
        expect(report.errors[0]).toInclude('Command file not found');
        expect(report.commandName).toBe('unknown');
    });

    it('validates a valid command file from disk', async () => {
        const path = makeTempCommandFile(
            'valid-command-test.md',
            `---
description: A valid command
model: haiku
---

Imperative body here.
`,
        );
        try {
            const report = await validateCommandFile(path);
            expect(report.valid).toBe(true);
            expect(report.commandName).toBe('valid-command-test');
            expect(report.frontmatter?.description).toBe('A valid command');
            expect(report.frontmatter?.model).toBe('haiku');
        } finally {
            unlinkSync(path);
        }
    });

    it('returns errors for invalid command file from disk', async () => {
        const path = makeTempCommandFile(
            'invalid-command-test.md',
            `---
description: Bad command
name: wrong-field
---

You should use your arguments.
`,
        );
        try {
            const report = await validateCommandFile(path);
            expect(report.valid).toBe(false);
            expect(report.errors.some((e) => e.includes("Invalid frontmatter field: 'name'"))).toBe(true);
            expect(report.warnings.some((w) => w.includes('second-person language'))).toBe(true);
        } finally {
            unlinkSync(path);
        }
    });
});

// ============================================================================
// parseCliArgs tests
// ============================================================================

describe('parseCliArgs', () => {
    let originalArgv: string[];
    let originalExit: typeof process.exit;

    beforeEach(() => {
        originalArgv = process.argv;
        originalExit = process.exit;
        setGlobalSilent(true);
        Object.defineProperty(process, 'stderr', {
            value: { write: () => true },
            writable: true,
        });
    });

    afterEach(() => {
        setGlobalSilent(false);
        process.argv = originalArgv;
        (process.exit as unknown) = originalExit;
        Object.defineProperty(process, 'stderr', {
            value: { write: (data: string) => process.stderr.write(data) },
            writable: true,
        });
    });

    it('throws when no path argument provided', () => {
        process.argv = ['node', 'validate.ts'];
        (process.exit as unknown) = ((code?: number) => {
            throw new Error(`process.exit(${code})`);
        }) as typeof process.exit;
        expect(() => parseCliArgs()).toThrow();
    });

    it('returns help and exits when --help is provided', () => {
        process.argv = ['node', 'validate.ts', '--help'];
        (process.exit as unknown) = ((_code?: number) => {
            throw new Error(`process.exit(0)`);
        }) as typeof process.exit;
        try {
            parseCliArgs();
        } catch (e: unknown) {
            const err = e as Error;
            expect(err.message).toContain('process.exit(0)');
        }
    });

    it('returns parsed args with path and defaults', () => {
        process.argv = ['node', 'validate.ts', '/some/path.md'];
        const result = parseCliArgs();
        expect(result.path).toBe('/some/path.md');
        expect(result.verbose).toBe(false);
        expect(result.json).toBe(false);
    });

    it('parses --verbose flag', () => {
        process.argv = ['node', 'validate.ts', '/some/path.md', '--verbose'];
        const result = parseCliArgs();
        expect(result.verbose).toBe(true);
    });

    it('parses --json flag', () => {
        process.argv = ['node', 'validate.ts', '/some/path.md', '--json'];
        const result = parseCliArgs();
        expect(result.json).toBe(true);
    });

    it('parses -v short flag', () => {
        process.argv = ['node', 'validate.ts', '/some/path.md', '-v'];
        const result = parseCliArgs();
        expect(result.verbose).toBe(true);
    });
});

// ============================================================================
// printReport tests
// ============================================================================

describe('printReport', () => {
    beforeEach(() => setGlobalSilent(true));
    afterEach(() => setGlobalSilent(false));

    it('handles clean report (no errors, no warnings)', () => {
        const report: CommandValidationReport = {
            valid: true,
            errors: [],
            warnings: [],
            findings: [],
            commandPath: '/tmp/test.md',
            commandName: 'clean-command',
            frontmatter: { description: 'A clean command' },
            invalidFields: [],
            bodyAnalysis: {
                lineCount: 10,
                hasPseudocode: false,
                pseudocodeConstructs: [],
                argumentRefs: [],
                usesPluginRoot: false,
                hasSecondPerson: false,
                sections: ['Usage'],
            },
            timestamp: '2024-01-01T00:00:00.000Z',
        };
        expect(() => printReport(report, false)).not.toThrow();
    });

    it('handles report with only errors', () => {
        const report: CommandValidationReport = {
            valid: false,
            errors: ['Error 1', 'Error 2'],
            warnings: [],
            findings: [
                { severity: 'error' as ValidationSeverity, message: 'Error 1' },
                { severity: 'error' as ValidationSeverity, message: 'Error 2' },
            ],
            commandPath: '/tmp/test.md',
            commandName: 'error-command',
            frontmatter: null,
            invalidFields: ['name'],
            bodyAnalysis: {
                lineCount: 5,
                hasPseudocode: false,
                pseudocodeConstructs: [],
                argumentRefs: [],
                usesPluginRoot: false,
                hasSecondPerson: false,
                sections: [],
            },
            timestamp: '2024-01-01T00:00:00.000Z',
        };
        expect(() => printReport(report, false)).not.toThrow();
    });

    it('handles report with only warnings', () => {
        const report: CommandValidationReport = {
            valid: true,
            errors: [],
            warnings: ['Warning 1', 'Warning 2'],
            findings: [
                { severity: 'warning' as ValidationSeverity, message: 'Warning 1' },
                { severity: 'warning' as ValidationSeverity, message: 'Warning 2' },
            ],
            commandPath: '/tmp/test.md',
            commandName: 'warn-command',
            frontmatter: null,
            invalidFields: [],
            bodyAnalysis: {
                lineCount: 50,
                hasPseudocode: true,
                pseudocodeConstructs: ['Task()'],
                argumentRefs: ['$ARGUMENTS'],
                usesPluginRoot: true,
                hasSecondPerson: true,
                sections: ['Usage', 'Examples'],
            },
            timestamp: '2024-01-01T00:00:00.000Z',
        };
        expect(() => printReport(report, false)).not.toThrow();
    });

    it('handles verbose mode with full body analysis', () => {
        const report: CommandValidationReport = {
            valid: true,
            errors: [],
            warnings: ['Some warning for verbose mode'],
            findings: [{ severity: 'warning' as ValidationSeverity, message: 'Some warning for verbose mode' }],
            commandPath: '/tmp/verbose.md',
            commandName: 'verbose-command',
            frontmatter: {
                description: 'A verbose command',
                model: 'sonnet',
                'allowed-tools': ['Read', 'Write'],
                'argument-hint': '<path>',
            },
            invalidFields: ['field1', 'field2'],
            bodyAnalysis: {
                lineCount: 100,
                hasPseudocode: true,
                pseudocodeConstructs: ['Task()', 'Skill()'],
                argumentRefs: ['$ARGUMENTS', '$1'],
                usesPluginRoot: true,
                hasSecondPerson: true,
                sections: ['Usage', 'Examples', 'Tips'],
            },
            timestamp: '2024-01-01T00:00:00.000Z',
        };
        expect(() => printReport(report, true)).not.toThrow();
    });
});
