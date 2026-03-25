#!/usr/bin/env bun
/**
 * Skill Validation Script for rd3:cc-skills
 *
 * Validates skill structure, frontmatter, and best practices
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import YAML from 'yaml';

import { getValidationDecisionState } from '../../../scripts/grading';
import { logger } from '../../../scripts/logger';
import { countTodoMarkers } from '../../../scripts/markdown-analysis';
import type { Platform, Skill, SkillFrontmatter, ValidationReport } from './types.ts';
import { discoverResources, parseFrontmatter } from './utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

// ============================================================================
// Validation Rules
// ============================================================================

interface ValidationRule {
    name: string;
    check: (skill: Skill, report: ValidationReport) => void;
}

function validateRequiredFields(skill: Skill, report: ValidationReport): void {
    const fm = skill.frontmatter;

    if (!fm) {
        report.errors.push('Missing YAML frontmatter');
        return;
    }

    if (!fm.name) {
        report.errors.push('Missing required field: name');
    } else if (!/^[a-z0-9][a-z0-9-]*$/.test(fm.name)) {
        report.errors.push(`Invalid name '${fm.name}': must be lowercase hyphen-case`);
    } else if (fm.name.length > 64) {
        report.errors.push(`Name exceeds 64 characters: ${fm.name.length}`);
    }

    if (!fm.description) {
        report.errors.push('Missing required field: description');
    } else if (fm.description.length > 1024) {
        report.warnings.push('Description exceeds 1024 characters');
    } else if (fm.description.length < 20) {
        report.warnings.push('Description is too short');
    }

    const dirName = skill.directory.split('/').pop();
    if (fm.name && dirName && fm.name !== dirName) {
        report.errors.push(`Skill name '${fm.name}' does not match directory '${dirName}'`);
    }
}

function validateMetadata(skill: Skill, report: ValidationReport): void {
    const fm = skill.frontmatter;
    if (!fm) return;

    if (fm.metadata) {
        if (typeof fm.metadata !== 'object') {
            report.errors.push('metadata must be an object');
        }
    }

    if (fm.license && !/^[A-Za-z0-9.-]+$/.test(fm.license)) {
        report.warnings.push(`Unusual license identifier: ${fm.license}`);
    }
}

function validateBodyContent(skill: Skill, report: ValidationReport): void {
    const { body } = skill;
    const lineCount = body.split('\n').length;

    if (body.trim().length === 0) {
        report.errors.push('SKILL.md body is empty');
        return;
    }

    if (lineCount < 10) {
        report.warnings.push(`Skill body is very short (${lineCount} lines)`);
    } else if (lineCount > 500) {
        report.warnings.push(`Skill body is very long (${lineCount} lines)`);
    }

    if (!body.toLowerCase().includes('when to use')) {
        report.warnings.push("Missing 'When to use' section");
    }

    const todoCount = countTodoMarkers(body);
    if (todoCount > 0) {
        report.warnings.push(`Found ${todoCount} TODO marker(s)`);
    }
}

function validateResources(skill: Skill, report: ValidationReport): void {
    const { resources } = skill;
    const hasWorkflow = skill.body.toLowerCase().includes('workflow');
    const interactions = skill.frontmatter?.metadata?.interactions ?? [];
    const isKnowledgeOnly = Array.isArray(interactions) && interactions.includes('knowledge-only');

    if (hasWorkflow && !isKnowledgeOnly && !resources.scripts?.length) {
        report.warnings.push('Skill has workflow but no scripts/ directory');
    }

    if (resources.scripts?.length) {
        const unsupportedScripts = resources.scripts.filter((f) => f.endsWith('.py') || f.endsWith('.rb'));
        if (unsupportedScripts.length > 0) {
            report.warnings.push(`Python/Ruby scripts: ${unsupportedScripts.join(', ')}`);
        }
    }
}

function validateCompanions(skill: Skill, report: ValidationReport): void {
    const skillDir = skill.directory;
    const agentsDir = join(skillDir, 'agents');
    if (existsSync(agentsDir)) {
        const openaiYaml = join(agentsDir, 'openai.yaml');
        if (existsSync(openaiYaml)) {
            try {
                const content = readFileSync(openaiYaml, 'utf-8');
                YAML.parse(content);
            } catch {
                report.errors.push('agents/openai.yaml contains invalid YAML');
            }
        }
    }
}

function validateClaudeFeatures(skill: Skill, report: ValidationReport): void {
    const { body, frontmatter } = skill;

    const backtickCommands = body.match(/!`[^`]+`/g) || [];
    const dollarArguments = body.match(/\$ARGUMENTS|\$\d+/g) || [];
    const contextFork = body.includes('context: fork');

    if (backtickCommands.length > 0) {
        report.warnings.push('Claude-specific !`cmd` syntax found - document in Platform Notes');
    }

    if (dollarArguments.length > 0) {
        report.warnings.push('Claude-specific $ARGUMENTS/$N usage found - document limitation');
    }

    if (contextFork) {
        report.warnings.push("'context: fork' is Claude-specific");
    }

    if (frontmatter?.hooks) {
        report.warnings.push("'hooks:' field is Claude-specific");
    }
}

function validateOpenClawMetadata(skill: Skill, report: ValidationReport): void {
    const { frontmatter } = skill;
    const hasMetadataFile = existsSync(join(skill.directory, 'metadata.openclaw'));
    const openclawMetadata = frontmatter?.metadata?.openclaw;

    if (!openclawMetadata && !hasMetadataFile) {
        report.warnings.push('No metadata.openclaw found - OpenClaw will use defaults');
        return;
    }

    if (hasMetadataFile) {
        return;
    }

    const openclaw = openclawMetadata as Record<string, unknown>;

    if (openclaw.emoji !== undefined && typeof openclaw.emoji !== 'string') {
        report.errors.push('metadata.openclaw.emoji must be a string');
    }
}

// ============================================================================
// Main Validation
// ============================================================================

const VALIDATION_RULES: ValidationRule[] = [
    { name: 'Required Fields', check: validateRequiredFields },
    { name: 'Metadata', check: validateMetadata },
    { name: 'Body Content', check: validateBodyContent },
    { name: 'Resources', check: validateResources },
    { name: 'Companions', check: validateCompanions },
    { name: 'Claude Features', check: validateClaudeFeatures },
    { name: 'OpenClaw Metadata', check: validateOpenClawMetadata },
];

export function validateSkill(skillPath: string, _options: ValidateOptions): ValidationReport {
    const errors: string[] = [];
    const warnings: string[] = [];

    const resolvedPath = resolve(skillPath);
    const skillMdPath = join(resolvedPath, 'SKILL.md');

    if (!existsSync(skillMdPath)) {
        return {
            valid: false,
            errors: [`SKILL.md not found at ${skillMdPath}`],
            warnings: [],
            skillPath: resolvedPath,
            skillName: resolvedPath.split('/').pop() || 'unknown',
            frontmatter: null,
            resources: {},
            platforms: [],
            timestamp: new Date().toISOString(),
        };
    }

    const content = readFileSync(skillMdPath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);
    const resources = discoverResources(resolvedPath);

    const skill: Skill = {
        frontmatter: frontmatter as SkillFrontmatter,
        body,
        raw: content,
        path: skillMdPath,
        directory: resolvedPath,
        resources,
    };

    for (const rule of VALIDATION_RULES) {
        rule.check(skill, {
            valid: false,
            errors,
            warnings,
            skillPath: resolvedPath,
            skillName: frontmatter?.name || resolvedPath.split('/').pop() || 'unknown',
            frontmatter: frontmatter as SkillFrontmatter,
            resources,
            platforms: [],
            timestamp: new Date().toISOString(),
        });
    }

    const report: ValidationReport = {
        valid: errors.length === 0,
        errors,
        warnings,
        skillPath: resolvedPath,
        skillName: frontmatter?.name || resolvedPath.split('/').pop() || 'unknown',
        frontmatter: frontmatter as SkillFrontmatter,
        resources,
        platforms: [],
        timestamp: new Date().toISOString(),
    };

    return report;
}

// ============================================================================
// CLI
// ============================================================================

interface ValidateOptions {
    platform: Platform | 'all';
    verbose: boolean;
    json: boolean;
}

function printUsage(): void {
    logger.log('Usage: validate.ts <skill-path> [options]');
    logger.log('');
    logger.log('Arguments:');
    logger.log('  <skill-path>          Path to skill directory');
    logger.log('');
    logger.log('Options:');
    logger.log('  --platform <name>    Platform: claude, codex, openclaw, opencode, antigravity, all');
    logger.log('  --verbose, -v        Show detailed validation output');
    logger.log('  --json               Output results as JSON');
    logger.log('  --help, -h           Show this help message');
}

function printReport(report: ValidationReport, verbose: boolean): void {
    const decision = getValidationDecisionState(report.valid, report.warnings.length);

    if (report.errors.length === 0 && report.warnings.length === 0) {
        logger.success(`Validation decision: ${decision} for ${report.skillName}`);
        return;
    }

    logger.log(`Validation decision: ${decision} for ${report.skillName}`);

    if (report.errors.length > 0) {
        logger.log('\nBLOCK findings:');
        for (const error of report.errors) {
            logger.fail(`  ${error}`);
        }
    }

    if (report.warnings.length > 0) {
        logger.log('\nWARN findings:');
        for (const warning of report.warnings) {
            logger.warn(`  ${warning}`);
        }
    }

    if (verbose && report.frontmatter) {
        logger.log('\nSkill Information:');
        logger.log(`  Name: ${report.frontmatter.name}`);
        logger.log(`  Description: ${report.frontmatter.description?.substring(0, 80)}...`);
        if (report.frontmatter.metadata) {
            logger.log(`  Author: ${report.frontmatter.metadata.author || '(none)'}`);
            logger.log(`  Version: ${report.frontmatter.metadata.version || '(none)'}`);
        }
        logger.log('  Resources:');
        logger.log(`    scripts/: ${report.resources.scripts?.length || 0} files`);
        logger.log(`    references/: ${report.resources.references?.length || 0} files`);
        logger.log(`    assets/: ${report.resources.assets?.length || 0} files`);
    }

    logger.log('\nSummary:');
    logger.log(`  BLOCK: ${report.errors.length}`);
    logger.log(`  WARN: ${report.warnings.length}`);
}

/**
 * Find project root by searching for package.json upward from the script location.
 * This ensures relative paths work regardless of where the user runs the script from.
 * Uses .git as the primary project marker (more reliable than package.json alone).
 */
