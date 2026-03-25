#!/usr/bin/env bun
/**
 * Command Validation Script for rd3:cc-commands
 *
 * Validates command structure, frontmatter fields, body content,
 * and argument consistency.
 *
 * Usage:
 *   bun validate.ts <command-path> [options]
 *
 * Options:
 *   --verbose, -v    Show detailed validation output
 *   --json           Output results as JSON
 *   --help, -h       Show help
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { getValidationDecisionState } from '../../../scripts/grading';
import { logger } from '../../../scripts/logger';
import { type ValidationFindingAccumulator, addValidationFinding } from '../../../scripts/validation-findings';

import type {
    Command,
    CommandBodyAnalysis,
    CommandValidationReport,
    ValidationFinding,
    ValidationSeverity,
} from './types';
import { VALID_MODELS } from './types';
import {
    analyzeBody,
    checkArgumentConsistency,
    isValidAllowedTools,
    isValidModel,
    parseFrontmatter,
    readCommand,
    validateDescription,
} from './utils';

// ============================================================================
// Validation Rules
// ============================================================================

interface ValidationRule {
    name: string;
    check: (command: Command, report: MutableReport) => void;
}

/** Mutable report used during validation */
interface MutableReport extends ValidationFindingAccumulator<ValidationFinding> {
    errors: string[];
    warnings: string[];
    findings: ValidationFinding[];
    invalidFields: string[];
    bodyAnalysis: CommandBodyAnalysis;
}

const addFinding = addValidationFinding<ValidationFinding>;

// ---- Rule: Frontmatter presence and YAML validity ----

function validateFrontmatterPresence(command: Command, report: MutableReport): void {
    if (!command.frontmatter && command.raw.startsWith('---')) {
        // Has frontmatter delimiters but failed to parse
        addFinding(report, 'error', 'Frontmatter YAML syntax is invalid');
        return;
    }
    // No frontmatter is valid (all fields are optional)
}

// ---- Rule: No invalid fields ----

function validateNoInvalidFields(command: Command, report: MutableReport): void {
    if (!command.raw.startsWith('---')) return; // No frontmatter at all

    const parsed = parseFrontmatter(command.raw);

    for (const field of parsed.invalidFields) {
        addFinding(
            report,
            'error',
            `Invalid frontmatter field: '${field}' is not valid for commands`,
            field,
            field === 'arguments'
                ? "Use 'argument-hint' instead"
                : field === 'tools'
                  ? "Use 'allowed-tools' instead"
                  : `Remove '${field}' from frontmatter`,
        );
        report.invalidFields.push(field);
    }

    for (const field of parsed.unknownFields) {
        addFinding(
            report,
            'error',
            `Unknown frontmatter field: '${field}' is not a valid command field`,
            field,
            `Remove '${field}' from frontmatter. Valid fields: description, allowed-tools, model, argument-hint, disable-model-invocation`,
        );
        report.invalidFields.push(field);
    }
}

// ---- Rule: Field format validation ----

function validateFieldFormats(command: Command, report: MutableReport): void {
    const fm = command.frontmatter;
    if (!fm) return;

    // description
    if (fm.description !== undefined) {
        if (typeof fm.description !== 'string') {
            addFinding(report, 'error', 'description must be a string', 'description');
        } else {
            const descValidation = validateDescription(fm.description);
            for (const issue of descValidation.issues) {
                const severity: ValidationSeverity = issue.includes('empty') ? 'error' : 'warning';
                addFinding(report, severity, issue, 'description');
            }
        }
    }

    // model
    if (fm.model !== undefined) {
        if (!isValidModel(fm.model)) {
            addFinding(
                report,
                'error',
                `Invalid model value: '${fm.model}'. Must be one of: ${VALID_MODELS.join(', ')}`,
                'model',
            );
        }
    }

    // allowed-tools
    if (fm['allowed-tools'] !== undefined) {
        if (!isValidAllowedTools(fm['allowed-tools'])) {
            addFinding(
                report,
                'error',
                'allowed-tools must be a non-empty string or array of strings',
                'allowed-tools',
            );
        }
    }

    // argument-hint
    if (fm['argument-hint'] !== undefined) {
        if (typeof fm['argument-hint'] !== 'string') {
            addFinding(report, 'error', 'argument-hint must be a string', 'argument-hint');
        } else if (fm['argument-hint'].trim().length === 0) {
            addFinding(report, 'warning', 'argument-hint is empty', 'argument-hint');
        }
    }

    // disable-model-invocation
    if (fm['disable-model-invocation'] !== undefined) {
        if (typeof fm['disable-model-invocation'] !== 'boolean') {
            addFinding(report, 'error', 'disable-model-invocation must be a boolean', 'disable-model-invocation');
        }
    }
}

