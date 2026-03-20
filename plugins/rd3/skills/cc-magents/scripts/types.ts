/**
 * Shared types for rd3:cc-magents
 *
 * These types define the Universal Main Agent Model (UMAM) and all supporting
 * data structures used across synthesize, validate, evaluate, refine,
 * evolve, and cross-platform adaptation of main agent configuration files.
 *
 * Key difference from cc-agents (subagent skill):
 * - Main agents use UMAM (section-based) instead of UAM (frontmatter-based)
 * - Main agents are flexible markdown with any headings (per AGENTS.md spec)
 * - Main agents support hierarchical inheritance (global -> project -> directory)
 * - Main agents cover 23+ platforms (tiered support) vs 6 for subagents
 * - "main agent" here means top-level project/global config (AGENTS.md, CLAUDE.md, etc.)
 */

// ============================================================================
// Platform Types
// ============================================================================

/**
 * All supported platforms for main agent configuration.
 * Organized by support tier:
 * - Tier 1 (Full): Parse + Generate + Validate (bidirectional)
 * - Tier 2 (Standard): Parse + Generate (bidirectional)
 * - Tier 3 (Basic): Generate only (one-directional)
 * - Tier 4 (Generic): AGENTS.md pass-through
 */
export type MagentPlatform =
    // Tier 1: Full support
    | 'agents-md'
    | 'claude-md'
    | 'gemini-md'
    | 'codex'
    // Tier 2: Standard support
    | 'cursorrules'
    | 'windsurfrules'
    | 'zed-rules'
    | 'opencode-rules'
    // Tier 3: Basic support (generate only)
    | 'junie'
    | 'augment'
    | 'cline'
    | 'aider'
    | 'warp'
    | 'roocode'
    | 'amp'
    | 'vscode-instructions'
    // Tier 4: Generic (AGENTS.md pass-through)
    | 'generic';

/** Platform tier classification */
export type PlatformTier = 1 | 2 | 3 | 4;

/** Tier classification for each platform */
export const PLATFORM_TIERS: Record<MagentPlatform, PlatformTier> = {
    'agents-md': 1,
    'claude-md': 1,
    'gemini-md': 1,
    codex: 1,
    cursorrules: 2,
    windsurfrules: 2,
    'zed-rules': 2,
    'opencode-rules': 2,
    junie: 3,
    augment: 3,
    cline: 3,
    aider: 3,
    warp: 3,
    roocode: 3,
    amp: 3,
    'vscode-instructions': 3,
    generic: 4,
};

/** All platforms in array form */
export const ALL_MAGENT_PLATFORMS: MagentPlatform[] = [
    'agents-md',
    'claude-md',
    'gemini-md',
    'codex',
    'cursorrules',
    'windsurfrules',
    'zed-rules',
    'opencode-rules',
    'junie',
    'augment',
    'cline',
    'aider',
    'warp',
    'roocode',
    'amp',
    'vscode-instructions',
    'generic',
];

/** Platform display names for reporting */
export const PLATFORM_DISPLAY_NAMES: Record<MagentPlatform, string> = {
    'agents-md': 'AGENTS.md (Universal Standard)',
    'claude-md': 'CLAUDE.md (Claude Code)',
    'gemini-md': 'GEMINI.md (Gemini CLI)',
    codex: 'Codex (OpenAI)',
    cursorrules: '.cursorrules (Cursor)',
    windsurfrules: '.windsurfrules (Windsurf)',
    'zed-rules': '.zed/rules (Zed)',
    'opencode-rules': 'opencode.md (OpenCode)',
    junie: 'Junie (Exploration Agent)',
    augment: 'Augment Code',
    cline: 'Cline',
    aider: '.aider.conf.yml (Aider)',
    warp: 'Warp Rules',
    roocode: 'RooCode Rules',
    amp: 'Amp Rules',
    'vscode-instructions': '.github/copilot-instructions.md (VS Code)',
    generic: 'Generic (AGENTS.md fallback)',
};

