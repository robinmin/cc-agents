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

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import type {
    Command,
    CommandBodyAnalysis,
    CommandFrontmatter,
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

// Logger
const logger = {
    info: (msg: string) => console.log(`[INFO] ${msg}`),
    warn: (msg: string) => console.warn(`[WARN] ${msg}`),
    error: (msg: string) => console.error(`[ERROR] ${msg}`),
    success: (msg: string) => console.log(`[OK] ${msg}`),
};

// ============================================================================
// Validation Rules
// ============================================================================

interface ValidationRule {
    name: string;
    check: (command: Command, report: MutableReport) => void;
}

/** Mutable report used during validation */
interface MutableReport {
    errors: string[];
    warnings: string[];
    findings: ValidationFinding[];
    invalidFields: string[];
    bodyAnalysis: CommandBodyAnalysis;
}

function addFinding(
    report: MutableReport,
    severity: ValidationSeverity,
    message: string,
    field?: string,
    suggestion?: string,
): void {
    const finding: ValidationFinding = { severity, message };
    if (field !== undefined) finding.field = field;
    if (suggestion !== undefined) finding.suggestion = suggestion;
    report.findings.push(finding);
    if (severity === 'error') report.errors.push(message);
    else if (severity === 'warning') report.warnings.push(message);
}

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
        return {
            valid: false,
            errors: [`Command file not found: ${resolvedPath}`],
            warnings: [],
            findings: [{ severity: 'error', message: `Command file not found: ${resolvedPath}` }],
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

function printReport(report: CommandValidationReport, verbose: boolean): void {
    if (report.errors.length === 0 && report.warnings.length === 0) {
        logger.success(`Validation passed for ${report.commandName}`);
        return;
    }

    if (!report.valid) {
        console.log(`\nValidation FAILED for ${report.commandName}`);
    } else {
        console.log(`\nValidation passed with warnings for ${report.commandName}`);
    }

    if (report.errors.length > 0) {
        console.log('\nErrors:');
        for (const error of report.errors) {
            console.log(`  [X] ${error}`);
        }
    }

    if (report.warnings.length > 0) {
        console.log('\nWarnings:');
        for (const warning of report.warnings) {
            console.log(`  [!] ${warning}`);
        }
    }

    if (verbose) {
        console.log('\nBody Analysis:');
        console.log(`  Lines: ${report.bodyAnalysis.lineCount}`);
        console.log(`  Pseudocode: ${report.bodyAnalysis.hasPseudocode ? 'yes' : 'no'}`);
        if (report.bodyAnalysis.pseudocodeConstructs.length > 0) {
            console.log(`  Constructs: ${report.bodyAnalysis.pseudocodeConstructs.join(', ')}`);
        }
        if (report.bodyAnalysis.argumentRefs.length > 0) {
            console.log(`  Argument refs: ${report.bodyAnalysis.argumentRefs.join(', ')}`);
        }
        console.log(`  Plugin root: ${report.bodyAnalysis.usesPluginRoot ? 'yes' : 'no'}`);
        console.log(`  Second-person: ${report.bodyAnalysis.hasSecondPerson ? 'yes' : 'no'}`);
        if (report.bodyAnalysis.sections.length > 0) {
            console.log(`  Sections: ${report.bodyAnalysis.sections.join(', ')}`);
        }

        if (report.frontmatter) {
            console.log('\nFrontmatter:');
            if (report.frontmatter.description) {
                console.log(`  description: ${report.frontmatter.description}`);
            }
            if (report.frontmatter.model) {
                console.log(`  model: ${report.frontmatter.model}`);
            }
            if (report.frontmatter['allowed-tools']) {
                console.log(`  allowed-tools: ${JSON.stringify(report.frontmatter['allowed-tools'])}`);
            }
            if (report.frontmatter['argument-hint']) {
                console.log(`  argument-hint: ${report.frontmatter['argument-hint']}`);
            }
        }

        if (report.invalidFields.length > 0) {
            console.log(`\nInvalid fields found: ${report.invalidFields.join(', ')}`);
        }
    }

    console.log(`\nSummary: ${report.errors.length} error(s), ${report.warnings.length} warning(s)`);
}

// ============================================================================
// CLI Entry Point
// ============================================================================

function parseCliArgs(): { path: string; verbose: boolean; json: boolean } {
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
        console.log('Usage: validate.ts <command-path> [options]');
        console.log('');
        console.log('Arguments:');
        console.log('  <command-path>     Path to command .md file');
        console.log('');
        console.log('Options:');
        console.log('  --verbose, -v      Show detailed output');
        console.log('  --json             Output as JSON');
        console.log('  --help, -h         Show help');
        process.exit(0);
    }

    const path = args.positionals?.[0];
    if (!path) {
        console.error('Error: Missing required argument <command-path>');
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
        console.log(JSON.stringify(report, null, 2));
        process.exit(report.valid ? 0 : 1);
    }

    printReport(report, verbose);
    process.exit(report.valid ? 0 : 1);
}

main();
