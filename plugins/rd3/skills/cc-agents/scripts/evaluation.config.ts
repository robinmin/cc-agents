/**
 * Evaluation Configuration for rd3:cc-agents
 *
 * This file is the SINGLE SOURCE for all agent evaluation weights and rules.
 * Adjust weights here to tune evaluation behavior.
 *
 * 10 MECE Dimensions across 4 categories.
 * Both weight profiles MUST sum to exactly 100 points.
 *
 * MECE Categories:
 * - Core Quality: frontmatter-quality, body-quality, naming-convention, instruction-clarity
 * - Discovery & Trigger: description-effectiveness
 * - Safety & Compliance: tool-restriction, thin-wrapper-compliance, security-posture
 * - Operational: platform-compatibility, operational-readiness
 */

import type { AgentDimensionName, AgentWeightProfile } from './types';

// ============================================================================
// TYPES
// ============================================================================

/** Dimension categories for grouping in reports (MECE) */
export type AgentDimensionCategory = 'Core Quality' | 'Discovery & Trigger' | 'Safety & Compliance' | 'Operational';

/** Weight values for all 10 agent dimensions (MECE) */
export interface AgentDimensionWeights {
    // Core Quality (30-35 pts)
    /** YAML validation, required fields */
    frontmatterQuality: number;
    /** Persona/process/rules, instruction clarity */
    bodyQuality: number;
    /** Lowercase hyphen-case, length, format */
    namingConvention: number;
    /** Unambiguous instructions, specificity */
    instructionClarity: number;

    // Discovery & Trigger (15 pts)
    /** Trigger design, routing accuracy */
    descriptionEffectiveness: number;

    // Safety & Compliance (30-35 pts)
    /** Tools whitelist/blacklist correctness */
    toolRestriction: number;
    /** Proper skill delegation vs direct implementation */
    thinWrapperCompliance: number;
    /** Security patterns, no dangerous code */
    securityPosture: number;

    // Operational (20 pts)
    /** UAM completeness for multi-platform */
    platformCompatibility: number;
    /** Output format, examples, completeness */
    operationalReadiness: number;
}

/** Security scanner pattern */
export interface SecurityPattern {
    pattern: RegExp;
    severity: 'critical' | 'warning';
    reason: string;
}

/** Full evaluation configuration */
export interface AgentEvaluationConfig {
    /** Weights for thin-wrapper agents (delegate to skills) */
    thinWrapper: AgentDimensionWeights;
    /** Weights for specialist agents (complex domain experts) */
    specialist: AgentDimensionWeights;
    /** Security scanner rules */
    security: {
        blacklist: SecurityPattern[];
        greylist: SecurityPattern[];
    };
}

// ============================================================================
// DIMENSION CATEGORIES (MECE)
// ============================================================================

/** Map dimension names to categories - MECE (Mutually Exclusive, Collectively Exhaustive) */
export const AGENT_DIMENSION_CATEGORIES: Record<AgentDimensionName, AgentDimensionCategory> = {
    'frontmatter-quality': 'Core Quality',
    'description-effectiveness': 'Discovery & Trigger',
    'body-quality': 'Core Quality',
    'tool-restriction': 'Safety & Compliance',
    'thin-wrapper-compliance': 'Safety & Compliance',
    'platform-compatibility': 'Operational',
    'naming-convention': 'Core Quality',
    'operational-readiness': 'Operational',
    'security-posture': 'Safety & Compliance',
    'instruction-clarity': 'Core Quality',
};

/** Human-readable display names for dimensions */
export const AGENT_DIMENSION_DISPLAY_NAMES: Record<AgentDimensionName, string> = {
    'frontmatter-quality': 'Frontmatter Quality',
    'description-effectiveness': 'Description Effectiveness',
    'body-quality': 'Body Quality',
    'tool-restriction': 'Tool Restriction',
    'thin-wrapper-compliance': 'Thin-Wrapper Compliance',
    'platform-compatibility': 'Platform Compatibility',
    'naming-convention': 'Naming Convention',
    'operational-readiness': 'Operational Readiness',
    'security-posture': 'Security Posture',
    'instruction-clarity': 'Instruction Clarity',
};