/** Canonical file names for each platform */
export const PLATFORM_FILENAMES: Record<MagentPlatform, string[]> = {
    'agents-md': ['AGENTS.md', '.agents.md', 'agents.md'],
    'claude-md': ['CLAUDE.md', '.claude/CLAUDE.md'],
    'gemini-md': ['GEMINI.md', '.gemini/GEMINI.md'],
    codex: ['codex.md', '.codex/AGENTS.md'],
    cursorrules: ['.cursorrules'],
    windsurfrules: ['.windsurfrules'],
    'zed-rules': ['.zed/rules'],
    'opencode-rules': ['opencode.md', '.opencode/rules.md'],
    junie: ['.junie/rules.md', 'junie.md'],
    augment: ['.augment/rules.md', 'augment.md'],
    cline: ['.cline/rules.md', 'cline.md'],
    aider: ['.aider.conf.yml'],
    warp: ['.warp/rules.md'],
    roocode: ['.roo/rules.md', '.roocode/rules.md'],
    amp: ['.amp/rules.md'],
    'vscode-instructions': ['.github/copilot-instructions.md'],
    generic: ['AGENTS.md'],
};

// ============================================================================
// Universal Main Agent Model (UMAM)
// ============================================================================

/**
 * Universal Main Agent Model -- the internal representation
 * for all main agent configuration files.
 *
 * Key difference from UAM (subagent model): UMAM is SECTION-BASED.
 * Main agent configs are flexible markdown documents with arbitrary headings,
 * not rigid frontmatter + body structures. The official AGENTS.md spec says
 * "standard Markdown, any headings" with no required fields.
 *
 * All platform-specific formats are parsed INTO UMAM and generated FROM UMAM.
 */
export interface UniversalMainAgent {
    /** Absolute path to the source file */
    sourcePath: string;
    /** Source platform format */
    sourceFormat: MagentPlatform;
    /** Optional metadata extracted from comments or frontmatter */
    metadata?: MagentMetadata;
    /** Ordered array of content sections (the core of UMAM) */
    sections: MagentSection[];
    /** Hierarchical position of this config */
    hierarchy?: MagentHierarchy;
    /** Estimated token count for the entire document */
    estimatedTokens?: number;
    /** Platform-specific features detected in the source */
    platformFeatures?: string[];
    /** Raw source content (preserved for lossless round-tripping) */
    rawContent?: string;
    /** Preamble text before the first heading (if any) */
    preamble?: string;
}

/** Optional metadata that some platforms support */
export interface MagentMetadata {
    /** Config name or title */
    name?: string;
    /** Description of what this config does */
    description?: string;
    /** Version string */
    version?: string;
    /** Effective date */
    effective?: string;
    /** Glob patterns for file matching (AGENTS.md feature) */
    globs?: string;
    /** Always apply regardless of context (AGENTS.md feature) */
    alwaysApply?: boolean;
    /** Additional platform-specific metadata */
    extensions?: Record<string, unknown>;
}

/** Hierarchy levels for config inheritance */
export type MagentHierarchy = 'global' | 'project' | 'directory';

// ============================================================================
// Section Types
// ============================================================================

/**
 * A single section in a main agent config.
 *
 * Sections are the fundamental building block of UMAM. Each section
 * corresponds to a markdown heading and its content.
 */
export interface MagentSection {
    /** The heading text (without # prefix) */
    heading: string;
    /** Heading level (1-6) */
    level: number;
    /** The content under this heading (markdown text) */
    content: string;
    /** Auto-detected or manually assigned category */
    category?: SectionCategory;
    /** How critical this section is for agent behavior */
    criticality?: SectionCriticality;
}

/**
 * Section categories for classification and analysis.
 * 14 categories based on analysis of 16+ platform system prompts.
 * Extended from original 12 with error-handling and planning based on
 * >40% coverage across vendor prompts.
 */
export type SectionCategory =
    | 'identity' // Who the agent is, its role, persona
    | 'rules' // Do/don't rules, constraints, boundaries
    | 'workflow' // Step-by-step processes, procedures
    | 'tools' // Tool usage, MCP servers, integrations
    | 'standards' // Coding standards, formatting, conventions
    | 'verification' // Anti-hallucination, fact-checking, validation
    | 'memory' // Memory patterns, context management
    | 'evolution' // Self-improvement, learning, adaptation
    | 'environment' // Environment setup, platform specifics
    | 'testing' // Test strategies, coverage requirements
    | 'output' // Output format, response structure
    | 'error-handling' // Error recovery, fallback strategies
    | 'planning' // Planning mode, task decomposition
    | 'parallel' // Parallel execution, concurrency
    | 'custom'; // Uncategorized sections

/** All section categories */
export const ALL_SECTION_CATEGORIES: SectionCategory[] = [
    'identity',
    'rules',
    'workflow',
    'tools',
    'standards',
    'verification',
    'memory',
    'evolution',
    'environment',
    'testing',
    'output',
    'error-handling',
    'planning',
    'parallel',
    'custom',
];

