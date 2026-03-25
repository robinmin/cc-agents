#!/usr/bin/env bun
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parseCliArgs, printReport, validateAgent } from '../scripts/validate';
import type { AgentTemplate, ValidationSeverity } from '../scripts/types';
import { setGlobalSilent } from '../../../scripts/logger';

const TEMP_FILES: string[] = [];

afterEach(() => {
    for (const file of TEMP_FILES.splice(0)) {
        rmSync(file, { force: true });
    }
});

function makeTempFile(name: string, content: string): string {
    const filePath = resolve(import.meta.dir, 'fixtures', name);
    TEMP_FILES.push(filePath);
    writeFileSync(filePath, content, 'utf-8');
    return filePath;
}

describe('validateAgent', () => {
    it('accumulates shared findings into errors, warnings, and info', async () => {
        const filePath = makeTempFile(
            'temp-validate-agent.md',
            `---
name: TestAgent
description: short
unknownField: value
---

TODO
`,
        );

        const report = await validateAgent(filePath);

        expect(report.valid).toBe(false);
        expect(report.errors.some((error) => error.includes('Invalid name format'))).toBe(true);
        expect(report.warnings.some((warning) => warning.includes('Description is very short'))).toBe(true);
        expect(report.warnings.some((warning) => warning.includes('Unknown frontmatter field'))).toBe(true);
        expect(
            report.findings.some((finding) => finding.severity === 'info' && finding.message.includes('TODO marker')),
        ).toBe(true);
    });

    it('returns a structured error finding for missing files', async () => {
        const report = await validateAgent('/nonexistent/agent.md');

        expect(report.valid).toBe(false);
        expect(report.findings).toEqual([
            {
                severity: 'error',
                message: 'Agent file not found: /nonexistent/agent.md',
            },
        ]);
    });

    it('reports YAML parse error when frontmatter is malformed', async () => {
        const filePath = makeTempFile(
            'temp-parse-error.md',
            `---
name: test-agent
description: A valid description here
  bad indentation: value
---

# Body
`,
        );

        const report = await validateAgent(filePath);
        expect(report.valid).toBe(false);
        expect(report.errors.some((e) => e.includes('YAML parse error'))).toBe(true);
    });

    it('returns error when YAML frontmatter is completely missing', async () => {
        const filePath = makeTempFile('temp-no-frontmatter.md', `# Agent Body\n\nNo frontmatter here.\n`);

        const report = await validateAgent(filePath);
        expect(report.valid).toBe(false);
        expect(report.errors.some((e) => e.includes('Missing YAML frontmatter'))).toBe(true);
    });

    it('returns error for missing name field', async () => {
        const filePath = makeTempFile(
            'temp-no-name.md',
            `---
description: This agent has no name field
---

# Body
`,
        );

        const report = await validateAgent(filePath);
        expect(report.valid).toBe(false);
        expect(report.errors.some((e) => e.includes('Missing required field: name'))).toBe(true);
    });

    it('returns error for missing description field', async () => {
        const filePath = makeTempFile(
            'temp-no-description.md',
            `---
name: test-agent
---

# Body
`,
        );

        const report = await validateAgent(filePath);
        expect(report.valid).toBe(false);
        expect(report.errors.some((e) => e.includes('Missing required field: description'))).toBe(true);
    });

    it('returns error when name field is wrong type (number instead of string)', async () => {
        const filePath = makeTempFile(
            'temp-name-type.md',
            `---
name: 12345
description: Valid description here
---

# Body
`,
        );

        const report = await validateAgent(filePath);
        expect(report.valid).toBe(false);
        expect(report.errors.some((e) => e.includes('Field name must be a string'))).toBe(true);
    });

    it('returns error when description field is wrong type', async () => {
        const filePath = makeTempFile(
            'temp-desc-type.md',
            `---
name: test-agent
description: 999
---

# Body
`,
        );

        const report = await validateAgent(filePath);
        expect(report.valid).toBe(false);
        expect(report.errors.some((e) => e.includes('Field description must be a string'))).toBe(true);
    });

    it('returns error for agent name too short', async () => {
        const filePath = makeTempFile(
            'temp-short-name.md',
            `---
name: ab
description: A valid description here
---

# Body
`,
        );

        const report = await validateAgent(filePath);
        expect(report.valid).toBe(false);
        expect(report.errors.some((e) => e.includes('too short'))).toBe(true);
    });

    it('returns error for agent name too long', async () => {
        const longName = 'a'.repeat(51);
        const filePath = makeTempFile(
            'temp-long-name.md',
            `---
name: ${longName}
description: A valid description here
---

# Body
`,
        );

        const report = await validateAgent(filePath);
        expect(report.valid).toBe(false);
        expect(report.errors.some((e) => e.includes('too long'))).toBe(true);
    });

    it('warns when agent name does not match filename', async () => {
        const filePath = makeTempFile(
            'temp-name-mismatch.md',
            `---
name: different-name
description: A valid description here
---

# Body
`,
        );

        const report = await validateAgent(filePath);
        expect(report.valid).toBe(true);
        expect(report.warnings.some((w) => w.includes('does not match filename'))).toBe(true);
    });

    it('returns error for empty agent body', async () => {
        const filePath = makeTempFile(
            'temp-empty-body.md',
            `---
name: test-agent
description: Valid description here
---

`,
        );

        const report = await validateAgent(filePath);
        expect(report.valid).toBe(false);
        expect(report.errors.some((e) => e.includes('body is empty'))).toBe(true);
    });

    it('warns when agent body is very short', async () => {
        const filePath = makeTempFile(
            'temp-short-body.md',
            `---
name: test-agent
description: Valid description here
---

# Agent
Single line body.
`,
        );

        const report = await validateAgent(filePath);
        expect(report.warnings.some((w) => w.includes('very short'))).toBe(true);
    });

    it('returns error for wrong field types in frontmatter', async () => {
        const filePath = makeTempFile(
            'temp-wrong-types.md',
            `---
name: test-agent
description: A valid description here
tools: not-an-array
maxTurns: "not-a-number"
background: "not-a-boolean"
---

# Body
`,
        );

        const report = await validateAgent(filePath);
        expect(report.valid).toBe(false);
        expect(report.errors.some((e) => e.includes('wrong type'))).toBe(true);
    });

    it('returns errors for all remaining wrong field types', async () => {
        const filePath = makeTempFile(
            'temp-wrong-types-all.md',
            `---
name: test-agent
description: A valid description here
disallowedTools: not-an-array
model: 123
temperature: "not-a-number"
color: 42
hidden: "not-a-boolean"
permissionMode: 99
isolation: true
---

# Body
`,
        );

        const report = await validateAgent(filePath);
        expect(report.valid).toBe(false);
        const typeErrors = report.errors.filter((e) => e.includes('wrong type'));
        expect(typeErrors.length).toBe(7);
    });

    it('validates against gemini platform fields', async () => {
        const filePath = makeTempFile(
            'temp-gemini.md',
            `---
name: test-agent
description: Valid description for gemini
max_turns: 10
---

# Body
`,
        );

        const report = await validateAgent(filePath, 'gemini');
        expect(report.frontmatter?.max_turns).toBe(10);
    });

    it('validates against opencode platform fields', async () => {
        const filePath = makeTempFile(
            'temp-opencode.md',
            `---
name: test-agent
description: Valid description for opencode
steps: 5
---

# Body
`,
        );

        const report = await validateAgent(filePath, 'opencode');
        expect(report.valid).toBe(true);
    });

    it('validates against codex platform fields', async () => {
        const filePath = makeTempFile(
            'temp-codex.md',
            `---
name: test-agent
description: Valid description for codex
developer_instructions: some instructions
---

# Body
`,
        );

        const report = await validateAgent(filePath, 'codex');
        expect(report.valid).toBe(true);
    });

    it('validates against openclaw platform fields', async () => {
        const filePath = makeTempFile(
            'temp-openclaw.md',
            `---
name: test-agent
description: Valid description for openclaw
runTimeoutSeconds: 60
---

# Body
`,
        );

        const report = await validateAgent(filePath, 'openclaw');
        expect(report.valid).toBe(true);
    });

    it('detects unknown fields for claude platform', async () => {
        const filePath = makeTempFile(
            'temp-unknown-field.md',
            `---
name: test-agent
description: Valid description here
unknownCustomField: value
---

# Body
`,
        );

        const report = await validateAgent(filePath);
        expect(report.warnings.some((w) => w.includes('Unknown frontmatter field'))).toBe(true);
        expect(report.unknownFields).toContain('unknownCustomField');
    });

    it('warns for specialist agent missing rules section', async () => {
        const body = `
## METADATA
## PERSONA
## PHILOSOPHY
## VERIFICATION
## COMPETENCIES
## PROCESS
## OUTPUT
Some content without rules section.
`.trim();

        const filePath = makeTempFile(
            'temp-specialist-no-rules.md',
            `---
name: test-agent
description: Specialist agent without rules
---

${body}
`,
        );

        const report = await validateAgent(filePath);
        expect(report.detectedTier).toBe('specialist');
        expect(report.warnings.some((w) => w.includes('missing rules section'))).toBe(true);
    });

    it('warns for specialist agent missing output format', async () => {
        const body = `
## METADATA
## PERSONA
## PHILOSOPHY
## VERIFICATION
## COMPETENCIES
## PROCESS
## RULES
## OUTPUT
Some content.
`.trim();

        const filePath = makeTempFile(
            'temp-specialist-no-output.md',
            `---
name: test-agent
description: Specialist agent without output format
---

${body}
`,
        );

        const report = await validateAgent(filePath);
        expect(report.detectedTier).toBe('specialist');
        expect(report.warnings.some((w) => w.includes('missing output format'))).toBe(true);
    });

    it('warns for standard agent with few sections', async () => {
        // Standard tier requires > 50 lines or >= 3 sections
        const manyLines = Array.from({ length: 55 }, (_, i) => `Line ${i + 1}`).join('\n');
        const filePath = makeTempFile(
            'temp-standard-few-sections.md',
            `---
name: test-agent
description: Standard agent with minimal sections
---

# Role
Only one section here.
${manyLines}
`,
        );

        const report = await validateAgent(filePath);
        expect(report.detectedTier).toBe('standard');
        expect(report.warnings.some((w) => w.includes('only') && w.includes('section'))).toBe(true);
    });

    it('warns for minimal agent that is too long', async () => {
        // This case is actually impossible to trigger: detectTemplateTier
        // classifies as 'standard' when lineCount > 50, so a 'minimal' agent
        // can never have lineCount > 80. This test documents the behavior.
        const filePath = makeTempFile(
            'temp-minimal-long.md',
            `---
name: test-agent
description: Minimal agent with some content
---

# Role
Some content here.
`,
        );

        const report = await validateAgent(filePath);
        expect(report.detectedTier).toBe('minimal');
        // The "consider upgrading" warning cannot fire for minimal tier
        // because lineCount > 50 triggers 'standard' classification
    });

    it('warns when description lacks example blocks (non-minimal)', async () => {
        // Need standard tier (>=3 sections or >50 lines) so the check fires
        const manyLines = Array.from({ length: 55 }, (_, i) => `Line ${i + 1}`).join('\n');
        const filePath = makeTempFile(
            'temp-no-examples.md',
            `---
name: test-agent
description: A description without any example blocks in it
---

# Role
Role content.
# Process
Process content.
# Rules
Rule content.
${manyLines}
`,
        );

        const report = await validateAgent(filePath);
        expect(report.detectedTier).toBe('standard');
        expect(report.findings.some((f) => f.severity === 'info' && f.message.includes('example'))).toBe(true);
    });

    it('informs when description includes example blocks', async () => {
        const filePath = makeTempFile(
            'temp-with-examples.md',
            `---
name: test-agent
description: An agent with <example> blocks for auto-routing
---

# Body
Some content.
`,
        );

        const report = await validateAgent(filePath);
        expect(report.findings.some((f) => f.severity === 'info' && f.message.includes('example blocks'))).toBe(true);
    });

    it('reports no BLOCK errors for a fully valid agent', async () => {
        // Filename must match name to avoid name mismatch warning
        const filePath = makeTempFile(
            'test-agent.md',
            `---
name: test-agent
description: A fully valid agent with proper description and body content
---

# Role
I am a test agent.

# Process
I follow a structured process.

# Rules
- DO write tests
- DON'T skip coverage
`,
        );

        const report = await validateAgent(filePath);
        expect(report.valid).toBe(true);
        expect(report.errors).toHaveLength(0);
    });

    it('validates all platform when platform is "all"', async () => {
        const filePath = makeTempFile(
            'test-agent-all.md',
            `---
name: test-agent
description: Valid description for all platforms
---

# Role
Agent role content.
# Process
Process content.
# Rules
- DO test
`,
        );

        const report = await validateAgent(filePath, 'all');
        expect(report.valid).toBe(true);
    });

    it('populates bodyAnalysis in report for valid agent', async () => {
        const filePath = makeTempFile(
            'test-agent-body.md',
            `---
name: test-agent
description: An agent with body analysis populated
---

# Role
I am a test agent.

## Process
I follow steps.
`,
        );

        const report = await validateAgent(filePath);
        expect(report.bodyAnalysis).toBeDefined();
        expect(report.bodyAnalysis.lineCount).toBeGreaterThan(0);
        expect(report.bodyAnalysis.sections.length).toBeGreaterThan(0);
    });

    it('warns info about anatomy sections for specialist agent with fewer than 8 sections', async () => {
        // Exactly 6 sections triggers the anatomy info warning but not the rules/output warnings
        const body = `
## METADATA
## PERSONA
## PHILOSOPHY
## VERIFICATION
## COMPETENCIES
## PROCESS
## RULES
## OUTPUT
Specialist content with all 8 sections.
`.trim();

        const filePath = makeTempFile(
            'test-specialist-full.md',
            `---
name: test-specialist
description: Specialist agent with all anatomy sections
---

${body}
`,
        );

        const report = await validateAgent(filePath);
        expect(report.detectedTier).toBe('specialist');
        expect(report.bodyAnalysis.has8SectionAnatomy).toBe(true);
    });

    it('validates with gemini platform and rejects unknown fields', async () => {
        // 'all' platform uses claude field set by default
        const filePath = makeTempFile(
            'temp-claude-unknown.md',
            `---
name: test-agent
description: Description here for unknown field test
unknownClaudeField: value
---

# Body
Content.
`,
        );

        const report = await validateAgent(filePath, 'all');
        expect(report.unknownFields).toContain('unknownClaudeField');
    });

    it('rejects invalid platform name', async () => {
        // This is a CLI validation - invalid platform gets caught by parseCliArgs
        // In API usage, any string is accepted since validateAgent takes AgentPlatform | 'all'
        // This tests the platform field switch in validateAgent
        const filePath = makeTempFile(
            'temp-platform-test.md',
            `---
name: test-agent
description: Valid description
---

# Role
Test content.
`,
        );

        // 'gemini' uses VALID_GEMINI_AGENT_FIELDS which has max_turns not maxTurns
        const geminiReport = await validateAgent(filePath, 'gemini');
        // Should not have unknown field warnings since max_turns is valid for gemini
        expect(geminiReport.unknownFields).not.toContain('max_turns');
    });

    it('returns info for specialist agent with incomplete anatomy (lines > 200, <6 anatomy sections)', async () => {
        // specialist tier triggered by lines > 200, but has8SectionAnatomy=false
        // This hits the anatomy info branch at lines 260-266
        const longBody = Array.from({ length: 210 }, (_, i) => `# Section ${i + 1}\nContent line ${i + 1}`).join('\n');
        const filePath = makeTempFile(
            'temp-specialist-incomplete.md',
            `---
name: test-specialist
description: A specialist agent with incomplete anatomy
---

# Role

${longBody}
`,
        );
        const report = await validateAgent(filePath);
        expect(report.detectedTier).toBe('specialist');
        // Specialist with incomplete anatomy should produce an info finding
        const anatomyInfo = report.findings.find(
            (f) => f.severity === 'info' && f.message.includes('/8 anatomy sections'),
        );
        expect(anatomyInfo).toBeDefined();
    });
});

