/**
 * Shared types for rd3:cc-commands
 *
 * These types define the core data structures used across
 * scaffolding, validation, evaluation, refinement, and adaptation
 * of slash commands.
 *
 * Key difference from cc-skills: Commands are single .md files
 * with a strict 5-field frontmatter schema.
 */

// ============================================================================
// Command Frontmatter Types
// ============================================================================

/**
 * Valid command frontmatter fields.
 * ONLY these 5 fields are valid in slash command frontmatter.
 */
export interface CommandFrontmatter {
    /** Optional: Brief description shown in /help (max ~60 chars) */
    description?: string;
    /** Optional: Restrict available tools (string or array) */
    'allowed-tools'?: string | string[];
    /** Optional: Claude model to use */
    model?: CommandModel;
    /** Optional: Document expected arguments for users */
    'argument-hint'?: string;
    /** Optional: Prevent programmatic invocation via SlashCommand tool */
    'disable-model-invocation'?: boolean;
}

/** Valid model values for commands */
export type CommandModel = 'sonnet' | 'opus' | 'haiku';

/** Valid model values as array for validation */
export const VALID_MODELS: CommandModel[] = ['sonnet', 'opus', 'haiku'];

/**
 * Fields that are NOT valid in command frontmatter.
 * Any of these present should be flagged as an error.
 */
export const INVALID_COMMAND_FIELDS = [
    'name',
    'skills',
    'subagents',
    'version',
    'agent',
    'context',
    'user-invocable',
    'triggers',
    'license',
    'metadata',
    'examples',
    'arguments',
    'tools',
] as const;

/** Type for invalid field names */
export type InvalidCommandField = (typeof INVALID_COMMAND_FIELDS)[number];

/**
 * All valid command frontmatter field names.
 */
export const VALID_COMMAND_FIELDS = [
    'description',
    'allowed-tools',
    'model',
    'argument-hint',
    'disable-model-invocation',
] as const;

/** Type for valid field names */
export type ValidCommandField = (typeof VALID_COMMAND_FIELDS)[number];

// ============================================================================
// Command Types
// ============================================================================

/**
 * Complete command structure parsed from a .md file.
 *
 * Unlike skills, commands are single files (not directories),
 * so there are no resource fields.
 */
export interface Command {
    /** Parsed frontmatter (may be null if invalid/missing) */
    frontmatter: CommandFrontmatter | null;
    /** Markdown body content (after frontmatter) */
    body: string;
    /** Raw file content */
    raw: string;
    /** Absolute file path */
    path: string;
    /** Filename without extension (serves as command name) */
    filename: string;
}

// ============================================================================
// Platform Types
// ============================================================================

/**
 * Supported platforms for command adaptation.
 * Commands have different platform targets than skills because
 * the concept of "slash commands" varies significantly across platforms.
 */
export type CommandPlatform = 'claude' | 'codex' | 'gemini' | 'openclaw' | 'opencode' | 'antigravity';

export const ALL_COMMAND_PLATFORMS: CommandPlatform[] = [
    'claude',
    'codex',
    'gemini',
    'openclaw',
    'opencode',
    'antigravity',
];

/**
 * Platform support assessment for a command.
 */
export interface CommandPlatformSupport {
    platform: CommandPlatform;
    supported: boolean;
    /** Generated output files for this platform */
    companions: string[];
    /** Issues preventing full support */
    issues: string[];
    /** Non-blocking warnings */
    warnings: string[];
}

// ============================================================================
// Validation Types
// ============================================================================

/** Severity level for validation findings */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/** Single validation finding */
export interface ValidationFinding {
    severity: ValidationSeverity;
    field?: string;
    message: string;
    suggestion?: string;
}

/**
 * Result of validating a single command.
 */
export interface CommandValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    findings: ValidationFinding[];
}

/**
 * Full validation report for a command.
 */
export interface CommandValidationReport extends CommandValidationResult {
    commandPath: string;
    commandName: string;
    frontmatter: CommandFrontmatter | null;
    /** Invalid fields found in frontmatter */
    invalidFields: string[];
    /** Body analysis results */
    bodyAnalysis: CommandBodyAnalysis;
    timestamp: string;
}

/**
 * Analysis of the command body content.
 */
export interface CommandBodyAnalysis {
    /** Total line count */
    lineCount: number;
    /** Whether command uses pseudocode constructs */
    hasPseudocode: boolean;
    /** Detected pseudocode constructs */
    pseudocodeConstructs: string[];
    /** Detected argument references ($1, $2, $ARGUMENTS) */
    argumentRefs: string[];
    /** Whether command uses CLAUDE_PLUGIN_ROOT */
    usesPluginRoot: boolean;
    /** Whether body has second-person language */
    hasSecondPerson: boolean;
    /** Detected sections (## headings) */
    sections: string[];
}

// ============================================================================
// Evaluation Types
// ============================================================================

/** Evaluation scope */
export type EvaluationScope = 'basic' | 'full';

/**
 * Weight profile identifier.
 * Commands with pseudocode weight delegation pattern higher;
 * commands without pseudocode weight content quality higher.
 */
export type WeightProfile = 'with-pseudocode' | 'without-pseudocode';

