#!/usr/bin/env bun
/**
 * Main Agent Config Evaluation Script for rd3:cc-magents
 *
 * Quality evaluation for main agent configuration files across 5 MECE dimensions:
 * - Coverage: Core concerns are present and substantive
 * - Operability: Instructions are actionable for real agent execution
 * - Grounding: Claims are verified, sourced, and uncertainty-aware
 * - Safety: CRITICAL rules, destructive action warnings, permissions
 * - Maintainability: Memory, feedback, steering, and change tracking
 *
 * Usage:
 *   bun evaluate.ts <config-path> [options]
 *
 * Options:
 *   --profile <name>    Weight profile: standard, minimal, advanced (default: standard)
 *   --platform <name>   Target platform (default: auto-detect)
 *   --json              Output results as JSON
 *   --verbose, -v       Show detailed output
 *   --output, -o <path> Write results to file (default: stdout)
 *   --help, -h          Show help
 *
 * Weight Profiles:
 *   standard:  Balanced weights (default)
 *   minimal:  Higher coverage/safety (simple configs)
 *   advanced:  Higher maintainability/grounding (self-evolving configs)
 */

import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { logger } from '../../../scripts/logger';
import {
    EXPECTED_CATEGORIES,
    MAGENT_EVALUATION_CONFIG,
    OPERABILITY_INDICATORS,
    SAFETY_INDICATORS,
    getGradeForPercentage,
    getWeightsForProfile,
} from './evaluation.config';
import type {
    DimensionScore,
    EvaluationDimension,
    MagentEvaluationReport,
    MagentPlatform,
    MagentSection,
    MagentValidationResult,
    MagentWeightProfile,
    UniversalMainAgent,
} from './types';
import { classifySections, detectPlatform, parseSections } from './utils';
import { validateMagentConfig } from './validate';

// ============================================================================
// CLI Options Interface (for testing)
// ============================================================================

/** Options for the evaluate run function */
export interface EvaluateOptions {
    configPath: string;
    profile?: MagentWeightProfile;
    forcedPlatform?: MagentPlatform;
    outputPath?: string;
    jsonOutput?: boolean;
    verbose?: boolean;
}

/** Result from evaluate run */
export interface EvaluateRunResult {
    validation: MagentValidationResult;
    report: MagentEvaluationReport;
    outputWritten?: string;
}

// ============================================================================
// Types
// ============================================================================

interface ScoredSection {
    section: MagentSection;
    categories: string[];
    score: number;
    maxScore: number;
}

interface DimensionResult {
    dimension: EvaluationDimension;
    displayName: string;
    score: number;
    maxScore: number;
    percentage: number;
    findings: string[];
    recommendations: string[];
    scoredSections: ScoredSection[];
}

interface EvaluationContext {
    model: UniversalMainAgent;
    sections: MagentSection[];
    rawContent: string;
    platform: MagentPlatform;
    weightProfile: MagentWeightProfile;
}

// ============================================================================
// Configuration Constants
// ============================================================================

const COVERAGE_WEIGHT_REQUIRED = 45;
const COVERAGE_WEIGHT_RECOMMENDED = 35;
const COVERAGE_WEIGHT_OPTIONAL = 20;
const COVERAGE_WEIGHT_EMPTY_PENALTY = 10;

const OPERABILITY_WEIGHT_ROUTING = 25;
const OPERABILITY_WEIGHT_EXAMPLES = 20;
const OPERABILITY_WEIGHT_CONSTRAINTS = 20;
const OPERABILITY_WEIGHT_OUTPUT = 20;
const OPERABILITY_WEIGHT_WORKFLOW = 15;

const GROUNDING_WEIGHT_EVIDENCE = 30;
const GROUNDING_WEIGHT_UNCERTAINTY = 25;
const GROUNDING_WEIGHT_VERIFICATION = 25;
const GROUNDING_WEIGHT_FALLBACK = 20;

const SAFETY_WEIGHT_CRITICAL = 30;
const SAFETY_WEIGHT_DESTRUCTIVE = 25;
const SAFETY_WEIGHT_SECRETS = 25;
const SAFETY_WEIGHT_PERMISSIONS = 20;

const MAINTAINABILITY_WEIGHT_MEMORY = 30;
const MAINTAINABILITY_WEIGHT_FEEDBACK = 30;
const MAINTAINABILITY_WEIGHT_STEERING = 20;
const MAINTAINABILITY_WEIGHT_VERSIONING = 20;

const PASS_THRESHOLD = 75;

// ============================================================================
// Main Evaluation Function
// ============================================================================

/**
 * Evaluate a main agent configuration file across all 5 quality dimensions.
 *
 * Returns a detailed evaluation report with per-dimension scores,
 * findings, recommendations, and an overall grade.
 */