/** How critical a section is */
export type SectionCriticality = 'critical' | 'important' | 'recommended' | 'informational';

// ============================================================================
// Validation Types
// ============================================================================

/** Severity level for validation findings */
export type ValidationSeverity = 'error' | 'warning' | 'suggestion';

/** Single validation finding */
export interface ValidationFinding {
    severity: ValidationSeverity;
    message: string;
    section?: string;
    suggestion?: string;
}

/**
 * Result of structural validation.
 * Separate from evaluation (quality scoring).
 */
export interface MagentValidationResult {
    /** Whether validation passed (no errors) */
    valid: boolean;
    /** Blocking errors */
    errors: string[];
    /** Non-blocking warnings */
    warnings: string[];
    /** Helpful suggestions */
    suggestions: string[];
    /** Detailed findings with context */
    findings: ValidationFinding[];
    /** File path validated */
    filePath: string;
    /** Detected platform */
    detectedPlatform: MagentPlatform | null;
    /** File size in bytes */
    fileSize: number;
    /** Estimated token count */
    estimatedTokens: number;
    /** Number of sections found */
    sectionCount: number;
    /** Timestamp of validation */
    timestamp: string;
}

// ============================================================================
// Evaluation Types
// ============================================================================

/**
 * The 5 evaluation dimensions for main agent config quality.
 * Each dimension measures a specific aspect of config quality.
 */
export type EvaluationDimension = 'completeness' | 'specificity' | 'verifiability' | 'safety' | 'evolution-readiness';

/**
 * Weight profiles for different config types.
 * - standard: Balanced weights (default)
 * - minimal: Higher weight on completeness/safety (simple configs)
 * - advanced: Higher weight on evolution/verifiability (self-evolving configs)
 */
export type MagentWeightProfile = 'standard' | 'minimal' | 'advanced';

/** Letter grade */
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

/** Score for a single evaluation dimension */
export interface DimensionScore {
    dimension: EvaluationDimension;
    displayName: string;
    weight: number;
    score: number;
    maxScore: number;
    percentage: number;
    findings: string[];
    recommendations: string[];
}

/**
 * Full evaluation report.
 */
export interface MagentEvaluationReport {
    /** File path evaluated */
    filePath: string;
    /** Detected or specified platform */
    platform: MagentPlatform;
    /** Weight profile used */
    weightProfile: MagentWeightProfile;
    /** Per-dimension scores */
    dimensions: DimensionScore[];
    /** Aggregate weighted score (0-100) */
    overallScore: number;
    /** Letter grade */
    grade: Grade;
    /** Whether the config passes quality threshold (>=75%) */
    passed: boolean;
    /** Top recommendations for improvement */
    topRecommendations: string[];
    /** Timestamp */
    timestamp: string;
}

// ============================================================================
// Evolution Types
// ============================================================================

/** Evolution maturity level */
export type EvolutionLevel = 'L1' | 'L2' | 'L3';

/** Evolution data source */
export type EvolutionDataSource = 'git-history' | 'ci-results' | 'user-feedback' | 'memory-md' | 'interaction-logs';

/** A single evolution proposal */
export interface EvolutionProposal {
    /** Unique proposal ID */
    id: string;
    /** Which section to modify */
    targetSection: string;
    /** Type of change */
    changeType: 'add' | 'modify' | 'remove' | 'reorder';
    /** Description of what to change */
    description: string;
    /** Rationale for the change */
    rationale: string;
    /** Data source that triggered this proposal */
    source: EvolutionDataSource;
    /** Confidence in the proposal (0-1) */
    confidence: number;
    /** Whether this affects a critical section */
    affectsCritical: boolean;
    /** Diff preview (before/after) */
    diff?: {
        before: string;
        after: string;
    };
}

/** Result of an evolution analysis */
export interface EvolutionResult {
    /** File path analyzed */
    filePath: string;
    /** Data sources consulted */
    sourcesUsed: EvolutionDataSource[];
    /** Generated proposals */
    proposals: EvolutionProposal[];
    /** Current grade (before changes) */
    currentGrade: Grade;
    /** Predicted grade (after applying all proposals) */
    predictedGrade: Grade;
    /** Safety warnings */
    safetyWarnings: string[];
    /** Timestamp */
    timestamp: string;
}

