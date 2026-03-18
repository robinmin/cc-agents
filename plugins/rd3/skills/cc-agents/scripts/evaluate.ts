#!/usr/bin/env bun
/**
 * Agent Evaluation Script for rd3:cc-agents
 *
 * Scores an agent .md file across 10 dimensions with configurable weight profiles.
 * Uses evaluation.config.ts for weights, security rules, and dimension definitions.
 *
 * Usage:
 *   bun evaluate.ts <agent-path> [options]
 *
 * Options:
 *   --scope <basic|full>           Evaluation scope (default: full)
 *   --profile <name|auto>          Weight profile: thin-wrapper, specialist, auto (default: auto)
 *   --output <json|text>           Output format (default: text)
 *   --verbose, -v                  Show detailed output
 *   --help, -h                     Show help
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { COLORS, logger } from '../../../scripts/logger';
import {
    AGENT_DIMENSION_CATEGORIES,
    AGENT_DIMENSION_DISPLAY_NAMES,
    AGENT_EVALUATION_CONFIG,
    type AgentDimensionWeights,
    getWeightsForProfile,
} from './evaluation.config';
import type {
    AgentDimensionName,
    AgentEvaluationDimension,
    AgentEvaluationReport,
    AgentWeightProfile,
    EvaluationScope,
    Grade,
} from './types';
import { analyzeBody, detectTemplateTier, detectWeightProfile, isValidAgentName, parseFrontmatter } from './utils';

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
// SECURITY SCANNER
// ============================================================================

/**
 * Scan agent content for dangerous patterns.
 * Blacklist hits cause immediate rejection. Greylist hits apply penalty.
 */
function scanForSecurityIssues(content: string): SecurityScanResult {
    const config = AGENT_EVALUATION_CONFIG;
    const result: SecurityScanResult = {
        hasBlacklist: false,
        blacklistFindings: [],
        greylistFindings: [],
        greylistPenalty: 0,
    };

    for (const rule of config.security.blacklist) {
        const matches = content.match(rule.pattern);
        if (matches) {
            result.hasBlacklist = true;
            result.blacklistFindings.push(`[BLACKLIST] ${rule.reason} (${matches[0]})`);
        }
    }

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
// DIMENSION SCORERS
// ============================================================================

/**
 * Score frontmatter quality (0-10).
 * Checks: YAML valid, name present, description present, proper types, no unknown fields.
 */
function scoreFrontmatterQuality(
    frontmatter: Record<string, unknown> | null,
    parseError: string | undefined,
    weight: number,
): AgentEvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let raw = 10;

    if (parseError) {
        findings.push(`YAML parse error: ${parseError}`);
        recommendations.push('Fix YAML frontmatter syntax');
        raw = 0;
    } else if (!frontmatter) {
        findings.push('No frontmatter found');
        recommendations.push('Add YAML frontmatter with at least name and description');
        raw = 0;
    } else {
        if (!frontmatter.name) {
            findings.push('Missing required field: name');
            recommendations.push('Add name field to frontmatter');
            raw -= 5;
        } else if (typeof frontmatter.name !== 'string') {
            findings.push('Field name must be a string');
            raw -= 5;
        }

        if (!frontmatter.description) {
            findings.push('Missing required field: description');
            recommendations.push('Add description field to frontmatter');
            raw -= 3;
        } else if (typeof frontmatter.description !== 'string') {
            findings.push('Field description must be a string');
            raw -= 3;
        }

        // Check tools field type
        if (frontmatter.tools !== undefined && !Array.isArray(frontmatter.tools)) {
            findings.push('tools field must be an array');
            recommendations.push('Use tools: ["Tool1", "Tool2"] format');
            raw -= 2;
        }
    }

    raw = Math.max(0, raw);
    const percentage = Math.round((raw / 10) * 100);

    return {
        name: 'frontmatter-quality',
        displayName: AGENT_DIMENSION_DISPLAY_NAMES['frontmatter-quality'],
        weight,
        score: Math.round((percentage / 100) * weight),
        maxScore: weight,
        findings,
        recommendations,
    };
}

/**
 * Score description effectiveness (0-10).
 * Checks: length, trigger phrases, "Use PROACTIVELY" pattern, example blocks, keyword richness.
 */
