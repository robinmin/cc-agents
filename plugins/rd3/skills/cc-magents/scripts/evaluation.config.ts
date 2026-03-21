/**
 * Evaluation Configuration for rd3:cc-magents
 *
 * This file is the SINGLE SOURCE for all main agent config evaluation
 * weights, grade thresholds, and dimension definitions.
 *
 * 5 MECE dimensions designed for main agent configs:
 * - Coverage: Core concerns are present and substantive
 * - Operability: Instructions are actionable for real agent execution
 * - Grounding: Claims are verified, sourced, and uncertainty-aware
 * - Safety: Risk controls, approvals, and secrets handling are explicit
 * - Maintainability: The config can be evolved safely over time
 *
 * 3 Weight Profiles:
 * - standard: Balanced weights (default for most configs)
 * - minimal: Higher coverage/safety (simple configs)
 * - advanced: Higher maintainability/grounding (self-evolving configs)
 */

import type { EvaluationDimension, Grade, MagentWeightProfile } from './types';

// ============================================================================
// Types
// ============================================================================

/** Weight values for all 5 dimensions */
export interface MagentDimensionWeights {
    coverage: number;
    operability: number;
    grounding: number;
    safety: number;
    maintainability: number;
}

/** Grade threshold entry */
export interface GradeThreshold {
    grade: Grade;
    minPercentage: number;
}

/** Full evaluation configuration */
export interface MagentEvaluationConfig {
    /** Weight profiles */
    profiles: Record<MagentWeightProfile, MagentDimensionWeights>;
    /** Grade thresholds (ordered highest to lowest) */
    gradeThresholds: GradeThreshold[];
    /** Pass threshold percentage */
    passThreshold: number;
    /** Dimension display names */
    dimensionDisplayNames: Record<EvaluationDimension, string>;
}

// ============================================================================
// Configuration
// ============================================================================

export const MAGENT_EVALUATION_CONFIG: MagentEvaluationConfig = {
    // ========================================================================
    // Weight Profiles (all must sum to 100)
    // ========================================================================
    profiles: {
        /**
         * Standard profile (default).
         * Balanced weights for typical production configs.
         */
        standard: {
            coverage: 25,
            operability: 25,
            grounding: 20,
            safety: 20,
            maintainability: 10,
        },

        /**
         * Minimal profile.
         * For simple configs that just need strong coverage and safety.
         * Lower weight on maintainability and deep verification.
         */
        minimal: {
            coverage: 30,
            operability: 20,
            grounding: 15,
            safety: 30,
            maintainability: 5,
        },

        /**
         * Advanced profile.
         * For sophisticated self-evolving configs with memory and feedback.
         * Higher weight on maintainability and grounding.
         */
        advanced: {
            coverage: 20,
            operability: 20,
            grounding: 25,
            safety: 15,
            maintainability: 20,
        },
    },

    // ========================================================================
    // Grade Thresholds
    // ========================================================================
    gradeThresholds: [
        { grade: 'A', minPercentage: 90 },
        { grade: 'B', minPercentage: 80 },
        { grade: 'C', minPercentage: 70 },
        { grade: 'D', minPercentage: 60 },
        { grade: 'F', minPercentage: 0 },
    ],

    /** Minimum percentage to pass */
    passThreshold: 75,

    // ========================================================================
    // Display Names
    // ========================================================================
    dimensionDisplayNames: {
        coverage: 'Coverage',
        operability: 'Operability',
        grounding: 'Grounding',
        safety: 'Safety',
        maintainability: 'Maintainability',
    },
};

// ============================================================================
// Section Category Expectations (for Coverage scoring)
// ============================================================================

/**
 * Expected section categories for a complete main agent config.
 * Used by the coverage dimension scorer.
 */
export const EXPECTED_CATEGORIES = {
    /** Categories that should always be present */
    required: ['identity', 'rules', 'tools'] as const,
    /** Categories that are recommended for quality configs */
    recommended: ['workflow', 'standards', 'verification', 'output'] as const,
    /** Categories that expand operational breadth without overlapping maintainability */
    optional: ['environment', 'error-handling', 'testing', 'planning', 'parallel'] as const,
};

// ============================================================================
// Operability Indicators (for Operability scoring)
// ============================================================================

/**
 * Patterns that indicate high operability in content.
 * These focus on actionable execution guidance rather than generic prose.
 */
export const OPERABILITY_INDICATORS = {
    /** Decision trees (IF/THEN structures) */
    decisionTrees: [/IF\s+.+:/m, /├──|└──|│/m, /\bIF\b.*\bTHEN\b/im],
    /** Concrete examples */
    examples: [/<example>/i, /```[\s\S]*?```/m, /\bExample:/i, /\be\.g\.\b/i],
    /** Exact commands */
    commands: [/^\s*\$\s+/m, /```(?:bash|sh|shell|zsh)\b/m],
    /** Version numbers and hard constraints */
    constraints: [/v?\d+\.\d+\.\d+/, /\b(version|v)\s*\d+/i, /\b\d+\s*(ms|s|min|hours?|%|MB|GB|KB|files?|lines?)\b/i],
    /** Output or response contract patterns */
    outputContracts: [
        /\b(output|response)\s+format\b/i,
        /\b(final\s+answer|report|json|yaml|markdown)\b/i,
        /\b(file\s+references?|citations?|sections?)\b/i,
    ],
    /** Workflow and success criteria patterns */
    workflows: [
        /\b(workflow|process|steps?|plan|execute|verify|validate)\b/i,
        /^\s*\d+\.\s+/m,
        /\b(success\s+criteria|done\s+when|quality\s+gate)\b/i,
    ],
};

// ============================================================================
// Safety Indicators (for Safety scoring)
// ============================================================================

/**
 * Patterns that indicate good safety practices.
 */
export const SAFETY_INDICATORS = {
    /** Critical markers */
    criticalMarkers: [/\[CRITICAL\]/i, /\bCRITICAL\b/, /\bNEVER\b/, /\bMUST NOT\b/i, /\bALWAYS\b/],
    /** Destructive action warnings */
    destructiveWarnings: [
        /\b(destructive|dangerous|irreversible)\b/i,
        /\b(force push|--force|rm -rf)\b/i,
        /\b(backup|rollback|undo)\b/i,
    ],
    /** Permission boundaries */
    permissions: [/\bpermission\b/i, /\bapproval\b/i, /\bask\s+(before|user|first)\b/i],
    /** Secret protection */
    secretProtection: [/\b(secrets?|credentials?|api.?keys?)\b/i, /\b(\.env|environment\s+variables?)\b/i],
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get weight configuration for a profile.
 */
export function getWeightsForProfile(profile: MagentWeightProfile): MagentDimensionWeights {
    return MAGENT_EVALUATION_CONFIG.profiles[profile];
}

/**
 * Get grade for a percentage score.
 */
export function getGradeForPercentage(percentage: number): Grade {
    for (const threshold of MAGENT_EVALUATION_CONFIG.gradeThresholds) {
        if (percentage >= threshold.minPercentage) {
            return threshold.grade;
        }
    }
    return 'F';
}

/**
 * Validate that a weight profile sums to exactly 100.
 */
export function validateWeightProfile(weights: MagentDimensionWeights): { valid: boolean; sum: number } {
    const sum = weights.coverage + weights.operability + weights.grounding + weights.safety + weights.maintainability;

    return { valid: sum === 100, sum };
}

export default MAGENT_EVALUATION_CONFIG;
