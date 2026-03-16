#!/usr/bin/env bun
/**
 * Skill Scaffolding Script for rd3:cc-skills
 *
 * Creates new skill directories from templates with support for
 * multiple platforms (Claude Code, Codex, Antigravity, OpenCode, OpenClaw)
 *
 * Usage:
 *   bun scaffold.ts <skill-name> --path <output-dir> [options]
 *
 * Options:
 *   --template <type>     Template type: technique, pattern, reference
 *   --resources <list>   Comma-separated: scripts,references,assets
 *   --platform <name>   Target platform: all, claude, codex, openclaw
 *   --examples           Include example files in resource directories
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import type { ResourceType, ScaffoldOptions } from './types';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple logger
const logger = {
    info: (msg: string) => console.log(`[INFO] ${msg}`),
    warn: (msg: string) => console.warn(`[WARN] ${msg}`),
    error: (msg: string) => console.error(`[ERROR] ${msg}`),
    success: (msg: string) => console.log(`✓ ${msg}`),
};

// Utility functions (local implementations)
function ensureDir(path: string): void {
    if (!existsSync(path)) {
        mkdirSync(path, { recursive: true });
    }
}

function pathExists(path: string): boolean {
    return existsSync(path);
}

function readFile(path: string): string {
    return readFileSync(path, 'utf-8');
}

function writeFile(path: string, content: string): void {
    ensureDir(dirname(path));
    writeFileSync(path, content, 'utf-8');
}

// Constants
const ALLOWED_RESOURCE_TYPES: readonly ResourceType[] = ['scripts', 'references', 'assets'];

// Parse resource types from comma-separated string
function parseResourceTypes(resources?: string): ResourceType[] {
    if (!resources) return [];
    const types = resources
        .split(',')
        .map((r) => r.trim() as ResourceType)
        .filter((r) => ALLOWED_RESOURCE_TYPES.includes(r));
    return [...new Set(types)];
}

// Validate resource types
function validateResourceTypes(resources?: string): {
    valid: boolean;
    errors: string[];
    warnings: string[];
} {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!resources) return { valid: true, errors, warnings };
    const types = resources.split(',').map((r) => r.trim());
    const invalid = types.filter((r) => r && !ALLOWED_RESOURCE_TYPES.includes(r as ResourceType));
    if (invalid.length > 0) {
        errors.push(`Unknown resource type(s): ${invalid.join(', ')}`);
        errors.push(`   Allowed: ${ALLOWED_RESOURCE_TYPES.join(', ')}`);
    }
    return { valid: errors.length === 0, errors, warnings };
}

// Template file names
const TEMPLATE_FILES = {
    technique: 'technique.md',
    pattern: 'pattern.md',
    reference: 'reference.md',
} as const;

// Example content for resource directories
const EXAMPLE_SCRIPT = (skillName: string) => `#!/usr/bin/env bun
/**
 * Example helper script for ${skillName}
 *
 * This is a placeholder script. Replace with actual implementation
 * or delete if not needed.
 */

export function example(): void {
  console.log("Example script for ${skillName}");
  // TODO: Add implementation
}
`;

const EXAMPLE_REFERENCE = (skillTitle: string) => `# Reference Documentation for ${skillTitle}

This is a placeholder for detailed reference documentation.
Replace with actual content or delete if not needed.

## When to Use

Reference documentation is useful for:
- API references
- Detailed workflows
- Configuration options
- Examples and patterns
`;

const EXAMPLE_ASSET = `# Example Asset File

This placeholder represents where asset files would be stored.
Replace with actual assets (templates, images, fonts) or delete if not needed.

## Common Asset Types