function scoreDescriptionEffectiveness(
    frontmatter: Record<string, unknown> | null,
    weight: number,
): AgentEvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let raw = 10;

    if (!frontmatter?.description || typeof frontmatter.description !== 'string') {
        findings.push('No description to evaluate');
        return {
            name: 'description-effectiveness',
            displayName: AGENT_DIMENSION_DISPLAY_NAMES['description-effectiveness'],
            weight,
            score: 0,
            maxScore: weight,
            findings,
            recommendations,
        };
    }

    const desc = frontmatter.description as string;

    // Length check
    if (desc.length < 20) {
        findings.push(`Description too short (${desc.length} chars)`);
        recommendations.push('Expand description to at least 20 characters with trigger keywords');
        raw -= 3;
    } else if (desc.length > 500) {
        findings.push(`Description too long (${desc.length} chars)`);
        recommendations.push('Keep description under 500 characters');
        raw -= 1;
    }

    // "Use PROACTIVELY" pattern
    if (/use\s+proactively/i.test(desc)) {
        findings.push('"Use PROACTIVELY" pattern detected (good)');
    } else {
        recommendations.push('Start description with "Use PROACTIVELY for..." for auto-routing');
        raw -= 2;
    }

    // Example blocks
    if (desc.includes('<example>')) {
        findings.push('Example blocks found in description (good)');
    } else {
        recommendations.push('Add 2-3 <example> blocks for better auto-routing');
        raw -= 2;
    }

    // Trigger phrase richness (action verbs + domain keywords)
    const triggerVerbs = /\b(implement|create|design|review|analyze|plan|debug|fix|build|test|deploy|refactor)\b/gi;
    const triggerCount = (desc.match(triggerVerbs) || []).length;
    if (triggerCount === 0) {
        findings.push('No trigger verbs found in description');
        recommendations.push('Add action verbs like "implement", "create", "review"');
        raw -= 2;
    } else if (triggerCount >= 3) {
        findings.push(`Rich trigger vocabulary (${triggerCount} verbs)`);
    }

    raw = Math.max(0, raw);
    const percentage = Math.round((raw / 10) * 100);

    return {
        name: 'description-effectiveness',
        displayName: AGENT_DIMENSION_DISPLAY_NAMES['description-effectiveness'],
        weight,
        score: Math.round((percentage / 100) * weight),
        maxScore: weight,
        findings,
        recommendations,
    };
}

/**
 * Score body quality (0-10).
 * Checks: line count, section headers, 8-section anatomy, persona/philosophy/rules,
 * DO/DON'T lists, output format.
 */
function scoreBodyQuality(body: string, weight: number, scope: EvaluationScope): AgentEvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let raw = 10;

    const analysis = analyzeBody(body);

    // Empty body
    if (body.trim().length === 0) {
        findings.push('Agent body is empty');
        recommendations.push('Add system prompt content');
        return {
            name: 'body-quality',
            displayName: AGENT_DIMENSION_DISPLAY_NAMES['body-quality'],
            weight,
            score: 0,
            maxScore: weight,
            findings,
            recommendations,
        };
    }

    // Line count
    if (analysis.lineCount < 10) {
        findings.push(`Body very short (${analysis.lineCount} lines)`);
        recommendations.push('Add more structured content (aim for 50+ lines)');
        raw -= 3;
    } else if (analysis.lineCount < 30) {
        findings.push(`Body somewhat short (${analysis.lineCount} lines)`);
        raw -= 1;
    }

    // Section headers
    if (analysis.sections.length === 0) {
        findings.push('No section headers found');
        recommendations.push('Add ## section headers for structure');
        raw -= 2;
    }

    // 8-section anatomy detection (specialist expectation)
    if (analysis.has8SectionAnatomy) {
        findings.push(`Full 8-section anatomy detected (${analysis.anatomySections.length}/8 sections)`);
    } else if (scope === 'full' && analysis.lineCount > 200) {
        findings.push(`Only ${analysis.anatomySections.length}/8 anatomy sections detected`);
        recommendations.push(
            'Consider full 8-section anatomy: METADATA, PERSONA, PHILOSOPHY, VERIFICATION, COMPETENCIES, PROCESS, RULES, OUTPUT',
        );
        raw -= 1;
    }

    // Rules section (DO/DON'T)
    if (analysis.hasRules) {
        findings.push("Rules section with DO/DON'T lists found");
    } else if (analysis.lineCount > 50) {
        recommendations.push("Add DO/DON'T rules section for behavioral constraints");
        raw -= 1;
    }

    // Output format section
    if (analysis.hasOutputFormat) {
        findings.push('Output format section found');
    } else if (scope === 'full') {
        recommendations.push('Add output format section with templates');
        raw -= 1;
    }

    raw = Math.max(0, raw);
    const percentage = Math.round((raw / 10) * 100);

    return {
        name: 'body-quality',
        displayName: AGENT_DIMENSION_DISPLAY_NAMES['body-quality'],
        weight,
        score: Math.round((percentage / 100) * weight),
        maxScore: weight,
        findings,
        recommendations,
    };
}

