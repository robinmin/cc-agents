#!/usr/bin/env bun
/**
 * Command Adaptation Script for rd3:cc-commands
 *
 * Audits, fixes, and adapts plugin commands for cross-platform compatibility.
 *
 * Usage:
 *   bun adapt.ts <plugin> <targets> [options]
 *
 * Arguments:
 *   plugin      Plugin name (e.g., rd2, rd3, wt) OR command path
 *   targets     Target platforms: all, codex, gemini, openclaw, claude (default: all)
 *
 * Options:
 *   --component   Component to process: commands, all (default: all)
 *   --dry-run     Preview changes without applying
 *   --verbose     Show detailed output
 *   --help        Show this help message
 *
 * Examples:
 *   bun adapt.ts rd3 all
 *   bun adapt.ts rd2 gemini,openclaw --dry-run
 *   bun adapt.ts ./commands/my-command claude
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { logger, COLORS } from '../../../scripts/logger';

import {
    createAntigravityAdapter,
    createClaudeAdapter,
    createCodexAdapter,
    createCommandAdapterContext,
    createGeminiAdapter,
    createOpenClawAdapter,
    createOpenCodeAdapter,
} from './adapters';
import type { CommandPlatform, ICommandPlatformAdapter } from './types';
import { analyzeBody, inferArgumentHints, parseFrontmatter, readCommand } from './utils';

// ============================================================================
// Types
// ============================================================================

interface AdaptOptions {
    plugin: string;
    targets: string[];
    component: string;
    dryRun: boolean;
    verbose: boolean;
    isPath: boolean;
}

interface AuditResult {
    file: string;
    issues: string[];
    warnings: string[];
    fixed: boolean;
}

interface AdaptResult {
    command: string;
    success: boolean;
    actions: string[];
    errors: string[];
}

// ============================================================================
// Configuration
// ============================================================================

// Navigate from plugins/rd3/skills/cc-commands/scripts to root
const PROJECT_ROOT = resolve(import.meta.dir, '..', '..', '..', '..', '..');

const VALID_TARGETS = ['all', 'codex', 'gemini', 'openclaw', 'claude', 'opencode', 'antigravity'];
const VALID_COMPONENTS = ['commands', 'all'];

// ============================================================================
// Argument Parsing
// ============================================================================

function parseCliArgs(): AdaptOptions {
    const args = parseArgs({
        args: process.argv.slice(2),
        allowPositionals: true,
        options: {
            component: { type: 'string', default: 'all' },
            'dry-run': { type: 'boolean', default: false },
            verbose: { type: 'boolean', default: false },
            help: { type: 'boolean', default: false },
        },
    });

    if (args.values.help) {
        printUsage();
        process.exit(0);
    }

    const pos = args.positionals || [];

    if (pos.length < 1) {
        logger.error('Plugin name or command path is required');
        printUsage();
        process.exit(1);
    }

    const plugin = pos[0];
    const targets = pos[1] ? pos[1].split(',') : ['all'];
    const component = (args.values.component as string) || 'all';
    const dryRun = args.values['dry-run'] as boolean;
    const verbose = args.values.verbose as boolean;

    // Check if it's a path (starts with . or /) or a plugin name
    const isPath = plugin.startsWith('.') || plugin.startsWith('/');

    return { plugin, targets, component, dryRun, verbose, isPath };
}

function printUsage(): void {
    logger.log(`${COLORS.cyan}adapt.ts${COLORS.reset} - Adapt commands for cross-platform compatibility\n`);
    logger.log(`${COLORS.green}USAGE:${COLORS.reset}`);
    logger.log('    bun adapt.ts <plugin|path> <targets> [options]\n');
    logger.log(`${COLORS.green}ARGUMENTS:${COLORS.reset}`);
    logger.log('    plugin      Plugin name (e.g., rd2, rd3, wt) OR command path\n');
    logger.log(
        '    targets     Target platforms: all, codex, gemini, openclaw, claude, opencode, antigravity (default: all)\n',
    );
    logger.log(`${COLORS.green}OPTIONS:${COLORS.reset}`);
    logger.log('    --component   Component: commands, all (default: all)');
    logger.log('    --dry-run     Preview changes without applying');
    logger.log('    --verbose     Show detailed output');
    logger.log('    --help        Show this help message\n');
    logger.log(`${COLORS.green}EXAMPLES:${COLORS.reset}`);
    logger.log('    bun adapt.ts rd3 all');
    logger.log('    bun adapt.ts rd2 gemini,openclaw --dry-run');
    logger.log('    bun adapt.ts ./my-command claude');
}

// ============================================================================
// Validation
// ============================================================================

function validateOptions(options: AdaptOptions): void {
    // Validate targets
    for (const target of options.targets) {
        if (!VALID_TARGETS.includes(target)) {
            logger.error(`Invalid target: ${target}`);
            logger.log(`   Valid: ${VALID_TARGETS.join(', ')}`);
            process.exit(1);
        }
    }

    // Validate component
    if (!VALID_COMPONENTS.includes(options.component)) {
        logger.error(`Invalid component: ${options.component}`);
        logger.log(`   Valid: ${VALID_COMPONENTS.join(', ')}`);
        process.exit(1);
    }

    // Validate plugin/path exists
    if (options.isPath) {
        if (!existsSync(options.plugin)) {
            logger.error(`Path not found: ${options.plugin}`);
            process.exit(1);
        }
    } else {
        const pluginDir = resolve(PROJECT_ROOT, 'plugins', options.plugin);
        if (!existsSync(pluginDir)) {
            logger.error(`Plugin not found: plugins/${options.plugin}`);
            process.exit(1);
        }
    }
}

// ============================================================================
// Command Validation
// ============================================================================

function auditCommand(cmdFile: string): AuditResult {
    const issues: string[] = [];
    const warnings: string[] = [];
    const content = readFileSync(cmdFile, 'utf-8');

    // Check 1: Frontmatter validation
    const parsed = parseFrontmatter(content);

    if (!parsed.frontmatter) {
        if (content.startsWith('---')) {
            issues.push('Invalid frontmatter YAML');
        }
        // No frontmatter is valid
    }

    // Check 2: Invalid fields
    if (parsed.invalidFields.length > 0) {
        for (const field of parsed.invalidFields) {
            issues.push(`Invalid field: ${field}`);
        }
    }

    // Check 3: Unknown fields
    if (parsed.unknownFields.length > 0) {
        for (const field of parsed.unknownFields) {
            warnings.push(`Unknown field: ${field}`);
        }
    }

    // Check 4: Description length
    if (parsed.frontmatter?.description && parsed.frontmatter.description.length > 60) {
        warnings.push(`Description too long: ${parsed.frontmatter.description.length} chars (max: 60)`);
    }

    // Check 5: Second-person language
    const analysis = analyzeBody(parsed.body);
    if (analysis.hasSecondPerson) {
        warnings.push('Uses second-person language (should be imperative)');
    }

    // Check 6: CC-specific patterns
    if (/Task\(/m.test(content)) {
        warnings.push('CC-SPECIFIC Task() pseudocode found');
    }
    if (/Skill\(/m.test(content)) {
        warnings.push('CC-SPECIFIC Skill() pseudocode found');
    }
    if (/!`/m.test(content)) {
        warnings.push('CC-SPECIFIC !`cmd` shell injection found');
    }

    return { file: cmdFile, issues, warnings, fixed: false };
}

function fixCommand(cmdFile: string, _targets: string[]): AuditResult {
    const result = auditCommand(cmdFile);
    if (result.issues.length === 0 && result.warnings.length === 0) {
        result.fixed = true;
        return result;
    }

    let content = readFileSync(cmdFile, 'utf-8');
    const _cmdName = basename(cmdFile, '.md');
    const parsed = parseFrontmatter(content);

    // Fix 1: Remove invalid fields
    if (parsed.invalidFields.length > 0 || parsed.unknownFields.length > 0) {
        const allInvalid = [...parsed.invalidFields, ...parsed.unknownFields];
        for (const field of allInvalid) {
            const fieldRegex = new RegExp(`^${field}:.*$`, 'm');
            content = content.replace(fieldRegex, '');
            logger.info(`  Removed field: ${field}`);
        }
    }

    // Fix 2: Truncate description if too long
    if (parsed.frontmatter?.description && parsed.frontmatter.description.length > 60) {
        const truncated = `${parsed.frontmatter.description.substring(0, 57)}...`;
        content = content.replace(/^description:.*$/m, `description: ${truncated}`);
        logger.info('  Truncated description to 60 chars');
    }

    // Fix 3: Add argument-hint if $N detected
    const _analysis = analyzeBody(parsed.body);
    if (/\$(\d+|ARGUMENTS)/.test(parsed.body) && !parsed.frontmatter?.['argument-hint']) {
        const args = inferArgumentHints(parsed.body) || '<args>';
        content = content.replace(/^---/, `---\nargument-hint: ${args}`);
        logger.info(`  Added argument-hint: ${args}`);
    }

    // Fix 4: Add Platform Notes section if missing
    if (!content.includes('## Platform Notes')) {
        content += `

## Platform Notes

### Claude Code
- Use \`!\`cmd\`\` for live command execution
- Use \`$ARGUMENTS\` or \`$1\`, \`$2\` etc. for parameter references

### Other Agents
- Run commands via Bash tool
- Arguments passed in chat context
`;
        logger.info('  Added Platform Notes section');
    }

    writeFileSync(cmdFile, content, 'utf-8');
    result.fixed = true;
    return result;
}

// ============================================================================
// Platform Adaptation
// ============================================================================

function getAdapter(platform: string): ICommandPlatformAdapter | undefined {
    const factories: Record<string, () => ICommandPlatformAdapter> = {
        claude: createClaudeAdapter,
        codex: createCodexAdapter,
        gemini: createGeminiAdapter,
        openclaw: createOpenClawAdapter,
        opencode: createOpenCodeAdapter,
        antigravity: createAntigravityAdapter,
    };
    const factory = factories[platform];
    if (!factory) return undefined;
    return factory();
}

async function adaptCommand(cmdFile: string, targets: string[], dryRun: boolean): Promise<AdaptResult> {
    const cmdName = basename(cmdFile, '.md');
    const command = await readCommand(cmdFile);
    const bodyAnalysis = analyzeBody(command.body);

    const context = createCommandAdapterContext(command, cmdFile.replace('.md', ''), bodyAnalysis);

    const actions: string[] = [];
    const errors: string[] = [];

    // Get target platforms
    const platforms = targets.includes('all')
        ? ['claude', 'codex', 'gemini', 'openclaw', 'opencode', 'antigravity']
        : (targets as CommandPlatform[]);

    for (const platform of platforms) {
        const adapter = getAdapter(platform);
        if (!adapter) {
            errors.push(`Unknown platform: ${platform}`);
            continue;
        }

        try {
            const result = await adapter.generateCompanions(context);
            if (result.files) {
                for (const [filePath, fileContent] of Object.entries(result.files)) {
                    const dir = dirname(filePath);
                    if (!existsSync(dir)) {
                        mkdirSync(dir, { recursive: true });
                    }
                    if (!dryRun) {
                        writeFileSync(filePath, fileContent as string, 'utf-8');
                    }
                    actions.push(`${platform}: ${basename(filePath)}`);
                }
            }
        } catch (e) {
            errors.push(`Failed to generate ${platform} companions: ${e}`);
        }
    }

    return {
        command: cmdName,
        success: errors.length === 0,
        actions,
        errors,
    };
}

// ============================================================================
// Process Functions
// ============================================================================

async function processCommands(
    pluginDir: string,
    _pluginName: string,
    targets: string[],
    dryRun: boolean,
): Promise<void> {
    let commandFiles: string[] = [];

    if (existsSync(pluginDir) && statSync(pluginDir).isFile()) {
        commandFiles = [pluginDir];
    } else {
        const commandsDir = join(pluginDir, 'commands');
        if (existsSync(commandsDir)) {
            logger.info(`Processing commands in ${commandsDir}...`);
            commandFiles = readdirSync(commandsDir)
                .filter((f) => f.endsWith('.md'))
                .map((f) => join(commandsDir, f));
        } else if (existsSync(pluginDir) && statSync(pluginDir).isDirectory()) {
            logger.info(`Processing commands in ${pluginDir}...`);
            commandFiles = readdirSync(pluginDir)
                .filter((f) => f.endsWith('.md'))
                .map((f) => join(pluginDir, f));
        }
    }

    if (commandFiles.length === 0) {
        logger.info('No commands directory found');
        return;
    }
    let total = 0;
    let issues = 0;
    let adapted = 0;

    for (const cmdFile of commandFiles) {
        if (!statSync(cmdFile).isFile()) continue;

        total++;
        const cmdName = basename(cmdFile, '.md');
        logger.log('');
        logger.info(`Processing: ${cmdName}`);

        // Audit and fix
        if (dryRun) {
            const result = auditCommand(cmdFile);
            for (const issue of result.issues) {
                logger.error(`  [${issue}]`);
            }
            for (const warning of result.warnings) {
                logger.warn(`  [${warning}]`);
            }
            if (result.issues.length > 0 || result.warnings.length > 0) {
                issues++;
            }
        } else {
            const result = fixCommand(cmdFile, targets);
            if (result.issues.length > 0 || result.warnings.length > 0) {
                issues++;
            }
        }

        // Generate platform companions
        if (targets.length > 0 && !targets.includes('none')) {
            const adaptResult = await adaptCommand(cmdFile, targets, dryRun);
            if (adaptResult.actions.length > 0) {
                adapted++;
                for (const action of adaptResult.actions) {
                    logger.success(`  ${action}`);
                }
            }
            if (adaptResult.errors.length > 0) {
                for (const err of adaptResult.errors) {
                    logger.error(`  ${err}`);
                }
            }
        }
    }

    logger.log('');
    logger.info(`Commands: ${total} total, ${issues} issues, ${adapted} adapted`);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
    const options = parseCliArgs();

    validateOptions(options);

    logger.log(`${COLORS.magenta}╔════════════════════════════════════════════════════════════╗${COLORS.reset}`);
    logger.log(
        `${COLORS.magenta}║${COLORS.reset}    ${COLORS.cyan}adapt.ts${COLORS.reset} - Cross-Platform Command Adaptation    ${COLORS.magenta}║${COLORS.reset}`,
    );
    logger.log(`${COLORS.magenta}╚════════════════════════════════════════════════════════════╝${COLORS.reset}\n`);

    const pluginDir = options.isPath ? options.plugin : resolve(PROJECT_ROOT, 'plugins', options.plugin);
    const pluginName = options.isPath ? basename(options.plugin) : options.plugin;

    logger.log(`Plugin: ${pluginName}`);
    logger.log(`Targets: ${options.targets.join(', ')}`);
    logger.log(`Component: ${options.component}`);
    logger.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'APPLY'}`);
    logger.log('');

    if (options.component.includes('commands') || options.component === 'all') {
        await processCommands(pluginDir, pluginName, options.targets, options.dryRun);
    }

    logger.log('');
    logger.success('Adaptation complete!');
    logger.log('');
    logger.info('Next steps:');
    logger.log('  1. Review changes with --dry-run first');
    logger.log('  2. Test commands with each platform');
    logger.log('');
    logger.info('Platform adaptations:');
    logger.log('  - Claude Code: Validation (name, description, argument-hint)');
    logger.log('  - Codex: agents/openai.yaml (UI metadata)');
    logger.log('  - Gemini: commands.toml (TOML format, argument conversion)');
    logger.log('  - OpenClaw: metadata.openclaw + variant');
    logger.log('  - OpenCode: permissions.yaml + variant');
    logger.log('  - Antigravity: @mention variant');
}

main();
