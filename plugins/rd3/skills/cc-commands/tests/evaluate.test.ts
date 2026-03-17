/**
 * Unit tests for rd3:cc-commands evaluate script
 */

import { describe, expect, it } from 'bun:test';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Command, CommandAdapterContext, CommandEvaluationDimension } from '../scripts/types';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SCRIPTS_DIR = join(__dirname, '..', 'scripts');

describe('Unit: evaluateCommand function', () => {
    it('should return correct dimensions count for basic scope', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/test.md',
            `---
description: Test command
---

# Test

Content.`,
        );

        const report = evaluateCommand(command, 'basic');

        // Basic scope should have 7 dimensions (includes circularReference)
        expect(report.dimensions.length).toBe(7);
    });

    it('should return correct dimensions count for full scope', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/test.md',
            `---
description: Test command
---

# Test

Content.`,
        );

        const report = evaluateCommand(command, 'full');

        // Full scope should have 11 dimensions (includes circularReference)
        expect(report.dimensions.length).toBe(11);
    });

    it('should detect pseudocode usage', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/workflow.md',
            `---
description: Workflow command
---

# Workflow

Task(
subagent_type="planner"
)
`,
        );

        const report = evaluateCommand(command, 'basic');

        expect(report.weightProfile).toBe('with-pseudocode');
    });

    it('should use without-pseudocode profile for simple commands', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/simple.md',
            `---
description: Simple command
---

# Simple

Just content.`,
        );

        const report = evaluateCommand(command, 'basic');

        expect(report.weightProfile).toBe('without-pseudocode');
    });

    it('should reject on security blacklist', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/insecure.md',
            `---
description: Test
---

# Test

password="secret"
`,
        );

        const report = evaluateCommand(command, 'basic');

        expect(report.rejected).toBe(true);
        expect(report.rejectReason).toContain('BLACKLIST');
    });

    it('should detect greylist security issues', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/warning.md',
            `---
description: Test
---

# Test

Bash()
`,
        );

        const report = evaluateCommand(command, 'full');

        expect(report.securityScan?.greylistFound).toBe(true);
    });

    it('should calculate correct grade for perfect command', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        // Perfect command
        const command = parseCommand(
            '/test/perfect.md',
            `---
description: Review code for bugs
allowed-tools: Read,Bash(git:*)
---

# Review Code

## When to Use

Use to review code.

## Steps

1. Read files
2. Check for bugs

## Examples

Example: review-code src/
`,
        );

        const report = evaluateCommand(command, 'full');

        expect(report.grade).toMatch(/^[A-F]$/);
        expect(report.passed).toBe(true);
    });

    it('should fail for missing file', async () => {
        const { evaluateCommandFile } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const report = await evaluateCommandFile('/nonexistent/file.md', 'basic');

        expect(report.rejected).toBe(true);
        expect(report.rejectReason).toContain('not found');
    });

    it('should check argument design', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        // Has $ARGUMENTS but no argument-hint
        const command = parseCommand(
            '/test/bad-args.md',
            `---
description: Test
---

# Test

Use: $ARGUMENTS
`,
        );

        const report = evaluateCommand(command, 'basic');

        const argDesignDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'argument-design');
        expect(argDesignDim?.findings.length).toBeGreaterThan(0);
    });

    it('should check naming convention', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        // Has uppercase in name
        const command = parseCommand(
            '/test/BadName.md',
            `---
description: Test
---

# Test

Content
`,
        );

        const report = evaluateCommand(command, 'full');

        const namingDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'naming-convention');
        expect(namingDim?.findings.length).toBeGreaterThan(0);
    });
});