/**
 * Score tool restriction (0-10).
 * Checks: tools field present, not empty, appropriate for role, no redundant.
 */
function scoreToolRestriction(
    frontmatter: Record<string, unknown> | null,
    body: string,
    weight: number,
): AgentEvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let raw = 10;

    if (!frontmatter) {
        findings.push('No frontmatter to check tools');
        return {
            name: 'tool-restriction',
            displayName: AGENT_DIMENSION_DISPLAY_NAMES['tool-restriction'],
            weight,
            score: 0,
            maxScore: weight,
            findings,
            recommendations,
        };
    }

    const tools = frontmatter.tools;
    const disallowed = frontmatter.disallowedTools;

    // tools field presence
    if (tools === undefined && disallowed === undefined) {
        findings.push('No tools or disallowedTools defined');
        recommendations.push('Add tools whitelist or disallowedTools blacklist for security');
        raw -= 4;
    } else {
        if (Array.isArray(tools)) {
            if (tools.length === 0) {
                findings.push('tools array is empty');
                recommendations.push('List specific tools the agent needs');
                raw -= 2;
            } else {
                findings.push(`${tools.length} tool(s) whitelisted`);

                // Check for overly broad tool access
                if (tools.length > 20) {
                    findings.push('Large tools list (may be overly permissive)');
                    recommendations.push('Consider reducing tool count for least-privilege');
                    raw -= 1;
                }
            }
        }

        if (Array.isArray(disallowed) && disallowed.length > 0) {
            findings.push(`${disallowed.length} tool(s) blacklisted`);
        }
    }

    // Check if body mentions tools the frontmatter doesn't list
    const bodyToolMentions = body.match(/\b(Read|Write|Edit|Grep|Glob|Bash|Task|Skill|WebSearch|WebFetch)\b/g);
    if (bodyToolMentions && Array.isArray(tools)) {
        const toolSet = new Set(tools.map(String));
        const unlistedTools = [...new Set(bodyToolMentions)].filter((t) => !toolSet.has(t));
        if (unlistedTools.length > 0) {
            findings.push(`Body references tools not in whitelist: ${unlistedTools.join(', ')}`);
            recommendations.push('Add referenced tools to the tools array');
            raw -= 1;
        }
    }

    raw = Math.max(0, raw);
    const percentage = Math.round((raw / 10) * 100);

    return {
        name: 'tool-restriction',
        displayName: AGENT_DIMENSION_DISPLAY_NAMES['tool-restriction'],
        weight,
        score: Math.round((percentage / 100) * weight),
        maxScore: weight,
        findings,
        recommendations,
    };
}

/**
 * Score thin-wrapper compliance (0-10).
 * Checks: skill references, delegation language, no direct implementation patterns,
 * Skill() invocations.
 */
