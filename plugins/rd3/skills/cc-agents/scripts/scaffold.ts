#!/usr/bin/env bun
/**
 * Agent Scaffolding Script for rd3:cc-agents
 *
 * Creates new agent .md files from tiered templates (minimal, standard, specialist)
 * with placeholder substitution.
 *
 * Usage:
 *   bun scaffold.ts <agent-name> --path <output-dir> [options]
 *
 * Options:
 *   --template <tier>       Template tier: minimal, standard, specialist (default: standard)
 *   --description <text>    Agent description
 *   --tools <list>          Comma-separated tool list (default: Read, Grep, Glob, Bash)
 *   --model <model>         Model override (default: inherit)
 *   --color <color>         Display color (default: teal)
 *   --plugin-name <name>    Plugin name for skill references
 *   --verbose, -v           Verbose output
 *   --help, -h              Show help
 */

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { logger } from '../../../scripts/logger';
import { ensureDir, pathExists, readFile, titleCaseSkillName, writeFile } from '../../../scripts/utils';
import type { AgentScaffoldOptions, AgentScaffoldResult, AgentTemplate } from './types';
import { normalizeAgentName } from './utils';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Constants
// ============================================================================

const TEMPLATE_FILES: Record<AgentTemplate, string> = {
    minimal: 'minimal.md',
    standard: 'standard.md',
    specialist: 'specialist.md',
};

const DEFAULT_TOOLS = 'Read, Grep, Glob, Bash';
const DEFAULT_MODEL = 'inherit';
const DEFAULT_COLOR = 'teal';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Load a template from the templates directory.
 */
function loadTemplate(tier: AgentTemplate): string {
    const templatesDir = resolve(__dirname, '..', 'templates');
    const templateFile = join(templatesDir, TEMPLATE_FILES[tier]);

    if (!pathExists(templateFile)) {
        throw new Error(`Template file not found: ${templateFile}`);
    }

    return readFile(templateFile);
}

/**
 * Process template with placeholder substitution.
 */
function processTemplate(template: string, agentName: string, options: AgentScaffoldOptions): string {
    const agentTitle = titleCaseSkillName(agentName);
    const description = options.description || '[TODO: Brief description of what this agent does]';
    const tools = options.tools?.join(', ') || DEFAULT_TOOLS;
    const model = options.model || DEFAULT_MODEL;
    const pluginName = options.pluginName || '{{PLUGIN_NAME}}';

    // Resolve skills: explicit --skills takes priority, then plugin-name derivation, then placeholder
    let skillsValue: string;
    if (options.skills && options.skills.length > 0) {
        skillsValue = options.skills.join(', ');
    } else if (options.pluginName) {
        skillsValue = `${pluginName}:${agentName}`;
    } else {
        skillsValue = '[TODO: plugin-name:skill-name]';
    }

    return template
        .replace(/\{\{AGENT_NAME\}\}/g, agentName)
        .replace(/\{\{AGENT_TITLE\}\}/g, agentTitle)
        .replace(/\{\{DESCRIPTION\}\}/g, description)
        .replace(/\{\{TOOLS\}\}/g, tools)
        .replace(/\{\{MODEL\}\}/g, model)
        .replace(/\{\{COLOR\}\}/g, options.color || DEFAULT_COLOR)
        .replace(/\{\{PLUGIN_NAME\}\}/g, pluginName)
        .replace(/\{\{SKILLS\}\}/g, skillsValue)
        .replace(/\{\{SYSTEM_PROMPT\}\}/g, `[TODO: System prompt for ${agentTitle}]`)
        .replace(/\{\{ROLE_SUMMARY\}\}/g, `[TODO: One-line summary of ${agentTitle} role]`)
        .replace(/\{\{ROLE_DESCRIPTION\}\}/g, '[TODO: Role description]')
        .replace(/\{\{ROLE_TITLE\}\}/g, `[TODO: ${agentTitle} Role Title]`)
        .replace(/\{\{SPECIALIZATION\}\}/g, '[TODO: Specialization area]')
        .replace(/\{\{DOMAIN\}\}/g, '[TODO: Domain]')
        .replace(/\{\{PURPOSE_STATEMENT\}\}/g, `[TODO: Purpose of ${agentTitle}]`)
        .replace(/\{\{USE_CASES\}\}/g, '[TODO: list key use cases]')
        .replace(/\{\{TRIGGER_PHRASE_\d+\}\}/g, '[TODO: trigger phrase]')
        .replace(/\{\{EXPERTISE_\d+\}\}/g, '[TODO: Expertise Area]')
        .replace(/\{\{COMPETENCY_AREA_\d+\}\}/g, '[TODO: Competency Area]')
        .replace(/\{\{OUTPUT_TITLE\}\}/g, `${agentTitle} Report`);
}

// ============================================================================
// Main Scaffold Function
// ============================================================================

/**
 * Scaffold a new agent file from a template.
 *
 * @param options - Scaffold options including name, path, template tier
 * @returns Scaffold result with created file paths and any errors
 */