/** Evolution history entry */
export interface EvolutionHistoryEntry {
    /** Timestamp of the evolution */
    timestamp: string;
    /** Proposals that were applied */
    appliedProposals: string[];
    /** Grade before evolution */
    gradeBefore: Grade;
    /** Grade after evolution */
    gradeAfter: Grade;
    /** Backup file path */
    backupPath: string;
}

/** Evolution safety level for auto-application of proposals */
export type EvolutionSafetyLevel = 'L1' | 'L2' | 'L3';

/** Type of detected pattern from analysis */
export type EvolutionPatternType = 'success' | 'failure' | 'improvement' | 'degradation' | 'gap';

/** A detected pattern from evolution analysis */
export interface DetectedPattern {
    /** Pattern type */
    type: EvolutionPatternType;
    /** Data source that detected this pattern */
    source: EvolutionDataSource;
    /** Human-readable description */
    description: string;
    /** Evidence supporting this pattern */
    evidence: string[];
    /** Confidence in this pattern (0-1) */
    confidence: number;
    /** Affected section (if applicable) */
    affectedSection?: string;
}

/** Version snapshot for rollback support */
export interface VersionSnapshot {
    /** Version identifier (v1, v2, etc.) */
    version: string;
    /** ISO timestamp */
    timestamp: string;
    /** Full content at this version */
    content: string;
    /** Evaluation grade at this version */
    grade: Grade;
    /** Description of changes in this version */
    changeDescription: string;
    /** IDs of proposals applied to create this version */
    proposalsApplied: string[];
}

// ============================================================================
// Synthesis Types
// ============================================================================

/** Domain template identifier */
export type DomainTemplate =
    | 'dev-agent'
    | 'research-agent'
    | 'content-agent'
    | 'data-agent'
    | 'devops-agent'
    | 'general-agent';

/** Project detection result */
export interface ProjectDetection {
    /** Primary language */
    language?: string;
    /** Framework(s) detected */
    frameworks: string[];
    /** Package manager */
    packageManager?: string;
    /** Test runner */
    testRunner?: string;
    /** CI/CD platform */
    ciPlatform?: string;
    /** Linting tools */
    linters: string[];
    /** Formatters */
    formatters: string[];
    /** Existing agent configs found */
    existingConfigs: Array<{ path: string; platform: MagentPlatform }>;
    /** Suggested domain template */
    suggestedTemplate: DomainTemplate;
}

/** Options for synthesizing a new config */
export interface SynthesizeOptions {
    /** Domain template to use */
    template?: DomainTemplate;
    /** Target platform */
    platform?: MagentPlatform;
    /** Output path */
    outputPath?: string;
    /** Enable auto-detection */
    autoDetect?: boolean;
    /** Project root for auto-detection */
    projectRoot?: string;
    /** Additional requirements */
    requirements?: string;
    /** Override project detection (for testing) */
    detectionOverride?: (projectRoot: string) => ProjectDetection;
    /** Override template loader (for testing) */
    templateLoaderOverride?: (domain: DomainTemplate) => string | null;
}

/** Result of synthesis */
export interface SynthesizeResult {
    success: boolean;
    outputPath: string;
    platform: MagentPlatform;
    template: DomainTemplate;
    detection?: ProjectDetection;
    errors: string[];
    warnings: string[];
}

// ============================================================================
// Refinement Types
// ============================================================================

/** Options for refining a config */
export interface RefineOptions {
    /** Path to the config file */
    filePath: string;
    /** Run validation + evaluation first */
    evaluate?: boolean;
    /** Dry-run mode (show changes without applying) */
    dryRun?: boolean;
    /** Output path (defaults to in-place) */
    outputPath?: string;
}

/** A single refinement action */
export interface RefineAction {
    /** Type of fix */
    type: 'structural' | 'quality' | 'security' | 'best-practice';
    /** Description of the change */
    description: string;
    /** Which section is affected */
    section?: string;
    /** Whether this requires human approval */
    requiresApproval: boolean;
    /** Diff preview */
    diff?: {
        before: string;
        after: string;
    };
}

/** Result of refinement */
export interface RefineResult {
    success: boolean;
    filePath: string;
    dryRun: boolean;
    actions: RefineAction[];
    /** Grade before refinement */
    gradeBefore?: Grade;
    /** Grade after refinement */
    gradeAfter?: Grade;
    errors: string[];
    warnings: string[];
}

// ============================================================================
// Adaptation Types
// ============================================================================

