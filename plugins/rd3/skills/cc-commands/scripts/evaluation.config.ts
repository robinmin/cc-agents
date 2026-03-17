/**
 * Evaluation Configuration for rd3:cc-commands
 *
 * This file is the SINGLE SOURCE for all evaluation weights and rules.
 * Adjust weights here to tune evaluation behavior.
 *
 * Two weight profiles:
 * - with-pseudocode: For workflow commands using Task/Skill/SlashCommand
 * - without-pseudocode: For simple commands with direct instructions
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CommandDimensionWeights {
    /** Valid YAML, only allowed fields, no invalid fields */
    frontmatterQuality: number;
    /** Under 60 chars, starts with verb, specific */
    descriptionEffectiveness: number;
    /** Imperative form, no second-person, writes FOR Claude */
    contentQuality: number;
    /** Under 150 lines, progressive disclosure */
    structureBrevity: number;
    /** Uses Skill()/Task()/SlashCommand(), fat skills thin wrappers */
    delegationPattern: number;
    /** argument-hint present when $N used, descriptive */
    argumentDesign: number;
    /** allowed-tools restrictive, no dangerous patterns */
    security: number;
    /** noun-verb for grouped, verb-noun for simple */
    namingConvention: number;
    /** Claude-specific features documented */
    platformCompatibility: number;
    /** Error handling, edge cases */
    operationalReadiness: number;
}

export interface SecurityPattern {
    pattern: RegExp;
    severity: 'critical' | 'warning';
    reason: string;
}

export interface EvaluationConfig {
    withPseudocode: CommandDimensionWeights;
    withoutPseudocode: CommandDimensionWeights;
    passThreshold: number;
    security: {
        blacklist: SecurityPattern[];
        greylist: SecurityPattern[];
    };
    detection: {
        pseudocodePatterns: RegExp[];
    };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export const EVALUATION_CONFIG: EvaluationConfig = {
    // ==========================================================================
    // DIMENSION WEIGHTS
    // ==========================================================================

    // Scenario: Commands WITH pseudocode (workflow commands)
    withPseudocode: {
        frontmatterQuality: 15,
        descriptionEffectiveness: 15,
        contentQuality: 12,
        structureBrevity: 10,
        delegationPattern: 12,
        argumentDesign: 8,
        security: 10,
        namingConvention: 5,
        platformCompatibility: 8,
        operationalReadiness: 5,
    },

    // Scenario: Commands WITHOUT pseudocode (simple commands)
    withoutPseudocode: {
        frontmatterQuality: 18,
        descriptionEffectiveness: 18,
        contentQuality: 15,
        structureBrevity: 12,
        delegationPattern: 5,
        argumentDesign: 10,
        security: 8,
        namingConvention: 7,
        platformCompatibility: 5,
        operationalReadiness: 2,
    },

    // ==========================================================================
    // PASS THRESHOLD
    // ==========================================================================

    passThreshold: 80,

    // ==========================================================================
    // SECURITY SCANNER RULES
    // ==========================================================================

    security: {
        // BLACKLIST: Immediate REJECT if found
        blacklist: [
            {
                pattern: /password\s*[:=]\s*['"][^'"]+['"]/i,
                severity: 'critical',
                reason: 'Hardcoded password in content',
            },
            {
                pattern: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
                severity: 'critical',
                reason: 'Hardcoded API key in content',
            },
            {
                pattern: /secret\s*[:=]\s*['"][^'"]+['"]/i,
                severity: 'critical',
                reason: 'Hardcoded secret in content',
            },
            {
                pattern: /token\s*[:=]\s*['"][^'"]+['"]/i,
                severity: 'critical',
                reason: 'Hardcoded token in content',
            },
            {
                pattern: /base64\.decode|atob\s*\(/,
                severity: 'critical',
                reason: 'Obfuscated code execution',
            },
            {
                pattern: /eval\s*\(/,
                severity: 'critical',
                reason: 'Dynamic code execution (eval)',
            },
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
        ],

        // GREYLIST: Penalty points if found (-2 per occurrence)
        greylist: [
            {
                pattern: /sudo\s+(?!-n)/,
                severity: 'warning',
                reason: 'Usage of sudo (may prompt for password)',
            },
            {
                pattern: /chmod\s+(?:-R\s+)?777/,
                severity: 'warning',
                reason: 'Insecure file permissions (chmod 777)',
            },
            {
                pattern: /Bash\s*\(\s*\)/,
                severity: 'warning',
                reason: 'Unrestricted Bash access (no tool filters)',
            },
            {
                pattern: /Bash\s*\(\s*['"]/,
                severity: 'warning',
                reason: 'Bash with string command (potential injection)',
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
    // PSEUDOCODE DETECTION
    // ===========================================================================

    detection: {
        // Patterns that indicate command uses pseudocode constructs
        pseudocodePatterns: [
            /\bTask\s*\(/, // Task() invocation
            /\bSkill\s*\(/, // Skill() invocation
            /\bSlashCommand\s*\(/, // SlashCommand() invocation
            /\bAskUserQuestion\s*\(/, // AskUserQuestion() invocation
            /!`[^`]+`/, // Claude command syntax !`cmd`
            /\$ARGUMENTS/, // $ARGUMENTS reference
            /\$[1-9]/, // $1, $2, etc. argument references
        ],
    },
};

export default EVALUATION_CONFIG;
