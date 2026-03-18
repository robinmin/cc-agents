#!/usr/bin/env bun
/**
 * Command Evaluation Script for rd3:cc-commands
 *
 * Evaluates command quality across 10 dimensions with configurable weights.
 * Uses evaluation.config.ts for configurable weights and rules.
 *
 * Usage:
 *   bun evaluate.ts <command-path> [options]
 *
 * Options:
 *   --scope <level>      Evaluation scope: basic, full (default: basic)
 *   --platform <name>   Target platform: claude, codex, gemini, openclaw, opencode, antigravity, all
 *   --json               Output results as JSON
 *   --verbose, -v        Show detailed evaluation output
 *   --help, -h           Show help
 */

import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { type CommandDimensionWeights, EVALUATION_CONFIG } from './evaluation.config';
import type {
    Command,
    CommandBodyAnalysis,
    CommandDimensionName,
    CommandEvaluationDimension,
    CommandEvaluationReport,
    CommandFrontmatter,
    CommandPlatform,
    EvaluationScope,
    Grade,
    WeightProfile,
} from './types';
import {
    analyzeBody,
    detectNamingPattern,
    isValidAllowedTools,
    normalizeCommandName,
    parseFrontmatter,
    validateDescription,
} from './utils';

// ============================================================================
// TYPES
// ============================================================================

interface SecurityScanResult {
    hasBlacklist: boolean;
    blacklistFindings: string[];
    greylistFindings: string[];
    greylistPenalty: number;
}

// ============================================================================
// UTILITIES
// ============================================================================

function calculateGrade(percentage: number): Grade {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
}

function getWeights(hasPseudocode: boolean): CommandDimensionWeights {
    return hasPseudocode ? EVALUATION_CONFIG.withPseudocode : EVALUATION_CONFIG.withoutPseudocode;
}

function detectPseudocode(body: string): boolean {
    for (const pattern of EVALUATION_CONFIG.detection.pseudocodePatterns) {
        if (pattern.test(body)) {
            return true;
        }
    }
    return false;
}

// ============================================================================
// SECURITY SCANNER
// ============================================================================

function scanForSecurityIssues(content: string): SecurityScanResult {
    const config = EVALUATION_CONFIG;
    const result: SecurityScanResult = {
        hasBlacklist: false,
        blacklistFindings: [],
        greylistFindings: [],
        greylistPenalty: 0,
    };

    // Check blacklist patterns (critical - immediate reject)
    for (const rule of config.security.blacklist) {
        const matches = content.match(rule.pattern);
        if (matches) {
            result.hasBlacklist = true;
            result.blacklistFindings.push(`[BLACKLIST] ${rule.reason} (${matches[0]})`);
        }
    }

    // Check greylist patterns (warnings - penalty points)
    for (const rule of config.security.greylist) {
        const matches = content.match(rule.pattern);
        if (matches) {
            result.greylistFindings.push(`[GREYLIST] ${rule.reason} (${matches[0]})`);
            result.greylistPenalty += 2;
        }
    }

    return result;
}

// ============================================================================
// EVALUATION DIMENSIONS
// ============================================================================

function evaluateFrontmatterQuality(
    frontmatter: CommandFrontmatter | null,
    weights: CommandDimensionWeights,
): CommandEvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const maxScore = weights.frontmatterQuality;
    let score = maxScore;

    if (!frontmatter) {
        findings.push('No frontmatter found');
        recommendations.push('Add YAML frontmatter with description');
        return {
            name: 'frontmatter-quality',
            displayName: 'Frontmatter Quality',
            weight: maxScore,
            score: 0,
            maxScore,
            findings,
            recommendations,
        };
    }

    // Check for YAML validity (already parsed, so frontmatter exists)
    // Check valid fields are used correctly

    // model field validation
    if (frontmatter.model !== undefined) {
        const validModels = ['sonnet', 'opus', 'haiku'];
        if (!validModels.includes(frontmatter.model)) {
            findings.push(`Invalid model value: ${frontmatter.model}`);
            recommendations.push('Use sonnet, opus, or haiku');
            score -= 2;
        }
    }

    // allowed-tools validation
    if (frontmatter['allowed-tools'] !== undefined) {
        if (!isValidAllowedTools(frontmatter['allowed-tools'])) {
            findings.push('Invalid allowed-tools format');
            recommendations.push('allowed-tools must be a non-empty string or array');
            score -= 2;
        }
    }

    // argument-hint validation
    if (frontmatter['argument-hint'] !== undefined) {
        if (typeof frontmatter['argument-hint'] !== 'string') {
            findings.push('argument-hint must be a string');
            score -= 1;
        } else if (frontmatter['argument-hint'].length === 0) {
            findings.push('argument-hint is empty');
            score -= 1;
        }
    }

    // disable-model-invocation validation
    if (frontmatter['disable-model-invocation'] !== undefined) {
        if (typeof frontmatter['disable-model-invocation'] !== 'boolean') {
            findings.push('disable-model-invocation must be a boolean');
            score -= 1;
        }
    }

    return {
        name: 'frontmatter-quality',
        displayName: 'Frontmatter Quality',
        weight: maxScore,
        score: Math.max(0, score),
        maxScore,
        findings,
        recommendations,
    };
}

