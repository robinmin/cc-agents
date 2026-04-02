#!/usr/bin/env bun
/**
 * Agent Validation Script for rd3:cc-agents
 *
 * Structural validation (Tier 1) for agent .md files.
 * Parses YAML frontmatter, checks required fields, validates name format,
 * detects unknown fields, checks tier-specific requirements, and reports
 * findings with severity levels.
 *
 * Usage:
 *   bun validate.ts <agent-path> [options]
 *
 * Options:
 *   --platform <name>    Validate for platform: claude, gemini, opencode, codex, all (default: claude)
 *   --verbose, -v        Show detailed output
 *   --json               Output results as JSON
 *   --help, -h           Show help
 */

import { basename, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { getValidationDecisionState } from '../../../scripts/grading';
import { logger } from '../../../scripts/logger';
import { pathExists } from '../../../scripts/utils';
import { type ValidationFindingAccumulator, addValidationFinding } from '../../../scripts/validation-findings';
import {
    AGENT_DESCRIPTION_RECOMMENDED_MAX_LENGTH,
    CODEX_AGENT_DESCRIPTION_MAX_LENGTH,
} from './description-constraints';
import type {
    AgentBodyAnalysis,
    AgentPlatform,
    AgentTemplate,
    AgentValidationReport,
    ValidationFinding,
} from './types';
import {
    VALID_CLAUDE_AGENT_FIELDS,
    VALID_CODEX_AGENT_FIELDS,
    VALID_GEMINI_AGENT_FIELDS,
    VALID_OPENCLAW_AGENT_FIELDS,
    VALID_OPENCODE_AGENT_FIELDS,
} from './types';
import { analyzeBody, detectTemplateTier, isValidAgentName, parseFrontmatter } from './utils';

// ============================================================================
// Validation Rules
// ============================================================================

interface ValidationRule {
    name: string;
    check: (ctx: ValidationContext, report: MutableReport) => void;
}

interface ValidationContext {
    /** Parsed frontmatter (null if missing/invalid) */
    frontmatter: Record<string, unknown> | null;
    /** Markdown body */
    body: string;
    /** Raw file content */
    raw: string;
    /** File path */
    path: string;
    /** Filename without extension */
    filename: string;
    /** Unknown fields detected */
    unknownFields: string[];
    /** YAML parse error if any */
    parseError: string | undefined;
    /** Target platform for validation */
    platform: AgentPlatform | 'all';
    /** Body analysis */
    bodyAnalysis: AgentBodyAnalysis;
    /** Detected template tier */
    detectedTier: AgentTemplate;
}

interface MutableReport extends ValidationFindingAccumulator<ValidationFinding> {
    errors: string[];
    warnings: string[];
    findings: ValidationFinding[];
    unknownFields: string[];
}

const addFinding = addValidationFinding<ValidationFinding>;

// ---- Rule: Frontmatter presence ----

function validateFrontmatterPresence(ctx: ValidationContext, report: MutableReport): void {
    if (ctx.parseError) {
        addFinding(report, 'error', `Frontmatter YAML parse error: ${ctx.parseError}`);
        return;
    }

    if (!ctx.frontmatter) {
        addFinding(
            report,
            'error',
            'Missing YAML frontmatter (agents require frontmatter with at least name and description)',
        );
    }
}

// ---- Rule: Required fields ----

function validateRequiredFields(ctx: ValidationContext, report: MutableReport): void {
    const fm = ctx.frontmatter;
    if (!fm) return;

    // name
    if (!fm.name) {
        addFinding(report, 'error', 'Missing required field: name', 'name');
    } else if (typeof fm.name !== 'string') {
        addFinding(report, 'error', 'Field name must be a string', 'name');
    } else {
        // Validate name format: [a-z0-9-]+, 3-50 chars, no leading/trailing hyphens
        const name = fm.name as string;
        if (name.length < 3) {
            addFinding(report, 'error', `Agent name too short: ${name.length} chars (min 3)`, 'name');
        } else if (name.length > 50) {
            addFinding(report, 'error', `Agent name too long: ${name.length} chars (max 50)`, 'name');
        } else if (!isValidAgentName(name)) {
            addFinding(
                report,
                'error',
                `Invalid name format: '${name}' (must be lowercase hyphen-case [a-z0-9-]+, no leading/trailing hyphens, no double hyphens)`,
                'name',
                'Use format like: my-agent-name',
            );
        }

        // Check name matches filename
        if (ctx.filename && name !== ctx.filename) {
            addFinding(
                report,
                'warning',
                `Agent name '${name}' does not match filename '${ctx.filename}'`,
                'name',
                `Rename file to '${name}.md' or update name field`,
            );
        }
    }

    // description
    if (!fm.description) {
        addFinding(report, 'error', 'Missing required field: description', 'description');
    } else if (typeof fm.description !== 'string') {
        addFinding(report, 'error', 'Field description must be a string', 'description');
    } else {
        const desc = (fm.description as string).trim();
        if (desc.length < 10) {
            addFinding(
                report,
                'warning',
                `Description is very short (${desc.length} chars)`,
                'description',
                'Add trigger phrases and example blocks for better auto-routing',
            );
        }
    }
}

// ---- Rule: Unknown/invalid fields ----

function validateFieldNames(ctx: ValidationContext, report: MutableReport): void {
    if (!ctx.frontmatter) return;

    const platform = ctx.platform === 'all' ? 'claude' : ctx.platform;

    let validFields: readonly string[];
    switch (platform) {
        case 'gemini':
            validFields = VALID_GEMINI_AGENT_FIELDS;
            break;
        case 'opencode':
            validFields = VALID_OPENCODE_AGENT_FIELDS;
            break;
        case 'codex':
            validFields = VALID_CODEX_AGENT_FIELDS;
            break;
        case 'openclaw':
            validFields = VALID_OPENCLAW_AGENT_FIELDS;
            break;
        default:
            validFields = VALID_CLAUDE_AGENT_FIELDS;
            break;
    }

    const validSet = new Set<string>(validFields);
    for (const key of Object.keys(ctx.frontmatter)) {
        if (!validSet.has(key)) {
            report.unknownFields.push(key);
            addFinding(
                report,
                'warning',
                `Unknown frontmatter field for ${platform}: '${key}'`,
                key,
                `Remove '${key}' or check if it's valid for your target platform`,
            );
        }
    }
}

// ---- Rule: Body content ----

function validateBodyContent(ctx: ValidationContext, report: MutableReport): void {
    const { body } = ctx;

    if (body.trim().length === 0) {
        addFinding(report, 'error', 'Agent body is empty (system prompt required)');
        return;
    }

    const lineCount = body.split('\n').length;
    if (lineCount < 5) {
        addFinding(
            report,
            'warning',
            `Agent body is very short (${lineCount} lines)`,
            undefined,
            'Add more context for the agent system prompt',
        );
    }

    // TODO markers
    const todoCount = (body.match(/\bTODO\b/gi) || []).length;
    if (todoCount > 0) {
        addFinding(report, 'info', `Found ${todoCount} TODO marker(s) in agent body`);
    }
}

// ---- Rule: Tier-specific requirements ----

function validateTierRequirements(ctx: ValidationContext, report: MutableReport): void {
    const { detectedTier, bodyAnalysis } = ctx;

    switch (detectedTier) {
        case 'specialist': {
            // Specialist agents should have rules sections
            if (!bodyAnalysis.hasRules) {
                addFinding(
                    report,
                    'warning',
                    "Specialist agent is missing rules section (DO/DON'T lists)",
                    undefined,
                    'Add "What I Always Do" and "What I Never Do" sections',
                );
            }

            // Should have output format
            if (!bodyAnalysis.hasOutputFormat) {
                addFinding(
                    report,
                    'warning',
                    'Specialist agent is missing output format section',
                    undefined,
                    'Add an "Output Format" section with templates',
                );
            }

            // Should have at least 6 of 8 anatomy sections
            if (!bodyAnalysis.has8SectionAnatomy) {
                addFinding(
                    report,
                    'info',
                    `Specialist agent has ${bodyAnalysis.anatomySections.length}/8 anatomy sections: ${bodyAnalysis.anatomySections.join(', ')}`,
                    undefined,
                    'Full 8-section anatomy: METADATA, PERSONA, PHILOSOPHY, VERIFICATION, COMPETENCIES, PROCESS, RULES, OUTPUT',
                );
            }
            break;
        }

        case 'standard': {
            // Standard agents should have some structure
            if (bodyAnalysis.sections.length < 2) {
                addFinding(
                    report,
                    'warning',
                    `Standard agent has only ${bodyAnalysis.sections.length} section(s)`,
                    undefined,
                    'Add sections like Role, Process, Rules, Output Format',
                );
            }
            break;
        }

        case 'minimal': {
            // Minimal is more relaxed, just check it's not too long
            if (bodyAnalysis.lineCount > 80) {
                addFinding(
                    report,
                    'info',
                    `Minimal agent has ${bodyAnalysis.lineCount} lines (consider upgrading to standard tier)`,
                );
            }
            break;
        }
    }
}

// ---- Rule: Description quality ----

function validateDescriptionQuality(ctx: ValidationContext, report: MutableReport): void {
    const fm = ctx.frontmatter;
    if (!fm?.description || typeof fm.description !== 'string') return;

    const desc = fm.description as string;

    // Check for example blocks (good practice for auto-routing)
    if (desc.includes('<example>')) {
        addFinding(report, 'info', 'Description includes example blocks (good for auto-routing)');
    } else if (ctx.detectedTier !== 'minimal') {
        addFinding(
            report,
            'info',
            'Description does not include <example> blocks',
            'description',
            'Add <example> blocks for better auto-routing delegation',
        );
    }

    if (desc.length > CODEX_AGENT_DESCRIPTION_MAX_LENGTH) {
        addFinding(
            report,
            'warning',
            `Description exceeds Codex hard limit (${desc.length}/${CODEX_AGENT_DESCRIPTION_MAX_LENGTH} chars)`,
            'description',
            `Trim to ${CODEX_AGENT_DESCRIPTION_MAX_LENGTH} chars or fewer while keeping one compact <example> block`,
        );
    } else if (desc.length > AGENT_DESCRIPTION_RECOMMENDED_MAX_LENGTH) {
        addFinding(
            report,
            'info',
            `Description is near the Codex hard limit (${desc.length}/${CODEX_AGENT_DESCRIPTION_MAX_LENGTH} chars)`,
            'description',
            `Tighten wording toward ${AGENT_DESCRIPTION_RECOMMENDED_MAX_LENGTH} chars or fewer, but keep the strongest example block`,
        );
    }
}

/**
 * Validate runtime types of optional frontmatter fields.
 */
function validateFrontmatterTypes(ctx: ValidationContext, report: MutableReport): void {
    const fm = ctx.frontmatter;
    if (!fm) return;

    const typeChecks: Array<{ field: string; expected: string; check: (v: unknown) => boolean }> = [
        { field: 'tools', expected: 'array', check: (v) => Array.isArray(v) },
        { field: 'disallowedTools', expected: 'array', check: (v) => Array.isArray(v) },
        { field: 'model', expected: 'string', check: (v) => typeof v === 'string' },
        { field: 'maxTurns', expected: 'number', check: (v) => typeof v === 'number' },
        { field: 'max_turns', expected: 'number', check: (v) => typeof v === 'number' },
        { field: 'temperature', expected: 'number', check: (v) => typeof v === 'number' },
        { field: 'color', expected: 'string', check: (v) => typeof v === 'string' },
        { field: 'background', expected: 'boolean', check: (v) => typeof v === 'boolean' },
        { field: 'hidden', expected: 'boolean', check: (v) => typeof v === 'boolean' },
        { field: 'permissionMode', expected: 'string', check: (v) => typeof v === 'string' },
        { field: 'isolation', expected: 'string', check: (v) => typeof v === 'string' },
    ];

    for (const { field, expected, check } of typeChecks) {
        if (fm[field] !== undefined && !check(fm[field])) {
            addFinding(
                report,
                'error',
                `Field '${field}' has wrong type: expected ${expected}, got ${typeof fm[field]}`,
                field,
            );
        }
    }
}

// ============================================================================
// Main Validation
// ============================================================================

const VALIDATION_RULES: ValidationRule[] = [
    { name: 'Frontmatter Presence', check: validateFrontmatterPresence },
    { name: 'Required Fields', check: validateRequiredFields },
    { name: 'Frontmatter Types', check: validateFrontmatterTypes },
    { name: 'Field Names', check: validateFieldNames },
    { name: 'Body Content', check: validateBodyContent },
    { name: 'Tier Requirements', check: validateTierRequirements },
    { name: 'Description Quality', check: validateDescriptionQuality },
];

/**
 * Validate an agent and return a full report.
 *
 * @param agentPath - Path to the agent .md file
 * @param platform - Target platform to validate against (default: 'claude')
 * @returns Validation report with errors, warnings, and findings
 */
export async function validateAgent(
    agentPath: string,
    platform: AgentPlatform | 'all' = 'claude',
): Promise<AgentValidationReport> {
    const resolvedPath = resolve(agentPath);

    if (!pathExists(resolvedPath)) {
        const missingFileReport: ValidationFindingAccumulator<ValidationFinding> = {
            errors: [],
            warnings: [],
            findings: [],
        };
        return {
            valid: false,
            errors: [`Agent file not found: ${resolvedPath}`],
            warnings: [],
            findings: [addValidationFinding(missingFileReport, 'error', `Agent file not found: ${resolvedPath}`)],
            agentPath: resolvedPath,
            agentName: 'unknown',
            frontmatter: null,
            unknownFields: [],
            bodyAnalysis: {
                lineCount: 0,
                sections: [],
                has8SectionAnatomy: false,
                anatomySections: [],
                hasSecondPerson: false,
                referencesSkills: false,
                hasRules: false,
                hasOutputFormat: false,
                contentLength: 0,
            },
            detectedTier: 'minimal',
            timestamp: new Date().toISOString(),
        };
    }

    // Determine valid fields set based on platform
    let validFields: readonly string[] | undefined;
    const targetPlatform = platform === 'all' ? 'claude' : platform;
    switch (targetPlatform) {
        case 'gemini':
            validFields = VALID_GEMINI_AGENT_FIELDS;
            break;
        case 'opencode':
            validFields = VALID_OPENCODE_AGENT_FIELDS;
            break;
        case 'codex':
            validFields = VALID_CODEX_AGENT_FIELDS;
            break;
        case 'openclaw':
            validFields = VALID_OPENCLAW_AGENT_FIELDS;
            break;
        default:
            validFields = VALID_CLAUDE_AGENT_FIELDS;
            break;
    }

    // Read file and parse
    const file = Bun.file(resolvedPath);
    const content = await file.text();
    const parsed = parseFrontmatter(content, validFields);
    const filename = basename(resolvedPath, '.md');

    const bodyAnalysis = analyzeBody(parsed.body);
    const detectedTier = detectTemplateTier(parsed.body);

    const ctx: ValidationContext = {
        frontmatter: parsed.frontmatter,
        body: parsed.body,
        raw: content,
        path: resolvedPath,
        filename,
        unknownFields: parsed.unknownFields,
        parseError: parsed.parseError,
        platform,
        bodyAnalysis,
        detectedTier,
    };

    const mutable: MutableReport = {
        errors: [],
        warnings: [],
        findings: [],
        unknownFields: [],
    };

    for (const rule of VALIDATION_RULES) {
        rule.check(ctx, mutable);
    }

    return {
        valid: mutable.errors.length === 0,
        errors: mutable.errors,
        warnings: mutable.warnings,
        findings: mutable.findings,
        agentPath: resolvedPath,
        agentName: (parsed.frontmatter?.name as string) || filename,
        frontmatter: parsed.frontmatter,
        unknownFields: mutable.unknownFields,
        bodyAnalysis,
        detectedTier,
        timestamp: new Date().toISOString(),
    };
}

// ============================================================================
// CLI Output
// ============================================================================

export function printReport(report: AgentValidationReport, verbose: boolean): void {
    const decision = getValidationDecisionState(report.valid, report.warnings.length);

    if (report.errors.length === 0 && report.warnings.length === 0) {
        logger.success(`Validation decision: ${decision} for ${report.agentName}`);
        if (report.findings.filter((f) => f.severity === 'info').length > 0) {
            logger.log('\nInfo:');
            for (const finding of report.findings.filter((f) => f.severity === 'info')) {
                logger.log(`  [i] ${finding.message}`);
            }
        }
        return;
    }

    logger.log(`\nValidation decision: ${decision} for ${report.agentName}`);

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

    const infoFindings = report.findings.filter((f) => f.severity === 'info');
    if (infoFindings.length > 0) {
        logger.log('\nInfo:');
        for (const finding of infoFindings) {
            logger.log(`  [i] ${finding.message}`);
        }
    }

    if (verbose) {
        logger.log('\nBody Analysis:');
        logger.log(`  Lines: ${report.bodyAnalysis.lineCount}`);
        logger.log(`  Sections: ${report.bodyAnalysis.sections.length}`);
        logger.log(`  Detected tier: ${report.detectedTier}`);
        logger.log(`  8-section anatomy: ${report.bodyAnalysis.has8SectionAnatomy ? 'yes' : 'no'}`);
        if (report.bodyAnalysis.anatomySections.length > 0) {
            logger.log(`  Anatomy sections: ${report.bodyAnalysis.anatomySections.join(', ')}`);
        }
        logger.log(`  Has rules: ${report.bodyAnalysis.hasRules ? 'yes' : 'no'}`);
        logger.log(`  Has output format: ${report.bodyAnalysis.hasOutputFormat ? 'yes' : 'no'}`);
        logger.log(`  References skills: ${report.bodyAnalysis.referencesSkills ? 'yes' : 'no'}`);

        if (report.frontmatter) {
            logger.log('\nFrontmatter:');
            logger.log(`  name: ${report.frontmatter.name}`);
            const desc = report.frontmatter.description as string | undefined;
            if (desc) {
                logger.log(`  description: ${desc.substring(0, 80)}...`);
            }
        }

        if (report.unknownFields.length > 0) {
            logger.log(`\nUnknown fields: ${report.unknownFields.join(', ')}`);
        }
    }

    // Suggestions
    const suggestions = report.findings
        .filter((f) => f.suggestion)
        .map((f) => f.suggestion ?? '')
        .filter(Boolean);
    if (suggestions.length > 0) {
        logger.log('\nSuggestions:');
        for (const suggestion of suggestions) {
            logger.log(`  -> ${suggestion}`);
        }
    }

    logger.log(`\nSummary: ${report.errors.length} error(s), ${report.warnings.length} warning(s)`);
}

// ============================================================================
// CLI Entry Point
// ============================================================================

export function parseCliArgs(): { path: string; platform: AgentPlatform | 'all'; verbose: boolean; json: boolean } {
    const args = parseArgs({
        args: process.argv.slice(2),
        allowPositionals: true,
        options: {
            platform: { type: 'string', default: 'claude' },
            verbose: { type: 'boolean', short: 'v', default: false },
            json: { type: 'boolean', default: false },
            help: { type: 'boolean', short: 'h', default: false },
        },
    });

    if (args.values.help) {
        logger.log('Usage: validate.ts <agent-path> [options]');
        logger.log('');
        logger.log('Arguments:');
        logger.log('  <agent-path>       Path to agent .md file');
        logger.log('');
        logger.log('Options:');
        logger.log('  --platform <name>  Platform: claude, gemini, opencode, codex, all (default: claude)');
        logger.log('  --verbose, -v      Show detailed output');
        logger.log('  --json             Output as JSON');
        logger.log('  --help, -h         Show help');
        process.exit(0);
    }

    const path = args.positionals?.[0];
    if (!path) {
        logger.error('Error: Missing required argument <agent-path>');
        process.exit(1);
    }

    const validPlatforms = ['all', 'claude', 'gemini', 'opencode', 'codex', 'openclaw', 'antigravity'];
    const platform = (args.values.platform as string) || 'claude';
    if (!validPlatforms.includes(platform)) {
        logger.error(`Error: Invalid platform '${platform}'`);
        process.exit(1);
    }

    return {
        path,
        platform: platform as AgentPlatform | 'all',
        verbose: args.values.verbose as boolean,
        json: args.values.json as boolean,
    };
}

export async function main() {
    const { path: agentPath, platform, verbose, json } = parseCliArgs();

    logger.info(`Validating agent: ${agentPath}`);

    const report = await validateAgent(agentPath, platform);

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