function scoreThinWrapperCompliance(
    frontmatter: Record<string, unknown> | null,
    body: string,
    weight: number,
): AgentEvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let raw = 10;

    const analysis = analyzeBody(body);

    // Skills references in frontmatter
    const hasSkillsFrontmatter = Array.isArray(frontmatter?.skills) && (frontmatter.skills as unknown[]).length > 0;
    if (hasSkillsFrontmatter) {
        findings.push(`Skills declared in frontmatter: ${(frontmatter?.skills as string[]).join(', ')}`);
    } else {
        recommendations.push('Add skills field to frontmatter listing delegated skills');
        raw -= 2;
    }

    // Skill references in body
    if (analysis.referencesSkills) {
        findings.push('Body references skills (delegation detected)');
    } else {
        findings.push('No skill references found in body');
        recommendations.push('Add rd2:*/rd3:* skill references showing delegation');
        raw -= 3;
    }

    // Delegation language patterns
    const delegationPatterns = [
        /\bdelegate\b/i,
        /\bSkill\s*\(/,
        /\binvoke\b.*\bskill\b/i,
        /\bfat\s+skills?\b/i,
        /\bthin\s+wrapper\b/i,
    ];
    const delegationCount = delegationPatterns.filter((p) => p.test(body)).length;
    if (delegationCount >= 2) {
        findings.push('Strong delegation language present');
    } else if (delegationCount === 0) {
        recommendations.push('Add delegation language (e.g., "delegate to", "invoke skill")');
        raw -= 2;
    }

    // Anti-pattern: direct implementation patterns (agent implementing logic itself)
    const implementationPatterns = [
        /\bfunction\s+\w+\s*\(/,
        /\bclass\s+\w+/,
        /\bimport\s+\{/,
        /```(?:typescript|javascript|python)\n.*(?:function|class|def)\b/s,
    ];
    const implCount = implementationPatterns.filter((p) => p.test(body)).length;
    if (implCount >= 2) {
        findings.push(`Direct implementation patterns detected (${implCount} patterns)`);
        recommendations.push('Agents should delegate to skills, not implement directly');
        raw -= 3;
    }

    raw = Math.max(0, raw);
    const percentage = Math.round((raw / 10) * 100);

    return {
        name: 'thin-wrapper-compliance',
        displayName: AGENT_DIMENSION_DISPLAY_NAMES['thin-wrapper-compliance'],
        weight,
        score: Math.round((percentage / 100) * weight),
        maxScore: weight,
        findings,
        recommendations,
    };
}

/**
 * Score platform compatibility (0-10).
 * Checks: UAM field completeness, no platform-specific syntax leaks, body portability.
 */
function scorePlatformCompatibility(
    frontmatter: Record<string, unknown> | null,
    body: string,
    weight: number,
): AgentEvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let raw = 10;

    // UAM core fields presence
    if (!frontmatter) {
        findings.push('No frontmatter for UAM assessment');
        raw = 2;
    } else {
        // Check for platform-specific field leaks
        const claudeOnlyFields = ['permissionMode', 'isolation', 'background', 'memory', 'hooks'];
        const claudeSpecificPresent = claudeOnlyFields.filter((f) => frontmatter[f] !== undefined);
        if (claudeSpecificPresent.length > 0) {
            findings.push(`Claude-specific fields: ${claudeSpecificPresent.join(', ')}`);
            raw -= 1;
        }
    }

    // Platform-specific syntax leaks in body
    const claudeSyntaxPatterns = [
        { pattern: /`!`[^`]+``/, label: 'Claude !`cmd` syntax' },
        { pattern: /\$ARGUMENTS|\$\d+/, label: 'Claude $ARGUMENTS syntax' },
        { pattern: /context:\s*fork/, label: 'Claude context: fork' },
    ];

    for (const { pattern, label } of claudeSyntaxPatterns) {
        if (pattern.test(body)) {
            findings.push(`Platform-specific syntax detected: ${label}`);
            recommendations.push(`Document ${label} as platform-specific`);
            raw -= 1;
        }
    }

    // Platform notes section
    if (/##\s+Platform/i.test(body)) {
        findings.push('Platform notes section found');
    } else if (body.length > 500) {
        recommendations.push('Add Platform Notes section for cross-platform guidance');
        raw -= 2;
    }

    raw = Math.max(0, raw);
    const percentage = Math.round((raw / 10) * 100);

    return {
        name: 'platform-compatibility',
        displayName: AGENT_DIMENSION_DISPLAY_NAMES['platform-compatibility'],
        weight,
        score: Math.round((percentage / 100) * weight),
        maxScore: weight,
        findings,
        recommendations,
    };
}

/**
 * Score naming convention (0-10).
 * Checks: lowercase, hyphen-case, 3-50 chars, no underscores, role-prefix pattern.
 */
