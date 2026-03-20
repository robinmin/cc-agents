#!/usr/bin/env bun
/**
 * Main Agent Config Evaluation Script for rd3:cc-magents
 *
 * Quality evaluation for main agent configuration files across 5 dimensions:
 * - Completeness (25%): All necessary sections present and substantive
 * - Specificity (20%): Concrete examples, decision trees, version numbers
 * - Verifiability (20%): Anti-hallucination protocol, confidence scoring
 * - Safety (20%): CRITICAL rules, destructive action warnings, permissions
 * - Evolution-Readiness (15%): Memory architecture, feedback mechanisms
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
 *   minimal:  Higher completeness/safety (simple configs)
 *   advanced:  Higher evolution/verifiability (self-evolving configs)
 */

import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { logger } from '../../../scripts/logger';
import {
    EXPECTED_CATEGORIES,
    MAGENT_EVALUATION_CONFIG,
    SAFETY_INDICATORS,
    SPECIFICITY_INDICATORS,
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

const COMPLETENESS_WEIGHT_REQUIRED = 40;
const COMPLETENESS_WEIGHT_RECOMMENDED = 30;
const COMPLETENESS_WEIGHT_OPTIONAL = 20;
const COMPLETENESS_WEIGHT_EMPTY_PENALTY = 10;

const SPECIFICITY_WEIGHT_DECISION_TREES = 25;
const SPECIFICITY_WEIGHT_EXAMPLES = 25;
const SPECIFICITY_WEIGHT_VERSIONS = 15;
const SPECIFICITY_WEIGHT_THRESHOLDS = 20;
const SPECIFICITY_WEIGHT_TABLES = 15;

const VERIFIABILITY_WEIGHT_ANTI_HALLUCINATION = 35;
const VERIFIABILITY_WEIGHT_CONFIDENCE = 35;
const VERIFIABILITY_WEIGHT_CITATIONS = 30;

const SAFETY_WEIGHT_CRITICAL = 40;
const SAFETY_WEIGHT_DESTRUCTIVE = 30;
const SAFETY_WEIGHT_SECRETS = 30;

const EVOLUTION_WEIGHT_MEMORY = 35;
const EVOLUTION_WEIGHT_FEEDBACK = 35;
const EVOLUTION_WEIGHT_STEERING = 30;

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
        scoreCompleteness(ctx),
        scoreSpecificity(ctx),
        scoreVerifiability(ctx),
        scoreSafety(ctx),
        scoreEvolutionReadiness(ctx),
    ];

    // Calculate weighted aggregate score
    const weights = getWeightsForProfile(profile);
    let totalScore = 0;
    let totalWeight = 0;

    // Map evaluation dimension names to weight keys
    const weightKeyMap: Record<EvaluationDimension, keyof typeof weights> = {
        completeness: 'completeness',
        specificity: 'specificity',
        verifiability: 'verifiability',
        safety: 'safety',
        'evolution-readiness': 'evolutionReadiness',
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
    const report = await evaluateMagentConfig(resolvedPath, await Bun.file(resolvedPath).text(), profile, forcedPlatform);

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
        case 'completeness':
            return weights.completeness;
        case 'specificity':
            return weights.specificity;
        case 'verifiability':
            return weights.verifiability;
        case 'safety':
            return weights.safety;
        case 'evolution-readiness':
            return weights.evolutionReadiness;
    }
}

function scoreCompleteness(ctx: EvaluationContext): DimensionResult {
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
            recommendations.push(`Add a "${cat}" section (required for completeness)`);
        }
    }

    // Required categories contribute 40%
    score += (requiredCount / EXPECTED_CATEGORIES.required.length) * COMPLETENESS_WEIGHT_REQUIRED;

    // Recommended categories contribute 30%
    let recommendedCount = 0;
    for (const cat of EXPECTED_CATEGORIES.recommended) {
        if (presentCategories.has(cat)) {
            recommendedCount++;
            findings.push(`Found recommended category: ${cat}`);
        }
    }
    score += (recommendedCount / EXPECTED_CATEGORIES.recommended.length) * COMPLETENESS_WEIGHT_RECOMMENDED;

    // Optional categories contribute 20%
    let optionalCount = 0;
    for (const cat of EXPECTED_CATEGORIES.optional) {
        if (presentCategories.has(cat)) {
            optionalCount++;
            findings.push(`Found optional category: ${cat}`);
        }
    }
    score += (optionalCount / EXPECTED_CATEGORIES.optional.length) * COMPLETENESS_WEIGHT_OPTIONAL;

    // Check for empty sections (penalty up to 10%)
    const emptySections = ctx.sections.filter((s) => !s.content || s.content.trim().length === 0);
    const emptyPenalty = Math.min(emptySections.length * 2, COMPLETENESS_WEIGHT_EMPTY_PENALTY);
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
        dimension: 'completeness',
        displayName: MAGENT_EVALUATION_CONFIG.dimensionDisplayNames.completeness,
        score,
        maxScore,
        percentage,
        findings,
        recommendations,
        scoredSections,
    };
}