// ---- Rule: Body content validation ----

function validateBodyContent(command: Command, report: MutableReport): void {
    const { body } = command;

    if (body.trim().length === 0) {
        addFinding(report, 'error', 'Command body is empty');
        return;
    }

    const analysis = analyzeBody(body);
    report.bodyAnalysis = analysis;

    // Line count check (thin wrapper principle)
    if (analysis.lineCount > 150) {
        addFinding(
            report,
            'warning',
            `Command body is ${analysis.lineCount} lines (recommended max: ~150 for thin wrappers)`,
            undefined,
            'Consider moving detailed logic into a skill',
        );
    }

    // Second-person language check
    if (analysis.hasSecondPerson) {
        addFinding(
            report,
            'warning',
            'Command body uses second-person language ("you should", "your", etc.)',
            undefined,
            'Use imperative form: "Review the code" not "You should review the code"',
        );
    }

    // TODO markers
    const todoCount = (body.match(/\bTODO\b/gi) || []).length;
    if (todoCount > 0) {
        addFinding(report, 'warning', `Found ${todoCount} TODO marker(s) in command body`);
    }
}

// ---- Rule: Argument consistency ----

function validateArgumentConsistency(command: Command, report: MutableReport): void {
    const fm = command.frontmatter;
    const analysis = report.bodyAnalysis;

    const issues = checkArgumentConsistency(fm?.['argument-hint'], analysis);
    for (const issue of issues) {
        addFinding(report, 'warning', issue, 'argument-hint');
    }
}

// ============================================================================
// Main Validation
// ============================================================================

const VALIDATION_RULES: ValidationRule[] = [
    { name: 'Frontmatter Presence', check: validateFrontmatterPresence },
    { name: 'Invalid Fields', check: validateNoInvalidFields },
    { name: 'Field Formats', check: validateFieldFormats },
    { name: 'Body Content', check: validateBodyContent },
    { name: 'Argument Consistency', check: validateArgumentConsistency },
];

/**
 * Validate a command and return a full report.
 */
