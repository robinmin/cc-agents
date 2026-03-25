#!/usr/bin/env bun
/**
 * Main Agent Config Synthesis Script for rd3:cc-magents
 *
 * Generates new main agent configuration files from templates with
 * project auto-detection and platform-specific output.
 *
 * Usage:
 *   bun synthesize.ts [template] [options]
 *
 * Arguments:
 *   template         Domain template (dev-agent, research-agent, etc.)
 *                    If omitted, auto-detects from project
 *
 * Options:
 *   --platform <name>   Target platform (default: agents-md)
 *   --output, -o <path> Output file path (default: AGENTS.md)
 *   --project-root <dir> Project root for auto-detection
 *   --auto-detect       Force auto-detection of project type
 *   --list              List available templates
 *   --verbose, -v       Show detailed output
 *   --help, -h          Show help
 *
 * Examples:
 *   bun synthesize.ts dev-agent --platform claude-md --output CLAUDE.md
 *   bun synthesize.ts --auto-detect --project-root ./my-project
 *   bun synthesize.ts --list
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { logger } from '../../../scripts/logger';

import { magentAdapterRegistry } from './adapters/index';
import type {
    DomainTemplate,
    MagentPlatform,
    ProjectDetection,
    SynthesizeOptions,
    SynthesizeResult,
    UniversalMainAgent,
} from './types';
import { PLATFORM_DISPLAY_NAMES, PLATFORM_FILENAMES } from './types';
import { classifySections, detectPlatform, estimateTokens, parseSections } from './utils';

// ============================================================================
// Constants
// ============================================================================

/** Template directory relative to this script */
const TEMPLATES_DIR = join(dirname(fileURLToPath(import.meta.url)), '../templates');

/** Domain to template file mapping */
const DOMAIN_TEMPLATE_FILES: Record<DomainTemplate, string> = {
    'dev-agent': 'dev-agent.md',
    'research-agent': 'research-agent.md',
    'content-agent': 'content-agent.md',
    'data-agent': 'data-agent.md',
    'devops-agent': 'devops-agent.md',
    'general-agent': 'general-agent.md',
};

/** Project indicator files for auto-detection */
const PROJECT_INDICATORS = {
    'package.json': 'node',
    'go.mod': 'go',
    'Cargo.toml': 'rust',
    'pyproject.toml': 'python',
    'requirements.txt': 'python',
    Makefile: 'make',
    'docker-compose.yml': 'docker',
    'docker-compose.yaml': 'docker',
    Dockerfile: 'docker',
    'pom.xml': 'java',
    'build.gradle': 'java',
};

/** Domain suggestions based on detected language/framework */
const LANGUAGE_TO_DOMAIN: Record<string, DomainTemplate> = {
    node: 'dev-agent',
    go: 'dev-agent',
    rust: 'dev-agent',
    python: 'data-agent',
    java: 'dev-agent',
    make: 'devops-agent',
    docker: 'devops-agent',
};

/** All available templates */
export const AVAILABLE_TEMPLATES: DomainTemplate[] = [
    'dev-agent',
    'research-agent',
    'content-agent',
    'data-agent',
    'devops-agent',
    'general-agent',
];

// ============================================================================
// Project Detection
// ============================================================================

/**
 * Detect project type from files in the project root.
 * Returns language, frameworks, package manager, etc.
 */