function scoreSpecificity(ctx: EvaluationContext): DimensionResult {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const scoredSections: ScoredSection[] = [];

    let score = 0;
    const maxScore = 100;

    let decisionTreeCount = 0;
    let exampleCount = 0;
    let versionCount = 0;
    let thresholdCount = 0;
    let tableCount = 0;

    // Check decision trees (IF/THEN patterns)
    for (const pattern of SPECIFICITY_INDICATORS.decisionTrees) {
        if (pattern.test(ctx.rawContent)) {
            decisionTreeCount++;
        }
    }

    // Count When-to-Use / When-NOT-to-Use patterns (decision tree indicators)
    const whenToUsePattern = /\bWhen\s+to\s+Use\b/i;
    const whenNotToUsePattern = /\bWhen\s+NOT\s+to\s+Use\b/i;
    if (whenToUsePattern.test(ctx.rawContent)) {
        decisionTreeCount++;
        findings.push('Found "When to Use" decision tree');
    }
    if (whenNotToUsePattern.test(ctx.rawContent)) {
        decisionTreeCount++;
        findings.push('Found "When NOT to Use" decision tree');
    }

    // Decision trees contribute 25%
    const decisionTreeScore = Math.min(decisionTreeCount * 25, SPECIFICITY_WEIGHT_DECISION_TREES);
    score += decisionTreeScore;

    if (decisionTreeCount === 0) {
        recommendations.push('Add decision trees (When-to-Use / When-NOT-to-Use patterns) for tools sections');
    }

    // Check examples (code blocks, Example: patterns)
    for (const pattern of SPECIFICITY_INDICATORS.examples) {
        const matches = ctx.rawContent.match(pattern);
        if (matches) {
            exampleCount += matches.length;
        }
    }

    const exampleScore =
        exampleCount >= 5
            ? SPECIFICITY_WEIGHT_EXAMPLES
            : exampleCount >= 3
              ? Math.round(SPECIFICITY_WEIGHT_EXAMPLES * 0.7)
              : exampleCount >= 1
                ? Math.round(SPECIFICITY_WEIGHT_EXAMPLES * 0.4)
                : 0;
    score += exampleScore;

    if (exampleCount > 0) {
        findings.push(`Found ${exampleCount} example blocks`);
    } else {
        recommendations.push('Add concrete examples to illustrate behavior');
    }

    // Check version numbers
    for (const pattern of SPECIFICITY_INDICATORS.versions) {
        if (pattern.test(ctx.rawContent)) {
            versionCount++;
        }
    }

    const versionScore =
        versionCount >= 3
            ? SPECIFICITY_WEIGHT_VERSIONS
            : versionCount >= 1
              ? Math.round(SPECIFICITY_WEIGHT_VERSIONS * 0.5)
              : 0;
    score += versionScore;

    if (versionCount > 0) {
        findings.push(`Found ${versionCount} version references`);
    }

    // Check concrete thresholds (numeric patterns in content)
    const thresholdPattern = /\b\d+\s*(ms|s|min|hours?|%|MB|GB|KB|files?|lines?)\b/i;
    const thresholdMatches = ctx.rawContent.match(thresholdPattern);
    thresholdCount = thresholdMatches ? thresholdMatches.length : 0;

    const thresholdScore =
        thresholdCount >= 5
            ? SPECIFICITY_WEIGHT_THRESHOLDS
            : thresholdCount >= 2
              ? Math.round(SPECIFICITY_WEIGHT_THRESHOLDS * 0.6)
              : thresholdCount >= 1
                ? Math.round(SPECIFICITY_WEIGHT_THRESHOLDS * 0.3)
                : 0;
    score += thresholdScore;

    if (thresholdCount > 0) {
        findings.push(`Found ${thresholdCount} concrete thresholds`);
    }

    // Check tables
    for (const pattern of SPECIFICITY_INDICATORS.tables) {
        const matches = ctx.rawContent.match(pattern);
        if (matches) {
            tableCount += matches.length;
        }
    }

    const tableScore =
        tableCount >= 2 ? SPECIFICITY_WEIGHT_TABLES : tableCount >= 1 ? Math.round(SPECIFICITY_WEIGHT_TABLES * 0.6) : 0;
    score += tableScore;

    if (tableCount > 0) {
        findings.push(`Found ${tableCount} tables`);
    }

    // Score each section
    for (const section of ctx.sections) {
        let sectionScore = 0;

        // Check for decision trees in this section
        for (const pattern of SPECIFICITY_INDICATORS.decisionTrees) {
            if (pattern.test(section.content)) {
                sectionScore += 25;
                break;
            }
        }

        // Check for examples in this section
        for (const pattern of SPECIFICITY_INDICATORS.examples) {
            if (pattern.test(section.content)) {
                sectionScore += 25;
                break;
            }
        }

        // Check for thresholds in this section
        if (thresholdPattern.test(section.content)) {
            sectionScore += 20;
        }

        // Check for tables in this section
        for (const pattern of SPECIFICITY_INDICATORS.tables) {
            if (pattern.test(section.content)) {
                sectionScore += 15;
                break;
            }
        }

        // Check for version in this section
        for (const pattern of SPECIFICITY_INDICATORS.versions) {
            if (pattern.test(section.content)) {
                sectionScore += 15;
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
        dimension: 'specificity',
        displayName: MAGENT_EVALUATION_CONFIG.dimensionDisplayNames.specificity,
        score,
        maxScore,
        percentage,
        findings,
        recommendations,
        scoredSections,
    };
}

function scoreVerifiability(ctx: EvaluationContext): DimensionResult {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const scoredSections: ScoredSection[] = [];

    let score = 0;
    const maxScore = 100;

    // Check for anti-hallucination rules
    const antiHallucinationPatterns = [
        /\b(anti.?hallucination|fact.?check|verify|validation|cross.?ref)\b/i,
        /\b(uncertainty|confidence|not sure|dont know)\b/i,
        /\b(cite|sources?|reference|documentation)\b/i,
    ];

    let antiHallucinationCount = 0;
    for (const pattern of antiHallucinationPatterns) {
        if (pattern.test(ctx.rawContent)) {
            antiHallucinationCount++;
        }
    }

    const antiHallucinationScore =
        antiHallucinationCount >= 3
            ? VERIFIABILITY_WEIGHT_ANTI_HALLUCINATION
            : antiHallucinationCount >= 2
              ? Math.round(VERIFIABILITY_WEIGHT_ANTI_HALLUCINATION * 0.7)
              : antiHallucinationCount >= 1
                ? Math.round(VERIFIABILITY_WEIGHT_ANTI_HALLUCINATION * 0.4)
                : 0;
    score += antiHallucinationScore;

    if (antiHallucinationCount > 0) {
        findings.push(`Found ${antiHallucinationCount} anti-hallucination indicators`);
    } else {
        recommendations.push('Add anti-hallucination rules (fact-checking, uncertainty acknowledgment)');
    }

    // Check for confidence scoring patterns
    const confidencePatterns = [
        /\b(confidence|probability|certainty)\b/i,
        /\b(high|medium|low)\s*(confidence|probability|certainty)\b/i,
        /\b(verify|check|cross.?ref)\s*(this|that|it)\b/i,
    ];

    let confidenceCount = 0;
    for (const pattern of confidencePatterns) {
        const matches = ctx.rawContent.match(pattern);
        if (matches) {
            confidenceCount += matches.length;
        }
    }

    const confidenceScore =
        confidenceCount >= 3
            ? VERIFIABILITY_WEIGHT_CONFIDENCE
            : confidenceCount >= 2
              ? Math.round(VERIFIABILITY_WEIGHT_CONFIDENCE * 0.6)
              : confidenceCount >= 1
                ? Math.round(VERIFIABILITY_WEIGHT_CONFIDENCE * 0.3)
                : 0;
    score += confidenceScore;

    if (confidenceCount > 0) {
        findings.push(`Found ${confidenceCount} confidence scoring indicators`);
    } else {
        recommendations.push('Add confidence scoring guidelines (HIGH/MEDIUM/LOW)');
    }

    // Check for source citations
    const citationPatterns = [
        /\[.+\]\(https?:\/\/.+\)/,
        /\*\*.+\*\*.*\(https?:\/\/.+\)/,
        /see\s+(also\s+)?https?:\/\/.+/i,
        /\b(Sources?|References?|See also):/i,
    ];

    let citationCount = 0;
    for (const pattern of citationPatterns) {
        const matches = ctx.rawContent.match(pattern);
        if (matches) {
            citationCount += matches.length;
        }
    }

    const citationScore =
        citationCount >= 3
            ? VERIFIABILITY_WEIGHT_CITATIONS
            : citationCount >= 2
              ? Math.round(VERIFIABILITY_WEIGHT_CITATIONS * 0.6)
              : citationCount >= 1
                ? Math.round(VERIFIABILITY_WEIGHT_CITATIONS * 0.3)
                : 0;
    score += citationScore;

    if (citationCount > 0) {
        findings.push(`Found ${citationCount} source citations`);
    } else {
        recommendations.push('Add source citations for technical claims');
    }

    // Score each section
    for (const section of ctx.sections) {
        let sectionScore = 0;

        for (const pattern of antiHallucinationPatterns) {
            if (pattern.test(section.content)) {
                sectionScore += 35;
                break;
            }
        }

        for (const pattern of confidencePatterns) {
            if (pattern.test(section.content)) {
                sectionScore += 35;
                break;
            }
        }

        for (const pattern of citationPatterns) {
            if (pattern.test(section.content)) {
                sectionScore += 30;
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
        dimension: 'verifiability',
        displayName: MAGENT_EVALUATION_CONFIG.dimensionDisplayNames.verifiability,
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

    // Permission patterns add bonus points
    if (permissionCount > 0) {
        score += 10;
        findings.push(`Found ${permissionCount} permission boundary patterns`);
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
        score += 10;
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
                sectionScore += 30;
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

function scoreEvolutionReadiness(ctx: EvaluationContext): DimensionResult {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const scoredSections: ScoredSection[] = [];

    let score = 0;
    const maxScore = 100;

    // Check for memory sections
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
        memoryCount >= 2 ? EVOLUTION_WEIGHT_MEMORY : memoryCount >= 1 ? Math.round(EVOLUTION_WEIGHT_MEMORY * 0.6) : 0;
    score += memoryScore;

    if (memoryCount > 0) {
        findings.push(`Found ${memoryCount} memory indicators`);
    } else {
        recommendations.push('Add a Memory section for context management patterns');
    }

    // Check for feedback mechanisms
    const feedbackPatterns = [
        /\b(feedback|learn|adapt|self.?improv|evolution)\b/i,
        /\b(user\s+feedback|behavior\s+adjustment)\b/i,
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
            ? EVOLUTION_WEIGHT_FEEDBACK
            : feedbackCount >= 2
              ? Math.round(EVOLUTION_WEIGHT_FEEDBACK * 0.6)
              : feedbackCount >= 1
                ? Math.round(EVOLUTION_WEIGHT_FEEDBACK * 0.3)
                : 0;
    score += feedbackScore;

    if (feedbackCount > 0) {
        findings.push(`Found ${feedbackCount} feedback mechanism indicators`);
    } else {
        recommendations.push('Add feedback mechanisms for continuous improvement');
    }

    // Check for steering file patterns
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
            ? EVOLUTION_WEIGHT_STEERING
            : steeringCount >= 1
              ? Math.round(EVOLUTION_WEIGHT_STEERING * 0.5)
              : 0;
    score += steeringScore;

    if (steeringCount > 0) {
        findings.push(`Found ${steeringCount} steering file patterns`);
    }

    // Check for version history patterns
    const versionHistoryPatterns = [/\b(changelog|version\s+history|history|revision)\b/i, /\bv\d+\.\d+\.\d+/];

    let versionHistoryCount = 0;
    for (const pattern of versionHistoryPatterns) {
        if (pattern.test(ctx.rawContent)) {
            versionHistoryCount++;
        }
    }

    if (versionHistoryCount > 0) {
        score += 10;
        findings.push('Found version history indicators');
    }

    // Score each section
    for (const section of ctx.sections) {
        let sectionScore = 0;

        for (const pattern of memoryPatterns) {
            if (pattern.test(section.content)) {
                sectionScore += 35;
                break;
            }
        }

        for (const pattern of feedbackPatterns) {
            if (pattern.test(section.content)) {
                sectionScore += 35;
                break;
            }
        }

        for (const pattern of steeringPatterns) {
            if (pattern.test(section.content)) {
                sectionScore += 30;
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
        dimension: 'evolution-readiness',
        displayName: MAGENT_EVALUATION_CONFIG.dimensionDisplayNames['evolution-readiness'],
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

/**
 * Parse CLI arguments for evaluate command
 */
export function parseEvaluateArgs(args: string[]): {
    values: Record<string, any>;
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
    });
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
  standard:  Balanced weights (default) - 25% completeness, 20% specificity,
              20% verifiability, 20% safety, 15% evolution-readiness
  minimal:    Higher completeness/safety - 30% completeness, 20% specificity,
              15% verifiability, 30% safety, 5% evolution-readiness
  advanced:   Higher evolution/verifiability - 20% completeness, 15% specificity,
              25% verifiability, 15% safety, 25% evolution-readiness

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
export async function handleEvaluateCLI(
    options: EvaluateCLIOptions = {},
): Promise<EvaluateCLIResult> {
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
    } else {
        return {
            exitCode: report.passed && validation.valid ? 0 : 1,
            output: formatEvaluateReport(validation, report, configPath, values.verbose),
        };
    }
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