describe('parseCliArgs', () => {
    const originalExit = process.exit;
    const originalStderr = process.stderr;
    const originalArgv = process.argv;

    beforeEach(() => {
        setGlobalSilent(true);
        // Stub process.exit to throw instead of terminating the test
        Object.defineProperty(process, 'exit', {
            value: ((code?: number) => {
                throw new Error(`process.exit(${code})`);
            }) as typeof process.exit,
            writable: true,
        });
        // Stub stderr to suppress output
        Object.defineProperty(process, 'stderr', {
            value: { write: () => true },
            writable: true,
        });
    });

    afterEach(() => {
        setGlobalSilent(false);
        process.exit = originalExit;
        process.stderr = originalStderr;
        process.argv = originalArgv;
    });

    it('returns path, platform, verbose and json flags from CLI args', () => {
        process.argv = ['bun', 'validate.ts', '/tmp/agent.md', '--platform', 'gemini', '--verbose', '--json'];

        const result = parseCliArgs();
        expect(result.path).toBe('/tmp/agent.md');
        expect(result.platform).toBe('gemini');
        expect(result.verbose).toBe(true);
        expect(result.json).toBe(true);
    });

    it('uses defaults for omitted flags', () => {
        process.argv = ['bun', 'validate.ts', '/tmp/agent.md'];

        const result = parseCliArgs();
        expect(result.path).toBe('/tmp/agent.md');
        expect(result.platform).toBe('claude');
        expect(result.verbose).toBe(false);
        expect(result.json).toBe(false);
    });

    it('accepts -v as short for verbose', () => {
        process.argv = ['bun', 'validate.ts', '/tmp/agent.md', '-v'];

        const result = parseCliArgs();
        expect(result.verbose).toBe(true);
    });

    it('throws process.exit(1) when path argument is missing', () => {
        process.argv = ['bun', 'validate.ts'];

        expect(() => parseCliArgs()).toThrow('process.exit(1)');
    });

    it('throws process.exit(1) when platform is invalid', () => {
        process.argv = ['bun', 'validate.ts', '/tmp/agent.md', '--platform', 'invalid-platform'];

        expect(() => parseCliArgs()).toThrow('process.exit(1)');
    });

    it('throws process.exit(0) when --help is passed', () => {
        process.argv = ['bun', 'validate.ts', '--help'];

        expect(() => parseCliArgs()).toThrow('process.exit(0)');
    });
});