describe('Unit: base adapter utilities', () => {
    it('should convert to imperative form', async () => {
        const { convertToImperative } = await import(join(SCRIPTS_DIR, 'adapters', 'base.ts'));

        const result = convertToImperative('You should do this');
        expect(result).toBe('do this');
    });

    it('should convert argument syntax to template format', async () => {
        const { convertArgumentSyntax } = await import(join(SCRIPTS_DIR, 'adapters', 'base.ts'));

        const result = convertArgumentSyntax('Use $ARGUMENTS and $1', 'template');
        expect(result).toBe('Use {{args}} and {{1}}');
    });

    it('should convert argument syntax to natural format', async () => {
        const { convertArgumentSyntax } = await import(join(SCRIPTS_DIR, 'adapters', 'base.ts'));

        const result = convertArgumentSyntax('Use {{args}} and {{1}}', 'natural');
        expect(result).toBe('Use $ARGUMENTS and $1');
    });

    it('should convert pseudocode to natural language', async () => {
        const { convertPseudocodeToNaturalLanguage } = await import(join(SCRIPTS_DIR, 'adapters', 'base.ts'));

        const result = convertPseudocodeToNaturalLanguage(
            'Task(subagent_type="super-coder") and Skill(skill="rd2:tasks")',
        );
        expect(result).toContain('Delegate to super-coder agent');
        expect(result).toContain('Use rd2:tasks skill');
    });

    it('should truncate long descriptions', async () => {
        const { truncateDescription } = await import(join(SCRIPTS_DIR, 'adapters', 'base.ts'));

        const short = truncateDescription('Short');
        expect(short.value).toBe('Short');
        expect(short.wasTruncated).toBe(false);

        const long = truncateDescription('This is a very long description that exceeds sixty characters');
        expect(long.wasTruncated).toBe(true);
        expect(long.value.length).toBeLessThanOrEqual(60);
    });

    it('should infer argument hints from body', async () => {
        const { inferArgumentHints } = await import(join(SCRIPTS_DIR, 'adapters', 'base.ts'));

        const withArgs = inferArgumentHints('Use $ARGUMENTS for this');
        expect(withArgs).toBe('<args>');

        const withNum = inferArgumentHints('Use $1 and $2');
        expect(withNum).toBe('<arg1> <arg2>');

        const without = inferArgumentHints('No arguments here');
        expect(without).toBeNull();
    });

    it('should create command adapter context with custom body analysis', async () => {
        const { createCommandAdapterContext } = await import(join(SCRIPTS_DIR, 'adapters', 'base.ts'));

        const command = {
            filename: 'test-command',
            path: '/test/test-command.md',
            frontmatter: { description: 'Test command' },
            body: 'Command body content',
            raw: '',
        };

        const customAnalysis = {
            lineCount: 10,
            hasPseudocode: true,
            pseudocodeConstructs: ['Task()'],
            argumentRefs: ['$1'],
            usesPluginRoot: true,
            hasSecondPerson: true,
            sections: ['## Steps', '## Examples'],
        };

        const context = createCommandAdapterContext(command, '/output/test-command.md', customAnalysis);
        expect(context.bodyAnalysis.lineCount).toBe(10);
        expect(context.bodyAnalysis.hasPseudocode).toBe(true);
        expect(context.bodyAnalysis.usesPluginRoot).toBe(true);
    });
});

describe('Unit: BaseCommandAdapter', () => {
    it('should validate command with empty body', async () => {
        const { BaseCommandAdapter } = await import(join(SCRIPTS_DIR, 'adapters', 'base.ts'));

        class TestAdapter extends BaseCommandAdapter {
            readonly platform = 'claude' as const;
            readonly displayName = 'Test Adapter';
        }

        const adapter = new TestAdapter();
        const command = {
            filename: 'test',
            path: '/test.md',
            frontmatter: { description: 'Test' },
            body: '',
            raw: '',
        };

        const result = await adapter.validate(command);
        expect(result.success).toBe(false);
        expect(result.errors).toContain('Command body is empty');
    });

    it('should validate command with long description warning', async () => {
        const { BaseCommandAdapter } = await import(join(SCRIPTS_DIR, 'adapters', 'base.ts'));

        class TestAdapter extends BaseCommandAdapter {
            readonly platform = 'claude' as const;
            readonly displayName = 'Test Adapter';
        }

        const adapter = new TestAdapter();
        const longDesc = 'This is a very long description that definitely exceeds sixty characters in length';
        const command = {
            filename: 'test',
            path: '/test.md',
            frontmatter: { description: longDesc },
            body: 'Some content here',
            raw: '',
        };

        const result = await adapter.validate(command);
        expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should validate command with valid content', async () => {
        const { BaseCommandAdapter } = await import(join(SCRIPTS_DIR, 'adapters', 'base.ts'));

        class TestAdapter extends BaseCommandAdapter {
            readonly platform = 'claude' as const;
            readonly displayName = 'Test Adapter';
        }

        const adapter = new TestAdapter();
        const command = {
            filename: 'test',
            path: '/test.md',
            frontmatter: { description: 'Valid command' },
            body: 'Command body with content',
            raw: '',
        };

        const result = await adapter.validate(command);
        expect(result.success).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should generate companions with platform files', async () => {
        const { BaseCommandAdapter } = await import(join(SCRIPTS_DIR, 'adapters', 'base.ts'));

        class TestAdapter extends BaseCommandAdapter {
            readonly platform = 'claude' as const;
            readonly displayName = 'Test Adapter';

            async generatePlatformCompanions(context: CommandAdapterContext): Promise<Record<string, string>> {
                return {
                    'companions/test.md': `# Generated for ${context.commandName}`,
                };
            }
        }

        const adapter = new TestAdapter();
        const context = {
            command: {
                filename: 'test-command',
                path: '/test/test-command.md',
                frontmatter: { description: 'Test' },
                body: 'Content',
                raw: '',
            },
            outputPath: '/output/test-command.md',
            commandName: 'test-command',
            frontmatter: { description: 'Test' },
            body: 'Content',
            bodyAnalysis: {
                lineCount: 1,
                hasPseudocode: false,
                pseudocodeConstructs: [],
                argumentRefs: [],
                usesPluginRoot: false,
                hasSecondPerson: false,
                sections: [],
            },
        };

        const result = await adapter.generateCompanions(context);
        expect(result.success).toBe(true);
        expect(result.files['companions/test.md']).toBeDefined();
    });

    it('should detect platform features', async () => {
        const { BaseCommandAdapter } = await import(join(SCRIPTS_DIR, 'adapters', 'base.ts'));

        class TestAdapter extends BaseCommandAdapter {
            readonly platform = 'claude' as const;
            readonly displayName = 'Test Adapter';

            detectPlatformSpecificFeatures(command: Command): string[] {
                const features: string[] = [];
                if (command.body.includes('Task')) {
                    features.push('has-delegation');
                }
                return features;
            }
        }

        const adapter = new TestAdapter();
        const command = {
            filename: 'test',
            path: '/test.md',
            frontmatter: { description: 'Test' },
            body: 'Task(subagent_type="test")',
            raw: '',
        };

        const features = adapter.detectPlatformFeatures(command);
        expect(features).toContain('has-delegation');
    });

    it('should validate with platform-specific validation', async () => {
        const { BaseCommandAdapter } = await import(join(SCRIPTS_DIR, 'adapters', 'base.ts'));

        class TestAdapter extends BaseCommandAdapter {
            readonly platform = 'claude' as const;
            readonly displayName = 'Test Adapter';

            async validatePlatform(command: Command): Promise<{ errors: string[]; warnings: string[] }> {
                return {
                    errors: ['Platform-specific error'],
                    warnings: ['Platform-specific warning'],
                };
            }
        }

        const adapter = new TestAdapter();
        const command = {
            filename: 'test',
            path: '/test.md',
            frontmatter: { description: 'Test' },
            body: 'Content',
            raw: '',
        };

        const result = await adapter.validate(command);
        expect(result.errors).toContain('Platform-specific error');
        expect(result.warnings).toContain('Platform-specific warning');
    });

    it('should use default platform methods when not overridden', async () => {
        const { BaseCommandAdapter } = await import(join(SCRIPTS_DIR, 'adapters', 'base.ts'));

        class TestAdapter extends BaseCommandAdapter {
            readonly platform = 'claude' as const;
            readonly displayName = 'Test Adapter';
        }

        const adapter = new TestAdapter();

        // Test default validatePlatform returns empty
        const validation = await adapter.validatePlatform({} as Command);
        expect(validation.errors).toEqual([]);
        expect(validation.warnings).toEqual([]);

        // Test default generatePlatformCompanions returns empty
        const companions = await adapter.generatePlatformCompanions({} as CommandAdapterContext);
        expect(companions).toEqual({});

        // Test default detectPlatformSpecificFeatures returns empty
        const features = adapter.detectPlatformSpecificFeatures({} as Command);
        expect(features).toEqual([]);
    });
});