- Templates: .pptx, .docx, project directories
- Images: .png, .jpg, .svg
- Fonts: .ttf, .woff2
- Data: .json, .csv
`;

/**
 * CLI-specific scaffold options extending the shared ScaffoldOptions.
 * Adds CLI-only fields (platform as single string, verbose flag).
 */
interface ScaffoldCliOptions extends ScaffoldOptions {
    platform: 'all' | 'claude' | 'codex' | 'openclaw' | 'opencode' | 'antigravity';
    verbose: boolean;
}

// Default options
const DEFAULT_OPTIONS: ScaffoldCliOptions = {
    name: '',
    path: './skills',
    template: 'technique',
    resources: [],
    platform: 'all',
    examples: false,
    verbose: false,
};

/**
 * Normalize skill name to lowercase hyphen-case
 */
function normalizeSkillName(name: string): string {
    let normalized = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    // Ensure starts with a letter
    if (!/^[a-z]/.test(normalized)) {
        normalized = `skill-${normalized}`;
    }

    // Limit length
    if (normalized.length > 64) {
        normalized = normalized.substring(0, 64);
    }

    return normalized;
}

/**
 * Convert hyphen-case to Title Case
 */
function toTitleCase(name: string): string {
    return name
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Load template content
 */
function loadTemplate(templateType: 'technique' | 'pattern' | 'reference'): string {
    const templatesDir = resolve(__dirname, '..', 'templates');
    const templateFile = join(templatesDir, TEMPLATE_FILES[templateType]);

    if (!pathExists(templateFile)) {
        logger.error(`Template file not found: ${templateFile}`);
        process.exit(1);
    }

    return readFile(templateFile);
}

/**
 * Process template with variable substitution
 */
function processTemplate(template: string, skillName: string, skillTitle: string): string {
    return template.replace(/\{\{skill_name\}\}/g, skillName).replace(/\{\{skill_title\}\}/g, skillTitle);
}

/**
 * Create resource directories
 */
function createResourceDirs(
    skillDir: string,
    resources: ('scripts' | 'references' | 'assets')[],
    skillName: string,
    skillTitle: string,
    includeExamples: boolean,
): void {
    for (const resource of resources) {
        const resourceDir = join(skillDir, resource);
        ensureDir(resourceDir);

        if (includeExamples) {
            switch (resource) {
                case 'scripts': {
                    const scriptPath = join(resourceDir, 'example.ts');
                    writeFile(scriptPath, EXAMPLE_SCRIPT(skillName));
                    logger.success('Created scripts/example.ts');
                    break;
                }
                case 'references': {
                    const refPath = join(resourceDir, 'overview.md');
                    writeFile(refPath, EXAMPLE_REFERENCE(skillTitle));
                    logger.success('Created references/overview.md');
                    break;
                }
                case 'assets': {
                    const assetPath = join(resourceDir, 'example_asset.txt');
                    writeFile(assetPath, EXAMPLE_ASSET);
                    logger.success('Created assets/example_asset.txt');
                    break;
                }
            }
        } else {
            logger.success(`Created ${resource}/`);
        }
    }
}

/**
 * Generate agents/openai.yaml for Codex compatibility
 *
 * TODO: Replace inline YAML generation with CodexAdapter from ./adapters/
 * to ensure consistent output format and reduce duplication. The CodexAdapter
 * already handles openai.yaml generation via generateCompanions() -- this
 * function should delegate to it instead of duplicating the logic.
 */
function generateOpenaiYaml(skillName: string, skillTitle: string, description: string): string {
    // Extract first sentence for short description
    const shortDescription = `${description.split('. ')[0]}.`;

    // Use the same format as refine.ts CodexAdapter
    return `# Generated by rd3:cc-skills
# This file provides UI metadata for Codex and compatible agents

name: ${skillName}
description: ${description}
version: "1.0.0"
icon: 🛠️
category: coding
tags:
  - skill
  - cc-agents
