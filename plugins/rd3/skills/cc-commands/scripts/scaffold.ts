#!/usr/bin/env bun
/**
 * Command Scaffolding Script for rd3:cc-commands
 *
 * Creates new slash command .md files from templates with support for
 * multiple platforms (Claude Code, Codex, Gemini, OpenClaw, OpenCode, Antigravity)
 *
 * Usage:
 *   bun scaffold.ts <command-name> --path <output-dir> [options]
 *
 * Options:
 *   --template <type>     Template type: simple, workflow, plugin (default: simple)
 *   --platform <name>     Target platform for companions: all, claude, codex, gemini, etc.
 *   --plugin-name <name>  Plugin name for plugin template commands
 *   --description <text>  Description for frontmatter
 *   --verbose, -v         Verbose output
 *   --help, -h            Show help
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { logger } from '../../../scripts/logger';
import { ensureDir, readFile, writeFile } from '../../../scripts/utils';
import type { CommandPlatform, CommandScaffoldOptions, CommandScaffoldResult, CommandTemplate } from './types';
import { normalizeCommandName } from './utils';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert hyphen-case to Title Case.
 */
function toTitleCase(name: string): string {
    return name
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Template file mapping
const TEMPLATE_FILES: Record<CommandTemplate, string> = {
    simple: 'simple.md',
    workflow: 'workflow.md',
    plugin: 'plugin.md',
};

// ============================================================================
// Template Processing
// ============================================================================

/**
 * Load a template from the templates directory.
 */
function loadTemplate(templateType: CommandTemplate): string {
    const templatesDir = resolve(__dirname, '..', 'templates');
    const templateFile = join(templatesDir, TEMPLATE_FILES[templateType]);

    if (!existsSync(templateFile)) {
        throw new Error(`Template file not found: ${templateFile}`);
    }

    return readFile(templateFile);
}

/**
 * Process template with variable substitution.
 */
function processTemplate(template: string, commandName: string, options: CommandScaffoldOptions): string {
    const commandTitle = toTitleCase(commandName);
    const description = options.description || '[TODO: Brief description under 60 chars]';
    const pluginName = options.pluginName || '{{PLUGIN_NAME}}';

    return template
        .replace(/\{\{COMMAND_NAME\}\}/g, commandName)
        .replace(/\{\{COMMAND_TITLE\}\}/g, commandTitle)
        .replace(/\{\{DESCRIPTION\}\}/g, description)
        .replace(/\{\{ARGUMENT_HINT\}\}/g, '[args]')
        .replace(/\{\{PLUGIN_NAME\}\}/g, pluginName)
        .replace(/\{\{SKILL_NAME\}\}/g, commandName)
        .replace(/\{\{SKILL_DIR\}\}/g, commandName)
        .replace(/\{\{SCRIPT_NAME\}\}/g, commandName)
        .replace(/\{\{AGENT_NAME\}\}/g, `super-${commandName}`);
}

// ============================================================================
// Main Scaffold Function
// ============================================================================

/**
 * Scaffold a new command file from a template.
 */
export async function scaffold(options: CommandScaffoldOptions): Promise<CommandScaffoldResult> {
    const result: CommandScaffoldResult = {
        success: false,
        commandPath: '',
        commandName: '',
        created: [],
        errors: [],
        warnings: [],
    };

    // Normalize command name
    const commandName = normalizeCommandName(options.name);
    if (!commandName) {
        result.errors.push(`Invalid command name: ${options.name}`);
        return result;
    }

    result.commandName = commandName;

    // Determine output path
    const outputDir = resolve(options.path);
    const commandPath = join(outputDir, `${commandName}.md`);
    result.commandPath = commandPath;

    // Check if file already exists
    if (existsSync(commandPath)) {
        result.errors.push(`Command file already exists: ${commandPath}`);
        return result;
    }

    // Load and process template
    const templateType = options.template || 'simple';
    try {
        const template = loadTemplate(templateType);
        const content = processTemplate(template, commandName, options);

        // Ensure output directory exists
        ensureDir(outputDir);

        // Write command file
        writeFile(commandPath, content);
        result.created.push(commandPath);
        logger.success(`Created ${commandPath}`);
    } catch (error) {
        result.errors.push(`Failed to create command: ${error instanceof Error ? error.message : String(error)}`);
        return result;
    }

    result.success = true;
    return result;
}

// ============================================================================
// CLI
// ============================================================================

function printUsage(): void {
    console.log('Usage: scaffold.ts <command-name> --path <output-dir> [options]');
    console.log('');
    console.log('Arguments:');
    console.log('  <command-name>         Name of the command to create');
    console.log('');
    console.log('Options:');
    console.log('  -p, --path <dir>       Output directory (default: ./commands)');
    console.log('  -t, --template <type>  Template: simple, workflow, plugin (default: simple)');
    console.log('  --platform <name>      Target platform: all, claude, codex, gemini, etc.');
    console.log('  --plugin-name <name>   Plugin name for plugin template');
    console.log('  --description <text>   Description for frontmatter');
    console.log('  -v, --verbose          Verbose output');
    console.log('  -h, --help             Show help');
}

function printNextSteps(commandPath: string, commandName: string): void {
    console.log(`\n[OK] Command created successfully at ${commandPath}`);
    console.log('\nNext steps:');
    console.log('1. Edit the command file to complete TODO items');
    console.log('2. Update the description (keep under 60 characters)');
    console.log('3. Add imperative instructions for Claude');
    console.log(`4. Validate: bun validate.ts ${commandPath}`);
    console.log(`5. Evaluate: bun evaluate.ts ${commandPath} --scope full`);
}

function parseCliArgs(): CommandScaffoldOptions & { verbose: boolean } {
    const args = parseArgs({
        args: process.argv.slice(2),
        allowPositionals: true,
        options: {
            path: { type: 'string', short: 'p' },
            template: { type: 'string', short: 't' },
            platform: { type: 'string' },
            'plugin-name': { type: 'string' },
            description: { type: 'string' },
            verbose: { type: 'boolean', short: 'v', default: false },
            help: { type: 'boolean', short: 'h', default: false },
        },
    });

    if (args.values.help) {
        printUsage();
        process.exit(0);
    }

    const name = args.positionals?.[0] || '';
    const template = (args.values.template as CommandTemplate) || 'simple';
    const validTemplates: CommandTemplate[] = ['simple', 'workflow', 'plugin'];

    if (!validTemplates.includes(template)) {
        console.error(`Error: Invalid template '${template}'. Must be: ${validTemplates.join(', ')}`);
        process.exit(1);
    }

    const pluginNameVal = args.values['plugin-name'] as string | undefined;
    const descriptionVal = args.values.description as string | undefined;

    const result: CommandScaffoldOptions & { verbose: boolean } = {
        name,
        path: (args.values.path as string) || './commands',
        template,
        verbose: args.values.verbose as boolean,
    };

    // Only add optional fields if they have values
    if (pluginNameVal) result.pluginName = pluginNameVal;
    if (descriptionVal) result.description = descriptionVal;

    // Parse --platform flag into platforms array
    const platformVal = args.values.platform as string | undefined;
    if (platformVal) {
        const validPlatforms = ['claude', 'codex', 'gemini', 'openclaw', 'opencode', 'antigravity', 'all'] as const;
        let platforms: string[];
        if (platformVal === 'all') {
            platforms = validPlatforms.filter((p) => p !== 'all') as string[];
        } else {
            platforms = [platformVal];
        }
        for (const p of platforms) {
            if (!validPlatforms.includes(p as (typeof validPlatforms)[number])) {
                console.error(`Error: Invalid platform '${p}'. Must be: ${validPlatforms.join(', ')}`);
                process.exit(1);
            }
        }
        result.platforms = platforms as CommandPlatform[];
    }

    return result;
}

async function main() {
    const options = parseCliArgs();

    if (!options.name) {
        console.error('Error: Missing required argument <command-name>');
        printUsage();
        process.exit(1);
    }

    logger.info(`Scaffolding command: ${options.name}`);
    logger.info(`  Template: ${options.template}`);
    logger.info(`  Path: ${options.path}`);

    const result = await scaffold(options);

    if (result.success) {
        printNextSteps(result.commandPath, result.commandName);
        process.exit(0);
    } else {
        for (const error of result.errors) {
            logger.error(error);
        }
        process.exit(1);
    }
}

if (import.meta.main) {
    main();
}