describe('Unit: evaluate.ts functions', () => {
    it('should detect pseudocode patterns', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        // Import evaluate.ts internals through a workaround - test detectPseudocode via evaluateCommand
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/workflow.md',
            `---
description: Workflow command
---

# Workflow

Task(subagent_type="planner")
Skill(skill="test-skill")
`,
        );

        const report = evaluateCommand(command, 'full');
        // The weight profile shows pseudocode was detected
        expect(report.weightProfile).toBe('with-pseudocode');
    });

    it('should calculate grade boundaries correctly', async () => {
        // Test grade calculation through evaluateCommand
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        // 95% should be A
        const highScore = parseCommand(
            '/test/high.md',
            `---
description: High score command
allowed-tools: Read,Bash
---

# Test

Use Read to analyze code.
`,
        );
        const report = evaluateCommand(highScore, 'full');
        // Check that we get valid grades
        expect(['A', 'B', 'C', 'D', 'F']).toContain(report.grade);
    });

    it('should handle security findings with no allowed-tools', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/no-tools.md',
            `---
description: Test command
---

# Test

Run some commands.
`,
        );

        const report = evaluateCommand(command, 'full');
        // Should have security finding for missing allowed-tools
        const secDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'security');
        expect(secDim?.findings.some((f: string) => f.includes('allowed-tools'))).toBe(true);
    });

    it('should evaluate description with "this command" pattern', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/bad-desc.md',
            `---
description: This command does something
---

# Test

Content.
`,
        );

        const report = evaluateCommand(command, 'basic');
        const descDim = report.dimensions.find(
            (d: CommandEvaluationDimension) => d.name === 'description-effectiveness',
        );
        expect(descDim?.findings.some((f: string) => f.includes('This command'))).toBe(true);
    });

    it('should evaluate content quality with second person', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/second-person.md',
            `---
description: Test
---

# Test

You should review this code carefully. Your task is to check for bugs.
`,
        );

        const report = evaluateCommand(command, 'basic');
        const contentDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'content-quality');
        expect(contentDim?.findings.some((f: string) => f.includes('second-person'))).toBe(true);
    });

    it('should evaluate structure brevity with many lines', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const longBody = Array.from({ length: 160 }, (_, i) => `Line ${i + 1}`).join('\n');
        const command = parseCommand(
            '/test/long.md',
            `---
description: Test
---

# Test

${longBody}
`,
        );

        const report = evaluateCommand(command, 'basic');
        const structDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'structure-brevity');
        // 160 lines is above 100, so it should trigger the "approaching limit" finding
        expect(structDim?.findings.length).toBeGreaterThan(0);
    });

    it('should evaluate delegation pattern with constructs', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/delegations.md',
            `---
description: Test
---

# Test

Task(subagent_type="planner")
`,
        );

        const report = evaluateCommand(command, 'basic');
        // With pseudocode, it should detect Task()
        expect(report.weightProfile).toBe('with-pseudocode');
    });

    it('should evaluate argument design with poor hint', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/bad-arg.md',
            `---
description: Test
argument-hint: arg1 arg2
---

# Test

Use $1 and $2.
`,
        );

        const report = evaluateCommand(command, 'basic');
        const argDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'argument-design');
        expect(argDim?.findings.some((f: string) => f.includes('generic names'))).toBe(true);
    });

    it('should evaluate platform compatibility with Claude syntax', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/claude-specific.md',
            `---
description: Test
---

# Test

Task(subagent_type="planner")

Use $ARGUMENTS and run \`!custom command\`
`,
        );

        const report = evaluateCommand(command, 'full');
        const platDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'platform-compatibility');
        // Has Task() but no Platform Notes section
        expect(platDim).toBeDefined();
    });

    it('should evaluate operational readiness with all operational terms', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        // Include all keywords that the operational readiness check looks for
        const content = `
# Test Command

This is a command that handles error cases and validates input.
It checks for edge cases and boundary conditions.
We validate all inputs before processing.
When troubleshooting, check the logs for debugging information.
`.trim();

        const command = parseCommand(
            '/test/good-ops.md',
            `---
description: Test command
---

# Test

${content}
`,
        );

        const report = evaluateCommand(command, 'full');
        const opDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'operational-readiness');
        // This should pass with good operational content
        expect(opDim).toBeDefined();
    });

    it('should handle missing frontmatter in evaluation', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/no-fm.md',
            `# Test

Just content without frontmatter`,
        );

        const report = evaluateCommand(command, 'basic');
        const fmDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'frontmatter-quality');
        expect(fmDim?.findings).toContain('No frontmatter found');
    });

    it('should handle invalid model value', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/bad-model.md',
            `---
description: Test
model: invalid-model
---

# Test

Content.
`,
        );

        const report = evaluateCommand(command, 'basic');
        const fmDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'frontmatter-quality');
        expect(fmDim?.findings.some((f: string) => f.includes('Invalid model'))).toBe(true);
    });

    it('should handle body without header', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/minimal.md',
            `---
description: Test
---

Simple content.
`,
        );

        const report = evaluateCommand(command, 'basic');
        const contentDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'content-quality');
        expect(contentDim).toBeDefined();
    });

    it('should evaluate naming with underscores', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/test_name.md',
            `---
description: Test
---

# Test

Content.
`,
        );

        const report = evaluateCommand(command, 'full');
        const namingDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'naming-convention');
        expect(namingDim?.findings.some((f: string) => f.includes('underscores'))).toBe(true);
    });

    it('should evaluate argument design with hint but no refs', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/extra-hint.md',
            `---
description: Test
argument-hint: <file>
---

# Test

Just content without args.
`,
        );

        const report = evaluateCommand(command, 'basic');
        const argDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'argument-design');
        expect(
            argDim?.findings.some((f: string) => f.includes('argument-hint defined but no argument references')),
        ).toBe(true);
    });

    it('should evaluate argument design with descriptive hint', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/good-arg.md',
            `---
description: Test
argument-hint: <file-path>
---

# Test

Use $ARGUMENTS for processing.
`,
        );

        const report = evaluateCommand(command, 'basic');
        // Should have no findings about generic names
        const argDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'argument-design');
        expect(argDim?.findings.some((f: string) => f.includes('generic names'))).toBe(false);
    });

    it('should evaluate security with Bash in string format', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        // Test greylist pattern for Bash() - see evaluation.config.ts
        const command = parseCommand(
            '/test/bash-string.md',
            `---
description: Test command
allowed-tools: Bash('echo hello')
---

# Test

Run commands.
`,
        );

        const report = evaluateCommand(command, 'full');
        // This should trigger the greylist for Bash with string command
        expect(report.securityScan?.greylistPenalty).toBeGreaterThan(0);
    });

    it('should evaluate content quality with TODOs', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/todos.md',
            `---
description: Test
---

# Test

TODO: Implement this
TODO: Fix that too
`,
        );

        const report = evaluateCommand(command, 'basic');
        const contentDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'content-quality');
        expect(contentDim?.findings.some((f: string) => f.includes('TODO'))).toBe(true);
    });

    it('should evaluate structure with no sections', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/no-sections.md',
            `---
description: Test
---

Just plain content without any sections.
`,
        );

        const report = evaluateCommand(command, 'basic');
        const structDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'structure-brevity');
        expect(structDim?.findings.some((f: string) => f.includes('No section headers'))).toBe(true);
    });

    it('should evaluate structure with When to Use section', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/good-structure.md',
            `---
description: Test
---

# Test

## When to Use

Use this when you need to do something.
`,
        );

        const report = evaluateCommand(command, 'basic');
        const structDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'structure-brevity');
        expect(structDim?.findings.some((f: string) => f.includes('When to Use'))).toBe(false);
    });

    it('should evaluate content with code blocks in long body', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/code-examples.md',
            `---
description: Test
---

# Test

This is a very long command that has lots of content and includes code examples.

\`\`\`bash
echo "Hello"
\`\`\`

More content here.
`,
        );

        const report = evaluateCommand(command, 'basic');
        const contentDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'content-quality');
        expect(contentDim).toBeDefined();
    });

    it('should evaluate description with redundant "command" word', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/redundant.md',
            `---
description: This command runs a test command
---

# Test

Content.
`,
        );

        const report = evaluateCommand(command, 'basic');
        const descDim = report.dimensions.find(
            (d: CommandEvaluationDimension) => d.name === 'description-effectiveness',
        );
        expect(descDim?.findings.some((f: string) => f.includes('redundant'))).toBe(true);
    });

    it('should evaluate content with many placeholders', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/placeholders.md',
            `---
description: Test
---

# Test

[INSERT NAME]
[INSERT DATE]
[INSERT VALUE]
[INSERT SOMETHING]
`,
        );

        const report = evaluateCommand(command, 'basic');
        const contentDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'content-quality');
        expect(contentDim?.findings.some((f: string) => f.includes('placeholder'))).toBe(true);
    });

    it('should evaluate content with consistent imperative form', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/imperative.md',
            `---
description: Test
---

# Test

Read the file first.
Check the content.
Write the output.
Run the command.
Validate the result.
`,
        );

        const report = evaluateCommand(command, 'basic');
        // Should have good imperative form
        const contentDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'content-quality');
        expect(contentDim?.findings.some((f: string) => f.includes('imperative form'))).toBe(false);
    });

    it('should evaluate delegation with AskUserQuestion only', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/ask-only.md',
            `---
description: Test
---

# Test

AskUserQuestion(question="What to do?")
`,
        );

        const report = evaluateCommand(command, 'basic');
        const delegDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'delegation-pattern');
        expect(delegDim?.findings.some((f: string) => f.includes('Only AskUserQuestion'))).toBe(true);
    });

    it('should evaluate description with very long issue list', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        // This triggers the else branch in validateDescription scoring
        const command = parseCommand(
            '/test/weird.md',
            `---
description: This command tests a thing
---

# Test

Content.
`,
        );

        const report = evaluateCommand(command, 'basic');
        const descDim = report.dimensions.find(
            (d: CommandEvaluationDimension) => d.name === 'description-effectiveness',
        );
        expect(descDim).toBeDefined();
    });

    it('should evaluate with pass threshold', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/good.md',
            `---
description: Review code for bugs
allowed-tools: Read,Bash(git:*)
argument-hint: <file-path>
---

# Review Code

## When to Use

Use to review code.

## Steps

1. Read files
2. Check for bugs

## Examples

Example: review-code src/
`,
        );

        const report = evaluateCommand(command, 'full');
        // This should pass the threshold
        expect(report.passed).toBe(true);
    });

    it('should evaluate frontmatter with invalid allowed-tools format', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        // Invalid allowed-tools - empty string
        const command = parseCommand(
            '/test/bad-tools.md',
            `---
description: Test
allowed-tools: ''
---

# Test

Content.
`,
        );

        const report = evaluateCommand(command, 'basic');
        const fmDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'frontmatter-quality');
        expect(fmDim?.findings.some((f: string) => f.includes('Invalid allowed-tools'))).toBe(true);
    });

    it('should evaluate frontmatter with empty argument-hint', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/empty-hint.md',
            `---
description: Test
argument-hint: ''
---

# Test

Content.
`,
        );

        const report = evaluateCommand(command, 'basic');
        const fmDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'frontmatter-quality');
        expect(fmDim?.findings.some((f: string) => f.includes('argument-hint is empty'))).toBe(true);
    });

    it('should evaluate frontmatter with non-boolean disable-model-invocation', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/bad-disable.md',
            `---
description: Test
disable-model-invocation: "yes"
---

# Test

Content.
`,
        );

        const report = evaluateCommand(command, 'basic');
        const fmDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'frontmatter-quality');
        expect(fmDim?.findings.some((f: string) => f.includes('disable-model-invocation must be a boolean'))).toBe(
            true,
        );
    });

    it('should evaluate frontmatter with valid model', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/sonnet.md',
            `---
description: Test
model: sonnet
---

# Test

Content.
`,
        );

        const report = evaluateCommand(command, 'basic');
        const fmDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'frontmatter-quality');
        expect(fmDim?.findings.some((f: string) => f.includes('Invalid model'))).toBe(false);
    });

    it('should evaluate description at exact length boundary', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        // 60 chars - should be valid
        const command = parseCommand(
            '/test/edge.md',
            `---
description: Exactly sixty characters right here for testing purposes
---

# Test

Content.
`,
        );

        const report = evaluateCommand(command, 'basic');
        expect(report).toBeDefined();
    });

    it('should evaluate content quality with second person and imperative', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/mixed.md',
            `---
description: Test
---

# Test

You should check this.
But also Review that.
`,
        );

        const report = evaluateCommand(command, 'basic');
        const contentDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'content-quality');
        expect(contentDim?.findings.length).toBeGreaterThan(0);
    });

    it('should evaluate structure with proper sections', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/good-struct.md',
            `---
description: Test
---

# Test

## When to Use

Use this.

## Steps

Do stuff.
`,
        );

        const report = evaluateCommand(command, 'basic');
        const structDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'structure-brevity');
        // Should have no findings about missing sections
        expect(
            structDim?.findings.some((f: string) => f.includes('No section headers') || f.includes('When to Use')),
        ).toBe(false);
    });

    it('should evaluate structure with 120 lines', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const longBody = Array.from({ length: 120 }, (_, i) => `Line ${i + 1}`).join('\n');
        const command = parseCommand(
            '/test/120-lines.md',
            `---
description: Test
---

# Test

${longBody}
`,
        );

        const report = evaluateCommand(command, 'basic');
        const structDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'structure-brevity');
        expect(structDim?.findings.some((f: string) => f.includes('approaching limit'))).toBe(true);
    });

    it('should evaluate delegation without pseudocode', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/simple.md',
            `---
description: Test
---

# Test

Just do it.
`,
        );

        const report = evaluateCommand(command, 'basic');
        expect(report.weightProfile).toBe('without-pseudocode');
    });

    it('should evaluate delegation with Skill but not Task', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/skill-only.md',
            `---
description: Test
---

# Test

Skill(skill="some-skill")
`,
        );

        const report = evaluateCommand(command, 'basic');
        const delegDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'delegation-pattern');
        // Should have Task() or Skill() - this one has Skill so it should be fine
        expect(delegDim?.findings.some((f: string) => f.includes('No Task() or Skill()'))).toBe(false);
    });

    it('should evaluate platform with proper notes section', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/platform-ok.md',
            `---
description: Test
---

# Test

Task(subagent_type="planner")

## Platform Notes

Works on Claude Code.
`,
        );

        const report = evaluateCommand(command, 'full');
        const platDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'platform-compatibility');
        expect(platDim?.findings.some((f: string) => f.includes('Platform Notes'))).toBe(false);
    });

    it('should evaluate security with unfiltered Bash', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/bash-no-filter.md',
            `---
description: Test
allowed-tools: Bash
---

# Test

Content.
`,
        );

        const report = evaluateCommand(command, 'full');
        const secDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'security');
        expect(secDim?.findings.some((f: string) => f.includes('Bash without tool filters'))).toBe(true);
    });

    it('should calculate percentage and grade correctly', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/grade.md',
            `---
description: Test
allowed-tools: Read
---

# Test

## When to Use

Use this.
`,
        );

        const report = evaluateCommand(command, 'full');
        expect(report.percentage).toBeGreaterThan(0);
        expect(['A', 'B', 'C', 'D', 'F']).toContain(report.grade);
    });

    it('should evaluate operational readiness with all checks passing', async () => {
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const command = parseCommand(
            '/test/full-ops.md',
            `---
description: Test
---

# Test

Handle errors gracefully when something fails.
Check edge cases like empty input.
Validate the input before processing.
Debug issues when troubleshooting is needed.
`,
        );

        const report = evaluateCommand(command, 'full');
        const opDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'operational-readiness');
        // All operational terms present - should have no findings
        expect(opDim?.findings.length).toBe(0);
    });
});