export function detectProject(projectRoot: string): ProjectDetection {
    const frameworks: string[] = [];
    let language: string | undefined;
    let packageManager: string | undefined;
    let testRunner: string | undefined;
    let ciPlatform: string | undefined;
    const linters: string[] = [];
    const formatters: string[] = [];
    const existingConfigs: Array<{ path: string; platform: MagentPlatform }> = [];

    // Check for existing agent configs
    for (const platform of Object.keys(PLATFORM_FILENAMES) as MagentPlatform[]) {
        for (const filename of PLATFORM_FILENAMES[platform]) {
            const fullPath = join(projectRoot, filename);
            if (existsSync(fullPath)) {
                existingConfigs.push({ path: fullPath, platform });
            }
        }
    }

    // Detect language/framework from project files
    for (const [file, lang] of Object.entries(PROJECT_INDICATORS)) {
        const fullPath = join(projectRoot, file);
        if (existsSync(fullPath)) {
            language = lang;

            // Detect package manager
            if (file === 'package.json') {
                try {
                    const pkg = JSON.parse(readFileSync(fullPath, 'utf-8'));
                    if (pkg.packageManager?.startsWith('pnpm')) packageManager = 'pnpm';
                    else if (pkg.packageManager?.startsWith('yarn')) packageManager = 'yarn';
                    else if (pkg.lockFileVersion !== undefined) packageManager = 'npm';
                    else if (existsSync(join(projectRoot, 'yarn.lock'))) packageManager = 'yarn';
                    else if (existsSync(join(projectRoot, 'pnpm-lock.yaml'))) packageManager = 'pnpm';
                    else packageManager = 'npm';

                    // Detect frameworks from dependencies
                    if (pkg.dependencies) {
                        if (pkg.dependencies.next) frameworks.push('next.js');
                        if (pkg.dependencies.nuxt) frameworks.push('nuxt');
                        if (pkg.dependencies.express) frameworks.push('express');
                        if (pkg.dependencies.fastify) frameworks.push('fastify');
                        if (pkg.dependencies.react) frameworks.push('react');
                        if (pkg.dependencies.vue) frameworks.push('vue');
                        if (pkg.dependencies.astro) frameworks.push('astro');
                        if (pkg.dependencies['@nestjs/core']) frameworks.push('nestjs');
                    }

                    // Detect test runner
                    if (pkg.devDependencies?.vitest) testRunner = 'vitest';
                    else if (pkg.devDependencies?.jest) testRunner = 'jest';
                    else if (pkg.devDependencies?.mocha) testRunner = 'mocha';
                    else if (pkg.devDependencies?.tap) testRunner = 'tap';

                    // Detect linters/formatters
                    if (pkg.devDependencies?.eslint) linters.push('eslint');
                    if (pkg.devDependencies?.prettier) formatters.push('prettier');
                    if (pkg.devDependencies?.biome) formatters.push('biome');
                    if (pkg.devDependencies?.rome) formatters.push('rome');
                } catch {
                    // Ignore JSON parse errors
                }
            }

            if (file === 'go.mod') {
                try {
                    const content = readFileSync(fullPath, 'utf-8');
                    const match = content.match(/module\s+([^\s]+)/);
                    if (match) frameworks.push(match[1]);
                } catch {
                    // Ignore
                }
            }

            if (file === 'Cargo.toml') {
                try {
                    const content = readFileSync(fullPath, 'utf-8');
                    const match = content.match(/name\s*=\s*"([^"]+)"/);
                    if (match) frameworks.push(match[1]);
                } catch {
                    // Ignore
                }
            }

            if (file === 'pyproject.toml') {
                try {
                    const content = readFileSync(fullPath, 'utf-8');
                    if (content.includes('fastapi')) frameworks.push('fastapi');
                    if (content.includes('django')) frameworks.push('django');
                    if (content.includes('flask')) frameworks.push('flask');
                    if (content.includes('pytest')) testRunner = 'pytest';
                    if (content.includes('ruff')) {
                        linters.push('ruff');
                        formatters.push('ruff');
                    }
                    if (content.includes('black')) formatters.push('black');
                    if (content.includes('mypy')) linters.push('mypy');
                } catch {
                    // Ignore
                }
            }
        }
    }

    // Detect CI platform
    if (existsSync(join(projectRoot, '.github/workflows'))) ciPlatform = 'github-actions';
    else if (existsSync(join(projectRoot, '.gitlab-ci.yml'))) ciPlatform = 'gitlab';
    else if (existsSync(join(projectRoot, 'Jenkinsfile'))) ciPlatform = 'jenkins';

    // Suggest domain based on language
    const suggestedTemplate = language ? (LANGUAGE_TO_DOMAIN[language] ?? 'general-agent') : 'general-agent';

    return {
        frameworks,
        linters,
        formatters,
        existingConfigs,
        suggestedTemplate,
        ...(language ? { language } : {}),
        ...(packageManager ? { packageManager } : {}),
        ...(testRunner ? { testRunner } : {}),
        ...(ciPlatform ? { ciPlatform } : {}),
    };
}

// ============================================================================
// Template Loading and Processing
// ============================================================================

/**
 * Load a template file by domain name.
 */
export function loadTemplate(domain: DomainTemplate): string | null {
    const filename = DOMAIN_TEMPLATE_FILES[domain];
    if (!filename) return null;

    const templatePath = join(TEMPLATES_DIR, filename);
    if (!existsSync(templatePath)) {
        logger.error(`Template not found: ${templatePath}`);
        return null;
    }

    try {
        return readFileSync(templatePath, 'utf-8');
    } catch (error) {
        logger.error(`Failed to read template: ${error}`);
        return null;
    }
}

/**
 * List all available templates.
 */