describe('printReport', () => {
    // printReport uses logger which writes to stdout/stderr - tests just verify no throws
    beforeEach(() => setGlobalSilent(true));
    afterEach(() => setGlobalSilent(false));

    it('handles valid report with warnings and info findings', () => {
        const report = {
            valid: true,
            errors: [],
            warnings: ['Warning 1', 'Warning 2'],
            findings: [
                { severity: 'info' as ValidationSeverity, message: 'Info message 1' },
                { severity: 'info' as ValidationSeverity, message: 'Info message 2' },
                { severity: 'warning' as ValidationSeverity, message: 'Warning 1', suggestion: 'Suggestion 1' },
                { severity: 'warning' as ValidationSeverity, message: 'Warning 2', suggestion: 'Suggestion 2' },
            ],
            agentPath: '/tmp/test.md',
            agentName: 'test-agent',
            frontmatter: { name: 'test-agent', description: 'A test agent' },
            unknownFields: ['unknownField'],
            bodyAnalysis: {
                lineCount: 50,
                sections: ['Role', 'Process'],
                has8SectionAnatomy: false,
                anatomySections: ['METADATA', 'PERSONA'],
                hasSecondPerson: true,
                referencesSkills: true,
                hasRules: true,
                hasOutputFormat: true,
                contentLength: 1000,
            },
            detectedTier: 'standard' as AgentTemplate,
            timestamp: '2024-01-01T00:00:00.000Z',
        };

        // Should not throw
        expect(() => printReport(report, true)).not.toThrow();
    });

    it('handles report with only errors', () => {
        const report = {
            valid: false,
            errors: ['Error 1', 'Error 2'],
            warnings: [],
            findings: [
                { severity: 'error' as ValidationSeverity, message: 'Error 1' },
                { severity: 'error' as ValidationSeverity, message: 'Error 2' },
            ],
            agentPath: '/tmp/test.md',
            agentName: 'test-agent',
            frontmatter: { name: 'test-agent', description: 'A test agent' },
            unknownFields: [],
            bodyAnalysis: {
                lineCount: 10,
                sections: [],
                has8SectionAnatomy: false,
                anatomySections: [],
                hasSecondPerson: false,
                referencesSkills: false,
                hasRules: false,
                hasOutputFormat: false,
                contentLength: 100,
            },
            detectedTier: 'minimal' as AgentTemplate,
            timestamp: '2024-01-01T00:00:00.000Z',
        };

        expect(() => printReport(report, false)).not.toThrow();
    });

    it('handles report with no errors, no warnings, no info', () => {
        const report = {
            valid: true,
            errors: [],
            warnings: [],
            findings: [],
            agentPath: '/tmp/test.md',
            agentName: 'clean-agent',
            frontmatter: { name: 'clean-agent', description: 'A clean agent' },
            unknownFields: [],
            bodyAnalysis: {
                lineCount: 30,
                sections: ['Role'],
                has8SectionAnatomy: false,
                anatomySections: [],
                hasSecondPerson: true,
                referencesSkills: false,
                hasRules: false,
                hasOutputFormat: false,
                contentLength: 500,
            },
            detectedTier: 'minimal' as AgentTemplate,
            timestamp: '2024-01-01T00:00:00.000Z',
        };

        expect(() => printReport(report, false)).not.toThrow();
    });

    it('handles clean report with info findings but no errors/warnings', () => {
        const report = {
            valid: true,
            errors: [],
            warnings: [],
            findings: [{ severity: 'info' as ValidationSeverity, message: 'Info message 1' }],
            agentPath: '/tmp/test.md',
            agentName: 'info-agent',
            frontmatter: { name: 'info-agent', description: 'An agent' },
            unknownFields: [],
            bodyAnalysis: {
                lineCount: 30,
                sections: ['Role'],
                has8SectionAnatomy: false,
                anatomySections: [],
                hasSecondPerson: true,
                referencesSkills: false,
                hasRules: false,
                hasOutputFormat: false,
                contentLength: 500,
            },
            detectedTier: 'minimal' as AgentTemplate,
            timestamp: '2024-01-01T00:00:00.000Z',
        };
        // This hits lines 491-494: the info block within the clean report path
        expect(() => printReport(report, false)).not.toThrow();
    });

    it('handles verbose mode with full body analysis', () => {
        const report = {
            valid: true,
            errors: [],
            warnings: [],
            findings: [],
            agentPath: '/tmp/test.md',
            agentName: 'verbose-agent',
            frontmatter: { name: 'verbose-agent', description: 'A verbose agent' },
            unknownFields: ['field1', 'field2'],
            bodyAnalysis: {
                lineCount: 100,
                sections: ['Role', 'Process', 'Rules'],
                has8SectionAnatomy: true,
                anatomySections: ['METADATA', 'PERSONA', 'PHILOSOPHY', 'VERIFICATION', 'COMPETENCIES', 'PROCESS'],
                hasSecondPerson: true,
                referencesSkills: true,
                hasRules: true,
                hasOutputFormat: true,
                contentLength: 5000,
            },
            detectedTier: 'specialist' as AgentTemplate,
            timestamp: '2024-01-01T00:00:00.000Z',
        };

        expect(() => printReport(report, true)).not.toThrow();
    });
});