function findProjectRoot(): string {
    const scriptDir = dirname(fileURLToPath(import.meta.url));
    let dir = scriptDir;
    while (dir !== resolve(dir, '..')) {
        // .git indicates a real project root (cache dirs don't have .git)
        if (existsSync(join(dir, '.git'))) {
            return dir;
        }
        dir = resolve(dir, '..');
    }
    // Fallback: find package.json while skipping cache directories
    dir = scriptDir;
    while (dir !== resolve(dir, '..')) {
        if (existsSync(join(dir, 'package.json'))) {
            // Skip cache directories - they have 'cache' in their path
            const pathParts = dir.split('/');
            const hasCacheDir = pathParts.includes('cache');
            if (!hasCacheDir) {
                return dir;
            }
        }
        dir = resolve(dir, '..');
    }
    return scriptDir; // Final fallback to script directory
}

function parseCliArgs(): { path: string; options: ValidateOptions } {
    const args = parseArgs({
        args: process.argv.slice(2),
        allowPositionals: true,
        options: {
            platform: { type: 'string', default: 'all' },
            verbose: { type: 'boolean', short: 'v', default: false },
            json: { type: 'boolean', default: false },
            help: { type: 'boolean', short: 'h', default: false },
        },
    });

    if (args.values.help) {
        printUsage();
        process.exit(0);
    }

    const rawPath = args.positionals?.[0];

    if (!rawPath) {
        logger.error('Error: Missing required argument <skill-path>');
        printUsage();
        process.exit(1);
    }

    // Resolve relative paths against project root, not CWD
    // This allows running from any directory (e.g., cd into cc-skills cache)
    const projectRoot = findProjectRoot();
    let path = rawPath.startsWith('/') ? rawPath : resolve(projectRoot, rawPath);

    // If resolved path doesn't exist, search upward from script location to find valid path
    // This handles cases where script is run from a cache installation
    if (!rawPath.startsWith('/') && !existsSync(join(path, 'SKILL.md'))) {
        // Search upward from script location for a directory containing the skill
        const scriptDir = dirname(fileURLToPath(import.meta.url));
        let searchDir = scriptDir;
        while (searchDir !== resolve(searchDir, '..')) {
            const candidatePath = join(searchDir, rawPath);
            if (existsSync(join(candidatePath, 'SKILL.md'))) {
                path = candidatePath;
                break;
            }
            searchDir = resolve(searchDir, '..');
        }
    }

    const validPlatforms = ['all', 'claude', 'codex', 'openclaw', 'opencode', 'antigravity'];
    const platform = (args.values.platform as string) || 'all';

    if (!validPlatforms.includes(platform)) {
        logger.error(`Error: Invalid platform '${platform}'`);
        process.exit(1);
    }

    return {
        path,
        options: {
            platform: platform as Platform | 'all',
            verbose: args.values.verbose as boolean,
            json: args.values.json as boolean,
        },
    };
}

async function main() {
    const { path: skillPath, options } = parseCliArgs();

    logger.info(`Validating skill at: ${skillPath}`);

    const report = validateSkill(skillPath, options);

    if (options.json) {
        logger.log(JSON.stringify(report, null, 2));
        process.exit(report.valid ? 0 : 1);
    }

    printReport(report, options.verbose);

    process.exit(report.valid ? 0 : 1);
}

if (import.meta.main) {
    main();
}