function scoreNamingConvention(
    frontmatter: Record<string, unknown> | null,
    filename: string,
    weight: number,
): AgentEvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let raw = 10;

    const name = (frontmatter?.name as string) || filename;

    if (!name) {
        findings.push('No agent name found');
        return {
            name: 'naming-convention',
            displayName: AGENT_DIMENSION_DISPLAY_NAMES['naming-convention'],
            weight,
            score: 0,
            maxScore: weight,
            findings,
            recommendations,
        };
    }

    // Valid format
    if (!isValidAgentName(name)) {
        findings.push(`Invalid name format: '${name}'`);
        recommendations.push('Use lowercase hyphen-case: my-agent-name');
        raw -= 5;
    }

    // Length
    if (name.length < 3) {
        findings.push(`Name too short: ${name.length} chars (min 3)`);
        raw -= 3;
    } else if (name.length > 50) {
        findings.push(`Name too long: ${name.length} chars (max 50)`);
        raw -= 2;
    }

    // Underscore check
    if (name.includes('_')) {
        findings.push('Name contains underscores');
        recommendations.push('Replace underscores with hyphens');
        raw -= 3;
    }

    // Role-prefix pattern (e.g., super-*, domain-*)
    if (/^(super|domain|task|code|skill|agent|command)-/.test(name)) {
        findings.push('Follows role-prefix naming pattern');
    }

    // Name matches filename
    if (filename && name !== filename) {
        findings.push(`Name '${name}' does not match filename '${filename}'`);
        recommendations.push('Align name field with filename');
        raw -= 1;
    }

    raw = Math.max(0, raw);
    const percentage = Math.round((raw / 10) * 100);

    return {
        name: 'naming-convention',
        displayName: AGENT_DIMENSION_DISPLAY_NAMES['naming-convention'],
        weight,
        score: Math.round((percentage / 100) * weight),
        maxScore: weight,
        findings,
        recommendations,
    };
}

/**
 * Score operational readiness (0-10).
 * Checks: examples section, output format, verification steps, error handling guidance.
 */
function scoreOperationalReadiness(body: string, weight: number, scope: EvaluationScope): AgentEvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let raw = 10;

    // Examples section
    if (/##\s+Example/i.test(body) || /\bexample\b/i.test(body)) {
        findings.push('Examples present');
    } else {
        findings.push('No examples found');
        recommendations.push('Add concrete examples showing agent usage');
        raw -= 3;
    }

    // Output format section
    if (/output\s*(format|template)/i.test(body)) {
        findings.push('Output format defined');
    } else {
        findings.push('No output format section');
        recommendations.push('Add output format with templates');
        raw -= 2;
    }

    if (scope === 'full') {
        // Verification / validation steps
        if (/\b(verif|validat|check|confirm)\b/i.test(body)) {
            findings.push('Verification guidance present');
        } else {
            recommendations.push('Add verification steps for agent output');
            raw -= 2;
        }

        // Error handling guidance
        if (/\b(error|fail|fallback|recovery|troubleshoot)\b/i.test(body)) {
            findings.push('Error handling guidance present');
        } else {
            recommendations.push('Add error handling or fallback guidance');
            raw -= 2;
        }

        // TODO markers
        const todoCount = (body.match(/\bTODO\b/gi) || []).length;
        if (todoCount > 0) {
            findings.push(`Found ${todoCount} TODO marker(s)`);
            recommendations.push('Resolve TODO markers before publishing');
            raw -= Math.min(todoCount, 3);
        }
    }

    raw = Math.max(0, raw);
    const percentage = Math.round((raw / 10) * 100);

    return {
        name: 'operational-readiness',
        displayName: AGENT_DIMENSION_DISPLAY_NAMES['operational-readiness'],
        weight,
        score: Math.round((percentage / 100) * weight),
        maxScore: weight,
        findings,
        recommendations,
    };
}

// ============================================================================
// GRADING
// ============================================================================

/**
 * Compute letter grade from percentage.
 */
function computeGrade(percentage: number): Grade {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
}

// ============================================================================
// NEW DIMENSIONS: Security Posture & Instruction Clarity
// ============================================================================

/**
 * Score security posture (0-10).
 * Checks: No blacklist patterns, no greylist patterns, no hardcoded credentials.
 * Note: This is separate from the security gatekeeper which blocks on blacklist.
 */
function scoreSecurityPosture(body: string, weight: number): AgentEvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let raw = 10;

    const config = AGENT_EVALUATION_CONFIG;

    // Check for blacklist patterns in body
    for (const rule of config.security.blacklist) {
        const matches = body.match(rule.pattern);
        if (matches) {
            findings.push(`[BLACKLIST] ${rule.reason} (${matches[0]})`);
            raw -= 5;
        }
    }

    // Check for greylist patterns
    const greylistMatches: string[] = [];
    for (const rule of config.security.greylist) {
        const matches = body.match(rule.pattern);
        if (matches) {
            greylistMatches.push(`${rule.reason}`);
        }
    }
    if (greylistMatches.length > 0) {
        findings.push(`Greylist patterns found: ${greylistMatches.join(', ')}`);
        raw -= Math.min(3, greylistMatches.length); // Max -3 for greylist
    }

    // Check for hardcoded credentials pattern
    const credentialPatterns = [
        /(?:password|api[_-]?key|secret|token)\s*[:=]\s*["'][^"']+["']/i,
        /sk-[a-zA-Z0-9]{20,}/, // OpenAI API key pattern
    ];
    for (const pattern of credentialPatterns) {
        if (pattern.test(body)) {
            findings.push('Potential hardcoded credentials detected');
            recommendations.push('Remove any hardcoded credentials from agent body');
            raw -= 3;
        }
    }

    raw = Math.max(0, raw);
    const percentage = Math.round((raw / 10) * 100);

    return {
        name: 'security-posture',
        displayName: AGENT_DIMENSION_DISPLAY_NAMES['security-posture'],
        weight,
        score: Math.round((percentage / 100) * weight),
        maxScore: weight,
        findings,
        recommendations,
    };
}