function evaluateDescriptionEffectiveness(
    frontmatter: CommandFrontmatter | null,
    weights: CommandDimensionWeights,
): CommandEvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const maxScore = weights.descriptionEffectiveness;
    let score = maxScore;

    if (!frontmatter?.description) {
        findings.push('No description in frontmatter');
        recommendations.push('Add description field to frontmatter');
        return {
            name: 'description-effectiveness',
            displayName: 'Description Effectiveness',
            weight: maxScore,
            score: 0,
            maxScore,
            findings,
            recommendations,
        };
    }

    const descValidation = validateDescription(frontmatter.description);
    for (const issue of descValidation.issues) {
        findings.push(issue);
        if (issue.includes('chars') && issue.includes('recommended max')) {
            recommendations.push('Keep description under 60 characters');
            score -= 3;
        } else if (issue.includes('empty')) {
            recommendations.push('Add a description');
            score -= 3;
        } else if (issue.includes('start with')) {
            recommendations.push('Start with a verb (Review, Deploy, Generate)');
            score -= 2;
        } else {
            score -= 1;
        }
    }

    // Additional checks
    if (/^this\s+command/i.test(frontmatter.description)) {
        findings.push('Description starts with "This command"');
        recommendations.push('Start with a verb instead');
        score -= 2;
    }

    if (/\b(command|slash\s+command)\b/i.test(frontmatter.description)) {
        findings.push('Description contains redundant "command" word');
        recommendations.push('Remove redundant "command" word');
        score -= 1;
    }

    return {
        name: 'description-effectiveness',
        displayName: 'Description Effectiveness',
        weight: maxScore,
        score: Math.max(0, score),
        maxScore,
        findings,
        recommendations,
    };
}