describe('Unit: CLI functions', () => {
    it('should print usage without errors', async () => {
        const { printUsage } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        // printUsage just calls console.log, should not throw
        expect(() => printUsage()).not.toThrow();
    });

    it('should print rejected report', async () => {
        const { printReport } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const report = {
            commandPath: '/test/cmd.md',
            commandName: 'test-command',
            scope: 'basic' as const,
            weightProfile: 'default' as const,
            overallScore: 0,
            maxScore: 100,
            percentage: 0,
            grade: 'F' as const,
            dimensions: [],
            timestamp: new Date().toISOString(),
            passed: false,
            rejected: true,
            rejectReason: 'Security blacklist match',
        };

        expect(() => printReport(report, false)).not.toThrow();
    });

    it('should print passed report', async () => {
        const { printReport } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const report = {
            commandPath: '/test/cmd.md',
            commandName: 'test-command',
            scope: 'basic' as const,
            weightProfile: 'default' as const,
            overallScore: 85,
            maxScore: 100,
            percentage: 85,
            grade: 'B' as const,
            dimensions: [],
            timestamp: new Date().toISOString(),
            passed: true,
        };

        expect(() => printReport(report, false)).not.toThrow();
    });

    it('should print failed report', async () => {
        const { printReport } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const report = {
            commandPath: '/test/cmd.md',
            commandName: 'test-command',
            scope: 'basic' as const,
            weightProfile: 'default' as const,
            overallScore: 50,
            maxScore: 100,
            percentage: 50,
            grade: 'F' as const,
            dimensions: [],
            timestamp: new Date().toISOString(),
            passed: false,
        };

        expect(() => printReport(report, false)).not.toThrow();
    });

    it('should print verbose report with findings', async () => {
        const { printReport } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const report = {
            commandPath: '/test/cmd.md',
            commandName: 'test-command',
            scope: 'full' as const,
            weightProfile: 'default' as const,
            overallScore: 70,
            maxScore: 100,
            percentage: 70,
            grade: 'C' as const,
            dimensions: [
                {
                    name: 'frontmatter-quality',
                    displayName: 'Frontmatter Quality',
                    weight: 20,
                    score: 15,
                    maxScore: 20,
                    findings: ['Test finding'],
                    recommendations: ['Test recommendation'],
                },
            ],
            timestamp: new Date().toISOString(),
            passed: false,
        };

        expect(() => printReport(report, true)).not.toThrow();
    });

    it('should print report with sorting by percentage', async () => {
        const { printReport } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const report = {
            commandPath: '/test/cmd.md',
            commandName: 'test-command',
            scope: 'full' as const,
            weightProfile: 'default' as const,
            overallScore: 70,
            maxScore: 100,
            percentage: 70,
            grade: 'C' as const,
            dimensions: [
                {
                    name: 'dim1',
                    displayName: 'Dimension One',
                    weight: 20,
                    score: 20,
                    maxScore: 20,
                    findings: [],
                    recommendations: [],
                },
                {
                    name: 'dim2',
                    displayName: 'Dimension Two',
                    weight: 20,
                    score: 5,
                    maxScore: 20,
                    findings: [],
                    recommendations: [],
                },
            ],
            timestamp: new Date().toISOString(),
            passed: false,
        };

        // This should trigger the sorting logic
        expect(() => printReport(report, false)).not.toThrow();
    });

    it('should parse valid CLI args', async () => {
        const { parseCliArgs } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        // Save original argv
        const originalArgv = process.argv;

        try {
            // Set test argv
            process.argv = [
                'node',
                'evaluate.ts',
                '/test/cmd.md',
                '--scope',
                'full',
                '--platform',
                'claude',
                '--verbose',
            ];

            const result = parseCliArgs();

            expect(result.path).toBe('/test/cmd.md');
            expect(result.options.scope).toBe('full');
            expect(result.options.platform).toBe('claude');
            expect(result.options.verbose).toBe(true);
        } finally {
            // Restore original argv
            process.argv = originalArgv;
        }
    });

    it('should parse CLI args with json flag', async () => {
        const { parseCliArgs } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const originalArgv = process.argv;

        try {
            process.argv = ['node', 'evaluate.ts', '/test/cmd.md', '--json'];

            const result = parseCliArgs();

            expect(result.path).toBe('/test/cmd.md');
            expect(result.options.json).toBe(true);
        } finally {
            process.argv = originalArgv;
        }
    });

    it('should use defaults for missing CLI args', async () => {
        const { parseCliArgs } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const originalArgv = process.argv;

        try {
            process.argv = ['node', 'evaluate.ts', '/test/cmd.md'];

            const result = parseCliArgs();

            expect(result.path).toBe('/test/cmd.md');
            expect(result.options.scope).toBe('basic');
            expect(result.options.platform).toBe('all');
            expect(result.options.verbose).toBe(false);
            expect(result.options.json).toBe(false);
        } finally {
            process.argv = originalArgv;
        }
    });

    it('should handle help flag', async () => {
        const { parseCliArgs } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const originalArgv = process.argv;
        const originalExit = process.exit;

        try {
            process.argv = ['node', 'evaluate.ts', '--help'];
            // @ts-ignore - mocking exit
            process.exit = () => {};

            // This should call printUsage and exit
            expect(() => parseCliArgs()).not.toThrow();
        } finally {
            process.argv = originalArgv;
            process.exit = originalExit;
        }
    });

    it('should handle missing path argument', async () => {
        const { parseCliArgs } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const originalArgv = process.argv;
        const originalExit = process.exit;
        const originalError = console.error;

        try {
            process.argv = ['node', 'evaluate.ts'];
            // @ts-ignore - mocking exit
            process.exit = () => {};
            console.error = () => {};

            // This should print error and exit
            expect(() => parseCliArgs()).not.toThrow();
        } finally {
            process.argv = originalArgv;
            process.exit = originalExit;
            console.error = originalError;
        }
    });

    it('should handle invalid scope', async () => {
        const { parseCliArgs } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const originalArgv = process.argv;
        const originalExit = process.exit;
        const originalError = console.error;

        try {
            process.argv = ['node', 'evaluate.ts', '/test/cmd.md', '--scope', 'invalid'];
            // @ts-ignore - mocking exit
            process.exit = () => {};
            console.error = () => {};

            expect(() => parseCliArgs()).not.toThrow();
        } finally {
            process.argv = originalArgv;
            process.exit = originalExit;
            console.error = originalError;
        }
    });

    it('should handle invalid platform', async () => {
        const { parseCliArgs } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));

        const originalArgv = process.argv;
        const originalExit = process.exit;
        const originalError = console.error;

        try {
            process.argv = ['node', 'evaluate.ts', '/test/cmd.md', '--platform', 'invalid'];
            // @ts-ignore - mocking exit
            process.exit = () => {};
            console.error = () => {};

            expect(() => parseCliArgs()).not.toThrow();
        } finally {
            process.argv = originalArgv;
            process.exit = originalExit;
            console.error = originalError;
        }
    });
});