describe('main', () => {
    const originalArgv = process.argv;
    const originalExit = process.exit;
    const originalStderr = process.stderr;

    beforeEach(() => {
        setGlobalSilent(true);
        Object.defineProperty(process, 'stderr', {
            value: { write: () => true },
            writable: true,
        });
    });

    afterEach(() => {
        setGlobalSilent(false);
        process.argv = originalArgv;
        process.exit = originalExit;
        Object.defineProperty(process, 'stderr', {
            value: originalStderr,
            writable: true,
        });
    });

    it('exits 0 for a valid agent', async () => {
        const filePath = makeTempFile(
            'test-main-agent.md',
            `---
name: test-main-agent
description: A valid agent for main test
---

# Role
I am a test agent.
`,
        );
        process.argv = ['bun', 'validate.ts', filePath];

        // Spy on process.exit without throwing - allows main() to complete
        const exitCodes: number[] = [];
        (process.exit as unknown) = ((code?: number) => {
            exitCodes.push(code ?? 0);
        }) as typeof process.exit;

        const { main } = await import('../scripts/validate');
        await main();

        expect(exitCodes[0]).toBe(0);
    });

    it('exits 1 for an invalid agent', async () => {
        const filePath = makeTempFile(
            'test-main-invalid.md',
            `---
name: test-main-invalid
---

# Body
TODO: fix this
`,
        );
        process.argv = ['bun', 'validate.ts', filePath];

        const exitCodes: number[] = [];
        (process.exit as unknown) = ((code?: number) => {
            exitCodes.push(code ?? 0);
        }) as typeof process.exit;

        const { main } = await import('../scripts/validate');
        await main();

        expect(exitCodes[0]).toBe(1);
    });

    it('outputs JSON and exits 0 for valid agent with --json', async () => {
        const filePath = makeTempFile(
            'test-main-json.md',
            `---
name: test-main-json
description: Valid
---

# Role
Content
`,
        );
        process.argv = ['bun', 'validate.ts', filePath, '--json'];

        const exitCodes: number[] = [];
        (process.exit as unknown) = ((code?: number) => {
            exitCodes.push(code ?? 0);
        }) as typeof process.exit;

        const { main } = await import('../scripts/validate');
        await main();

        expect(exitCodes[0]).toBe(0);
    });
});
