/**
 * Evaluation Configuration for rd3:cc-skills
 *
 * This file is the SINGLE SOURCE for all evaluation weights and rules.
 * Adjust weights here to tune evaluation behavior.
 */

// ============================================================================
// TYPES
// ============================================================================

// MECE Dimensions (Mutually Exclusive, Collectively Exhaustive)
// Total: 100 points
export type DimensionCategory = 'Core Quality' | 'Discovery & Trigger' | 'Safety & Security' | 'Code & Documentation';

export interface DimensionWeights {
    // Core Quality (40 pts)
    frontmatter: number; // 10 pts - YAML validation, required fields
    structure: number; // 5 pts - Directory structure, file organization
    content: number; // 15 pts - SKILL.md body quality
    completeness: number; // 10 pts - All required sections present
    // Discovery & Trigger (20 pts)
    triggerDesign: number; // 10 pts - Description triggers, when-to-use
    platformCompatibility: number; // 10 pts - Multi-platform support
    // Safety & Security (20 pts)
    security: number; // 10 pts - No dangerous patterns
    circularReference: number; // 10 pts - No circular references
    // Code & Documentation (20 pts)
    codeQuality: number; // 10 pts - Scripts are executable
    progressiveDisclosure: number; // 10 pts - Progressive disclosure
}

// Dimension name to category mapping
export const DIMENSION_CATEGORIES: Record<string, DimensionCategory> = {
    Frontmatter: 'Core Quality',
    Structure: 'Core Quality',
    Content: 'Core Quality',
    Completeness: 'Core Quality',
    'Trigger Design': 'Discovery & Trigger',
    'Platform Compatibility': 'Discovery & Trigger',
    Security: 'Safety & Security',
    'Circular Reference Prevention': 'Safety & Security',
    'Code Quality': 'Code & Documentation',
    'Progressive Disclosure': 'Code & Documentation',
};

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
    // DIMENSION WEIGHTS (MECE - Total: 100 pts)
    // ==========================================================================

    // Scenario: Skills WITH scripts/commands
    withScripts: {
        // Core Quality (40 pts)
        frontmatter: 10,
        structure: 5,
        content: 15,
        completeness: 10,
        // Discovery & Trigger (20 pts)
        triggerDesign: 10,
        platformCompatibility: 10,
        // Safety & Security (20 pts)
        security: 10,
        circularReference: 10,
        // Code & Documentation (20 pts)
        codeQuality: 10,
        progressiveDisclosure: 10,
    },

    // Scenario: Skills WITHOUT scripts (documentation-only)
    withoutScripts: {
        // Core Quality (50 pts) - More weight to content since no scripts
        frontmatter: 10,
        structure: 10,
        content: 20,
        completeness: 10,
        // Discovery & Trigger (20 pts)
        triggerDesign: 10,
        platformCompatibility: 10,
        // Safety & Security (20 pts)
        security: 10,
        circularReference: 10,
        // Code & Documentation (10 pts) - No scripts to evaluate
        codeQuality: 0,
        progressiveDisclosure: 10,
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
                // Match literal credential assignments: password = "xxx", api_key: "xxx", secret = 'xxx'
                // Does NOT match: "password reset", "email/password", "forgot my password"
                pattern: /(?:password|api[_-]?key|secret)\s*[=:]\s*["'][^"']+["']/i,
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
