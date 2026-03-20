#!/usr/bin/env bun
/**
 * Main Agent Config Validation Script for rd3:cc-magents
 *
 * Structural validation for main agent configuration files.
 * Checks markdown parsability, size limits, embedded secrets,
 * section structure, and platform-specific rules.
 *
 * IMPORTANT: This is STRUCTURAL validation only. Quality scoring
 * is handled separately by evaluate.ts (Phase 2).
 *
 * Usage:
 *   bun validate.ts <config-path> [options]
 *
 * Options:
 *   --platform <name>    Validate for platform (default: auto-detect)
 *   --json               Output results as JSON
 *   --verbose, -v        Show detailed output
 *   --help, -h           Show help
 */

import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { logger } from '../../../scripts/logger';
import { pathExists } from '../../../scripts/utils';
import { magentAdapterRegistry } from './adapters/index';
import type { MagentPlatform, MagentValidationResult, ValidationFinding, ValidationSeverity } from './types';
import {
    buildUMAM,
    detectInjectionPatterns,
    detectPlatform,
    detectSecrets,
    estimateTokens,
    parseSections,
} from './utils';

// ============================================================================
// Validation Rules
// ============================================================================

interface ValidationRule {
    name: string;
    check: (ctx: ValidationContext, report: MutableReport) => void;
}

interface ValidationContext {
    /** Raw file content */
    raw: string;
    /** File path */
    path: string;
    /** File size in bytes */
    fileSize: number;
    /** Estimated tokens */
    estimatedTokens: number;
    /** Detected platform */
    platform: MagentPlatform | null;
    /** Forced platform from CLI */
    forcedPlatform: MagentPlatform | null;
}

interface MutableReport {
    errors: string[];
    warnings: string[];
    suggestions: string[];
    findings: ValidationFinding[];
}

function addFinding(
    report: MutableReport,
    severity: ValidationSeverity,
    message: string,
    section?: string,
    suggestion?: string,
): void {
    const finding: ValidationFinding = { severity, message };
    if (section !== undefined) finding.section = section;
    if (suggestion !== undefined) finding.suggestion = suggestion;
    report.findings.push(finding);

    if (severity === 'error') report.errors.push(message);
    else if (severity === 'warning') report.warnings.push(message);
    else if (severity === 'suggestion') report.suggestions.push(message);
}

// ============================================================================
// Rule: File existence and readability
// ============================================================================

function validateFileReadable(ctx: ValidationContext, report: MutableReport): void {
    if (!ctx.raw || ctx.raw.trim().length === 0) {
        addFinding(report, 'error', 'File is empty or could not be read');
    }
}

// ============================================================================
// Rule: File size limits
// ============================================================================

function validateFileSize(ctx: ValidationContext, report: MutableReport): void {
    const SIZE_WARN = 50 * 1024; // 50KB
    const SIZE_ERROR = 200 * 1024; // 200KB

    if (ctx.fileSize > SIZE_ERROR) {
        addFinding(
            report,
            'error',
            `File size (${(ctx.fileSize / 1024).toFixed(1)}KB) exceeds maximum 200KB`,
            undefined,
            'Split into directory-level configs or remove redundant sections',
        );
    } else if (ctx.fileSize > SIZE_WARN) {
        addFinding(
            report,
            'warning',
            `File size (${(ctx.fileSize / 1024).toFixed(1)}KB) is large`,
            undefined,
            'Consider splitting into directory-level configs for better token efficiency',
        );
    }
}

// ============================================================================
// Rule: Markdown structure
// ============================================================================