// ============================================================================
// CONFIGURATION
// ============================================================================

export const AGENT_EVALUATION_CONFIG: AgentEvaluationConfig = {
    // ==========================================================================
    // WEIGHT PROFILE: thin-wrapper (Total: 100 pts)
    // Agents that delegate to skills -- emphasizes delegation, trigger, tools
    // Category breakdown: Core=30, Discovery=15, Safety=30, Operational=25
    // ==========================================================================
    thinWrapper: {
        // Core Quality (30 pts)
        frontmatterQuality: 10,
        bodyQuality: 10,
        namingConvention: 5,
        instructionClarity: 5,

        // Discovery & Trigger (15 pts)
        descriptionEffectiveness: 15,

        // Safety & Compliance (30 pts)
        toolRestriction: 10,
        thinWrapperCompliance: 15,
        securityPosture: 5,

        // Operational (25 pts)
        platformCompatibility: 10,
        operationalReadiness: 15,
    },

    // ==========================================================================
    // WEIGHT PROFILE: specialist (Total: 100 pts)
    // Complex domain expert agents -- emphasizes body, competencies, structure
    // Category breakdown: Core=35, Discovery=15, Safety=20, Operational=30
    // ==========================================================================
    specialist: {
        // Core Quality (35 pts)
        frontmatterQuality: 10,
        bodyQuality: 15,
        namingConvention: 5,
        instructionClarity: 5,

        // Discovery & Trigger (15 pts)
        descriptionEffectiveness: 15,

        // Safety & Compliance (20 pts)
        toolRestriction: 10,
        thinWrapperCompliance: 5,
        securityPosture: 5,

        // Operational (30 pts)
        platformCompatibility: 10,
        operationalReadiness: 20,
    },

    // ==========================================================================
    // SECURITY SCANNER RULES
    // ==========================================================================
    security: {
        // BLACKLIST: Immediate REJECT if found
        blacklist: [
            {
                pattern: /rm\s+-rf/,
                severity: 'critical',
                reason: 'Destructive file deletion (rm -rf)',
            },
            {
                pattern: /curl\s+.*\|\s*sh/,
                severity: 'critical',
                reason: 'Pipe to shell execution (curl | sh)',
            },
            {
                pattern: /wget\s+.*\|\s*sh/,
                severity: 'critical',
                reason: 'Pipe to shell execution (wget | sh)',
            },
            {
                pattern: /eval\s*\(/,
                severity: 'critical',
                reason: 'Dynamic code execution (eval)',
            },
            {
                pattern: /exec\s*\(/,
                severity: 'critical',
                reason: 'Command execution (exec)',
            },
            {
                pattern: /subprocess.*shell\s*=\s*True/,
                severity: 'critical',
                reason: 'Shell=True vulnerability',
            },
            {
                pattern: /base64\.decode|atob\s*\(/,
                severity: 'critical',
                reason: 'Obfuscated code execution',
            },
            {
                pattern: /(?:password|api[_-]?key|secret)\s*[:=]\s*["'][^"']+["']/i,
                severity: 'critical',
                reason: 'Hardcoded credentials',
            },
            {
                pattern: /mkfs\.\w+/,
                severity: 'critical',
                reason: 'Disk formatting command (mkfs)',
            },
            {
                pattern: /dd\s+if=.*of=\/dev\/(sd|nvme|mmc)/,
                severity: 'critical',
                reason: 'Destructive low-level block write (dd to /dev/*)',
            },
            {
                pattern: /shutdown\s+-h|reboot|init\s+0/,
                severity: 'critical',
                reason: 'System shutdown/reboot commands',
            },
            {
                pattern: /:\(\)\{\s*:\|:&\s*\};:/,
                severity: 'critical',
                reason: 'Fork bomb execution pattern',
            },
            {
                pattern: /nc\s+-l\s+-p|netcat\s+-l/,
                severity: 'critical',
                reason: 'Network listeners/bind shells (nc -l)',
            },
            {
                pattern: />\s*\/dev\/(sd|nvme)\w*/,
                severity: 'critical',
                reason: 'Direct write to block devices',
            },
            {
                pattern: /crontab\s+-r/,
                severity: 'critical',
                reason: 'Malicious deletion of cron jobs',
            },
            {
                pattern: /history\s*\|\s*(?:sh|bash|zsh)/,
                severity: 'critical',
                reason: 'Executing commands from shell history (injection risk)',
            },
            {
                pattern: /echo\s+.*>\s*\/(bin|sbin|usr\/bin|usr\/sbin|etc)\/.*/,
                severity: 'critical',
                reason: 'Overwriting critical system binaries or global config files',
            },
            {
                pattern: /alias\s+.*=.*(?:rm\s+-rf|mkfs)/,
                severity: 'critical',
                reason: 'Creating malicious aliases for destructive commands',
            },
            {
                pattern: /mv\s+.*\/dev\/null/,
                severity: 'critical',
                reason: 'Irreversible moving of files to /dev/null',
            },
        ],

        // GREYLIST: Penalty points if found (-2 per occurrence)
        greylist: [
            {
                pattern: /sudo\s+(?!-n)/,
                severity: 'warning',
                reason: 'Usage of sudo (may prompt for password, requires caution)',
            },
            {
                pattern: /sudo\s+.*without.*pass/i,
                severity: 'warning',
                reason: 'sudo without password configuration',
            },
            {
                pattern: /chmod\s+(?:-R\s+)?777/,
                severity: 'warning',
                reason: 'Insecure file permissions (chmod 777)',
            },
            {
                pattern: /chown\s+-R\s+(root|0):/,
                severity: 'warning',
                reason: 'Recursive ownership change to root (chown -R root:)',
            },
            {
                pattern: /os\.system\s*\(/,
                severity: 'warning',
                reason: 'os.system usage (command injection risk)',
            },
            {
                pattern: /__import__\s*\(/,
                severity: 'warning',
                reason: 'Dynamic import risk',
            },
            {
                pattern: /curl\s+(?:-k|--insecure)/,
                severity: 'warning',
                reason: 'Disabling SSL checks in curl',
            },
            {
                pattern: /wget\s+--no-check-certificate/,
                severity: 'warning',
                reason: 'Disabling SSL checks in wget',
            },
            {
                pattern: /git\s+push\s+(?:-f|--force)/,
                severity: 'warning',
                reason: 'Destructive remote Git push (git push --force)',
            },
            {
                pattern: /npm\s+publish/,
                severity: 'warning',
                reason: 'Risky automated package publishing',
            },
            {
                pattern: /\/tmp\/[a-zA-Z0-9_-]+/,
                severity: 'warning',
                reason: 'Hardcoded /tmp paths (use mktemp instead)',
            },
            {
                pattern: /chattr\s+[+-]i/,
                severity: 'warning',
                reason: 'Modifying file immutability attributes',
            },
            {
                pattern: /chmod\s+.*(?:4755|u\+s)/,
                severity: 'warning',
                reason: 'Setting SUID bits',
            },
            {
                pattern: /curl\s+.*\|\s*(?:python|ruby|perl|php)/,
                severity: 'warning',
                reason: 'Piping remote scripts into interpreters',
            },
        ],
    },
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get the weight profile configuration for a given profile name.
 */
export function getWeightsForProfile(profile: AgentWeightProfile): AgentDimensionWeights {
    switch (profile) {
        case 'thin-wrapper':
            return AGENT_EVALUATION_CONFIG.thinWrapper;
        case 'specialist':
            return AGENT_EVALUATION_CONFIG.specialist;
        default:
            return AGENT_EVALUATION_CONFIG.thinWrapper;
    }
}

/**
 * Validate that a weight profile sums to exactly 100.
 * Used for config integrity checks.
 */
export function validateWeightProfile(weights: AgentDimensionWeights): { valid: boolean; sum: number } {
    const sum =
        weights.frontmatterQuality +
        weights.descriptionEffectiveness +
        weights.bodyQuality +
        weights.toolRestriction +
        weights.thinWrapperCompliance +
        weights.platformCompatibility +
        weights.namingConvention +
        weights.operationalReadiness +
        weights.securityPosture +
        weights.instructionClarity;

    return { valid: sum === 100, sum };
}

export default AGENT_EVALUATION_CONFIG;