/**
 * Score instruction clarity (0-10).
 * Checks: No ambiguous language, specific actionable instructions, clear role definition, defined boundaries.
 */
function scoreInstructionClarity(body: string, weight: number): AgentEvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let raw = 10;

    // Ambiguous language patterns
    const ambiguousPatterns = [
        { pattern: /\b(maybe|perhaps|possibly|might|may)\b/gi, weight: 1, reason: 'Ambiguous modal verbs' },
        { pattern: /\b(you can|you might|you could)\b/gi, weight: 1, reason: 'Hedging language' },
        { pattern: /\b(etc|and so on|and so forth)\b/gi, weight: 1, reason: 'Incomplete specification' },
        { pattern: /\b(whatever|anything)\b/gi, weight: 1, reason: 'Unbounded instructions' },
    ];

    for (const { pattern, weight: w, reason } of ambiguousPatterns) {
        const matches = body.match(pattern);
        if (matches && matches.length > 2) {
            findings.push(`Found ${matches.length} instances of ${reason}`);
            raw -= w;
        }
    }

    // Check for specific actionable instructions (positive)
    const hasActionVerbs = /\b(ensure|verify|check|validate|implement|create|add|fix|update|remove)\b/i.test(body);
    if (!hasActionVerbs) {
        findings.push('No clear action verbs found');
        recommendations.push('Use specific action verbs like "ensure", "verify", "check"');
        raw -= 2;
    }

    // Check for clear role definition
    const hasRoleDefinition = /^##\s*Role\s*$/m.test(body) || /^#\s+.*\s+Role\s*$/m.test(body);
    if (!hasRoleDefinition) {
        findings.push('No clear Role section found');
        recommendations.push("Add a Role section defining the agent's identity");
        raw -= 2;
    }

    // Check for boundaries/rules
    const hasRules = /^##\s*Rules\s*$/m.test(body) || /^###\s*(Do|Don't)/m.test(body);
    if (!hasRules) {
        findings.push('No Rules section found');
        recommendations.push('Add a Rules section defining behavioral boundaries');
        raw -= 1;
    }

    raw = Math.max(0, raw);
    const percentage = Math.round((raw / 10) * 100);

    return {
        name: 'instruction-clarity',
        displayName: AGENT_DIMENSION_DISPLAY_NAMES['instruction-clarity'],
        weight,
        score: Math.round((percentage / 100) * weight),
        maxScore: weight,
        findings,
        recommendations,
    };
}

// ============================================================================
// MAIN EVALUATION
// ============================================================================

/**
 * Evaluate an agent file across all 10 MECE dimensions.
 *
 * @param agentPath - Path to the agent .md file
 * @param scope - Evaluation scope: 'basic' or 'full'
 * @param weightProfile - Weight profile override (auto-detects if not specified)
 * @returns Full evaluation report
 */