export function listTemplates(): Array<{ domain: DomainTemplate; filename: string }> {
    return AVAILABLE_TEMPLATES.map((domain) => ({
        domain,
        filename: DOMAIN_TEMPLATE_FILES[domain],
    }));
}

/**
 * Process template variables based on project detection.
 */
export function processTemplate(template: string, detection: ProjectDetection): string {
    let processed = template;

    // Replace domain-specific placeholders
    const replacements: Record<string, string | undefined> = {
        '[primary_language]': detection.language?.toUpperCase() ?? 'TypeScript',
        '[years_experience]': '5',
        '[primary_specialization]': detection.frameworks[0] ?? 'backend APIs',
        '[platform_specific_critical_rule_1]': getCriticalRule(detection.language ?? 'node'),
        '[platform_specific_critical_rule_2]': getCriticalRule2(detection.language ?? 'node'),
        '[indentation_style]': getIndentation(detection.language ?? 'node'),
        '[max_line_length]': '100',
        '[file_naming_convention]': getFileNaming(detection.language ?? 'node'),
        '[private_prefix]': getPrivatePrefix(detection.language ?? 'node'),
        '[test_coverage]': '70',
        '[lint_command]': getLintCommand(detection),
        '[test_command]': getTestCommand(detection),
        '[type_check_command]': getTypeCheckCommand(detection),
        '[build_command]': getBuildCommand(detection),
        '[install_command]': getInstallCommand(detection),
        '[project_type]': detection.frameworks[0] ?? 'application',
        '[research_domains]': 'technology, science, industry trends',
        '[content_types]': 'technical documentation, blog posts',
        '[brand_tone]': 'professional, informative',
        '[brand_name]': 'Acme',
        '[primary_focus]': detection.frameworks[0] ?? 'machine learning',
        '[primary_tools]': getPrimaryTools(detection),
        '[devops_specialization]': detection.frameworks[0] ?? 'cloud infrastructure',
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
        if (value) {
            processed = processed.split(placeholder).join(value);
        }
    }

    // Remove unfilled placeholders
    processed = processed.replace(/\[([^\]]+)\]/g, '');

    return processed;
}

/** Get platform-specific critical rule */
function getCriticalRule(language: string): string {
    switch (language) {
        case 'node':
            return 'Never use `var` - always use `const` or `let`';
        case 'go':
            return 'Never ignore errors - handle all error cases explicitly';
        case 'rust':
            return 'Always handle Result and Option types explicitly';
        case 'python':
            return 'Follow PEP 8 style guidelines';
        default:
            return 'Follow language-specific best practices';
    }
}

function getCriticalRule2(language: string): string {
    switch (language) {
        case 'node':
            return 'Use async/await over callback patterns';
        case 'go':
            return 'Keep functions small and focused (single responsibility)';
        case 'rust':
            return 'Use the type system to prevent runtime errors';
        case 'python':
            return 'Use type hints for function signatures';
        default:
            return 'Write clear, maintainable code';
    }
}

function getIndentation(language: string): string {
    switch (language) {
        case 'python':
            return '4 spaces (no tabs)';
        case 'go':
            return 'tabs (automatic from gofmt)';
        default:
            return '4 spaces';
    }
}

function getFileNaming(language: string): string {
    switch (language) {
        case 'python':
            return 'snake_case';
        case 'go':
            return 'snake_case not used - use PascalCase or camelCase';
        default:
            return 'kebab-case';
    }
}

function getPrivatePrefix(language: string): string {
    switch (language) {
        case 'python':
            return '_';
        case 'rust':
            return '_';
        default:
            return '_';
    }
}

function getLintCommand(detection: ProjectDetection): string {
    if (detection.linters.includes('eslint')) return 'npm run lint';
    if (detection.linters.includes('ruff')) return 'ruff check .';
    if (detection.linters.includes('mypy')) return 'mypy .';
    return 'N/A';
}

function getTestCommand(detection: ProjectDetection): string {
    if (detection.testRunner === 'vitest') return 'npm test';
    if (detection.testRunner === 'jest') return 'npm test';
    if (detection.testRunner === 'pytest') return 'pytest';
    if (detection.testRunner === 'mocha') return 'npm test';
    return 'npm test';
}

function getTypeCheckCommand(detection: ProjectDetection): string {
    if (detection.language === 'node') return 'tsc --noEmit';
    if (detection.language === 'go') return 'go vet ./...';
    if (detection.language === 'rust') return 'cargo check';
    if (detection.language === 'python') return 'mypy .';
    return 'N/A';
}

