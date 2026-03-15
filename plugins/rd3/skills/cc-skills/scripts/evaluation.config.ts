/**
 * Evaluation Configuration for rd3:cc-skills
 *
 * This file is the SINGLE SOURCE for all evaluation weights and rules.
 * Adjust weights here to tune evaluation behavior.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DimensionWeights {
    frontmatter: number;
    structure: number;
    bestPractices: number;
    platformCompatibility: number;
    completeness: number;
    security: number;
    // New dimensions from rd2
    content: number;
    triggerDesign: number;
    valueAdd: number;
    // Merged: behavioral + behavioralReadiness
    operationalReadiness: number;
    codeQuality: number;
    efficiency: number;
}

export interface SecurityPattern {
    pattern: RegExp;
    severity: 'critical' | 'warning';
    reason: string;
}

export interface EvaluationConfig {
    withScripts: DimensionWeights;
    withoutScripts: DimensionWeights;
    entry: {
        requireTestsForScripts: boolean;
        requireTestsToPass: boolean;
        minTestCoverage: number;
    };
    security: {
        blacklist: SecurityPattern[];
        greylist: SecurityPattern[];
    };
    detection: {
        scriptPatterns: RegExp[];
    };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export const EVALUATION_CONFIG: EvaluationConfig = {
    // ==========================================================================
    // DIMENSION WEIGHTS
    // ==========================================================================

    // Scenario: Skills WITH scripts/commands
    withScripts: {
        frontmatter: 10,
        structure: 5,
        bestPractices: 10,
        platformCompatibility: 10,
        completeness: 10,
        security: 8,
        // New dimensions from rd2
        content: 12,
        triggerDesign: 10,
        valueAdd: 8,
        // Merged: behavioral (5) + behavioralReadiness (4) = 9
        operationalReadiness: 9,
        codeQuality: 5,
        efficiency: 3,
    },

    // Scenario: Skills WITHOUT scripts (documentation-only)
    withoutScripts: {
        frontmatter: 12,
        structure: 8,
        bestPractices: 12,
        platformCompatibility: 12,
        completeness: 12,
        security: 0,
        // New dimensions from rd2
        content: 18,
        triggerDesign: 12,
        valueAdd: 8,
        // Merged: behavioral (0) + behavioralReadiness (3) = 3
        operationalReadiness: 3,
        codeQuality: 0,
        efficiency: 5,
    },

    // ==========================================================================
    // ENTRY REQUIREMENTS (GATEKEEPERS)
    // ==========================================================================

    entry: {
        requireTestsForScripts: true,
        requireTestsToPass: true,
        minTestCoverage: 0, // 0 = no minimum, 90 = 90% coverage required
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
                pattern: /password|api[_-]?key|secret\s*=/i,
                severity: 'critical',
                reason: 'Hardcoded credentials',
            },
        ],

        // GREYLIST: Penalty points if found (-2 per occurrence)
        greylist: [
            {
                pattern: /sudo\s+.*without.*pass/i,
                severity: 'warning',
                reason: 'sudo without password',
            },
            {
                pattern: /chmod\s+777/,
                severity: 'warning',
                reason: 'Insecure file permissions (chmod 777)',
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
        ],
    },

    // ==========================================================================
    // SCRIPT DETECTION
    // ===========================================================================

    detection: {
        // Patterns that indicate skill has executable content
        scriptPatterns: [
            /```(?:bash|sh|zsh|shell)/, // Code blocks
            /!`[^`]+`/, // Claude command syntax
            /\$\w+\s*=/, // Variable assignments
            /bun\s+(run|test|install)/, // Bun commands
            /npm\s+(run|test|install)/, // NPM commands
            /python\s+\w+\.py/, // Python scripts
            /scripts?\//, // References to scripts dir
        ],
    },
};

export default EVALUATION_CONFIG;