function evaluateContentQuality(
    body: string,
    analysis: CommandBodyAnalysis,
    weights: CommandDimensionWeights,
): CommandEvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const maxScore = weights.contentQuality;
    let score = maxScore;

    if (!body || body.trim().length === 0) {
        findings.push('Command body is empty');
        recommendations.push('Add command body content');
        return {
            name: 'content-quality',
            displayName: 'Content Quality',
            weight: maxScore,
            score: 0,
            maxScore,
            findings,
            recommendations,
        };
    }

    // Check second-person language
    if (analysis.hasSecondPerson) {
        findings.push('Uses second-person language ("you should", "your")');
        recommendations.push('Use imperative form: "Review the code" not "You should review"');
        score -= 3;
    }

    // Check for imperative form (should have verbs at start of lines)
    // Filter out non-prose lines: lists, code fences, tables, blockquotes, headings, empty lines
    // Then check if lines start with common imperative verbs
    const lines = body.split('\n').filter((l) => {
        const trimmed = l.trim();
        if (trimmed.length === 0) return false;
        if (trimmed.startsWith('#')) return false;
        if (trimmed.startsWith('-') || trimmed.startsWith('*')) return false;
        if (/^\d+\.\s/.test(trimmed)) return false;
        if (trimmed.startsWith('|')) return false;
        if (trimmed.startsWith('`')) return false;
        if (trimmed.startsWith('>')) return false;
        return true;
    });
    // Common imperative verbs that start sentences (compact regex)
    const imperativeVerbs =
        /^(?:Add|Analyze|Apply|Build|Change|Check|Create|Clean|Compare|Convert|Copy|Debug|Define|Delete|Deploy|Download|Edit|Ensure|Eval|Execute|Extract|Find|Fix|Format|Generate|Get|Identify|Implement|Import|Initialize|Install|List|Load|Make|Modify|Move|Optimize|Parse|Read|Remove|Render|Replace|Reset|Resize|Review|Run|Save|Search|Set|Setup|Test|Update|Validate|Verify|Write)\b/i;
    const imperativeCount = lines.filter((l) => imperativeVerbs.test(l.trim())).length;
    // Only penalize if we have enough prose lines AND very few imperatives
    if (lines.length > 5 && imperativeCount < lines.length * 0.2) {
        findings.push('Content may not use imperative form consistently');
        recommendations.push('Use imperative form for instructions');
        score -= 2;
    }

    // Check for TODO markers
    const todoCount = (body.match(/\bTODO\b/gi) || []).length;
    if (todoCount > 0) {
        findings.push(`Found ${todoCount} TODO marker(s)`);
        recommendations.push('Remove TODO markers before publishing');
        score -= todoCount * 2;
    }

    // Check for placeholder text
    const placeholderCount = (body.match(/\[(?:TODO|PLACEHOLDER|FIXME|XXX|INSERT|CHANGE|REPLACE|FILL)[^\]]*\]/gi) || [])
        .length;
    if (placeholderCount > 3) {
        findings.push(`Found ${placeholderCount} placeholder(s)`);
        recommendations.push('Replace placeholders with actual content');
        score -= Math.min(5, placeholderCount);
    }

    // Check for code blocks
    const codeBlockCount = (body.match(/```[\s\S]*?```/g) || []).length;
    if (codeBlockCount === 0 && body.length > 500) {
        findings.push('No code examples found in substantial content');
        recommendations.push('Add code examples to illustrate usage');
        score -= 2;
    }

    return {
        name: 'content-quality',
        displayName: 'Content Quality',
        weight: maxScore,
        score: Math.max(0, score),
        maxScore,
        findings,
        recommendations,
    };
}

function evaluateStructureBrevity(
    body: string,
    analysis: CommandBodyAnalysis,
    weights: CommandDimensionWeights,
): CommandEvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const maxScore = weights.structureBrevity;
    let score = maxScore;

    // Line count check (thin wrapper principle)
    if (analysis.lineCount > 150) {
        findings.push(`Command body is ${analysis.lineCount} lines (recommended max: ~150)`);
        recommendations.push('Consider moving detailed logic into a skill');
        score -= 4;
    } else if (analysis.lineCount > 100) {
        findings.push(`Command body is ${analysis.lineCount} lines (approaching limit)`);
        recommendations.push('Consider simplifying or moving to a skill');
        score -= 2;
    }

    // Check for sections
    if (analysis.sections.length === 0) {
        findings.push('No section headers found');
        recommendations.push('Use ## for main sections');
        score -= 2;
    }

    // Check for "When to Use" section (commands should have this)
    const hasWhenToUse = analysis.sections.some((s) => /when\s+to\s+use/i.test(s));
    if (!hasWhenToUse) {
        findings.push("No 'When to Use' section found");
        recommendations.push("Add a 'When to Use' section");
        score -= 2;
    }

    return {
        name: 'structure-brevity',
        displayName: 'Structure & Brevity',
        weight: maxScore,
        score: Math.max(0, score),
        maxScore,
        findings,
        recommendations,
    };
}

function evaluateDelegationPattern(
    body: string,
    analysis: CommandBodyAnalysis,
    weights: CommandDimensionWeights,
): CommandEvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const maxScore = weights.delegationPattern;
    let score = maxScore;

    // Commands should NOT have scripts/ subdirectories - they delegate to skills
    // This dimension checks if the command properly delegates

    if (!analysis.hasPseudocode) {
        // Simple command without pseudocode - low weight expected
        if (weights.delegationPattern > 8) {
            findings.push('No pseudocode constructs found (Task, Skill, SlashCommand)');
            recommendations.push('Consider delegating to skills for complex operations');
            score -= 2;
        }
        return {
            name: 'delegation-pattern',
            displayName: 'Delegation Pattern',
            weight: maxScore,
            score: Math.max(0, score),
            maxScore,
            findings,
            recommendations,
        };
    }

    // Check for proper pseudocode usage
    const constructs = analysis.pseudocodeConstructs;

    // Should use Task() or Skill() for delegation
    const hasTask = constructs.some((c) => c.includes('Task'));
    const hasSkill = constructs.some((c) => c.includes('Skill'));
    const hasSlashCommand = constructs.some((c) => c.includes('SlashCommand'));
    const hasAskUserQuestion = constructs.some((c) => c.includes('AskUserQuestion'));

    if (!hasTask && !hasSkill && constructs.length > 0) {
        findings.push('No Task() or Skill() delegation found');
        recommendations.push('Use Task() or Skill() for proper delegation');
        score -= 2;
    }

    // Check for nested delegation (should not have too many)
    if (constructs.length > 5) {
        findings.push(`Many pseudocode constructs (${constructs.length})`);
        recommendations.push('Consider splitting into multiple commands or a skill');
        score -= 2;
    }

    // AskUserQuestion should have clear purpose
    if (hasAskUserQuestion && constructs.length === 1) {
        findings.push('Only AskUserQuestion found - consider if user input is necessary');
        recommendations.push('Remove AskUserQuestion if not needed');
        score -= 1;
    }

    return {
        name: 'delegation-pattern',
        displayName: 'Delegation Pattern',
        weight: maxScore,
        score: Math.max(0, score),
        maxScore,
        findings,
        recommendations,
    };
}