/** Options for cross-platform adaptation */
export interface AdaptOptions {
    /** Source file path */
    sourcePath: string;
    /** Target platform(s) */
    targetPlatform: MagentPlatform | 'all';
    /** Output directory */
    outputDir?: string;
}

/** A single conversion warning about feature loss */
export interface ConversionWarning {
    /** Feature that will be lost or degraded */
    feature: string;
    /** Source platform where feature exists */
    sourcePlatform: MagentPlatform;
    /** Target platform where feature is missing/degraded */
    targetPlatform: MagentPlatform;
    /** Severity of the loss */
    severity: 'info' | 'warning' | 'critical';
    /** Human-readable description */
    description: string;
}

/** Result of a single platform conversion */
export interface ConversionResult {
    /** Target platform */
    targetPlatform: MagentPlatform;
    /** Whether conversion succeeded */
    success: boolean;
    /** Generated output content */
    output?: string;
    /** Output file path */
    outputPath?: string;
    /** Conversion warnings (feature losses) */
    conversionWarnings: ConversionWarning[];
    /** Errors */
    errors: string[];
}

/** Result of adapt operation (may include multiple platform conversions) */
export interface AdaptResult {
    /** Source file path */
    sourcePath: string;
    /** Source platform */
    sourcePlatform: MagentPlatform;
    /** Per-platform conversion results */
    conversions: ConversionResult[];
    /** Summary of all conversion warnings */
    allWarnings: ConversionWarning[];
    errors: string[];
}

// ============================================================================
// Adapter Interface
// ============================================================================

/**
 * Platform adapter interface for main agent configs.
 *
 * Key difference from IAgentPlatformAdapter (subagent adapters):
 * - Main agent adapters work with UMAM (section-based) instead of UAM
 * - Main agent adapters include getDiscoveryPaths() for file discovery
 * - Tier 3 adapters only implement generate() (one-directional)
 */
export interface IMagentPlatformAdapter {
    /** Platform identifier */
    readonly platform: MagentPlatform;
    /** Human-readable platform name */
    readonly displayName: string;
    /** Support tier (1-4) */
    readonly tier: PlatformTier;

    /**
     * Parse platform-native format into UMAM.
     * Required for Tier 1 and Tier 2. Tier 3/4 throw UnsupportedError.
     */
    parse(input: string, filePath: string): Promise<MagentParseResult>;

    /**
     * Validate a UMAM model for this platform's constraints.
     * Required for Tier 1. Tier 2+ use base validation only.
     */
    validate(model: UniversalMainAgent): Promise<MagentAdapterResult>;

    /**
     * Generate platform-native output from UMAM.
     * Required for all tiers.
     */
    generate(model: UniversalMainAgent, options?: MagentGenerateOptions): Promise<MagentAdapterResult>;

    /**
     * Detect platform-specific features present in a UMAM model.
     */
    detectFeatures(model: UniversalMainAgent): string[];

    /**
     * Get file paths where this platform's config files are typically found.
     */
    getDiscoveryPaths(): string[];
}

/** Result of parsing a platform-native format into UMAM */
export interface MagentParseResult {
    /** Whether parsing succeeded */
    success: boolean;
    /** Parsed UMAM model (null if parsing failed) */
    model: UniversalMainAgent | null;
    /** Source platform */
    sourcePlatform: MagentPlatform;
    /** Errors */
    errors: string[];
    /** Warnings */
    warnings: string[];
}

/** Options for generating platform output */
export interface MagentGenerateOptions {
    /** Output file path */
    outputPath?: string;
    /** Include metadata comments */
    includeMetadata?: boolean;
    /** Target hierarchy level */
    hierarchy?: MagentHierarchy;
}

/** Result from adapter operations (validate/generate) */
export interface MagentAdapterResult {
    /** Whether the operation succeeded */
    success: boolean;
    /** Generated output content */
    output?: string;
    /** Errors */
    errors: string[];
    /** Warnings */
    warnings: string[];
    /** Informational messages */
    messages?: string[];
    /** Conversion warnings for cross-platform adaptation */
    conversionWarnings?: ConversionWarning[];
}

// ============================================================================
// CLI Types
// ============================================================================

/** Shared CLI options across scripts */
export interface MagentCLIOptions {
    /** Target platform */
    platform?: MagentPlatform;
    /** Weight profile for evaluation */
    profile?: MagentWeightProfile;
    /** Output format */
    output?: 'json' | 'markdown' | 'text';
    /** Verbose output */
    verbose?: boolean;
    /** Dry-run mode */
    dryRun?: boolean;
}