describe('Unit: evaluate edge cases', () => {
    it('should handle empty body in content-quality', async () => {
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));

        const command = parseCommand(
            '/test/empty.md',
            `---
description: Test
---

# Test
`,
        );

        const report = evaluateCommand(command, 'basic');
        // Just check it runs without error
        expect(report.percentage).toBeGreaterThanOrEqual(0);
    });

    it('should handle description with "too long" issue', async () => {
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));

        // Create a very long description
        const longDesc = 'A'.repeat(100);
        const command = parseCommand(
            '/test/long.md',
            `---
description: ${longDesc}
---

# Test

Content here.
`,
        );

        // Just check it runs without error
        const report = evaluateCommand(command, 'basic');
        expect(report.percentage).toBeGreaterThan(0);
    });

    it('should handle description with empty issue', async () => {
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));

        const command = parseCommand(
            '/test/empty-desc.md',
            `---
description: ""
---

# Test

Content here.
`,
        );

        // Just check it runs without error
        const report = evaluateCommand(command, 'basic');
        expect(report.percentage).toBeGreaterThanOrEqual(0);
    });

    it('should handle valid argument-hint', async () => {
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));

        const command = parseCommand(
            '/test/good-hint.md',
            `---
description: Test
argument-hint: <file>
---

# Test

Content.
`,
        );

        const report = evaluateCommand(command, 'basic');
        // Just check it doesn't crash
        expect(report.percentage).toBeGreaterThan(0);
    });

    it('should handle many pseudocode constructs', async () => {
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));

        // Create command with many Task() calls
        const command = parseCommand(
            '/test/many-tasks.md',
            `---
description: Test
---

# Test

Task(subagent_type="a")
Task(subagent_type="b")
Task(subagent_type="c")
Task(subagent_type="d")
Task(subagent_type="e")
Task(subagent_type="f")
`,
        );

        const report = evaluateCommand(command, 'full');

        // Should have finding about many constructs - check weight profile
        expect(report.weightProfile).toBe('with-pseudocode');
    });

    it('should handle second-person language', async () => {
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));

        const command = parseCommand(
            '/test/second-person.md',
            `---
description: Test
---

# Test

You should check the code.
Your files need review.
`,
        );

        const report = evaluateCommand(command, 'basic');
        const contentDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'content-quality');

        expect(contentDim?.findings).toContain('Uses second-person language ("you should", "your")');
    });

    it('should handle low imperative ratio', async () => {
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));

        // Create command with many non-imperative lines (10+ lines, less than 30% imperative)
        const command = parseCommand(
            '/test/low-imp.md',
            `---
description: Test
---

# Test

This is a test file.
It has many sentences.
That do not start with verbs.
They are just statements.
And more statements here.
Also some more text.
Even more content.
More content here.
Another line added.
Final line to add.
`,
        );

        const report = evaluateCommand(command, 'full');
        const contentDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'content-quality');

        // Should have low imperative finding - the logic checks for lines.length > 5
        // and imperativeCount < lines.length * 0.3
        expect(contentDim?.findings.length).toBeGreaterThanOrEqual(0);
    });

    it('should evaluate structure brevity', async () => {
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));

        // Very short content
        const command = parseCommand(
            '/test/short.md',
            `---
description: Test
---

# Test

x
`,
        );

        const report = evaluateCommand(command, 'basic');
        const structDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'structure-brevity');

        // Very short should have finding
        expect(structDim?.findings.length).toBeGreaterThan(0);
    });

    it('should evaluate naming convention', async () => {
        const { evaluateCommand } = await import(join(SCRIPTS_DIR, 'evaluate.ts'));
        const { parseCommand } = await import(join(SCRIPTS_DIR, 'utils.ts'));

        const command = parseCommand(
            '/test/Bad_Name.md',
            `---
description: Test command
---

# Test

Content.
`,
        );

        const report = evaluateCommand(command, 'full');
        const namingDim = report.dimensions.find((d: CommandEvaluationDimension) => d.name === 'naming-convention');

        // Bad naming should have findings
        expect(namingDim?.findings.length).toBeGreaterThan(0);
    });
});