function evaluateArgumentDesign(
    frontmatter: CommandFrontmatter | null,
    analysis: CommandBodyAnalysis,
    weights: CommandDimensionWeights,
): CommandEvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const maxScore = weights.argumentDesign;
    let score = maxScore;

    const hasArgumentRefs = analysis.argumentRefs.length > 0;
    const hasArgumentHint = !!frontmatter?.['argument-hint'];

    // Check consistency
    if (hasArgumentRefs && !hasArgumentHint) {
        findings.push('Body uses argument references but no argument-hint defined');
        recommendations.push('Add argument-hint to frontmatter');
        score -= 4;
    }

    if (!hasArgumentRefs && hasArgumentHint) {
        findings.push('argument-hint defined but no argument references found in body');
        recommendations.push('Remove argument-hint if not needed');
        score -= 2;
    }

    // Check argument-hint quality if present
    if (hasArgumentHint && frontmatter?.['argument-hint']) {
        const hint = frontmatter['argument-hint'];

        // Ensure hint is a string before processing
        if (typeof hint !== 'string') {
            findings.push('argument-hint must be a string');
            recommendations.push('Change argument-hint to a descriptive string');
            score -= 3;
            return {
                name: 'argument-design',
                displayName: 'Argument Design',
                weight: maxScore,
                score: Math.max(0, score),
                maxScore,
                findings,
                recommendations,
            };
        }

        // Should have angle brackets or descriptive names
        if (!hint.includes('<') && !hint.includes('[')) {
            findings.push('argument-hint should use angle or square brackets');
            recommendations.push('Use format like <file-path> or [option]');
            score -= 1;
        }

        // Check for descriptive names (not arg1, arg2)
        if (/arg\d+/.test(hint)) {
            findings.push('argument-hint uses generic names (arg1, arg2)');
            recommendations.push('Use descriptive argument names');
            score -= 1;
        }

        // Check length
        if (hint.length > 100) {
            findings.push('argument-hint is too long');
            recommendations.push('Keep argument-hint concise');
            score -= 1;
        }
    }

    return {
        name: 'argument-design',
        displayName: 'Argument Design',
        weight: maxScore,
        score: Math.max(0, score),
        maxScore,
        findings,
        recommendations,
    };
}

function evaluateSecurity(
    frontmatter: CommandFrontmatter | null,
    securityResult: SecurityScanResult,
    weights: CommandDimensionWeights,
): CommandEvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const maxScore = weights.security;
    let score = maxScore;

    // Blacklist findings
    for (const finding of securityResult.blacklistFindings) {
        findings.push(finding);
    }

    // Greylist findings (penalty)
    for (const finding of securityResult.greylistFindings) {
        findings.push(finding);
    }
    score -= securityResult.greylistPenalty;

    // Check allowed-tools
    const allowedTools = frontmatter?.['allowed-tools'];
    if (!allowedTools) {
        findings.push('No allowed-tools restriction');
        recommendations.push('Add allowed-tools to restrict available tools');
        score -= 2;
    } else if (allowedTools === '*' || allowedTools === 'all') {
        findings.push('allowed-tools is too permissive');
        recommendations.push('Restrict to specific tools (e.g., Bash(git:*), Read)');
        score -= 3;
    } else if (typeof allowedTools === 'string' && allowedTools.includes('Bash') && !allowedTools.includes('(')) {
        findings.push('Bash without tool filters is too permissive');
        recommendations.push('Use Bash(git:*), Bash(npm:*), etc.');
        score -= 2;
    }

    if (securityResult.hasBlacklist) {
        recommendations.push('Remove blacklist patterns before evaluation');
    }

    return {
        name: 'security',
        displayName: 'Security',
        weight: maxScore,
        score: Math.max(0, score),
        maxScore,
        findings,
        recommendations,
    };
}