function getBuildCommand(detection: ProjectDetection): string {
    if (detection.language === 'node') return 'npm run build';
    if (detection.language === 'go') return 'go build ./...';
    if (detection.language === 'rust') return 'cargo build';
    if (detection.language === 'python') return 'pip install -e .';
    return 'make build';
}

function getInstallCommand(detection: ProjectDetection): string {
    if (detection.packageManager === 'pnpm') return 'pnpm install';
    if (detection.packageManager === 'yarn') return 'yarn install';
    if (detection.packageManager === 'npm') return 'npm install';
    if (detection.language === 'go') return 'go mod download';
    if (detection.language === 'rust') return 'cargo fetch';
    if (detection.language === 'python') return 'pip install -e .';
    return 'make install';
}

function getPrimaryTools(detection: ProjectDetection): string {
    if (detection.language === 'node') return 'Node.js, TypeScript, npm/yarn/pnpm';
    if (detection.language === 'go') return 'Go, go mod, golangci-lint';
    if (detection.language === 'rust') return 'Rust, Cargo, rustfmt';
    if (detection.language === 'python') return 'Python, pip, pandas, PyTorch';
    return 'Standard toolchain for the project';
}

// ============================================================================
// UMAM Construction
// ============================================================================

/**
 * Build a UMAM model from processed template content.
 */
export function buildUMAMFromTemplate(
    content: string,
    outputPath: string,
    platform: MagentPlatform,
    domain: DomainTemplate,
): UniversalMainAgent {
    const { sections, preamble } = parseSections(content);
    const classified = classifySections(sections);

    const model: UniversalMainAgent = {
        sourcePath: outputPath,
        sourceFormat: platform,
        sections: classified,
        estimatedTokens: estimateTokens(content),
        rawContent: content,
    };

    if (preamble) model.preamble = preamble;
    model.metadata = {
        name: domain,
        description: `Generated ${domain} configuration`,
    };

    return model;
}

// ============================================================================
// Synthesis
// ============================================================================

/**
 * Synthesize a new main agent configuration from a template.
 */
export async function synthesize(options: SynthesizeOptions): Promise<SynthesizeResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Determine project root
    const projectRoot = options.projectRoot ?? process.cwd();

    // Auto-detect project if requested or no template provided
    let detection: ProjectDetection | undefined;
    let template = options.template;
    let platform = options.platform ?? 'agents-md';
    const outputPath = options.outputPath ?? 'AGENTS.md';

    // If platform is not specified, try to detect from output path
    if (!options.platform && outputPath !== 'AGENTS.md') {
        const detected = detectPlatform(outputPath);
        if (detected) platform = detected;
    }

    // Always run detection to get project info for template processing
    detection = options.detectionOverride ? options.detectionOverride(projectRoot) : detectProject(projectRoot);
    warnings.push(...detection.existingConfigs.map((c) => `Found existing config: ${c.path}`));

    // If no template provided, use detected template
    if (!template) {
        template = detection.suggestedTemplate;
        warnings.push(`Auto-detected template: ${template} (language: ${detection.language ?? 'unknown'})`);
    }

    // Validate template
    if (!template) {
        errors.push('No template specified and auto-detection failed');
        return {
            success: false,
            outputPath,
            platform,
            template: 'general-agent',
            errors,
            warnings,
        };
    }

    if (!AVAILABLE_TEMPLATES.includes(template)) {
        errors.push(`Invalid template: ${template}. Available: ${AVAILABLE_TEMPLATES.join(', ')}`);
        return {
            success: false,
            outputPath,
            platform,
            template,
            errors,
            warnings,
        };
    }

    // Load template
    const templateLoader = options.templateLoaderOverride ?? loadTemplate;
    const templateContent = templateLoader(template);
    if (!templateContent) {
        errors.push(`Failed to load template: ${template}`);
        return {
            success: false,
            outputPath,
            platform,
            template,
            errors,
            warnings,
        };
    }

    // Process template with detection info
    const processedContent = detection ? processTemplate(templateContent, detection) : templateContent;

    // Build UMAM model
    const model = buildUMAMFromTemplate(processedContent, outputPath, platform, template);

    // Generate platform-specific output
    try {
        const adapter = magentAdapterRegistry.get(platform);
        const result = await adapter.generate(model);

        if (!result.success || !result.output) {
            errors.push(...result.errors);
            return {
                success: false,
                outputPath,
                platform,
                template,
                detection,
                errors,
                warnings,
            };
        }

        // Write output
        const resolvedOutput = resolve(outputPath);
        writeFileSync(resolvedOutput, result.output, 'utf-8');

        warnings.push(...result.warnings);

        return {
            success: true,
            outputPath: resolvedOutput,
            platform,
            template,
            detection,
            errors: [],
            warnings,
        };
    } catch (error) {
        errors.push(`Generation failed: ${error instanceof Error ? error.message : String(error)}`);
        return {
            success: false,
            outputPath,
            platform,
            template,
            detection,
            errors,
            warnings,
        };
    }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

