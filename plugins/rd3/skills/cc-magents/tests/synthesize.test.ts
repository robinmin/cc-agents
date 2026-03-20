import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import {
    detectProject,
    loadTemplate,
    listTemplates,
    processTemplate,
    buildUMAMFromTemplate,
    AVAILABLE_TEMPLATES,
    synthesize,
    main,
} from '../scripts/synthesize';
import type { DomainTemplate, MagentPlatform, ProjectDetection } from '../scripts/types';
import { writeFileSync, mkdirSync, rmdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

function createTestProject(parentDir: string, name: string, files: Record<string, string>): string {
    const projectRoot = join(parentDir, name);
    mkdirSync(projectRoot, { recursive: true });
    for (const [filename, content] of Object.entries(files)) {
        const filePath = join(projectRoot, filename);
        // Create parent directories for nested paths
        mkdirSync(dirname(filePath), { recursive: true });
        writeFileSync(filePath, content);
    }
    return projectRoot;
}

describe('synthesize', () => {
    const TEST_DIR = '/tmp/magent-synthesize-test';

    afterEach(() => {
        try {
            rmdirSync(TEST_DIR, { recursive: true });
        } catch { /* ignore */ }
    });

    describe('AVAILABLE_TEMPLATES', () => {
        it('should have all expected templates', () => {
            expect(AVAILABLE_TEMPLATES).toContain('dev-agent');
            expect(AVAILABLE_TEMPLATES).toContain('research-agent');
            expect(AVAILABLE_TEMPLATES).toContain('content-agent');
            expect(AVAILABLE_TEMPLATES).toContain('data-agent');
            expect(AVAILABLE_TEMPLATES).toContain('devops-agent');
            expect(AVAILABLE_TEMPLATES).toContain('general-agent');
        });

        it('should have 6 templates', () => {
            expect(AVAILABLE_TEMPLATES.length).toBe(6);
        });
    });

    describe('detectProject', () => {
        it('should detect Node.js project from package.json', () => {
            const projectRoot = createTestProject(TEST_DIR, 'node', {
                'package.json': JSON.stringify({
                    name: 'test',
                    dependencies: { express: '^4.0.0' },
                }),
            });

            const result = detectProject(projectRoot);

            expect(result.language).toBe('node');
            expect(result.frameworks).toContain('express');
        });

        it('should detect Python project from pyproject.toml', () => {
            const projectRoot = createTestProject(TEST_DIR, 'python', {
                'pyproject.toml': `
[project]
name = "test"
requires-python = ">=3.8"
`,
            });

            const result = detectProject(projectRoot);

            expect(result.language).toBe('python');
        });

        it('should detect ruff linter and formatter from pyproject.toml', () => {
            const projectRoot = createTestProject(TEST_DIR, 'ruff-project', {
                'pyproject.toml': `
[project]
name = "test"
requires-python = ">=3.8"

[tool.ruff]
line-length = 100
`,
            });

            const result = detectProject(projectRoot);

            expect(result.language).toBe('python');
            expect(result.linters).toContain('ruff');
            expect(result.formatters).toContain('ruff');
        });

        it('should detect Go project from go.mod', () => {
            const projectRoot = createTestProject(TEST_DIR, 'go', {
                'go.mod': 'module github.com/test/project\n\ngo 1.21',
            });

            const result = detectProject(projectRoot);

            expect(result.language).toBe('go');
        });

        it('should detect Rust project from Cargo.toml', () => {
            const projectRoot = createTestProject(TEST_DIR, 'rust', {
                'Cargo.toml': '[package]\nname = "test"\nversion = "0.1.0"',
            });

            const result = detectProject(projectRoot);

            expect(result.language).toBe('rust');
        });

        it('should detect package manager from lock files', () => {
            const projectRoot = createTestProject(TEST_DIR, 'pnpm', {
                'package.json': JSON.stringify({ name: 'test' }),
                'pnpm-lock.yaml': 'lockfileVersion: 6.0',
            });

            const result = detectProject(projectRoot);

            expect(result.packageManager).toBe('pnpm');
        });

        it('should detect frameworks from dependencies', () => {
            const projectRoot = createTestProject(TEST_DIR, 'nextjs', {
                'package.json': JSON.stringify({
                    name: 'test',
                    dependencies: { next: '^14.0.0', react: '^18.0.0' },
                }),
            });

            const result = detectProject(projectRoot);

            expect(result.frameworks).toContain('next.js');
            expect(result.frameworks).toContain('react');
        });

        it('should detect test runner from devDependencies', () => {
            const projectRoot = createTestProject(TEST_DIR, 'vitest', {
                'package.json': JSON.stringify({
                    name: 'test',
                    devDependencies: { vitest: '^1.0.0' },
                }),
            });

            const result = detectProject(projectRoot);

            expect(result.testRunner).toBe('vitest');
        });

        it('should detect linters and formatters', () => {
            const projectRoot = createTestProject(TEST_DIR, 'lint', {
                'package.json': JSON.stringify({
                    name: 'test',
                    devDependencies: { eslint: '^8.0.0', prettier: '^3.0.0' },
                }),
            });

            const result = detectProject(projectRoot);

            expect(result.linters).toContain('eslint');
            expect(result.formatters).toContain('prettier');
        });

        it('should detect CI platform', () => {
            const projectRoot = createTestProject(TEST_DIR, 'ci', {
                '.github/workflows/test.yml': 'name: test',
            });

            const result = detectProject(projectRoot);

            expect(result.ciPlatform).toBe('github-actions');
        });

        it('should suggest dev-agent for Node.js projects', () => {
            const projectRoot = createTestProject(TEST_DIR, 'dev', {
                'package.json': JSON.stringify({ name: 'test' }),
            });

            const result = detectProject(projectRoot);

            expect(result.suggestedTemplate).toBe('dev-agent');
        });

        it('should suggest data-agent for Python projects', () => {
            const projectRoot = createTestProject(TEST_DIR, 'data', {
                'pyproject.toml': '[project]\nname = "test"',
            });

            const result = detectProject(projectRoot);

            expect(result.suggestedTemplate).toBe('data-agent');
        });

        it('should detect existing agent configs', () => {
            const projectRoot = createTestProject(TEST_DIR, 'existing', {
                'CLAUDE.md': '# CLAUDE.md',
                'package.json': JSON.stringify({ name: 'test' }),
            });

            const result = detectProject(projectRoot);

            expect(result.existingConfigs.length).toBeGreaterThan(0);
            expect(result.existingConfigs[0].platform).toBe('claude-md');
        });

        it('should return general-agent for unknown project type', () => {
            const projectRoot = createTestProject(TEST_DIR, 'unknown', {
                'README.md': '# Test Project',
            });

            const result = detectProject(projectRoot);

            expect(result.suggestedTemplate).toBe('general-agent');
            expect(result.language).toBeUndefined();
        });
    });

    describe('loadTemplate', () => {
        it('should load a valid template', () => {
            const template = loadTemplate('dev-agent');
            expect(template).not.toBeNull();
            expect(template).toContain('Identity');
        });

        it('should return null for invalid template', () => {
            const template = loadTemplate('non-existent' as DomainTemplate);
            expect(template).toBeNull();
        });
    });

    describe('listTemplates', () => {
        it('should list all available templates', () => {
            const templates = listTemplates();

            expect(templates.length).toBe(6);
            expect(templates.some((t) => t.domain === 'dev-agent')).toBe(true);
            expect(templates.some((t) => t.domain === 'research-agent')).toBe(true);
        });

        it('should have filename for each template', () => {
            const templates = listTemplates();

            for (const template of templates) {
                expect(template.filename).toBeTruthy();
                expect(template.filename.endsWith('.md')).toBe(true);
            }
        });
    });

    describe('processTemplate', () => {
        it('should replace language placeholder', () => {
            const template = '# [primary_language] Agent';
            const detection = {
                language: 'python',
                frameworks: [] as string[],
                packageManager: 'pip',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('PYTHON');
        });

        it('should replace indentation style', () => {
            const template = 'Use [indentation_style]';
            const detection = {
                language: 'python',
                frameworks: [] as string[],
                packageManager: 'pip',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('4 spaces (no tabs)');
        });

        it('should remove unfilled placeholders', () => {
            const template = '# Agent\n[nonexistent]';
            const detection = {
                language: 'node',
                frameworks: [] as string[],
                packageManager: 'npm',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).not.toContain('[nonexistent]');
        });

        it('should use tabs for Go indentation', () => {
            const template = 'Indentation: [indentation_style]';
            const detection = {
                language: 'go',
                frameworks: [] as string[],
                packageManager: 'go',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('tabs');
        });

        it('should use PascalCase for Go file naming', () => {
            const template = 'Files: [file_naming_convention]';
            const detection = {
                language: 'go',
                frameworks: [] as string[],
                packageManager: 'go',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('PascalCase');
        });

        it('should include Go critical rule for error handling', () => {
            const template = 'Rule: [platform_specific_critical_rule_1]';
            const detection = {
                language: 'go',
                frameworks: [] as string[],
                packageManager: 'go',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('Never ignore errors');
        });

        it('should include Rust critical rule for Result/Option', () => {
            const template = 'Rule: [platform_specific_critical_rule_1]';
            const detection = {
                language: 'rust',
                frameworks: [] as string[],
                packageManager: 'cargo',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('Result and Option');
        });

        it('should include Rust type system rule', () => {
            const template = 'Rule: [platform_specific_critical_rule_2]';
            const detection = {
                language: 'rust',
                frameworks: [] as string[],
                packageManager: 'cargo',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('type system');
        });

        it('should use async/await for Node critical rule 2', () => {
            const template = 'Rule: [platform_specific_critical_rule_2]';
            const detection = {
                language: 'node',
                frameworks: [] as string[],
                packageManager: 'npm',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('async/await');
        });

        it('should return ruff lint command', () => {
            const template = 'Lint: [lint_command]';
            const detection = {
                language: 'python',
                frameworks: [] as string[],
                packageManager: 'pip',
                linters: ['ruff'],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('ruff check');
        });

        it('should return eslint lint command', () => {
            const template = 'Lint: [lint_command]';
            const detection = {
                language: 'node',
                frameworks: [] as string[],
                packageManager: 'npm',
                linters: ['eslint'],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('npm run lint');
        });

        it('should return pytest test command', () => {
            const template = 'Test: [test_command]';
            const detection = {
                language: 'python',
                frameworks: [] as string[],
                packageManager: 'pip',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
                testRunner: 'pytest',
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('pytest');
        });

        it('should return go type check command', () => {
            const template = 'Type check: [type_check_command]';
            const detection = {
                language: 'go',
                frameworks: [] as string[],
                packageManager: 'go',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('go vet');
        });

        it('should return rust type check command', () => {
            const template = 'Type check: [type_check_command]';
            const detection = {
                language: 'rust',
                frameworks: [] as string[],
                packageManager: 'cargo',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('cargo check');
        });

        it('should return go build command', () => {
            const template = 'Build: [build_command]';
            const detection = {
                language: 'go',
                frameworks: [] as string[],
                packageManager: 'go',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('go build');
        });

        it('should return cargo install command', () => {
            const template = 'Install: [install_command]';
            const detection = {
                language: 'rust',
                frameworks: [] as string[],
                packageManager: 'cargo',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('cargo fetch');
        });

        it('should return pnpm install command', () => {
            const template = 'Install: [install_command]';
            const detection = {
                language: 'node',
                frameworks: [] as string[],
                packageManager: 'pnpm',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('pnpm install');
        });

        it('should return yarn install command', () => {
            const template = 'Install: [install_command]';
            const detection = {
                language: 'node',
                frameworks: [] as string[],
                packageManager: 'yarn',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('yarn install');
        });

        it('should return primary tools for go', () => {
            const template = 'Tools: [primary_tools]';
            const detection = {
                language: 'go',
                frameworks: [] as string[],
                packageManager: 'go',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('golangci-lint');
        });

        it('should return primary tools for rust', () => {
            const template = 'Tools: [primary_tools]';
            const detection = {
                language: 'rust',
                frameworks: [] as string[],
                packageManager: 'cargo',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('rustfmt');
        });

        it('should return primary tools for python', () => {
            const template = 'Tools: [primary_tools]';
            const detection = {
                language: 'python',
                frameworks: [] as string[],
                packageManager: 'pip',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('pandas');
        });

        it('should use default critical rule for unknown language', () => {
            const template = 'Rule: [platform_specific_critical_rule_1]';
            const detection = {
                language: 'java' as any,
                frameworks: [] as string[],
                packageManager: 'maven',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('best practices');
        });

        it('should use default critical rule 2 for unknown language', () => {
            const template = 'Rule: [platform_specific_critical_rule_2]';
            const detection = {
                language: 'csharp' as any,
                frameworks: [] as string[],
                packageManager: 'nuget',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('maintainable');
        });

        it('should use default indentation for unknown language', () => {
            const template = 'Indent: [indentation_style]';
            const detection = {
                language: 'ruby' as any,
                frameworks: [] as string[],
                packageManager: 'bundle',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('4 spaces');
        });

        it('should use default file naming for unknown language', () => {
            const template = 'Files: [file_naming_convention]';
            const detection = {
                language: 'kotlin' as any,
                frameworks: [] as string[],
                packageManager: 'gradle',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('kebab-case');
        });

        it('should return N/A lint command when no linter matches', () => {
            const template = 'Lint: [lint_command]';
            const detection = {
                language: 'ruby' as any,
                frameworks: [] as string[],
                packageManager: 'bundle',
                linters: ['rubocop'],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('N/A');
        });

        it('should return npm test for unknown test runner', () => {
            const template = 'Test: [test_command]';
            const detection = {
                language: 'go',
                frameworks: [] as string[],
                packageManager: 'go',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
                testRunner: 'unknown' as any,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('npm test');
        });

        it('should return N/A for unknown language type check', () => {
            const template = 'Type check: [type_check_command]';
            const detection = {
                language: 'ruby' as any,
                frameworks: [] as string[],
                packageManager: 'bundle',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('N/A');
        });

        it('should return make build for unknown language build', () => {
            const template = 'Build: [build_command]';
            const detection = {
                language: 'scala' as any,
                frameworks: [] as string[],
                packageManager: 'sbt',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('make build');
        });

        it('should return make install for unknown language/package manager', () => {
            const template = 'Install: [install_command]';
            const detection = {
                language: 'elixir' as any,
                frameworks: [] as string[],
                packageManager: 'mix',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('make install');
        });

        it('should return default tools for unknown language', () => {
            const template = 'Tools: [primary_tools]';
            const detection = {
                language: 'haskell' as any,
                frameworks: [] as string[],
                packageManager: 'cabal',
                linters: [] as string[],
                formatters: [] as string[],
                existingConfigs: [] as { path: string; platform: MagentPlatform }[],
                suggestedTemplate: 'dev-agent' as DomainTemplate,
            };

            const result = processTemplate(template, detection);

            expect(result).toContain('Standard toolchain');
        });
    });

    describe('buildUMAMFromTemplate', () => {
        it('should build UMAM from template content', () => {
            const content = `# Identity

I am a test agent.

## Tools

Use the Read tool.

## Rules

Be helpful.
`;
            const result = buildUMAMFromTemplate(content, '/test/AGENTS.md', 'agents-md', 'dev-agent');

            expect(result.sourcePath).toBe('/test/AGENTS.md');
            expect(result.sourceFormat).toBe('agents-md');
            expect(result.sections.length).toBe(3);
            expect(result.estimatedTokens).toBeGreaterThan(0);
            expect(result.metadata?.name).toBe('dev-agent');
        });

        it('should classify sections', () => {
            const content = `# Identity

I am a test.

## Tools

Use Read.

## Rules

Be helpful.
`;
            const result = buildUMAMFromTemplate(content, '/test/AGENTS.md', 'agents-md', 'dev-agent');

            const identity = result.sections.find((s) => s.category === 'identity');
            const tools = result.sections.find((s) => s.category === 'tools');
            const rules = result.sections.find((s) => s.category === 'rules');

            expect(identity).toBeDefined();
            expect(tools).toBeDefined();
            expect(rules).toBeDefined();
        });

        it('should preserve preamble', () => {
            const content = `This is a preamble.

# Identity

I am a test.
`;
            const result = buildUMAMFromTemplate(content, '/test/AGENTS.md', 'agents-md', 'dev-agent');

            expect(result.preamble).toBeTruthy();
            expect(result.preamble).toContain('preamble');
        });
    });

    describe('synthesize', () => {
        const TEST_OUTPUT = join(TEST_DIR, 'test-output-AGENTS.md');

        it('should synthesize from a valid template', async () => {
            mkdirSync(TEST_DIR, { recursive: true });
            const result = await synthesize({
                template: 'dev-agent',
                platform: 'agents-md',
                outputPath: TEST_OUTPUT,
                projectRoot: TEST_DIR,
            });

            expect(result.success).toBe(true);
            expect(result.outputPath).toBe(TEST_OUTPUT);
            expect(result.platform).toBe('agents-md');
            expect(result.template).toBe('dev-agent');
        });

        it('should fail for invalid template', async () => {
            mkdirSync(TEST_DIR, { recursive: true });
            const result = await synthesize({
                template: 'non-existent-template' as DomainTemplate,
                platform: 'agents-md',
                outputPath: TEST_OUTPUT,
            });

            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('Invalid template');
        });

        it('should auto-detect template when not provided', async () => {
            const projectRoot = createTestProject(TEST_DIR, 'auto', {
                'package.json': JSON.stringify({ name: 'test' }),
            });
            const outputPath = join(projectRoot, 'AGENTS.md');

            const result = await synthesize({
                platform: 'agents-md',
                outputPath,
                projectRoot,
            });

            expect(result.success).toBe(true);
            expect(result.warnings.some((w) => w.includes('Auto-detected template'))).toBe(true);
        });

        it('should auto-detect template and warn when no project files found', async () => {
            mkdirSync(TEST_DIR, { recursive: true });
            // Create an empty project root with no detectable files
            const result = await synthesize({
                platform: 'agents-md',
                outputPath: TEST_OUTPUT,
                projectRoot: TEST_DIR,
                autoDetect: true,
            });

            // Should succeed but with auto-detected 'general-agent' template
            expect(result.success).toBe(true);
            // Should have a warning about auto-detecting the template
            expect(result.warnings.some((w) => w.includes('Auto-detected template') || w.includes('general-agent'))).toBe(true);
        });
    });

    describe('loadTemplate error paths', () => {
        it('should return null for invalid template', () => {
            const result = loadTemplate('non-existent-template' as DomainTemplate);
            expect(result).toBeNull();
        });
    });

    describe('processTemplate', () => {
        it('should process template with detection info', () => {
            const template = 'Language: [primary_language]';
            const detection: any = {
                language: 'typescript',
                frameworks: ['express'],
                linters: ['eslint'],
                testRunner: 'jest',
            };
            const result = processTemplate(template, detection);
            expect(result).toBe('Language: TYPESCRIPT');
        });

        it('should leave unchanged vars if no detection', () => {
            const template = 'Language: [primary_language]';
            const result = processTemplate(template, {
                language: undefined,
                frameworks: [],
                linters: [],
                testRunner: undefined,
            } as any);
            expect(result).toBe('Language: TypeScript'); // default when language is undefined
        });
    });

    describe('main CLI function', () => {
        // Suppress console output during CLI tests
        const originalConsole = { debug: console.debug, info: console.info, warn: console.warn, error: console.error, log: console.log };

        beforeEach(() => {
            mkdirSync(TEST_DIR, { recursive: true });
            // Suppress console output
            console.debug = () => {};
            console.info = () => {};
            console.warn = () => {};
            console.error = () => {};
            console.log = () => {};
        });

        afterEach(() => {
            try {
                rmdirSync(TEST_DIR, { recursive: true });
            } catch { /* ignore */ }
            // Restore console
            console.debug = originalConsole.debug;
            console.info = originalConsole.info;
            console.warn = originalConsole.warn;
            console.error = originalConsole.error;
            console.log = originalConsole.log;
        });

        it('should show help and exit with 0 when --help is passed', async () => {
            const exitMock = mock(() => {});
            const originalExit = process.exit;
            Object.defineProperty(process, 'exit', {
                value: exitMock,
                writable: true,
            });

            try {
                await main(['synthesize.ts', '--help']);
            } catch {
                // Ignore errors from exit
            } finally {
                Object.defineProperty(process, 'exit', {
                    value: originalExit,
                    writable: true,
                });
            }

            expect(exitMock).toHaveBeenCalledWith(0);
        });

        it('should list templates when --list is passed', async () => {
            const exitMock = mock(() => {});
            const originalExit = process.exit;
            Object.defineProperty(process, 'exit', {
                value: exitMock,
                writable: true,
            });

            try {
                await main(['synthesize.ts', '--list']);
            } catch {
                // Ignore errors from exit
            } finally {
                Object.defineProperty(process, 'exit', {
                    value: originalExit,
                    writable: true,
                });
            }

            expect(exitMock).toHaveBeenCalledWith(0);
        });

        it('should exit with 1 when synthesis fails', async () => {
            // Create a file path that will fail synthesis
            const invalidOutput = '/nonexistent/path/AGENTS.md';

            const exitMock = mock(() => {});
            const originalExit = process.exit;
            Object.defineProperty(process, 'exit', {
                value: exitMock,
                writable: true,
            });

            try {
                await main(['synthesize.ts', '--output', invalidOutput]);
            } catch {
                // Ignore errors from exit
            } finally {
                Object.defineProperty(process, 'exit', {
                    value: originalExit,
                    writable: true,
                });
            }

            expect(exitMock).toHaveBeenCalledWith(1);
        });

        it('should synthesize successfully with valid template', async () => {
            const outputPath = join(TEST_DIR, 'AGENTS.md');

            const exitMock = mock(() => {});
            const originalExit = process.exit;
            Object.defineProperty(process, 'exit', {
                value: exitMock,
                writable: true,
            });

            try {
                await main(['synthesize.ts', 'dev-agent', '--output', outputPath]);
            } catch {
                // Ignore errors from exit
            } finally {
                Object.defineProperty(process, 'exit', {
                    value: originalExit,
                    writable: true,
                });
            }

            expect(exitMock).toHaveBeenCalledWith(0);
        });

        it('should show verbose output when --verbose is passed', async () => {
            const outputPath = join(TEST_DIR, 'AGENTS.md');

            const exitMock = mock(() => {});
            const originalExit = process.exit;
            Object.defineProperty(process, 'exit', {
                value: exitMock,
                writable: true,
            });

            try {
                await main(['dev-agent', '--output', outputPath, '--verbose']);
            } catch {
                // Ignore errors from exit
            } finally {
                Object.defineProperty(process, 'exit', {
                    value: originalExit,
                    writable: true,
                });
            }

            expect(exitMock).toHaveBeenCalledWith(0);
        });
    });
});

describe('synthesize with overrides', () => {
    const TEST_DIR = '/tmp/magent-synthesize-override-test';

    beforeEach(() => {
        mkdirSync(TEST_DIR, { recursive: true });
    });

    afterEach(() => {
        try { rmdirSync(TEST_DIR, { recursive: true }); } catch { /* ignore */ }
    });

    it('should return error when templateLoaderOverride returns null', async () => {
        const outputPath = join(TEST_DIR, 'AGENTS.md');

        const result = await synthesize({
            template: 'dev-agent',
            outputPath,
            projectRoot: TEST_DIR,
            templateLoaderOverride: () => null,
        });

        expect(result.success).toBe(false);
        expect(result.errors.some((e) => e.includes('Failed to load template'))).toBe(true);
    });

    it('should return error when template is invalid', async () => {
        const outputPath = join(TEST_DIR, 'AGENTS.md');

        const result = await synthesize({
            template: 'invalid-template' as DomainTemplate,
            outputPath,
            projectRoot: TEST_DIR,
        });

        expect(result.success).toBe(false);
        expect(result.errors.some((e) => e.includes('Invalid template'))).toBe(true);
    });

    it('should use detectionOverride when provided', async () => {
        const outputPath = join(TEST_DIR, 'AGENTS.md');

        const mockDetection: ProjectDetection = {
            language: 'python',
            frameworks: ['django'],
            packageManager: 'pip',
            testRunner: 'pytest',
            ciPlatform: 'github-actions',
            linters: ['ruff'],
            formatters: ['black'],
            existingConfigs: [],
            suggestedTemplate: 'data-agent',
        };

        const result = await synthesize({
            template: 'dev-agent',
            outputPath,
            projectRoot: TEST_DIR,
            detectionOverride: () => mockDetection,
            templateLoaderOverride: (domain) => `# ${domain}\n\nTest content` as any,
        });

        expect(result.success).toBe(true);
        expect(result.detection?.language).toBe('python');
    });

    it('should handle detection with no language via override', async () => {
        const outputPath = join(TEST_DIR, 'AGENTS.md');

        // Override detection to return minimal info without frameworks
        const mockDetection: ProjectDetection = {
            frameworks: [],
            linters: [],
            formatters: [],
            existingConfigs: [],
            suggestedTemplate: 'general-agent',
        };

        const result = await synthesize({
            outputPath,
            projectRoot: TEST_DIR,
            detectionOverride: () => mockDetection,
        });

        // Should still succeed with general-agent template
        expect(result.success).toBe(true);
        expect(result.template).toBe('general-agent');
    });
});