function evaluateNamingConvention(commandName: string, weights: CommandDimensionWeights): CommandEvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const maxScore = weights.namingConvention;
    let score = maxScore;

    // Check format (should be hyphen-case)
    if (commandName !== commandName.toLowerCase()) {
        findings.push('Command name should be lowercase');
        recommendations.push('Use lowercase: my-command');
        score -= 1;
    }

    if (/[A-Z]/.test(commandName)) {
        findings.push('Command name contains uppercase letters');
        recommendations.push('Use hyphen-case: my-command');
        score -= 1;
    }

    if (/_/.test(commandName)) {
        findings.push('Command name contains underscores');
        recommendations.push('Use hyphens: my-command not my_command');
        score -= 1;
    }

    // Check naming pattern
    const pattern = detectNamingPattern(commandName);
    if (pattern === 'unknown') {
        findings.push('Unable to determine naming pattern (noun-verb or verb-noun)');
        recommendations.push('Use noun-verb (task-create) or verb-noun (review-code) pattern');
        score -= 1;
    }

    return {
        name: 'naming-convention',
        displayName: 'Naming Convention',
        weight: maxScore,
        score: Math.max(0, score),
        maxScore,
        findings,
        recommendations,
    };
}

function evaluatePlatformCompatibility(
    body: string,
    analysis: CommandBodyAnalysis,
    weights: CommandDimensionWeights,
): CommandEvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const maxScore = weights.platformCompatibility;
    let score = maxScore;

    if (!analysis.hasPseudocode) {
        // Simple command - less weight on platform compatibility
        return {
            name: 'platform-compatibility',
            displayName: 'Platform Compatibility',
            weight: maxScore,
            score: Math.max(0, score),
            maxScore,
            findings,
            recommendations,
        };
    }

    // Check for Claude-specific features
    const hasClaudeCommands = body.includes('!`');
    const hasDollarArgs = analysis.argumentRefs.some((a) => a.includes('$ARGUMENTS') || /^\$\d+$/.test(a));
    const hasTask = analysis.pseudocodeConstructs.some((c) => c.includes('Task'));
    const hasSkill = analysis.pseudocodeConstructs.some((c) => c.includes('Skill'));

    if (hasClaudeCommands) {
        findings.push('Uses Claude-specific !`cmd` syntax');
        recommendations.push('Document in Platform Notes section');
        score -= 1;
    }

    if (hasDollarArgs) {
        findings.push('Uses Claude-specific $ARGUMENTS syntax');
        recommendations.push('Document limitation for other platforms');
        score -= 1;
    }

    // Check for platform notes section
    const hasPlatformNotes = analysis.sections.some((s) => /platform\s+notes/i.test(s));
    if ((hasTask || hasSkill) && !hasPlatformNotes) {
        findings.push('No Platform Notes section found for delegation constructs');
        recommendations.push('Add Platform Notes section documenting platform support');
        score -= 2;
    }

    return {
        name: 'platform-compatibility',
        displayName: 'Platform Compatibility',
        weight: maxScore,
        score: Math.max(0, score),
        maxScore,
        findings,
        recommendations,
    };
}

// ============================================================================
// CIRCULAR REFERENCE CHECKER (Commands)
// ============================================================================

/**
 * Detects circular references in commands.
 * Commands should NOT reference their associated skills by name.
 */