export function validateCommand(command: Command): CommandValidationReport {
    const mutable: MutableReport = {
        errors: [],
        warnings: [],
        findings: [],
        invalidFields: [],
        bodyAnalysis: analyzeBody(command.body),
    };

    for (const rule of VALIDATION_RULES) {
        rule.check(command, mutable);
    }

    return {
        valid: mutable.errors.length === 0,
        errors: mutable.errors,
        warnings: mutable.warnings,
        findings: mutable.findings,
        commandPath: command.path,
        commandName: command.filename,
        frontmatter: command.frontmatter,
        invalidFields: mutable.invalidFields,
        bodyAnalysis: mutable.bodyAnalysis,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Validate a command file from disk.
 */
export async function validateCommandFile(filePath: string): Promise<CommandValidationReport> {
    const resolvedPath = resolve(filePath);

    if (!existsSync(resolvedPath)) {
        const missingFileReport: ValidationFindingAccumulator<ValidationFinding> = {
            errors: [],
            warnings: [],
            findings: [],
        };
        return {
            valid: false,
            errors: [`Command file not found: ${resolvedPath}`],
            warnings: [],
            findings: [addValidationFinding(missingFileReport, 'error', `Command file not found: ${resolvedPath}`)],
            commandPath: resolvedPath,
            commandName: 'unknown',
            frontmatter: null,
            invalidFields: [],
            bodyAnalysis: {
                lineCount: 0,
                hasPseudocode: false,
                pseudocodeConstructs: [],
                argumentRefs: [],
                usesPluginRoot: false,
                hasSecondPerson: false,
                sections: [],
            },
            timestamp: new Date().toISOString(),
        };
    }

    const command = await readCommand(resolvedPath);
    return validateCommand(command);
}

// ============================================================================
// CLI Output
// ============================================================================

export function printReport(report: CommandValidationReport, verbose: boolean): void {
    const decision = getValidationDecisionState(report.valid, report.warnings.length);

    if (report.errors.length === 0 && report.warnings.length === 0) {
        logger.success(`Validation decision: ${decision} for ${report.commandName}`);
        return;
    }

    logger.log(`\nValidation decision: ${decision} for ${report.commandName}`);

    if (report.errors.length > 0) {
        logger.log('\nBLOCK findings:');
        for (const error of report.errors) {
            logger.log(`  [X] ${error}`);
        }
    }

    if (report.warnings.length > 0) {
        logger.log('\nWARN findings:');
        for (const warning of report.warnings) {
            logger.log(`  [!] ${warning}`);
        }
    }

    if (verbose) {
        logger.log('\nBody Analysis:');
        logger.log(`  Lines: ${report.bodyAnalysis.lineCount}`);
        logger.log(`  Pseudocode: ${report.bodyAnalysis.hasPseudocode ? 'yes' : 'no'}`);
        if (report.bodyAnalysis.pseudocodeConstructs.length > 0) {
            logger.log(`  Constructs: ${report.bodyAnalysis.pseudocodeConstructs.join(', ')}`);
        }
        if (report.bodyAnalysis.argumentRefs.length > 0) {
            logger.log(`  Argument refs: ${report.bodyAnalysis.argumentRefs.join(', ')}`);
        }
        logger.log(`  Plugin root: ${report.bodyAnalysis.usesPluginRoot ? 'yes' : 'no'}`);
        logger.log(`  Second-person: ${report.bodyAnalysis.hasSecondPerson ? 'yes' : 'no'}`);
        if (report.bodyAnalysis.sections.length > 0) {
            logger.log(`  Sections: ${report.bodyAnalysis.sections.join(', ')}`);
        }

        if (report.frontmatter) {
            logger.log('\nFrontmatter:');
            if (report.frontmatter.description) {
                logger.log(`  description: ${report.frontmatter.description}`);
            }
            if (report.frontmatter.model) {
                logger.log(`  model: ${report.frontmatter.model}`);
            }
            if (report.frontmatter['allowed-tools']) {
                logger.log(`  allowed-tools: ${JSON.stringify(report.frontmatter['allowed-tools'])}`);
            }
            if (report.frontmatter['argument-hint']) {
                logger.log(`  argument-hint: ${report.frontmatter['argument-hint']}`);
            }
        }

        if (report.invalidFields.length > 0) {
            logger.log(`\nInvalid fields found: ${report.invalidFields.join(', ')}`);
        }
    }

    logger.log(`\nSummary: ${report.errors.length} error(s), ${report.warnings.length} warning(s)`);
}

// ============================================================================
// CLI Entry Point
// ============================================================================

export function parseCliArgs(): { path: string; verbose: boolean; json: boolean } {
    const args = parseArgs({
        args: process.argv.slice(2),
        allowPositionals: true,
        options: {
            verbose: { type: 'boolean', short: 'v', default: false },
            json: { type: 'boolean', default: false },
            help: { type: 'boolean', short: 'h', default: false },
        },
    });

    if (args.values.help) {
        logger.log('Usage: validate.ts <command-path> [options]');
        logger.log('');
        logger.log('Arguments:');
        logger.log('  <command-path>     Path to command .md file');
        logger.log('');
        logger.log('Options:');
        logger.log('  --verbose, -v      Show detailed output');
        logger.log('  --json             Output as JSON');
        logger.log('  --help, -h         Show help');
        process.exit(0);
    }

    const path = args.positionals?.[0];
    if (!path) {
        logger.error('Error: Missing required argument <command-path>');
        process.exit(1);
    }

    return {
        path,
        verbose: args.values.verbose as boolean,
        json: args.values.json as boolean,
    };
}

async function main() {
    const { path, verbose, json } = parseCliArgs();

    logger.info(`Validating command: ${path}`);

    const report = await validateCommandFile(path);

    if (json) {
        logger.log(JSON.stringify(report, null, 2));
        process.exit(report.valid ? 0 : 1);
    }

    printReport(report, verbose);
    process.exit(report.valid ? 0 : 1);
}

if (import.meta.main) {
    main();
}