export async function evaluateAgent(
    agentPath: string,
    scope: EvaluationScope = 'full',
    weightProfile?: AgentWeightProfile,
): Promise<AgentEvaluationReport> {
    const resolvedPath = resolve(agentPath);

    // Check file exists
    if (!existsSync(resolvedPath)) {
        return {
            agentPath: resolvedPath,
            agentName: 'unknown',
            scope,
            weightProfile: weightProfile || 'thin-wrapper',
            overallScore: 0,
            maxScore: 100,
            percentage: 0,
            grade: 'F',
            dimensions: [],
            timestamp: new Date().toISOString(),
            passed: false,
            rejected: false,
            rejectReason: `Agent file not found: ${resolvedPath}`,
        };
    }

    // Read and parse
    const file = Bun.file(resolvedPath);
    const content = await file.text();
    const parsed = parseFrontmatter(content);
    const filename = resolvedPath.split('/').pop()?.replace(/\.md$/, '') || 'unknown';

    // Detect profile if auto
    const profile = weightProfile || detectWeightProfile(parsed.body);
    const weights = getWeightsForProfile(profile);

    // Security scan (gatekeeper)
    const securityResult = scanForSecurityIssues(content);
    if (securityResult.hasBlacklist) {
        return {
            agentPath: resolvedPath,
            agentName: (parsed.frontmatter?.name as string) || filename,
            scope,
            weightProfile: profile,
            overallScore: 0,
            maxScore: 100,
            percentage: 0,
            grade: 'F',
            dimensions: [],
            timestamp: new Date().toISOString(),
            passed: false,
            rejected: true,
            rejectReason: `Security blacklist violation: ${securityResult.blacklistFindings.join('; ')}`,
        };
    }

    // Score all 10 MECE dimensions
    const dimensions: AgentEvaluationDimension[] = [
        scoreFrontmatterQuality(parsed.frontmatter, parsed.parseError, weights.frontmatterQuality),
        scoreDescriptionEffectiveness(parsed.frontmatter, weights.descriptionEffectiveness),
        scoreBodyQuality(parsed.body, weights.bodyQuality, scope),
        scoreToolRestriction(parsed.frontmatter, parsed.body, weights.toolRestriction),
        scoreThinWrapperCompliance(parsed.frontmatter, parsed.body, weights.thinWrapperCompliance),
        scorePlatformCompatibility(parsed.frontmatter, parsed.body, weights.platformCompatibility),
        scoreNamingConvention(parsed.frontmatter, filename, weights.namingConvention),
        scoreOperationalReadiness(parsed.body, weights.operationalReadiness, scope),
        scoreSecurityPosture(parsed.body, weights.securityPosture),
        scoreInstructionClarity(parsed.body, weights.instructionClarity),
    ];

    // Apply greylist penalty to overall score
    const rawTotal = dimensions.reduce((sum, d) => sum + d.score, 0);
    const maxTotal = dimensions.reduce((sum, d) => sum + d.maxScore, 0);
    const adjustedTotal = Math.max(0, rawTotal - securityResult.greylistPenalty);

    const percentage = maxTotal > 0 ? Math.round((adjustedTotal / maxTotal) * 100) : 0;
    const grade = computeGrade(percentage);

    // Add greylist findings to dimensions
    if (securityResult.greylistFindings.length > 0) {
        // Attach to the first dimension as a cross-cutting concern
        for (const finding of securityResult.greylistFindings) {
            dimensions[0].findings.push(finding);
        }
    }

    return {
        agentPath: resolvedPath,
        agentName: (parsed.frontmatter?.name as string) || filename,
        scope,
        weightProfile: profile,
        overallScore: adjustedTotal,
        maxScore: maxTotal,
        percentage,
        grade,
        dimensions,
        timestamp: new Date().toISOString(),
        passed: percentage >= 75,
        rejected: false,
    };
}

// ============================================================================
// CLI OUTPUT
// ============================================================================

/**
 * Render a bar chart for a dimension score.
 */
function renderBar(score: number, maxScore: number, width = 20): string {
    const pct = maxScore > 0 ? score / maxScore : 0;
    const filled = Math.round(pct * width);
    const empty = width - filled;
    const bar = '#'.repeat(filled) + '-'.repeat(empty);
    const pctStr = `${Math.round(pct * 100)}%`.padStart(4);
    return `[${bar}] ${pctStr}`;
}

/**
 * Print the evaluation report to stdout in text format.
 */