function evaluateCircularReference(
    body: string,
    analysis: CommandBodyAnalysis,
    weights: CommandDimensionWeights,
): CommandEvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const maxScore = weights.circularReference || 5;
    let score = maxScore;

    // Patterns that indicate circular references for commands
    const circularPatterns = [
        {
            // Commands Reference section (explicit violation)
            pattern: /^## Commands Reference$/m,
            message: 'Contains "Commands Reference" section - commands must not list other commands',
            severity: 'error',
        },
        {
            // Skill references by name
            pattern: /(?:Skill|skill):\s*["'](rd\d+):[a-z-]+["']/g,
            message: 'Contains explicit skill reference by name - commands must use generic delegation patterns',
            severity: 'warning',
        },
        {
            // See also sections with skill references
            pattern: /See also:.*(rd\d+):[a-z-]+/gi,
            message: 'Contains "See also" with skill reference - circular reference detected',
            severity: 'error',
        },
    ];

    for (const { pattern, message, severity } of circularPatterns) {
        const matches = body.match(pattern);
        if (matches) {
            findings.push(message);
            if (severity === 'error') {
                score = 0; // Critical - fail immediately
            } else {
                score = Math.max(0, score - 3);
            }
        }
    }

    if (findings.length > 0) {
        recommendations.push('Remove "Commands Reference" sections');
        recommendations.push('Use generic patterns like "Skill()" instead of specific skill names');
    }

    return {
        name: 'circular-reference',
        displayName: 'Circular Reference Prevention',
        weight: maxScore,
        score: Math.max(0, score),
        maxScore,
        findings,
        recommendations,
    };
}

function evaluateOperationalReadiness(
    body: string,
    analysis: CommandBodyAnalysis,
    weights: CommandDimensionWeights,
): CommandEvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const maxScore = weights.operationalReadiness;
    let score = maxScore;

    if (weights.operationalReadiness <= 2) {
        // Low weight - skip detailed checks for simple commands
        return {
            name: 'operational-readiness',
            displayName: 'Operational Readiness',
            weight: maxScore,
            score: Math.max(0, score),
            maxScore,
            findings,
            recommendations,
        };
    }

    const bodyLower = body.toLowerCase();

    // Error handling
    const hasErrorHandling = /error|fail|exception|catch/i.test(body);
    if (!hasErrorHandling) {
        findings.push('No error handling mentioned');
        recommendations.push('Add error handling instructions');
        score -= 1;
    }

    // Edge cases
    const hasEdgeCases = /edge\s+case|boundary|limit/i.test(body);
    if (!hasEdgeCases && body.length > 500) {
        findings.push('No edge case coverage');
        recommendations.push('Document edge cases');
        score -= 1;
    }

    // Input validation
    const hasInputValidation = /validat|check|verify|ensure/i.test(body);
    if (!hasInputValidation && body.length > 300) {
        findings.push('No input validation mentioned');
        recommendations.push('Add input validation instructions');
        score -= 1;
    }

    // Troubleshooting
    const hasTroubleshooting = /troubleshoot|debug|solve|resolve/i.test(body);
    if (!hasTroubleshooting && body.length > 800) {
        findings.push('No troubleshooting guidance');
        recommendations.push('Add troubleshooting section');
        score -= 1;
    }

    return {
        name: 'operational-readiness',
        displayName: 'Operational Readiness',
        weight: maxScore,
        score: Math.max(0, score),
        maxScore,
        findings,
        recommendations,
    };
}

// ============================================================================
// MAIN EVALUATION
// ============================================================================

/**
 * Evaluate a command and return a full report.
 */