export async function evaluateMagentConfig(
    filePath: string,
    content: string,
    profile: MagentWeightProfile = 'standard',
    forcedPlatform?: MagentPlatform,
): Promise<MagentEvaluationReport> {
    const resolvedPath = resolve(filePath);
    const detectedPlatform = forcedPlatform ?? detectPlatform(resolvedPath) ?? 'agents-md';
    const { sections } = parseSections(content);
    const classifiedSections = classifySections(sections);

    const model: UniversalMainAgent = {
        sourcePath: resolvedPath,
        sourceFormat: detectedPlatform,
        sections: classifiedSections,
        rawContent: content,
    };

    const ctx: EvaluationContext = {
        model,
        sections: classifiedSections,
        rawContent: content,
        platform: detectedPlatform,
        weightProfile: profile,
    };

    // Score each dimension
    const dimensionResults: DimensionResult[] = [
        scoreCoverage(ctx),
        scoreOperability(ctx),
        scoreGrounding(ctx),
        scoreSafety(ctx),
        scoreMaintainability(ctx),
    ];

    // Calculate weighted aggregate score
    const weights = getWeightsForProfile(profile);
    let totalScore = 0;
    let totalWeight = 0;

    // Map evaluation dimension names to weight keys
    const weightKeyMap: Record<EvaluationDimension, keyof typeof weights> = {
        coverage: 'coverage',
        operability: 'operability',
        grounding: 'grounding',
        safety: 'safety',
        maintainability: 'maintainability',
    };

    for (const result of dimensionResults) {
        const weightKey = weightKeyMap[result.dimension];
        const weight = weights[weightKey];
        totalScore += (result.percentage / 100) * weight;
        totalWeight += weight;
    }

    const overallScore = Math.round((totalScore / totalWeight) * 100);
    const grade = getGradeForPercentage(overallScore);
    const passed = overallScore >= PASS_THRESHOLD;

    // Collect top recommendations
    const allRecommendations: Array<{ dimension: string; recommendation: string; priority: number }> = [];
    for (const result of dimensionResults) {
        for (let i = 0; i < result.recommendations.length; i++) {
            allRecommendations.push({
                dimension: result.displayName,
                recommendation: result.recommendations[i],
                priority: i,
            });
        }
    }

    // Sort by priority and take top 5
    allRecommendations.sort((a, b) => a.priority - b.priority);
    const topRecommendations = allRecommendations.slice(0, 5).map((r) => `[${r.dimension}] ${r.recommendation}`);

    // Build dimension scores
    const dimensions: DimensionScore[] = dimensionResults.map((result) => ({
        dimension: result.dimension,
        displayName: result.displayName,
        weight: getDimensionWeight(result.dimension, weights),
        score: result.score,
        maxScore: result.maxScore,
        percentage: result.percentage,
        findings: result.findings,
        recommendations: result.recommendations,
    }));

    return {
        filePath: resolvedPath,
        platform: detectedPlatform,
        weightProfile: profile,
        dimensions,
        overallScore,
        grade,
        passed,
        topRecommendations,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Run evaluation with full workflow: validate, evaluate, optionally write output.
 * This is the main entry point for programmatic use.
 */
export async function runEvaluate(opts: EvaluateOptions): Promise<EvaluateRunResult> {
    const { configPath, profile = 'standard', forcedPlatform, outputPath } = opts;

    const resolvedPath = resolve(configPath);

    // Validate profile
    if (profile && !['standard', 'minimal', 'advanced'].includes(profile)) {
        throw new Error(`Invalid profile: ${profile}. Must be one of: standard, minimal, advanced`);
    }

    // Run validation first (hidden internal step)
    const validation = await validateMagentConfig(resolvedPath, await Bun.file(resolvedPath).text());

    // Then run evaluation
    const report = await evaluateMagentConfig(
        resolvedPath,
        await Bun.file(resolvedPath).text(),
        profile,
        forcedPlatform,
    );

    // Output handling
    if (outputPath) {
        const resolvedOutputPath = resolve(outputPath);
        await Bun.write(resolvedOutputPath, JSON.stringify({ validation, report }, null, 2));
        logger.success(`Report written to: ${resolvedOutputPath}`);
    }

    return { validation, report };
}

// ============================================================================
// Dimension Scorers
// ============================================================================

function getDimensionWeight(dimension: EvaluationDimension, weights: ReturnType<typeof getWeightsForProfile>): number {
    switch (dimension) {
        case 'coverage':
            return weights.coverage;
        case 'operability':
            return weights.operability;
        case 'grounding':
            return weights.grounding;
        case 'safety':
            return weights.safety;
        case 'maintainability':
            return weights.maintainability;
    }
}

function scoreCoverage(ctx: EvaluationContext): DimensionResult {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const scoredSections: ScoredSection[] = [];

    let score = 0;
    const maxScore = 100;

    // Check required categories
    const presentCategories = new Set(ctx.sections.map((s) => s.category));
    let requiredCount = 0;
    for (const cat of EXPECTED_CATEGORIES.required) {
        if (presentCategories.has(cat)) {
            requiredCount++;
            findings.push(`Found required category: ${cat}`);
        } else {
            recommendations.push(`Add a "${cat}" section (required for coverage)`);
        }
    }

    // Required categories contribute 45%
    score += (requiredCount / EXPECTED_CATEGORIES.required.length) * COVERAGE_WEIGHT_REQUIRED;

    // Recommended categories contribute 35%
    let recommendedCount = 0;
    for (const cat of EXPECTED_CATEGORIES.recommended) {
        if (presentCategories.has(cat)) {
            recommendedCount++;
            findings.push(`Found recommended category: ${cat}`);
        } else {
            recommendations.push(`Add a "${cat}" section to improve operational coverage`);
        }
    }
    score += (recommendedCount / EXPECTED_CATEGORIES.recommended.length) * COVERAGE_WEIGHT_RECOMMENDED;

    // Optional categories contribute 20%
    let optionalCount = 0;
    for (const cat of EXPECTED_CATEGORIES.optional) {
        if (presentCategories.has(cat)) {
            optionalCount++;
            findings.push(`Found optional category: ${cat}`);
        }
    }
    score += (optionalCount / EXPECTED_CATEGORIES.optional.length) * COVERAGE_WEIGHT_OPTIONAL;

    // Check for empty sections (penalty up to 10%)
    const emptySections = ctx.sections.filter((s) => !s.content || s.content.trim().length === 0);
    const emptyPenalty = Math.min(emptySections.length * 2, COVERAGE_WEIGHT_EMPTY_PENALTY);
    score -= emptyPenalty;

    if (emptySections.length > 0) {
        findings.push(`${emptySections.length} empty sections found`);
        for (const section of emptySections.slice(0, 3)) {
            recommendations.push(`Add content to empty section "${section.heading}" or remove it`);
        }
    }

    // Score each section for substance
    for (const section of ctx.sections) {
        const contentLength = section.content?.trim().length ?? 0;
        const substanceScore = contentLength > 200 ? 100 : contentLength > 100 ? 70 : contentLength > 50 ? 40 : 10;

        scoredSections.push({
            section,
            categories: section.category ? [section.category] : [],
            score: substanceScore,
            maxScore: 100,
        });
    }

    // Add finding for total sections
    findings.push(`Total sections: ${ctx.sections.length}`);

    const percentage = Math.round(Math.max(0, Math.min(100, score)));

    return {
        dimension: 'coverage',
        displayName: MAGENT_EVALUATION_CONFIG.dimensionDisplayNames.coverage,
        score,
        maxScore,
        percentage,
        findings,
        recommendations,
        scoredSections,
    };
}

function scoreOperability(ctx: EvaluationContext): DimensionResult {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const scoredSections: ScoredSection[] = [];

    let score = 0;
    const maxScore = 100;

    let routingCount = 0;
    let exampleCount = 0;
    let constraintCount = 0;
    let outputCount = 0;
    let workflowCount = 0;

    for (const pattern of OPERABILITY_INDICATORS.decisionTrees) {
        if (pattern.test(ctx.rawContent)) {
            routingCount++;
        }
    }

    if (/\bWhen\s+to\s+Use\b/i.test(ctx.rawContent)) {
        routingCount++;
        findings.push('Found "When to Use" routing guidance');
    }
    if (/\bWhen\s+NOT\s+to\s+Use\b/i.test(ctx.rawContent)) {
        routingCount++;
        findings.push('Found "When NOT to Use" routing guidance');
    }

    const routingScore =
        routingCount >= 3
            ? OPERABILITY_WEIGHT_ROUTING
            : routingCount >= 2
              ? Math.round(OPERABILITY_WEIGHT_ROUTING * 0.75)
              : routingCount >= 1
                ? Math.round(OPERABILITY_WEIGHT_ROUTING * 0.4)
                : 0;
    score += routingScore;

    if (routingCount === 0) {
        recommendations.push('Add tool-routing decision trees (When-to-Use / When-NOT-to-Use patterns)');
    }

    for (const pattern of OPERABILITY_INDICATORS.examples) {
        const matches = ctx.rawContent.match(pattern);
        if (matches) {
            exampleCount += matches.length;
        }
    }
    for (const pattern of OPERABILITY_INDICATORS.commands) {
        const matches = ctx.rawContent.match(pattern);
        if (matches) {
            exampleCount += matches.length;
        }
    }

    const exampleScore =
        exampleCount >= 5
            ? OPERABILITY_WEIGHT_EXAMPLES
            : exampleCount >= 3
              ? Math.round(OPERABILITY_WEIGHT_EXAMPLES * 0.7)
              : exampleCount >= 1
                ? Math.round(OPERABILITY_WEIGHT_EXAMPLES * 0.4)
                : 0;
    score += exampleScore;

    if (exampleCount > 0) {
        findings.push(`Found ${exampleCount} executable examples or command blocks`);
    } else {
        recommendations.push('Add runnable examples or exact command snippets');
    }

    for (const pattern of OPERABILITY_INDICATORS.constraints) {
        const matches = ctx.rawContent.match(pattern);
        if (matches) {
            constraintCount += matches.length;
        }
    }

    const constraintScore =
        constraintCount >= 5
            ? OPERABILITY_WEIGHT_CONSTRAINTS
            : constraintCount >= 2
              ? Math.round(OPERABILITY_WEIGHT_CONSTRAINTS * 0.65)
              : constraintCount >= 1
                ? Math.round(OPERABILITY_WEIGHT_CONSTRAINTS * 0.35)
                : 0;
    score += constraintScore;

    if (constraintCount > 0) {
        findings.push(`Found ${constraintCount} concrete constraints or version references`);
    } else {
        recommendations.push('Replace vague guidance with concrete thresholds, limits, and versions');
    }

    for (const pattern of OPERABILITY_INDICATORS.outputContracts) {
        const matches = ctx.rawContent.match(pattern);
        if (matches) {
            outputCount += matches.length;
        }
    }
    const hasOutputCategory = ctx.sections.some((section) => section.category === 'output');
    if (hasOutputCategory) {
        outputCount++;
    }

    const outputScore =
        outputCount >= 3
            ? OPERABILITY_WEIGHT_OUTPUT
            : outputCount >= 2
              ? Math.round(OPERABILITY_WEIGHT_OUTPUT * 0.7)
              : outputCount >= 1
                ? Math.round(OPERABILITY_WEIGHT_OUTPUT * 0.4)
                : 0;
    score += outputScore;

    if (outputCount > 0) {
        findings.push(`Found ${outputCount} output contract indicators`);
    } else {
        recommendations.push('Define the expected response/output contract for the agent');
    }

    for (const pattern of OPERABILITY_INDICATORS.workflows) {
        const matches = ctx.rawContent.match(pattern);
        if (matches) {
            workflowCount += matches.length;
        }
    }
    const hasWorkflowCategory = ctx.sections.some(
        (section) => section.category === 'workflow' || section.category === 'planning',
    );
    if (hasWorkflowCategory) {
        workflowCount++;
    }

    const workflowScore =
        workflowCount >= 4
            ? OPERABILITY_WEIGHT_WORKFLOW
            : workflowCount >= 2
              ? Math.round(OPERABILITY_WEIGHT_WORKFLOW * 0.7)
              : workflowCount >= 1
                ? Math.round(OPERABILITY_WEIGHT_WORKFLOW * 0.4)
                : 0;
    score += workflowScore;

    if (workflowCount > 0) {
        findings.push(`Found ${workflowCount} workflow or success-criteria indicators`);
    } else {
        recommendations.push('Document a stepwise workflow with success criteria or quality gates');
    }

    for (const section of ctx.sections) {
        let sectionScore = 0;

        for (const pattern of OPERABILITY_INDICATORS.decisionTrees) {
            if (pattern.test(section.content)) {
                sectionScore += 25;
                break;
            }
        }
        for (const pattern of OPERABILITY_INDICATORS.examples) {
            if (pattern.test(section.content)) {
                sectionScore += 20;
                break;
            }
        }
        for (const pattern of OPERABILITY_INDICATORS.commands) {
            if (pattern.test(section.content)) {
                sectionScore += 15;
                break;
            }
        }
        for (const pattern of OPERABILITY_INDICATORS.constraints) {
            if (pattern.test(section.content)) {
                sectionScore += 20;
                break;
            }
        }
        for (const pattern of OPERABILITY_INDICATORS.outputContracts) {
            if (pattern.test(section.content)) {
                sectionScore += 10;
                break;
            }
        }
        for (const pattern of OPERABILITY_INDICATORS.workflows) {
            if (pattern.test(section.content)) {
                sectionScore += 10;
                break;
            }
        }

        scoredSections.push({
            section,
            categories: section.category ? [section.category] : [],
            score: Math.min(sectionScore, 100),
            maxScore: 100,
        });
    }

    const percentage = Math.round(Math.max(0, Math.min(100, score)));

    return {
        dimension: 'operability',
        displayName: MAGENT_EVALUATION_CONFIG.dimensionDisplayNames.operability,
        score,
        maxScore,
        percentage,
        findings,
        recommendations,
        scoredSections,
    };
}

function scoreGrounding(ctx: EvaluationContext): DimensionResult {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const scoredSections: ScoredSection[] = [];

    let score = 0;
    const maxScore = 100;

    const evidencePatterns = [
        /\[.+\]\(https?:\/\/.+\)/,
        /\*\*.+\*\*.*\(https?:\/\/.+\)/,
        /see\s+(also\s+)?https?:\/\/.+/i,
        /\b(Sources?|References?|See also):/i,
        /\b(cite|citation|source|reference|documentation)\b/i,
    ];
    const uncertaintyPatterns = [
        /\b(confidence|probability|certainty)\b/i,
        /\b(high|medium|low)\s*(confidence|probability|certainty)\b/i,
        /\b(uncertain|not sure|don't know|cannot verify|unknown)\b/i,
    ];
    const verificationPatterns = [
        /\b(verify|validation|fact.?check|cross.?check|cross.?ref|test|tests|quality\s+gate)\b/i,
        /\b(run|execute|inspect|confirm)\b.*\b(test|check|verification|validation)\b/i,
    ];
    const fallbackPatterns = [
        /\b(if\s+unsure|if\s+uncertain|when\s+unclear)\b/i,
        /\b(ask\s+the\s+user|escalate|state\s+the\s+limitation|do\s+not\s+claim)\b/i,
    ];

    let evidenceCount = 0;
    for (const pattern of evidencePatterns) {
        const matches = ctx.rawContent.match(pattern);
        if (matches) {
            evidenceCount += matches.length;
        }
    }
    const evidenceScore =
        evidenceCount >= 3
            ? GROUNDING_WEIGHT_EVIDENCE
            : evidenceCount >= 2
              ? Math.round(GROUNDING_WEIGHT_EVIDENCE * 0.7)
              : evidenceCount >= 1
                ? Math.round(GROUNDING_WEIGHT_EVIDENCE * 0.4)
                : 0;
    score += evidenceScore;

    if (evidenceCount > 0) {
        findings.push(`Found ${evidenceCount} evidence or citation indicators`);
    } else {
        recommendations.push('Require sources or citations for external and technical claims');
    }

    let uncertaintyCount = 0;
    for (const pattern of uncertaintyPatterns) {
        const matches = ctx.rawContent.match(pattern);
        if (matches) {
            uncertaintyCount += matches.length;
        }
    }
    const uncertaintyScore =
        uncertaintyCount >= 3
            ? GROUNDING_WEIGHT_UNCERTAINTY
            : uncertaintyCount >= 2
              ? Math.round(GROUNDING_WEIGHT_UNCERTAINTY * 0.7)
              : uncertaintyCount >= 1
                ? Math.round(GROUNDING_WEIGHT_UNCERTAINTY * 0.4)
                : 0;
    score += uncertaintyScore;

    if (uncertaintyCount > 0) {
        findings.push(`Found ${uncertaintyCount} uncertainty-handling indicators`);
    } else {
        recommendations.push('Add confidence or uncertainty-handling guidance');
    }

    let verificationCount = 0;
    for (const pattern of verificationPatterns) {
        const matches = ctx.rawContent.match(pattern);
        if (matches) {
            verificationCount += matches.length;
        }
    }
    const verificationScore =
        verificationCount >= 4
            ? GROUNDING_WEIGHT_VERIFICATION
            : verificationCount >= 2
              ? Math.round(GROUNDING_WEIGHT_VERIFICATION * 0.7)
              : verificationCount >= 1
                ? Math.round(GROUNDING_WEIGHT_VERIFICATION * 0.4)
                : 0;
    score += verificationScore;

    if (verificationCount > 0) {
        findings.push(`Found ${verificationCount} verification or quality-gate indicators`);
    } else {
        recommendations.push('Define explicit verification steps before claiming completion');
    }

    let fallbackCount = 0;
    for (const pattern of fallbackPatterns) {
        const matches = ctx.rawContent.match(pattern);
        if (matches) {
            fallbackCount += matches.length;
        }
    }
    const fallbackScore =
        fallbackCount >= 2
            ? GROUNDING_WEIGHT_FALLBACK
            : fallbackCount >= 1
              ? Math.round(GROUNDING_WEIGHT_FALLBACK * 0.5)
              : 0;
    score += fallbackScore;

    if (fallbackCount > 0) {
        findings.push(`Found ${fallbackCount} fallback or escalation indicators`);
    } else {
        recommendations.push('Document what the agent should do when evidence is missing or uncertainty remains');
    }

    for (const section of ctx.sections) {
        let sectionScore = 0;

        for (const pattern of evidencePatterns) {
            if (pattern.test(section.content)) {
                sectionScore += 30;
                break;
            }
        }
        for (const pattern of uncertaintyPatterns) {
            if (pattern.test(section.content)) {
                sectionScore += 25;
                break;
            }
        }
        for (const pattern of verificationPatterns) {
            if (pattern.test(section.content)) {
                sectionScore += 25;
                break;
            }
        }
        for (const pattern of fallbackPatterns) {
            if (pattern.test(section.content)) {
                sectionScore += 20;
                break;
            }
        }

        scoredSections.push({
            section,
            categories: section.category ? [section.category] : [],
            score: Math.min(sectionScore, 100),
            maxScore: 100,
        });
    }

    const percentage = Math.round(Math.max(0, Math.min(100, score)));

    return {
        dimension: 'grounding',
        displayName: MAGENT_EVALUATION_CONFIG.dimensionDisplayNames.grounding,
        score,
        maxScore,
        percentage,
        findings,
        recommendations,
        scoredSections,
    };
}

function scoreSafety(ctx: EvaluationContext): DimensionResult {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const scoredSections: ScoredSection[] = [];

    let score = 0;
    const maxScore = 100;

    // Check for CRITICAL markers
    let criticalCount = 0;
    for (const pattern of SAFETY_INDICATORS.criticalMarkers) {
        const matches = ctx.rawContent.match(pattern);
        if (matches) {
            criticalCount += matches.length;
        }
    }

    const criticalScore =
        criticalCount >= 5
            ? SAFETY_WEIGHT_CRITICAL
            : criticalCount >= 3
              ? Math.round(SAFETY_WEIGHT_CRITICAL * 0.7)
              : criticalCount >= 1
                ? Math.round(SAFETY_WEIGHT_CRITICAL * 0.4)
                : 0;
    score += criticalScore;

    if (criticalCount > 0) {
        findings.push(`Found ${criticalCount} CRITICAL safety markers`);
    } else {
        recommendations.push('Add CRITICAL safety markers for essential rules');
    }

    // Check for destructive action warnings
    let destructiveCount = 0;
    for (const pattern of SAFETY_INDICATORS.destructiveWarnings) {
        const matches = ctx.rawContent.match(pattern);
        if (matches) {
            destructiveCount += matches.length;
        }
    }

    const destructiveScore =
        destructiveCount >= 3
            ? SAFETY_WEIGHT_DESTRUCTIVE
            : destructiveCount >= 2
              ? Math.round(SAFETY_WEIGHT_DESTRUCTIVE * 0.6)
              : destructiveCount >= 1
                ? Math.round(SAFETY_WEIGHT_DESTRUCTIVE * 0.3)
                : 0;
    score += destructiveScore;

    if (destructiveCount > 0) {
        findings.push(`Found ${destructiveCount} destructive action warnings`);
    } else {
        recommendations.push('Add warnings for destructive/irreversible actions (force push, rm -rf)');
    }

    // Check for secret/API key handling
    let secretCount = 0;
    for (const pattern of SAFETY_INDICATORS.secretProtection) {
        const matches = ctx.rawContent.match(pattern);
        if (matches) {
            secretCount += matches.length;
        }
    }

    const secretScore =
        secretCount >= 3
            ? SAFETY_WEIGHT_SECRETS
            : secretCount >= 2
              ? Math.round(SAFETY_WEIGHT_SECRETS * 0.6)
              : secretCount >= 1
                ? Math.round(SAFETY_WEIGHT_SECRETS * 0.3)
                : 0;
    score += secretScore;

    if (secretCount > 0) {
        findings.push(`Found ${secretCount} secret handling patterns`);
    } else {
        recommendations.push('Add guidance for handling secrets, API keys, and credentials');
    }

    // Check for permission boundaries
    const permissionPatterns = [
        /\b(permission|approval|ask\s+(before|user|first))\b/i,
        /\b(confirm|verify|check\s+with)\b.*\b(user|admin|owner)\b/i,
    ];

    let permissionCount = 0;
    for (const pattern of permissionPatterns) {
        if (pattern.test(ctx.rawContent)) {
            permissionCount++;
        }
    }

    const permissionScore =
        permissionCount >= 2
            ? SAFETY_WEIGHT_PERMISSIONS
            : permissionCount >= 1
              ? Math.round(SAFETY_WEIGHT_PERMISSIONS * 0.5)
              : 0;
    score += permissionScore;

    if (permissionCount > 0) {
        findings.push(`Found ${permissionCount} permission boundary patterns`);
    } else {
        recommendations.push('Add approval and escalation boundaries for risky actions');
    }

    // Check for PII protection patterns
    const piiPatterns = [
        /\b(PII|personally\s+identifiable|privacy|GDPR|PIPL)\b/i,
        /\b(user\s+data|customer\s+data|personal\s+info)\b/i,
    ];

    let piiCount = 0;
    for (const pattern of piiPatterns) {
        if (pattern.test(ctx.rawContent)) {
            piiCount++;
        }
    }

    if (piiCount > 0) {
        score = Math.min(100, score + 5);
        findings.push('Found PII protection indicators');
    }

    // Score each section
    for (const section of ctx.sections) {
        let sectionScore = 0;

        for (const pattern of SAFETY_INDICATORS.criticalMarkers) {
            if (pattern.test(section.content)) {
                sectionScore += 40;
                break;
            }
        }

        for (const pattern of SAFETY_INDICATORS.destructiveWarnings) {
            if (pattern.test(section.content)) {
                sectionScore += 30;
                break;
            }
        }

        for (const pattern of SAFETY_INDICATORS.secretProtection) {
            if (pattern.test(section.content)) {
                sectionScore += 25;
                break;
            }
        }

        for (const pattern of permissionPatterns) {
            if (pattern.test(section.content)) {
                sectionScore += 20;
                break;
            }
        }

        scoredSections.push({
            section,
            categories: section.category ? [section.category] : [],
            score: Math.min(sectionScore, 100),
            maxScore: 100,
        });
    }

    const percentage = Math.round(Math.max(0, Math.min(100, score)));

    return {
        dimension: 'safety',
        displayName: MAGENT_EVALUATION_CONFIG.dimensionDisplayNames.safety,
        score,
        maxScore,
        percentage,
        findings,
        recommendations,
        scoredSections,
    };
}

function scoreMaintainability(ctx: EvaluationContext): DimensionResult {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const scoredSections: ScoredSection[] = [];

    let score = 0;
    const maxScore = 100;

    const memoryPatterns = [/\b(memory|context|history|remember|persistence)\b/i, /#\s*Memory/i, /#\s*Context/i];

    let memoryCount = 0;
    for (const pattern of memoryPatterns) {
        if (pattern.test(ctx.rawContent)) {
            memoryCount++;
        }
    }

    // Also check for dedicated memory category
    const hasMemoryCategory = ctx.sections.some((s) => s.category === 'memory');
    if (hasMemoryCategory) memoryCount++;

    const memoryScore =
        memoryCount >= 2
            ? MAINTAINABILITY_WEIGHT_MEMORY
            : memoryCount >= 1
              ? Math.round(MAINTAINABILITY_WEIGHT_MEMORY * 0.6)
              : 0;
    score += memoryScore;

    if (memoryCount > 0) {
        findings.push(`Found ${memoryCount} memory indicators`);
    } else {
        recommendations.push('Add a Memory or Context section for durable context-management patterns');
    }

    const feedbackPatterns = [
        /\b(feedback|learn|adapt|self.?improv|evolution)\b/i,
        /\b(user\s+feedback|behavior\s+adjustment|retrospective|postmortem)\b/i,
    ];

    let feedbackCount = 0;
    for (const pattern of feedbackPatterns) {
        const matches = ctx.rawContent.match(pattern);
        if (matches) {
            feedbackCount += matches.length;
        }
    }

    // Also check for evolution category
    const hasEvolutionCategory = ctx.sections.some((s) => s.category === 'evolution');
    if (hasEvolutionCategory) feedbackCount++;

    const feedbackScore =
        feedbackCount >= 3
            ? MAINTAINABILITY_WEIGHT_FEEDBACK
            : feedbackCount >= 2
              ? Math.round(MAINTAINABILITY_WEIGHT_FEEDBACK * 0.6)
              : feedbackCount >= 1
                ? Math.round(MAINTAINABILITY_WEIGHT_FEEDBACK * 0.3)
                : 0;
    score += feedbackScore;

    if (feedbackCount > 0) {
        findings.push(`Found ${feedbackCount} feedback mechanism indicators`);
    } else {
        recommendations.push('Add feedback and improvement loops for maintaining the config over time');
    }

    const steeringPatterns = [
        /\b(steering|directives?|instructions?)\b/i,
        /\b(preference|preferences?|defaults?)\b/i,
        /\.(steering|directives)\b/i,
    ];

    let steeringCount = 0;
    for (const pattern of steeringPatterns) {
        const matches = ctx.rawContent.match(pattern);
        if (matches) {
            steeringCount += matches.length;
        }
    }

    const steeringScore =
        steeringCount >= 2
            ? MAINTAINABILITY_WEIGHT_STEERING
            : steeringCount >= 1
              ? Math.round(MAINTAINABILITY_WEIGHT_STEERING * 0.5)
              : 0;
    score += steeringScore;

    if (steeringCount > 0) {
        findings.push(`Found ${steeringCount} steering or preference patterns`);
    } else {
        recommendations.push('Document steering files, defaults, or persistent preference mechanisms');
    }

    const versionHistoryPatterns = [
        /\b(changelog|version\s+history|revision|release\s+notes|effective\s+date)\b/i,
        /\bv\d+\.\d+\.\d+/,
        /\b(last\s+updated|updated_at|effective)\b/i,
    ];

    let versionHistoryCount = 0;
    for (const pattern of versionHistoryPatterns) {
        if (pattern.test(ctx.rawContent)) {
            versionHistoryCount++;
        }
    }

    const versioningScore =
        versionHistoryCount >= 2
            ? MAINTAINABILITY_WEIGHT_VERSIONING
            : versionHistoryCount >= 1
              ? Math.round(MAINTAINABILITY_WEIGHT_VERSIONING * 0.5)
              : 0;
    score += versioningScore;

    if (versionHistoryCount > 0) {
        findings.push('Found versioning or change-tracking indicators');
    } else {
        recommendations.push('Track config evolution with a version, effective date, or changelog note');
    }

    // Score each section
    for (const section of ctx.sections) {
        let sectionScore = 0;

        for (const pattern of memoryPatterns) {
            if (pattern.test(section.content)) {
                sectionScore += 30;
                break;
            }
        }

        for (const pattern of feedbackPatterns) {
            if (pattern.test(section.content)) {
                sectionScore += 30;
                break;
            }
        }

        for (const pattern of steeringPatterns) {
            if (pattern.test(section.content)) {
                sectionScore += 20;
                break;
            }
        }

        for (const pattern of versionHistoryPatterns) {
            if (pattern.test(section.content)) {
                sectionScore += 20;
                break;
            }
        }

        scoredSections.push({
            section,
            categories: section.category ? [section.category] : [],
            score: Math.min(sectionScore, 100),
            maxScore: 100,
        });
    }

    const percentage = Math.round(Math.max(0, Math.min(100, score)));

    return {
        dimension: 'maintainability',
        displayName: MAGENT_EVALUATION_CONFIG.dimensionDisplayNames.maintainability,
        score,
        maxScore,
        percentage,
        findings,
        recommendations,
        scoredSections,
    };
}

// ============================================================================
// CLI Entry Point
// ============================================================================

export interface EvaluateCLIOptions {
    args?: string[];
    stdin?: { filePath?: string; content?: string };
}

export interface EvaluateCLIResult {
    exitCode: number;
    output?: string;
    error?: string;
}

interface EvaluateArgValues {
    profile?: string;
    platform?: string;
    json?: boolean;
    verbose?: boolean;
    output?: string;
    help?: boolean;
}

/**
 * Parse CLI arguments for evaluate command
 */
export function parseEvaluateArgs(args: string[]): {
    values: EvaluateArgValues;
    positionals: string[];
} {
    return parseArgs({
        args,
        options: {
            profile: { type: 'string', short: 'p' },
            platform: { type: 'string' },
            json: { type: 'boolean' },
            verbose: { type: 'boolean', short: 'v' },
            output: { type: 'string', short: 'o' },
            help: { type: 'boolean', short: 'h' },
        },
        allowPositionals: true,
    }) as { values: EvaluateArgValues; positionals: string[] };
}

/**
 * Format evaluation report for console output
 */
export function formatEvaluateReport(
    validation: MagentValidationResult,
    report: MagentEvaluationReport,
    configPath: string,
    verbose?: boolean,
): string {
    const lines: string[] = [];

    const gradeColor =
        report.grade === 'A'
            ? '\x1b[32m'
            : report.grade === 'B'
              ? '\x1b[36m'
              : report.grade === 'C'
                ? '\x1b[33m'
                : '\x1b[31m';
    const reset = '\x1b[0m';

    lines.push(`\n${'='.repeat(60)}`);
    lines.push(`EVALUATION REPORT: ${configPath}`);
    lines.push(`${'='.repeat(60)}`);

    // Show validation summary first
    if (!validation.valid) {
        lines.push('\n--- Validation Errors ---');
        for (const error of validation.errors) {
            lines.push(`  ${'\x1b[31m'}✗${reset} ${error}`);
        }
    }
    if (validation.warnings.length > 0) {
        lines.push('\n--- Validation Warnings ---');
        for (const warning of validation.warnings) {
            lines.push(`  ${'\x1b[33m'}⚠${reset} ${warning}`);
        }
    }
    if (validation.valid && validation.warnings.length === 0) {
        lines.push(`\n${'\x1b[32m'}✓ Validation passed${reset}`);
    }

    lines.push(`\nPlatform: ${report.platform} | Profile: ${report.weightProfile}`);
    lines.push(
        `\nOverall Score: ${gradeColor}${report.grade}${reset} (${report.overallScore}%) ${report.passed ? 'PASS' : 'FAIL'}`,
    );
    lines.push('\n--- Dimension Scores ---');

    for (const dim of report.dimensions) {
        const dimColor = dim.percentage >= 80 ? '\x1b[32m' : dim.percentage >= 60 ? '\x1b[33m' : '\x1b[31m';
        lines.push(`  ${dim.displayName}: ${dimColor}${dim.percentage}%${reset} (weight: ${dim.weight}%)`);
    }

    if (verbose) {
        lines.push('\n--- Detailed Findings ---');
        for (const dim of report.dimensions) {
            if (dim.findings.length > 0) {
                lines.push(`\n${dim.displayName}:`);
                for (const finding of dim.findings.slice(0, 10)) {
                    lines.push(`  + ${finding}`);
                }
            }
        }
    }

    if (report.topRecommendations.length > 0) {
        lines.push('\n--- Top Recommendations ---');
        for (const rec of report.topRecommendations.slice(0, 5)) {
            lines.push(`  * ${rec}`);
        }
    }

    lines.push(`\nTimestamp: ${report.timestamp}`);
    lines.push('');

    return lines.join('\n');
}

/**
 * Get help text for evaluate command
 */
export function getEvaluateHelp(): string {
    return `
Usage: bun evaluate.ts <config-path> [options]

Options:
  --profile <name>    Weight profile: standard, minimal, advanced (default: standard)
  --platform <name>   Target platform (default: auto-detect)
  --json              Output results as JSON
  --verbose, -v       Show detailed output
  --output, -o <path> Write results to file
  --help, -h          Show help

Weight Profiles:
  standard:  Balanced weights (default) - 25% coverage, 25% operability,
              20% grounding, 20% safety, 10% maintainability
  minimal:   Higher coverage/safety - 30% coverage, 20% operability,
              15% grounding, 30% safety, 5% maintainability
  advanced:  Higher maintainability/grounding - 20% coverage, 20% operability,
              25% grounding, 15% safety, 20% maintainability

Grade Thresholds:
  A: >= 90%  B: >= 80%  C: >= 70%  D: >= 60%  F: < 60%
  Pass threshold: 75%

Examples:
  bun evaluate.ts AGENTS.md
  bun evaluate.ts .claude/CLAUDE.md --profile minimal
  bun evaluate.ts AGENTS.md --json --output evaluation-report.json
`;
}

/**
 * Handle evaluate CLI invocation - separated for testing
 */
export async function handleEvaluateCLI(options: EvaluateCLIOptions = {}): Promise<EvaluateCLIResult> {
    const args = options.args ?? Bun.argv.slice(2);
    const { values, positionals } = parseEvaluateArgs(args);

    if (values.help || positionals.length === 0) {
        return { exitCode: 0, output: getEvaluateHelp() };
    }

    const configPath = positionals[0];
    const resolvedPath = resolve(configPath);

    // Check file exists (skip in test mode with stdin)
    if (!options.stdin?.content) {
        if (!(await Bun.file(resolvedPath).exists())) {
            return { exitCode: 1, error: `File not found: ${resolvedPath}` };
        }
    }

    // Validate profile
    const profile = values.profile as MagentWeightProfile | undefined;
    if (profile && !['standard', 'minimal', 'advanced'].includes(profile)) {
        return { exitCode: 1, error: `Invalid profile: ${profile}. Must be one of: standard, minimal, advanced` };
    }

    const forcedPlatform = values.platform as MagentPlatform | undefined;

    // Run evaluation
    const runOpts: EvaluateOptions = {
        configPath: resolvedPath,
        profile: profile ?? 'standard',
    };
    if (values.output) {
        runOpts.outputPath = values.output;
    }
    if (forcedPlatform) {
        runOpts.forcedPlatform = forcedPlatform;
    }
    const { validation, report } = await runEvaluate(runOpts);

    if (values.json) {
        return {
            exitCode: report.passed && validation.valid ? 0 : 1,
            output: JSON.stringify({ validation, report }, null, 2),
        };
    }

    return {
        exitCode: report.passed && validation.valid ? 0 : 1,
        output: formatEvaluateReport(validation, report, configPath, values.verbose),
    };
}

async function main(): Promise<void> {
    const result = await handleEvaluateCLI();

    if (result.error) {
        logger.error(result.error);
    }
    if (result.output) {
        console.log(result.output);
    }
    process.exit(result.exitCode);
}

// Run if executed directly
if (import.meta.main) {
    main().catch((error) => {
        logger.error(`Unexpected error: ${error}`);
        process.exit(1);
    });
}