export async function main(args: string[] = Bun.argv.slice(2)): Promise<void> {
    const { values, positionals } = parseArgs({
        args,
        options: {
            platform: { type: 'string', short: 'p' },
            output: { type: 'string', short: 'o' },
            'project-root': { type: 'string' },
            'auto-detect': { type: 'boolean' },
            list: { type: 'boolean' },
            verbose: { type: 'boolean', short: 'v' },
            help: { type: 'boolean', short: 'h' },
        },
        allowPositionals: true,
    });

    if (values.help) {
        logger.log(`
Usage: bun synthesize.ts [template] [options]

Arguments:
  template         Domain template (dev-agent, research-agent, content-agent,
                    data-agent, devops-agent, general-agent)

Options:
  --platform, -p <name>   Target platform (default: agents-md)
  --output, -o <path>     Output file path (default: AGENTS.md)
  --project-root <dir>    Project root for auto-detection
  --auto-detect           Force auto-detection of project type
  --list                  List available templates
  --verbose, -v           Show detailed output
  --help, -h              Show help

Supported Platforms:
  agents-md (AGENTS.md) - Universal standard
  claude-md (CLAUDE.md) - Claude Code
  gemini-md (GEMINI.md) - Gemini CLI
  codex - OpenAI Codex
  cursorrules - Cursor
  windsurfrules - Windsurf
  zed-rules - Zed
  opencode-rules - OpenCode

Available Templates:
  dev-agent       - Software development
  research-agent  - Research and analysis
  content-agent   - Content creation
  data-agent      - Data science and ML
  devops-agent    - DevOps and infrastructure
  general-agent   - General purpose

Examples:
  # Create AGENTS.md for a Node.js project
  bun synthesize.ts dev-agent --auto-detect

  # Create CLAUDE.md for a Go project
  bun synthesize.ts dev-agent --platform claude-md --output CLAUDE.md

  # List available templates
  bun synthesize.ts --list
`);
        process.exit(0);
    }

    if (values.list) {
        logger.log('Available templates:');
        for (const { domain, filename } of listTemplates()) {
            logger.log(`  ${domain} -> ${filename}`);
        }
        process.exit(0);
    }

    const templateArg = positionals[0] as DomainTemplate | undefined;
    const platform = values.platform as MagentPlatform | undefined;
    const outputPath = values.output ?? (platform === 'claude-md' ? 'CLAUDE.md' : 'AGENTS.md');

    const options: SynthesizeOptions = {
        ...(templateArg && { template: templateArg }),
        ...(platform && { platform }),
        outputPath,
        ...(values['project-root'] && { projectRoot: values['project-root'] }),
        autoDetect: values['auto-detect'] ?? !templateArg,
    };

    const result = await synthesize(options);

    if (!result.success) {
        logger.error('Synthesis decision: BLOCK');
        for (const error of result.errors) {
            logger.log(`  - ${error}`);
        }
        process.exit(1);
    }

    logger.success('Synthesis decision: PASS');
    logger.log(`Generated: ${result.outputPath}`);
    logger.log(`Platform: ${PLATFORM_DISPLAY_NAMES[result.platform]}`);
    logger.log(`Template: ${result.template}`);

    if (result.detection && values.verbose) {
        logger.log('\nProject Detection:');
        if (result.detection.language) logger.log(`  Language: ${result.detection.language}`);
        if (result.detection.frameworks.length > 0) {
            logger.log(`  Frameworks: ${result.detection.frameworks.join(', ')}`);
        }
        if (result.detection.packageManager) {
            logger.log(`  Package Manager: ${result.detection.packageManager}`);
        }
        if (result.detection.testRunner) logger.log(`  Test Runner: ${result.detection.testRunner}`);
        if (result.detection.ciPlatform) logger.log(`  CI Platform: ${result.detection.ciPlatform}`);
        if (result.warnings.length > 0) {
            logger.log('\nWARN findings:');
            for (const warning of result.warnings) {
                logger.log(`  - ${warning}`);
            }
        }
    }

    process.exit(0);
}

// Run if executed directly
if (import.meta.main) {
    main().catch((error) => {
        logger.error(`Unexpected error: ${error}`);
        process.exit(1);
    });
}
