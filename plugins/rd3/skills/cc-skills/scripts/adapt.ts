#!/usr/bin/env bun
/**
 * Skill Adaptation Script for rd3:cc-skills
 *
 * Audits, fixes, and adapts plugin skills for cross-platform compatibility
 * following the agentskills.io standard.
 *
 * Usage:
 *   bun adapt.ts <plugin> <targets> [options]
 *
 * Arguments:
 *   plugin      Plugin name (e.g., rd2, rd3, wt) OR skill path
 *   targets     Target platforms: all, codex, openclaw, claude (default: all)
 *
 * Options:
 *   --component   Component to process: commands, skills, subagents, all (default: all)
 *   --dry-run     Preview changes without applying
 *   --verbose     Show detailed output
 *   --help        Show this help message
 *
 * Examples:
 *   bun adapt.ts rd3 all
 *   bun adapt.ts rd2 codex,openclaw --dry-run
 *   bun adapt.ts ./skills/my-skill claude --component skills
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

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

// ============================================================================
// Configuration
// ============================================================================

// Navigate from plugins/rd3/skills/cc-skills/scripts to root
const PROJECT_ROOT = resolve(import.meta.dir, '..', '..', '..', '..', '..');

const COLORS = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
};

const VALID_TARGETS = ['all', 'codex', 'openclaw', 'claude', 'opencode', 'antigravity'];
const VALID_COMPONENTS = ['commands', 'skills', 'subagents', 'all'];

// ============================================================================
// Logger
// ============================================================================

const logger = {
    info: (msg: string) => console.log(`${COLORS.cyan}ℹ️  ${msg}${COLORS.reset}`),
    success: (msg: string) => console.log(`${COLORS.green}✅ ${msg}${COLORS.reset}`),
    warning: (msg: string) => console.warn(`${COLORS.yellow}⚠️  ${msg}${COLORS.reset}`),
    error: (msg: string) => console.error(`${COLORS.red}❌ ${msg}${COLORS.reset}`),
    header: () => {
        console.log(`${COLORS.magenta}╔════════════════════════════════════════════════════════════╗${COLORS.reset}`);
        console.log(
            `${COLORS.magenta}║${COLORS.reset}    ${COLORS.cyan}adapt.ts${COLORS.reset} - Cross-Platform Adaptation        ${COLORS.magenta}║${COLORS.reset}`,
        );
        console.log(`${COLORS.magenta}╚════════════════════════════════════════════════════════════╝${COLORS.reset}\n`);
    },
};

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
        logger.error('Plugin name or skill path is required');
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
    console.log(`${COLORS.cyan}adapt.ts${COLORS.reset} - Adapt plugin for cross-platform compatibility\n`);
    console.log(`${COLORS.green}USAGE:${COLORS.reset}`);
    console.log('    bun adapt.ts <plugin|path> <targets> [options]\n');
    console.log(`${COLORS.green}ARGUMENTS:${COLORS.reset}`);
    console.log('    plugin      Plugin name (e.g., rd2, rd3, wt) OR skill path\n');
    console.log('    targets     Target platforms: all, codex, openclaw, claude (default: all)\n');
    console.log(`${COLORS.green}OPTIONS:${COLORS.reset}`);
    console.log('    --component   Component: commands, skills, subagents, all (default: all)');
    console.log('    --dry-run     Preview changes without applying');
    console.log('    --verbose     Show detailed output');
    console.log('    --help        Show this help message\n');
    console.log(`${COLORS.green}EXAMPLES:${COLORS.reset}`);
    console.log('    bun adapt.ts rd3 all');
    console.log('    bun adapt.ts rd2 codex,openclaw --dry-run');
    console.log('    bun adapt.ts ./skills/my-skill claude --component skills');
}

// ============================================================================
// Validation
// ============================================================================

function validateOptions(options: AdaptOptions): void {
    // Validate targets
    for (const target of options.targets) {
        if (!VALID_TARGETS.includes(target)) {
            logger.error(`Invalid target: ${target}`);
            console.log(`   Valid: ${VALID_TARGETS.join(', ')}`);
            process.exit(1);
        }
    }

    // Validate component
    if (!VALID_COMPONENTS.includes(options.component)) {
        logger.error(`Invalid component: ${options.component}`);
        console.log(`   Valid: ${VALID_COMPONENTS.join(', ')}`);
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
// Skills 2.0 Compliance - Commands
// ============================================================================

function auditCommand(cmdFile: string, pluginName: string): AuditResult {
    const issues: string[] = [];
    const warnings: string[] = [];
    const content = readFileSync(cmdFile, 'utf-8');

    // Check 1: Frontmatter must have 'name' field
    if (!/^name:/m.test(content)) {
        issues.push('MISSING name: field in frontmatter');
    }

    // Check 2: Frontmatter must have 'description' field
    if (!/^description:/m.test(content)) {
        issues.push('MISSING description: field in frontmatter');
    }

    // Check 3: Should have 'disable-model-invocation: true' for commands
    if (!/^disable-model-invocation:/m.test(content)) {
        warnings.push('OPTIONAL disable-model-invocation: not set');
    }

    // Check 4: CC-specific patterns
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

function fixCommand(cmdFile: string, pluginName: string): AuditResult {
    const result = auditCommand(cmdFile, pluginName);
    if (result.issues.length === 0 && result.warnings.length === 0) {
        result.fixed = true;
        return result;
    }

    let content = readFileSync(cmdFile, 'utf-8');
    const cmdName = basename(cmdFile, '.md');

    // Fix 1: Add 'name:' field if missing
    if (!/^name:/m.test(content)) {
        if (/^---/m.test(content)) {
            content = content.replace(/^---/, `---\nname: ${pluginName}-${cmdName}`);
            logger.info(`  Added name: ${pluginName}-${cmdName}`);
        }
    }

    // Fix 2: Add 'disable-model-invocation: true' if not present
    if (!/^disable-model-invocation:/m.test(content)) {
        if (/^---/m.test(content)) {
            content = content.replace(/^---/, '---\ndisable-model-invocation: true');
            logger.info('  Added disable-model-invocation: true');
        }
    }

    // Fix 3: Add platform section for CC-specific syntax
    const hasCcSyntax = /Task\(|Skill\(|!`/m.test(content);
    if (hasCcSyntax && !/## Platform Notes/m.test(content)) {
        content += `

## Platform Notes

### Claude Code
- Uses Task(), Skill(), and !\`cmd\` pseudocode for orchestration

### Other Agents
- These commands are available as Skills in .agents/skills/ or .codex/skills/
`;
        logger.info('  Added Platform Notes section');
    }

    writeFileSync(cmdFile, content, 'utf-8');
    result.fixed = true;
    return result;
}

// ============================================================================
// Skills 2.0 Compliance - Skills
// ============================================================================

function auditSkill(skillDir: string): AuditResult {
    const issues: string[] = [];
    const warnings: string[] = [];
    const skillName = basename(skillDir);
    const skillFile = join(skillDir, 'SKILL.md');

    if (!existsSync(skillFile)) {
        issues.push('MISSING SKILL.md file');
        return { file: skillDir, issues, warnings, fixed: false };
    }

    const content = readFileSync(skillFile, 'utf-8');

    // Check 1: 'name:' must match directory name
    const nameMatch = content.match(/^name:\s*(.+)$/m);
    const nameInFile = nameMatch ? nameMatch[1].trim() : '';
    if (nameInFile !== skillName) {
        issues.push(`MISMATCH name: '${nameInFile}' != directory '${skillName}'`);
    }

    // Check 2: 'description:' should exist and be descriptive
    const descMatch = content.match(/^description:\s*(.+)$/m);
    if (!descMatch) {
        issues.push('MISSING description: field');
    } else if (descMatch[1].trim().length < 20) {
        warnings.push(`SHORT description too short (${descMatch[1].trim().length} chars)`);
    }

    // Check 3: CC-specific patterns
    if (/Task\(/m.test(content)) {
        warnings.push('CC-SPECIFIC Task() pseudocode');
    }
    if (/!`/m.test(content)) {
        warnings.push('CC-SPECIFIC !`cmd` shell injection');
    }

    return { file: skillDir, issues, warnings, fixed: false };
}

function fixSkill(skillDir: string): AuditResult {
    const result = auditSkill(skillDir);
    if (result.issues.length === 0) {
        result.fixed = true;
        return result;
    }

    const skillName = basename(skillDir);
    const skillFile = join(skillDir, 'SKILL.md');
    let content = readFileSync(skillFile, 'utf-8');

    // Fix 1: Ensure name matches directory
    if (!new RegExp(`^name: ${skillName}`, 'm').test(content)) {
        if (/^name:/m.test(content)) {
            content = content.replace(/^name:.*/m, `name: ${skillName}`);
            logger.info(`  Fixed name: -> ${skillName}`);
        } else {
            content = `---\nname: ${skillName}\n${content}`;
            logger.info(`  Added name: ${skillName}`);
        }
    }

    writeFileSync(skillFile, content, 'utf-8');
    result.fixed = true;
    return result;
}