function printTextReport(report: AgentEvaluationReport, verbose: boolean): void {
    const { COLORS: C } = { COLORS };

    // Header
    console.log('');
    console.log(`${C.cyan}Agent Evaluation Report${C.reset}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`  Agent:    ${report.agentName}`);
    console.log(`  Path:     ${report.agentPath}`);
    console.log(`  Profile:  ${report.weightProfile}`);
    console.log(`  Scope:    ${report.scope}`);
    console.log('');

    // Rejection check
    if (report.rejected) {
        console.log(`${C.red}  REJECTED: ${report.rejectReason}${C.reset}`);
        console.log('');
        return;
    }

    // Overall score
    const gradeColor = report.passed ? C.green : C.red;
    console.log(`  Grade:    ${gradeColor}${report.grade}${C.reset} (${report.percentage}%)`);
    console.log(`  Score:    ${report.overallScore} / ${report.maxScore}`);
    console.log(`  Status:   ${report.passed ? `${C.green}PASS${C.reset}` : `${C.red}FAIL${C.reset}`}`);
    console.log('');

    // Dimension breakdown
    console.log(`${C.cyan}Dimension Breakdown${C.reset}`);
    console.log(`${'-'.repeat(60)}`);

    for (const dim of report.dimensions) {
        const dimPct = dim.maxScore > 0 ? Math.round((dim.score / dim.maxScore) * 100) : 0;
        const dimColor = dimPct >= 70 ? C.green : dimPct >= 40 ? C.yellow : C.red;
        const bar = renderBar(dim.score, dim.maxScore);

        console.log(`  ${dim.displayName.padEnd(26)} ${bar}  ${dimColor}${dim.score}/${dim.maxScore}${C.reset}`);

        if (verbose) {
            for (const finding of dim.findings) {
                console.log(`    [i] ${finding}`);
            }
            for (const rec of dim.recommendations) {
                console.log(`    [>] ${rec}`);
            }
        }
    }

    console.log('');

    // Recommendations summary (non-verbose)
    if (!verbose) {
        const allRecs = report.dimensions.flatMap((d) => d.recommendations);
        if (allRecs.length > 0) {
            console.log(`${C.cyan}Top Recommendations${C.reset}`);
            console.log(`${'-'.repeat(60)}`);
            for (const rec of allRecs.slice(0, 5)) {
                console.log(`  [>] ${rec}`);
            }
            if (allRecs.length > 5) {
                console.log(`  ... and ${allRecs.length - 5} more (use --verbose for all)`);
            }
            console.log('');
        }
    }
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

function printUsage(): void {
    console.log('Usage: evaluate.ts <agent-path> [options]');
    console.log('');
    console.log('Arguments:');
    console.log('  <agent-path>                Path to agent .md file');
    console.log('');
    console.log('Options:');
    console.log('  --scope <basic|full>        Evaluation scope (default: full)');
    console.log('  --profile <name|auto>       Weight profile: thin-wrapper, specialist, auto (default: auto)');
    console.log('  --output <json|text>        Output format (default: text)');
    console.log('  --verbose, -v               Show detailed findings');
    console.log('  --help, -h                  Show help');
}

function parseCliArgs(): {
    path: string;
    scope: EvaluationScope;
    profile: AgentWeightProfile | undefined;
    output: 'json' | 'text';
    verbose: boolean;
} {
    const args = parseArgs({
        args: process.argv.slice(2),
        allowPositionals: true,
        options: {
            scope: { type: 'string', default: 'full' },
            profile: { type: 'string', default: 'auto' },
            output: { type: 'string', default: 'text' },
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
        console.error('Error: Missing required argument <agent-path>');
        printUsage();
        process.exit(1);
    }

    const validScopes = ['basic', 'full'];
    const scope = (args.values.scope as string) || 'full';
    if (!validScopes.includes(scope)) {
        console.error(`Error: Invalid scope '${scope}'`);
        process.exit(1);
    }

    const validProfiles = ['auto', 'thin-wrapper', 'specialist'];
    const profileArg = (args.values.profile as string) || 'auto';
    if (!validProfiles.includes(profileArg)) {
        console.error(`Error: Invalid profile '${profileArg}'`);
        process.exit(1);
    }

    const validOutputs = ['json', 'text'];
    const output = (args.values.output as string) || 'text';
    if (!validOutputs.includes(output)) {
        console.error(`Error: Invalid output format '${output}'`);
        process.exit(1);
    }

    return {
        path,
        scope: scope as EvaluationScope,
        profile: profileArg === 'auto' ? undefined : (profileArg as AgentWeightProfile),
        output: output as 'json' | 'text',
        verbose: args.values.verbose as boolean,
    };
}

async function main(): Promise<void> {
    const { path: agentPath, scope, profile, output, verbose } = parseCliArgs();

    logger.info(`Evaluating agent: ${agentPath}`);

    const report = await evaluateAgent(agentPath, scope, profile);

    if (output === 'json') {
        console.log(JSON.stringify(report, null, 2));
    } else {
        printTextReport(report, verbose);
    }

    process.exit(report.passed ? 0 : 1);
}

if (import.meta.main) {
    main();
}