/**
 * Names of the 10 evaluation dimensions for commands (organized by MECE category).
 */
export type CommandDimensionName =
    // Metadata
    | 'frontmatter-quality'
    | 'description-effectiveness'
    | 'naming-convention'
    // Content
    | 'content-quality'
    | 'structure-brevity'
    // Architecture
    | 'delegation-architecture'
    | 'argument-design'
    // Security
    | 'security'
    | 'circular-reference'
    // Platform
    | 'cross-platform-portability';

/**
 * Single evaluation dimension result.
 */
export interface CommandEvaluationDimension {
    name: CommandDimensionName;
    displayName: string;
    /** MECE category: Metadata | Content | Architecture | Security | Platform */
    category: 'Metadata' | 'Content' | 'Architecture' | 'Security' | 'Platform';
    weight: number;
    score: number;
    maxScore: number;
    findings: string[];
    recommendations: string[];
}

/** Letter grade */
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Full evaluation report for a command.
 */
export interface CommandEvaluationReport {
    commandPath: string;
    commandName: string;
    scope: EvaluationScope;
    weightProfile: WeightProfile;
    overallScore: number;
    maxScore: number;
    percentage: number;
    grade: Grade;
    dimensions: CommandEvaluationDimension[];
    timestamp: string;
    passed: boolean;
    /** Security gatekeeper fields */
    rejected?: boolean;
    rejectReason?: string;
    securityScan?: {
        blacklistFound: boolean;
        greylistFound: boolean;
        greylistPenalty: number;
    };
}

// ============================================================================
// Scaffolding Types
// ============================================================================

/** Command template types */
export type CommandTemplate = 'simple' | 'workflow' | 'plugin';

/**
 * Options for scaffolding a new command.
 */
export interface CommandScaffoldOptions {
    /** Command name (will be normalized) */
    name: string;
    /** Output directory for the .md file */
    path: string;
    /** Template type to use */
    template?: CommandTemplate;
    /** Target platform(s) for generation */
    platforms?: CommandPlatform[];
    /** Plugin name for CLAUDE_PLUGIN_ROOT commands */
    pluginName?: string;
    /** Description for frontmatter */
    description?: string;
}

/**
 * Result of scaffolding a command.
 */
export interface CommandScaffoldResult {
    success: boolean;
    commandPath: string;
    commandName: string;
    /** All created files (main .md + any platform variants) */
    created: string[];
    errors: string[];
    warnings: string[];
}

// ============================================================================
// Refinement Types
// ============================================================================

/**
 * Options for refining a command.
 */
export interface CommandRefineOptions {
    /** Path to the command .md file */
    commandPath: string;
    /** Evaluation report to base refinement on */
    fromEval?: string;
    /** Enable rd2 migration mode */
    migrate?: boolean;
    /** Target platform for companion generation */
    platform?: CommandPlatform | 'all';
    /** Output path (defaults to in-place) */
    output?: string;
}

/**
 * Result of refining a command.
 */
export interface CommandRefineResult {
    success: boolean;
    commandPath: string;
    changes: string[];
    /** Generated platform companion files */
    companions: string[];
    errors: string[];
    warnings: string[];
}

// ============================================================================
// Adapter Types
// ============================================================================

/**
 * Context passed to platform adapters.
 */
export interface CommandAdapterContext {
    /** The command being adapted */
    command: Command;
    /** Output directory for generated files */
    outputPath: string;
    /** Command name */
    commandName: string;
    /** Parsed frontmatter */
    frontmatter: CommandFrontmatter | null;
    /** Command body content */
    body: string;
    /** Body analysis */
    bodyAnalysis: CommandBodyAnalysis;
}

/**
 * Result from a platform adapter.
 */
export interface CommandAdapterResult {
    /** Whether the operation succeeded */
    success: boolean;
    /** Generated companion file paths */
    companions: string[];
    /** Generated files as path -> content mapping */
    files?: Record<string, string>;
    /** Error messages */
    errors: string[];
    /** Warning messages */
    warnings: string[];
    /** Informational messages */
    messages?: string[];
}

/**
 * Base adapter interface for command platform adapters.
 * All platform adapters must implement this interface.
 */
export interface ICommandPlatformAdapter {
    /** Platform identifier */
    readonly platform: CommandPlatform;
    /** Human-readable platform name */
    readonly displayName: string;

    /**
     * Validate command for platform compatibility.
     */
    validate(command: Command): Promise<CommandAdapterResult>;

    /**
     * Generate platform-specific equivalent files.
     */
    generateCompanions(context: CommandAdapterContext): Promise<CommandAdapterResult>;

    /**
     * Detect platform-specific features in the command.
     */
    detectPlatformFeatures(command: Command): string[];
}

// ============================================================================
// CLI / Command Options Types
// ============================================================================

/**
 * Shared CLI options across scripts.
 */
export interface CommandCLIOptions {
    /** Platform filter */
    platform?: CommandPlatform | 'all';
    /** Evaluation scope */
    scope?: EvaluationScope;
    /** Enable migration mode */
    migrate?: boolean;
    /** Output format */
    output?: 'json' | 'markdown' | 'text';
    /** Verbose output */
    verbose?: boolean;
}