function validateMarkdownStructure(ctx: ValidationContext, report: MutableReport): void {
    const { sections, preamble } = parseSections(ctx.raw);

    if (sections.length === 0 && (!preamble || preamble.trim().length === 0)) {
        addFinding(
            report,
            'warning',
            'No markdown headings found',
            undefined,
            'Add at least one heading (# or ##) to structure the config',
        );
        return;
    }

    // Check for empty sections
    let emptySectionCount = 0;
    for (const section of sections) {
        if (!section.content || section.content.trim().length === 0) {
            emptySectionCount++;
            addFinding(
                report,
                'warning',
                `Empty section: "${section.heading}"`,
                section.heading,
                'Remove empty sections or add content',
            );
        }
    }

    if (emptySectionCount > 3) {
        addFinding(
            report,
            'warning',
            `${emptySectionCount} empty sections found; this looks like an unfinished template`,
        );
    }

    // Check for duplicate top-level headings
    const topHeadings = sections.filter((s) => s.level <= 2).map((s) => s.heading.toLowerCase());
    const seen = new Set<string>();
    for (const heading of topHeadings) {
        if (seen.has(heading)) {
            addFinding(
                report,
                'warning',
                `Duplicate heading: "${heading}"`,
                heading,
                'Merge duplicate sections or differentiate their names',
            );
        }
        seen.add(heading);
    }

    // Suggestion: heading level consistency
    const levels = sections.map((s) => s.level);
    if (levels.length > 0 && Math.min(...levels) > 2) {
        addFinding(
            report,
            'suggestion',
            'All headings are level 3 or deeper; consider using ## for top-level sections',
        );
    }
}

// ============================================================================
// Rule: Security scan
// ============================================================================

function validateSecurity(ctx: ValidationContext, report: MutableReport): void {
    // Detect embedded secrets
    const secrets = detectSecrets(ctx.raw);
    for (const secret of secrets) {
        addFinding(
            report,
            'error',
            `Security: ${secret}`,
            undefined,
            'Remove secrets from agent config and use environment variables instead',
        );
    }

    // Detect prompt injection patterns
    const injections = detectInjectionPatterns(ctx.raw);
    for (const injection of injections) {
        addFinding(
            report,
            'warning',
            `Security: ${injection}`,
            undefined,
            'Review content for prompt injection attempts',
        );
    }
}

// ============================================================================
// Rule: Token estimation
// ============================================================================

function validateTokenCount(ctx: ValidationContext, report: MutableReport): void {
    if (ctx.estimatedTokens > 20000) {
        addFinding(
            report,
            'warning',
            `Estimated ${ctx.estimatedTokens} tokens; very large configs significantly reduce context window`,
            undefined,
            'Split into directory-level configs or prioritize the most important rules',
        );
    } else if (ctx.estimatedTokens > 10000) {
        addFinding(
            report,
            'suggestion',
            `Estimated ${ctx.estimatedTokens} tokens; consider whether all sections are necessary`,
        );
    }
}

// ============================================================================
// Rule: Platform-specific validation
// ============================================================================