export async function scaffoldAgent(options: AgentScaffoldOptions): Promise<AgentScaffoldResult> {
    const result: AgentScaffoldResult = {
        success: false,
        agentPath: '',
        agentName: '',
        created: [],
        errors: [],
        warnings: [],
    };

    // Normalize agent name
    const agentName = normalizeAgentName(options.name);
    if (!agentName || agentName.length < 3) {
        result.errors.push(`Invalid agent name: '${options.name}' (must be 3+ chars, lowercase hyphen-case)`);
        return result;
    }

    if (agentName.length > 50) {
        result.errors.push(`Agent name too long: ${agentName.length} chars (max 50)`);
        return result;
    }

    result.agentName = agentName;

    // Determine output path
    const outputDir = resolve(options.path);
    const agentPath = join(outputDir, `${agentName}.md`);
    result.agentPath = agentPath;

    // Check if file already exists
    if (pathExists(agentPath)) {
        result.errors.push(`Agent file already exists: ${agentPath}`);
        return result;
    }

    // Load and process template
    const tier = options.template || 'standard';
    try {
        const template = loadTemplate(tier);
        const content = processTemplate(template, agentName, options);

        // Ensure output directory exists
        ensureDir(outputDir);

        // Write agent file
        writeFile(agentPath, content);
        result.created.push(agentPath);
        logger.success(`Created ${agentPath}`);
    } catch (error) {
        result.errors.push(`Failed to create agent: ${error instanceof Error ? error.message : String(error)}`);
        return result;
    }

    result.success = true;
    return result;
}

// ============================================================================
// CLI
// ============================================================================

function printUsage(): void {
    logger.log('Usage: scaffold.ts <agent-name> [description] [options]');
    logger.log('');
    logger.log('Arguments:');
    logger.log('  <agent-name>           Name of the agent to create (hyphen-case)');
    logger.log('  [description]          Optional agent description (free-text)');
    logger.log('');
    logger.log('Options:');
    logger.log('  -p, --path <dir>       Output directory (default: ./agents)');
    logger.log('  -t, --template <tier>  Template: minimal, standard, specialist (default: standard)');
    logger.log('  --description <text>   Agent description');
    logger.log('  --tools <list>         Comma-separated tools (default: Read,Grep,Glob,Bash)');
    logger.log('  --model <model>        Model override (default: inherit)');
    logger.log('  --color <color>        Display color (default: teal)');
    logger.log('  --plugin-name <name>   Plugin name for skill references');
    logger.log('  --skills <list>        Comma-separated skills to delegate to');
    logger.log('  -v, --verbose          Verbose output');
    logger.log('  -h, --help             Show help');
}

function printNextSteps(agentPath: string, _agentName: string, tier: AgentTemplate): void {
    logger.success(`Agent created successfully at ${agentPath}`);
    logger.log(`\nTemplate tier: ${tier}`);
    logger.log('\nNext steps:');
    logger.log('1. Edit the agent file to complete TODO items');
    logger.log('2. Update the description with trigger phrases and examples');
    logger.log('3. Fill in the system prompt / persona / competencies');
    logger.log(`4. Validate: bun validate.ts ${agentPath}`);
    logger.log(`5. Evaluate: bun evaluate.ts ${agentPath} --scope full`);
}

function parseCliArgs(): AgentScaffoldOptions & { verbose: boolean } {
    const args = parseArgs({
        args: process.argv.slice(2),
        allowPositionals: true,
        options: {
            path: { type: 'string', short: 'p' },
            template: { type: 'string', short: 't' },
            description: { type: 'string' },
            tools: { type: 'string' },
            model: { type: 'string' },
            color: { type: 'string' },
            'plugin-name': { type: 'string' },
            skills: { type: 'string' },
            verbose: { type: 'boolean', short: 'v', default: false },
            help: { type: 'boolean', short: 'h', default: false },
        },
    });

    if (args.values.help) {
        printUsage();
        process.exit(0);
    }

    const name = args.positionals?.[0] || '';
    // Second positional is optional description (free-text)
    const positionalDescription = args.positionals?.[1] || '';
    const template = (args.values.template as AgentTemplate) || 'standard';
    const validTemplates: AgentTemplate[] = ['minimal', 'standard', 'specialist'];

    if (!validTemplates.includes(template)) {
        logger.error(`Error: Invalid template '${template}'. Must be: ${validTemplates.join(', ')}`);
        process.exit(1);
    }

    const result: AgentScaffoldOptions & { verbose: boolean } = {
        name,
        path: (args.values.path as string) || './agents',
        template,
        verbose: args.values.verbose as boolean,
    };

    // --description flag takes priority over positional description
    const descValue = (args.values.description as string) || positionalDescription;
    if (descValue) result.description = descValue;
    if (args.values.model) result.model = args.values.model as string;
    if (args.values.color) result.color = args.values.color as string;
    if (args.values['plugin-name']) result.pluginName = args.values['plugin-name'] as string;

    // Parse tools from comma-separated string
    if (args.values.tools) {
        result.tools = (args.values.tools as string).split(',').map((t) => t.trim());
    }

    // Parse skills from comma-separated string
    if (args.values.skills) {
        result.skills = (args.values.skills as string).split(',').map((s) => s.trim());
    }

    return result;
}

async function main() {
    const options = parseCliArgs();

    if (!options.name) {
        logger.error('Error: Missing required argument <agent-name>');
        printUsage();
        process.exit(1);
    }

    logger.info(`Scaffolding agent: ${options.name}`);
    logger.info(`  Template: ${options.template}`);
    logger.info(`  Path: ${options.path}`);

    const result = await scaffoldAgent(options);

    if (result.success) {
        printNextSteps(result.agentPath, result.agentName, options.template || 'standard');
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