export function evaluateCommand(command: Command, scope: EvaluationScope = 'basic'): CommandEvaluationReport {
    const { frontmatter, body, path, filename } = command;

    // Detect pseudocode usage
    const hasPseudocode = detectPseudocode(body);
    const weightProfile: WeightProfile = hasPseudocode ? 'with-pseudocode' : 'without-pseudocode';
    const weights = getWeights(hasPseudocode);

    // Run security scan
    const securityResult = scanForSecurityIssues(command.raw);

    // Check for blacklist (immediate reject)
    if (securityResult.hasBlacklist) {
        return {
            commandPath: path,
            commandName: filename,
            scope,
            weightProfile,
            overallScore: 0,
            maxScore: 100,
            percentage: 0,
            grade: 'F',
            dimensions: [],
            timestamp: new Date().toISOString(),
            passed: false,
            rejected: true,
            rejectReason: `Security blacklist violation: ${securityResult.blacklistFindings.join(', ')}`,
            securityScan: {
                blacklistFound: true,
                greylistFound: securityResult.greylistFindings.length > 0,
                greylistPenalty: securityResult.greylistPenalty,
            },
        };
    }

    // Analyze body
    const analysis = analyzeBody(body);

    const dimensions: CommandEvaluationDimension[] = [];

    // Always run basic evaluations (7 of 11 dimensions).
    // NOTE: Basic scope evaluates fewer dimensions, so percentages are relative
    // to the actual maxScore of evaluated dimensions, not the full 10-dimension total.
    dimensions.push(evaluateFrontmatterQuality(frontmatter, weights));
    dimensions.push(evaluateDescriptionEffectiveness(frontmatter, weights));
    dimensions.push(evaluateContentQuality(body, analysis, weights));
    dimensions.push(evaluateStructureBrevity(body, analysis, weights));
    dimensions.push(evaluateDelegationPattern(body, analysis, weights));
    dimensions.push(evaluateArgumentDesign(frontmatter, analysis, weights));
    dimensions.push(evaluateCircularReference(body, analysis, weights));

    if (scope === 'full') {
        dimensions.push(evaluateSecurity(frontmatter, securityResult, weights));
        dimensions.push(evaluateNamingConvention(filename, weights));
        dimensions.push(evaluatePlatformCompatibility(body, analysis, weights));
        dimensions.push(evaluateOperationalReadiness(body, analysis, weights));
    }

    // Calculate overall score
    const weightedScore = dimensions.reduce((sum, d) => sum + d.score, 0);
    const maxScore = dimensions.reduce((sum, d) => sum + d.maxScore, 0);
    const percentage = maxScore > 0 ? Math.round((weightedScore / maxScore) * 100) : 0;

    return {
        commandPath: path,
        commandName: filename,
        scope,
        weightProfile,
        overallScore: weightedScore,
        maxScore,
        percentage,
        grade: calculateGrade(percentage),
        dimensions,
        timestamp: new Date().toISOString(),
        passed: percentage >= EVALUATION_CONFIG.passThreshold,
        securityScan: {
            blacklistFound: false,
            greylistFound: securityResult.greylistFindings.length > 0,
            greylistPenalty: securityResult.greylistPenalty,
        },
    };
}

/**
 * Evaluate a command file from disk.
 */
export async function evaluateCommandFile(
    filePath: string,
    scope: EvaluationScope = 'basic',
): Promise<CommandEvaluationReport> {
    const resolvedPath = resolve(filePath);

    if (!existsSync(resolvedPath)) {
        return {
            commandPath: resolvedPath,
            commandName: 'unknown',
            scope,
            weightProfile: 'without-pseudocode',
            overallScore: 0,
            maxScore: 100,
            percentage: 0,
            grade: 'F',
            dimensions: [],
            timestamp: new Date().toISOString(),
            passed: false,
            rejected: true,
            rejectReason: `Command file not found: ${resolvedPath}`,
        };
    }

    const { parseCommand } = await import('./utils');
    const content = readFileSync(resolvedPath, 'utf-8');
    const command = parseCommand(resolvedPath, content);

    return evaluateCommand(command, scope);
}

// ============================================================================
// CLI OUTPUT
// ============================================================================

