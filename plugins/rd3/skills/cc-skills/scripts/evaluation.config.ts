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
        content: 16,
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