async function validatePlatformSpecific(ctx: ValidationContext, report: MutableReport): Promise<void> {
    const platform = ctx.forcedPlatform ?? ctx.platform;
    if (!platform) return;

    if (!magentAdapterRegistry.has(platform)) {
        addFinding(
            report,
            'suggestion',
            `No adapter available for platform "${platform}"; skipping platform-specific validation`,
        );
        return;
    }

    try {
        const adapter = magentAdapterRegistry.get(platform);
        const model = buildUMAM(ctx.raw, ctx.path, platform);
        const result = await adapter.validate(model);

        for (const error of result.errors) {
            addFinding(report, 'error', `[${platform}] ${error}`);
        }
        for (const warning of result.warnings) {
            addFinding(report, 'warning', `[${platform}] ${warning}`);
        }
        if (result.messages) {
            for (const msg of result.messages) {
                addFinding(report, 'suggestion', `[${platform}] ${msg}`);
            }
        }
    } catch (error) {
        addFinding(
            report,
            'warning',
            `Platform validation error for ${platform}: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
}

// ============================================================================
// Validation Rules Registry
// ============================================================================

const SYNC_RULES: ValidationRule[] = [
    { name: 'file-readable', check: validateFileReadable },
    { name: 'file-size', check: validateFileSize },
    { name: 'markdown-structure', check: validateMarkdownStructure },
    { name: 'security', check: validateSecurity },
    { name: 'token-count', check: validateTokenCount },
];

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validate a main agent configuration file.
 *
 * Runs all structural validation rules and returns a detailed report.
 * This is STRUCTURAL validation only -- quality scoring is handled by evaluate.ts.
 */
export async function validateMagentConfig(
    filePath: string,
    content: string,
    forcedPlatform?: MagentPlatform,
): Promise<MagentValidationResult> {
    const resolvedPath = resolve(filePath);
    const detectedPlatform = detectPlatform(resolvedPath);
    const tokens = estimateTokens(content);
    const { sections } = parseSections(content);

    const ctx: ValidationContext = {
        raw: content,
        path: resolvedPath,
        fileSize: Buffer.byteLength(content, 'utf-8'),
        estimatedTokens: tokens,
        platform: detectedPlatform,
        forcedPlatform: forcedPlatform ?? null,
    };

    const report: MutableReport = {
        errors: [],
        warnings: [],
        suggestions: [],
        findings: [],
    };

    // Run synchronous rules
    for (const rule of SYNC_RULES) {
        rule.check(ctx, report);
    }

    // Run async platform-specific validation
    await validatePlatformSpecific(ctx, report);

    return {
        valid: report.errors.length === 0,
        errors: report.errors,
        warnings: report.warnings,
        suggestions: report.suggestions,
        findings: report.findings,
        filePath: resolvedPath,
        detectedPlatform: detectedPlatform,
        fileSize: ctx.fileSize,
        estimatedTokens: tokens,
        sectionCount: sections.length,
        timestamp: new Date().toISOString(),
    };
}

// ============================================================================
// CLI Entry Point
// ============================================================================

export async function main(args: string[] = Bun.argv.slice(2)): Promise<void> {
    const { values, positionals } = parseArgs({
        args,
        options: {
            platform: { type: 'string', short: 'p' },
            json: { type: 'boolean' },
            verbose: { type: 'boolean', short: 'v' },
            help: { type: 'boolean', short: 'h' },
        },
        allowPositionals: true,
    });

    if (values.help || positionals.length === 0) {
        logger.log(`
Usage: bun validate.ts <config-path> [options]

Options:
  --platform, -p <name>   Validate for platform (default: auto-detect)
  --json                  Output results as JSON
  --verbose, -v           Show detailed output
  --help, -h              Show help

Supported platforms:
  agents-md, claude-md, gemini-md, codex, cursorrules,
  windsurfrules, zed-rules, opencode-rules

Examples:
  bun validate.ts AGENTS.md
  bun validate.ts .claude/CLAUDE.md --platform claude-md
  bun validate.ts AGENTS.md --json
`);
        process.exit(0);
    }

    const configPath = positionals[0];
    const resolvedPath = resolve(configPath);

    if (!(await pathExists(resolvedPath))) {
        logger.error(`File not found: ${resolvedPath}`);
        process.exit(1);
    }

    const content = await Bun.file(resolvedPath).text();
    const forcedPlatform = values.platform as MagentPlatform | undefined;

    const result = await validateMagentConfig(resolvedPath, content, forcedPlatform);

    if (values.json) {
        logger.log(JSON.stringify(result, null, 2));
    } else {
        // Formatted output
        const platform = result.detectedPlatform ?? 'unknown';
        const status = result.valid ? '✅ VALID' : '❌ INVALID';

        logger.log(`\n${status} - ${configPath} (${platform})`);
        logger.log(
            `  Size: ${(result.fileSize / 1024).toFixed(1)}KB | Tokens: ~${result.estimatedTokens} | Sections: ${result.sectionCount}`,
        );

        if (result.errors.length > 0) {
            logger.log('\nErrors:');
            for (const error of result.errors) {
                logger.log(`  ❌ ${error}`);
            }
        }

        if (result.warnings.length > 0) {
            logger.log('\nWarnings:');
            for (const warning of result.warnings) {
                logger.log(`  ⚠️  ${warning}`);
            }
        }

        if (values.verbose && result.suggestions.length > 0) {
            logger.log('\nSuggestions:');
            for (const suggestion of result.suggestions) {
                logger.log(`  💡 ${suggestion}`);
            }
        }

        logger.log('');
    }

    process.exit(result.valid ? 0 : 1);
}

// Run if executed directly
if (import.meta.main) {
    main().catch((error) => {
        logger.error(`Unexpected error: ${error}`);
        process.exit(1);
    });
}

// Export argv for testing
export const testArgs = Bun.argv;
