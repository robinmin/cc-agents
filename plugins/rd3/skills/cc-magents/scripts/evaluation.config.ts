/**
 * Evaluation Configuration for rd3:cc-magents
 *
 * This file is the SINGLE SOURCE for all main agent config evaluation
 * weights, grade thresholds, and dimension definitions.
 *
 * 5 Dimensions designed for main agent configs:
 * - Completeness (25%): All necessary sections present and substantive
 * - Specificity (20%): Concrete examples, decision trees, version numbers
 * - Verifiability (20%): Anti-hallucination protocol, confidence scoring
 * - Safety (20%): CRITICAL rules, destructive action warnings, permissions
 * - Evolution-Readiness (15%): Memory architecture, feedback mechanisms
 *
 * 3 Weight Profiles:
 * - standard: Balanced weights (default for most configs)
 * - minimal: Higher completeness/safety (simple configs)
 * - advanced: Higher evolution/verifiability (self-evolving configs)
 */

import type { EvaluationDimension, Grade, MagentWeightProfile } from './types';

// ============================================================================
// Types
// ============================================================================

/** Weight values for all 5 dimensions */
export interface MagentDimensionWeights {
    completeness: number;
    specificity: number;
    verifiability: number;
    safety: number;
    evolutionReadiness: number;
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
            completeness: 25,
            specificity: 20,
            verifiability: 20,
            safety: 20,
            evolutionReadiness: 15,
        },

        /**
         * Minimal profile.
         * For simple configs that just need core rules and safety.
         * Higher weight on completeness and safety, lower on evolution.
         */
        minimal: {
            completeness: 30,
            specificity: 20,
            verifiability: 15,
            safety: 30,
            evolutionReadiness: 5,
        },

        /**
         * Advanced profile.
         * For sophisticated self-evolving configs with memory and feedback.
         * Higher weight on evolution and verifiability.
         */
        advanced: {
            completeness: 20,
            specificity: 15,
            verifiability: 25,
            safety: 15,
            evolutionReadiness: 25,
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
        completeness: 'Completeness',
        specificity: 'Specificity',
        verifiability: 'Verifiability',
        safety: 'Safety',
        'evolution-readiness': 'Evolution Readiness',
    },
};

// ============================================================================
// Section Category Expectations (for Completeness scoring)
// ============================================================================

/**
 * Expected section categories for a complete main agent config.
 * Used by the completeness dimension scorer.
 */
export const EXPECTED_CATEGORIES = {
    /** Categories that should always be present */
    required: ['identity', 'rules', 'tools'] as const,
    /** Categories that are recommended for quality configs */
    recommended: ['workflow', 'standards', 'verification', 'output'] as const,
    /** Categories that are nice-to-have for advanced configs */
    optional: ['memory', 'evolution', 'error-handling', 'testing', 'planning'] as const,
};

// ============================================================================
// Specificity Indicators (for Specificity scoring)
// ============================================================================

/**
 * Patterns that indicate high specificity in content.
 * Each match adds to the specificity score.
 */
export const SPECIFICITY_INDICATORS = {
    /** Decision trees (IF/THEN structures) */
    decisionTrees: [/IF\s+.+:/m, /├──|└──|│/m, /\bIF\b.*\bTHEN\b/im],
    /** Concrete examples */
    examples: [/<example>/i, /```[\s\S]*?```/m, /\bExample:/i, /\be\.g\.\b/i],
    /** Version numbers */
    versions: [/v?\d+\.\d+\.\d+/, /\b(version|v)\s*\d+/i],
    /** Exact commands */
    commands: [/^\s*\$\s+/m, /```(?:bash|sh|shell|zsh)\b/m],
    /** Tables with data */
    tables: [/\|.*\|.*\|/m],
    /** Forbidden phrases (communication anti-patterns) */
    forbiddenPhrases: [/\bforbidden\s+phrases?\b/i, /\bdo\s+not\s+(?:use|say|write)\b/i],
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
    const sum =
        weights.completeness +
        weights.specificity +
        weights.verifiability +
        weights.safety +
        weights.evolutionReadiness;

    return { valid: sum === 100, sum };
}

export default MAGENT_EVALUATION_CONFIG;