export function printReport(report: CommandEvaluationReport, verbose: boolean): void {
    // Check if rejected
    if (report.rejected) {
        console.log('\nEvaluation REJECTED');
        console.log(`Reason: ${report.rejectReason}`);
        console.log(`\nCommand: ${report.commandName}`);
        console.log(`Scope: ${report.scope}`);
        return;
    }

    // Normal evaluation result
    if (report.passed) {
        console.log(`\nEvaluation passed (${report.percentage}%)`);
    } else {
        console.log(`\nEvaluation failed (${report.percentage}%)`);
    }

    console.log(`\nCommand: ${report.commandName}`);
    console.log(`Scope: ${report.scope}`);
    console.log(`Profile: ${report.weightProfile}`);
    console.log(`Score: ${report.overallScore}/${report.maxScore} (${report.percentage}%)`);
    console.log(`Grade: ${report.grade}`);
    console.log(`Pass threshold: ${EVALUATION_CONFIG.passThreshold}%`);

    // Always show dimension scores in table format
    console.log('\n--- Dimensions ---');
    console.log('');
    console.log('| Dimension                   | Score  | Max   | %     | Status |');
    console.log('| --------------------------- | ------ | ----- | ----- | ------ |');

    // Sort by percentage ascending to show weakest first
    const sortedDims = [...report.dimensions].sort((a, b) => {
        const pctA = a.maxScore > 0 ? (a.score / a.maxScore) * 100 : 0;
        const pctB = b.maxScore > 0 ? (b.score / b.maxScore) * 100 : 0;
        return pctA - pctB;
    });

    for (const dim of sortedDims) {
        const pct = dim.maxScore > 0 ? Math.round((dim.score / dim.maxScore) * 100) : 0;
        const status = pct >= 70 ? 'PASS' : 'FAIL';
        const name = dim.displayName.padEnd(26);
        console.log(
            `| ${name} | ${String(dim.score).padStart(4)} | ${String(dim.maxScore).padStart(4)} | ${String(pct).padStart(3)}% | ${status} |`,
        );
    }
    console.log('');

    // Show findings/recommendations in verbose mode
    if (verbose) {
        console.log('\n--- Detailed Findings ---');
        for (const dim of report.dimensions) {
            if (dim.findings.length > 0 || dim.recommendations.length > 0) {
                console.log(`\n**${dim.displayName}**`);
                if (dim.findings.length > 0) {
                    console.log('  Findings:');
                    for (const f of dim.findings) {
                        console.log(`    - ${f}`);
                    }
                }
                if (dim.recommendations.length > 0) {
                    console.log('  Recommendations:');
                    for (const r of dim.recommendations) {
                        console.log(`    - ${r}`);
                    }
                }
            }
        }
    }

    console.log('\n--- Summary ---');
    const totalFindings = report.dimensions.reduce((sum, d) => sum + d.findings.length, 0);
    const totalRecs = report.dimensions.reduce((sum, d) => sum + d.recommendations.length, 0);
    console.log(`Total findings: ${totalFindings}`);
    console.log(`Total recommendations: ${totalRecs}`);
    console.log(`Pass threshold: ${EVALUATION_CONFIG.passThreshold}%`);
}

export function printUsage(): void {
    console.log('Usage: evaluate.ts <command-path> [options]');
    console.log('');
    console.log('Arguments:');
    console.log('  <command-path>     Path to command .md file');
    console.log('');
    console.log('Options:');
    console.log('  --scope <level>    Evaluation scope: basic, full (default: basic)');
    console.log('  --platform <name>  Platform: claude, codex, gemini, openclaw, opencode, antigravity, all');
    console.log('  --json             Output results as JSON');
    console.log('  --verbose, -v      Show detailed evaluation output');
    console.log('  --help, -h         Show this help message');
}

export function parseCliArgs(): {
    path: string;
    options: {
        scope: EvaluationScope;
        platform: CommandPlatform | 'all';
        json: boolean;
        verbose: boolean;
    };
} {
    const args = parseArgs({
        args: process.argv.slice(2),
        allowPositionals: true,
        options: {
            scope: { type: 'string', default: 'basic' },
            platform: { type: 'string', default: 'all' },
            json: { type: 'boolean', default: false },
            verbose: { type: 'boolean', short: 'v', default: false },
            help: { type: 'boolean', short: 'h', default: false },
        },
    });

    if (args.values.help) {
        printUsage();
        process.exit(0);
    }

    const path = args.positionals?.[0];

    if (!path) {
        console.error('Error: Missing required argument <command-path>');
        printUsage();
        process.exit(1);
    }

    const validScopes = ['basic', 'full'];
    const scope = (args.values.scope as string) || 'basic';

    if (!validScopes.includes(scope)) {
        console.error(`Error: Invalid scope '${scope}'`);
        process.exit(1);
    }

    const validPlatforms = ['all', 'claude', 'codex', 'gemini', 'openclaw', 'opencode', 'antigravity'];
    const platform = (args.values.platform as string) || 'all';

    if (!validPlatforms.includes(platform)) {
        console.error(`Error: Invalid platform '${platform}'`);
        process.exit(1);
    }

    return {
        path,
        options: {
            scope: scope as EvaluationScope,
            platform: platform as CommandPlatform | 'all',
            json: args.values.json as boolean,
            verbose: args.values.verbose as boolean,
        },
    };
}

export async function main() {
    const { path: commandPath, options } = parseCliArgs();

    const log = options.json ? console.error : console.log;
    log(`[INFO] Evaluating command at: ${commandPath}`);
    log(`[INFO] Scope: ${options.scope}, Platform: ${options.platform}`);

    const report = await evaluateCommandFile(commandPath, options.scope);

    if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        process.exit(report.passed ? 0 : 1);
    }

    printReport(report, options.verbose);

    process.exit(report.passed ? 0 : 1);
}

// Only run main when executed directly, not when imported as a module
if (import.meta.main) {
    main();
}