// ============================================================================
// Platform Adaptations
// ============================================================================

function generateCodexYaml(skillDir: string): string {
    const skillName = basename(skillDir);
    const skillFile = join(skillDir, 'SKILL.md');
    const content = readFileSync(skillFile, 'utf-8');

    // Extract fields from frontmatter
    const descMatch = content.match(/^description:\s*(.+)$/m);
    const description = descMatch ? descMatch[1].trim() : `${skillName} skill`;

    const versionMatch = content.match(/^ {2}version:\s*(.+)$/m);
    const version = versionMatch ? versionMatch[1].trim().replace(/"/g, '') : '1.0.0';

    const emojiMatch = content.match(/emoji:\s*["']?([^"'\n]+)["']?/);
    const emoji = emojiMatch ? emojiMatch[1].trim() : '🛠️';

    return `# Generated by rd3:cc-skills
# This file provides UI metadata for Codex and compatible agents

name: ${skillName}
description: ${description}
version: "${version}"
icon: ${emoji}
category: coding
tags:
  - skill
  - cc-agents
`;
}

function adaptForCodex(skillDir: string, targets: string[], dryRun: boolean): void {
    if (!targets.includes('codex') && !targets.includes('all')) return;

    const skillName = basename(skillDir);
    logger.info(`Adapting for Codex: ${skillName}`);

    const agentsDir = join(skillDir, 'agents');
    const yamlFile = join(agentsDir, 'openai.yaml');

    if (existsSync(yamlFile)) {
        logger.info('  [SKIP] agents/openai.yaml already exists');
        return;
    }

    if (dryRun) {
        logger.info('  [WOULD CREATE] agents/openai.yaml');
        return;
    }

    mkdirSync(agentsDir, { recursive: true });
    writeFileSync(yamlFile, generateCodexYaml(skillDir), 'utf-8');
    logger.success('Created: agents/openai.yaml');
}

function adaptForOpenclaw(skillDir: string, targets: string[], dryRun: boolean): void {
    if (!targets.includes('openclaw') && !targets.includes('all')) return;

    const skillName = basename(skillDir);
    const skillFile = join(skillDir, 'SKILL.md');
    logger.info(`Adapting for OpenClaw: ${skillName}`);

    const content = readFileSync(skillFile, 'utf-8');

    // Check if metadata.openclaw already exists
    if (/metadata:.*openclaw/s.test(content) || /^ {2}openclaw:/m.test(content)) {
        logger.info('  [SKIP] openclaw metadata already exists');
        return;
    }

    if (dryRun) {
        logger.info('  [WOULD ADD] metadata.openclaw to frontmatter');
        return;
    }

    // Add metadata.openclaw after description
    const emoji = '🛠️';
    const homepage = 'https://github.com/cc-agents/cc-agents';
    const metadata = `\nmetadata:\n  openclaw:\n    emoji: "${emoji}"\n    homepage: "${homepage}"`;

    const newContent = content.replace(/(^description:.*$)/m, `$1${metadata}`);
    writeFileSync(skillFile, newContent, 'utf-8');
    logger.success('Added: metadata.openclaw to frontmatter');
}

// ============================================================================
// Process Functions
// ============================================================================

function processCommands(pluginDir: string, pluginName: string, targets: string[], dryRun: boolean): void {
    const commandsDir = join(pluginDir, 'commands');
    if (!existsSync(commandsDir)) {
        logger.info('No commands directory found');
        return;
    }

    logger.info(`Processing commands in ${commandsDir}...`);

    const files = readdirSync(commandsDir).filter((f) => f.endsWith('.md'));
    let total = 0;
    let issues = 0;

    for (const file of files) {
        const cmdFile = join(commandsDir, file);
        if (!statSync(cmdFile).isFile()) continue;

        total++;
        const cmdName = basename(file, '.md');
        console.log('');
        logger.info(`Auditing: ${cmdName}`);

        if (dryRun) {
            const result = auditCommand(cmdFile, pluginName);
            for (const issue of result.issues) logger.warning(`  [${issue}]`);
            for (const warning of result.warnings) logger.warning(`  [${warning}]`);
            if (result.issues.length > 0) issues++;
        } else {
            const result = auditCommand(cmdFile, pluginName);
            if (result.issues.length > 0 || result.warnings.length > 0) {
                issues++;
                logger.info('  Fixing...');
                fixCommand(cmdFile, pluginName);
                logger.success('  Fixed');
            } else {
                logger.success('  OK');
            }
        }
    }

    console.log('');
    logger.info(`Commands: ${total} total, ${issues} issues found`);
}

function processSkills(pluginOrPath: string, isPath: boolean, targets: string[], dryRun: boolean): void {
    const skillsDir = isPath ? pluginOrPath : join(pluginOrPath, 'skills');

    if (!existsSync(skillsDir)) {
        logger.info('No skills directory found');
        return;
    }

    logger.info(`Processing skills in ${skillsDir}...`);

    const dirs = readdirSync(skillsDir).filter((f) => {
        const fullPath = join(skillsDir, f);
        return statSync(fullPath).isDirectory();
    });

    let total = 0;
    let issues = 0;

    for (const dir of dirs) {
        const skillDir = join(skillsDir, dir);
        total++;
        const skillName = basename(skillDir);
        console.log('');
        logger.info(`Auditing skill: ${skillName}`);

        // Skills 2.0 compliance
        if (dryRun) {
            const result = auditSkill(skillDir);
            for (const issue of result.issues) logger.warning(`  [${issue}]`);
            for (const warning of result.warnings) logger.warning(`  [${warning}]`);
            if (result.issues.length > 0) issues++;
        } else {
            const result = auditSkill(skillDir);
            if (result.issues.length > 0) {
                issues++;
                logger.info('  Fixing...');
                fixSkill(skillDir);
                logger.success('  Fixed');
            } else {
                logger.success('  OK');
            }
        }

        // Platform adaptations
        adaptForCodex(skillDir, targets, dryRun);
        adaptForOpenclaw(skillDir, targets, dryRun);
    }

    console.log('');
    logger.info(`Skills: ${total} total, ${issues} issues found`);
}

function processSubagents(pluginDir: string): void {
    const subagentsDir = join(pluginDir, 'subagents');
    if (!existsSync(subagentsDir)) {
        logger.info('No subagents directory found');
        return;
    }

    logger.info(`Processing subagents in ${subagentsDir}...`);
    logger.warning('  Note: Subagents have no cross-platform standard (Claude Code only)');

    const files = readdirSync(subagentsDir).filter((f) => f.endsWith('.md'));
    for (const file of files) {
        const agentName = basename(file, '.md');
        logger.info(`  - ${agentName} (Claude Code only)`);
    }

    console.log('');
    logger.info(`Subagents: ${files.length} (Claude Code specific - no cross-platform migration)`);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
    const options = parseCliArgs();

    validateOptions(options);

    logger.header();

    const pluginDir = options.isPath ? options.plugin : resolve(PROJECT_ROOT, 'plugins', options.plugin);
    const pluginName = options.isPath ? basename(options.plugin) : options.plugin;

    console.log(`Plugin: ${pluginName}`);
    console.log(`Targets: ${options.targets.join(', ')}`);
    console.log(`Component: ${options.component}`);
    console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'APPLY'}`);
    console.log('');

    if (options.component.includes('commands') || options.component === 'all') {
        if (!options.isPath) {
            processCommands(pluginDir, pluginName, options.targets, options.dryRun);
        } else {
            logger.info('Commands: skipped (path mode)');
        }
    }

    if (options.component.includes('skills') || options.component === 'all') {
        processSkills(pluginDir, options.isPath, options.targets, options.dryRun);
    }

    if (options.component.includes('subagents') || options.component === 'all') {
        if (!options.isPath) {
            processSubagents(pluginDir);
        } else {
            logger.info('Subagents: skipped (path mode)');
        }
    }

    console.log('');
    logger.success('Adaptation complete!');
    console.log('');
    logger.info('Next steps:');
    console.log('  1. Review changes with --dry-run first');
    console.log('  2. Run install-skills.sh to distribute to target agents');
    console.log('');
    logger.info('Platform adaptations applied:');
    console.log('  - Claude Code: Skills 2.0 compliance (name, description)');
    console.log('  - Codex: agents/openai.yaml (UI metadata)');
    console.log('  - OpenClaw: metadata.openclaw in SKILL.md frontmatter');
}

main();