`;
}

/**
 * Main scaffold function
 */
async function scaffold(options: ScaffoldCliOptions): Promise<string | null> {
    const { name, path, template, resources, platform, examples, verbose } = options;

    // Normalize skill name
    const skillName = normalizeSkillName(name);
    const skillTitle = toTitleCase(skillName);
    const skillDir = resolve(path, skillName);

    if (verbose) {
        logger.info(`Scaffolding skill: ${skillName}`);
        logger.info(`  Location: ${skillDir}`);
        logger.info(`  Template: ${template}`);
        if (resources.length > 0) {
            logger.info(`  Resources: ${resources.join(', ')}`);
        }
        logger.info(`  Platform: ${platform}`);
    }

    // Check if directory already exists
    if (pathExists(skillDir)) {
        logger.error(`Skill directory already exists: ${skillDir}`);
        return null;
    }

    // Create skill directory
    ensureDir(skillDir);
    logger.success(`Created skill directory: ${skillDir}`);

    // Load and process template
    const templateContent = loadTemplate(template);
    const skillMdContent = processTemplate(templateContent, skillName, skillTitle);

    // Create SKILL.md
    const skillMdPath = join(skillDir, 'SKILL.md');
    writeFile(skillMdPath, skillMdContent);
    logger.success('Created SKILL.md');

    // Create agents/openai.yaml for Codex compatibility
    if (platform === 'all' || platform === 'codex') {
        const agentsDir = join(skillDir, 'agents');
        ensureDir(agentsDir);
        const openaiYamlPath = join(agentsDir, 'openai.yaml');

        // Extract description from template (it's in the frontmatter)
        const descriptionMatch = skillMdContent.match(/description:\s*(.+)/);
        const description = descriptionMatch
            ? descriptionMatch[1].replace(/\[TODO:.*?\]/, `Use ${skillTitle} for specialized tasks`).trim()
            : `Use ${skillTitle} for specialized tasks`;

        writeFile(openaiYamlPath, generateOpenaiYaml(skillName, skillTitle, description));
        logger.success('Created agents/openai.yaml');
    }

    // Create resource directories
    if (resources.length > 0) {
        createResourceDirs(skillDir, resources, skillName, skillTitle, examples);
    }

    return skillDir;
}

/**
 * Print next steps guidance
 */
function printNextSteps(skillDir: string, resources: string[], examples: boolean): void {
    console.log(`\n[OK] Skill initialized successfully at ${skillDir}`);
    console.log('\nNext steps:');
    console.log('1. Edit SKILL.md to complete the TODO items and update the description');
    console.log('2. Update agents/openai.yaml if the UI metadata should differ');

    if (resources.length > 0) {
        if (examples) {
            console.log('3. Customize or delete the example files in scripts/, references/, and assets/');
        } else {
            console.log('3. Add resources to scripts/, references/, and assets/ as needed');
        }
    } else {
        console.log('3. Create resource directories only if needed (scripts/, references/, assets/)');
    }

    console.log('4. Run validation: bun validate.ts <skill-path>');
    console.log('5. Test the skill with realistic user requests');
}

/**
 * Print usage information
 */
function printUsage(): void {
    console.log('Usage: scaffold.ts <skill-name> --path <output-dir> [options]');
    console.log('');
    console.log('Arguments:');
    console.log('  <skill-name>          Name of the skill to create');
    console.log('');
    console.log('Options:');
    console.log('  -p, --path <dir>      Output directory (default: ./skills)');
    console.log('  -t, --template <type> Template type: technique, pattern, reference (default: technique)');
    console.log('  -r, --resources <list> Comma-separated: scripts,references,assets');
    console.log(
        '  --platform <name>     Target platform: all, claude, codex, openclaw, opencode, antigravity (default: all)',
    );
    console.log('  -e, --examples        Include example files in resource directories');
    console.log('  -v, --verbose         Enable verbose output');
    console.log('  -h, --help            Show this help message');
}

/**
 * Parse command line arguments
 */
function parseCliArgs(): ScaffoldCliOptions {
    const args = parseArgs({
        args: process.argv.slice(2),
        allowPositionals: true,
        options: {
            path: { type: 'string', short: 'p' },
            template: { type: 'string', short: 't' },
            resources: { type: 'string', short: 'r' },
            platform: { type: 'string' },
            examples: { type: 'boolean', short: 'e', default: false },
            verbose: { type: 'boolean', short: 'v', default: false },
            help: { type: 'boolean', short: 'h', default: false },
        },
    });

    if (args.values.help) {
        printUsage();
        process.exit(0);
    }

    const options = { ...DEFAULT_OPTIONS };

    // Parse positional argument (skill name)
    if (args.positionals && args.positionals.length > 0) {
        options.name = args.positionals[0];
    }

    // Parse named options (type assertion needed for parseArgs return type)
    const values = args.values as Record<string, string | boolean>;
    if (values.path && typeof values.path === 'string') {
        options.path = values.path;
    }
    if (
        values.template &&
        typeof values.template === 'string' &&
        ['technique', 'pattern', 'reference'].includes(values.template)
    ) {
        options.template = values.template as ScaffoldCliOptions['template'];
    }
    if (values.resources && typeof values.resources === 'string') {
        options.resources = parseResourceTypes(values.resources);
    }
    if (
        values.platform &&
        typeof values.platform === 'string' &&
        ['all', 'claude', 'codex', 'openclaw', 'opencode', 'antigravity'].includes(values.platform)
    ) {
        options.platform = values.platform as ScaffoldCliOptions['platform'];
    }
    if (values.examples === true) {
        options.examples = true;
    }
    if (values.verbose === true) {
        options.verbose = true;
    }

    return options;
}

/**
 * Main entry point
 */
async function main() {
    const options = parseCliArgs();

    // Validate required arguments
    if (!options.name) {
        console.error('Usage: scaffold.ts <skill-name> --path <output-dir> [options]');
        console.error('\nOptions:');
        console.error('  --template <type>     Template type: technique, pattern, reference (default: technique)');
        console.error('  --resources <list>   Comma-separated: scripts,references,assets');
        console.error('  --platform <name>   Target platform: all, claude, codex, openclaw (default: all)');
        console.error('  --examples           Include example files in resource directories');
        console.error('  --verbose, -v        Enable verbose output');
        process.exit(1);
    }

    // Validate resource types if specified
    if (options.resources.length > 0) {
        const validation = validateResourceTypes(options.resources.join(','));
        if (!validation.valid) {
            for (const err of validation.errors) {
                console.error(err);
            }
            process.exit(1);
        }
    }

    // Print configuration
    console.log(`Initializing skill: ${options.name}`);
    console.log(`   Location: ${options.path}`);
    if (options.resources.length > 0) {
        console.log(`   Resources: ${options.resources.join(', ')}`);
        if (options.examples) {
            console.log('   Examples: enabled');
        }
    } else {
        console.log('   Resources: none (create as needed)');
    }
    console.log();

    // Run scaffolding
    const skillDir = await scaffold(options);

    if (skillDir) {
        printNextSteps(skillDir, options.resources, options.examples);
        process.exit(0);
    } else {
        process.exit(1);
    }
}

main();
