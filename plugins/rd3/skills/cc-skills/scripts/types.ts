/**
 * Shared types for rd3:cc-skills
 *
 * These types define the core data structures used across
 * scaffolding, validation, evaluation, and packaging.
 */

// ============================================================================
// Skill Types
// ============================================================================

/**
 * Skill frontmatter structure
 * Based on agentskills.io specification
 */
export interface SkillFrontmatter {
    /** Required: Skill identifier (lowercase hyphen-case, max 64 chars) */
    name: string;
    /** Required: When to trigger this skill (max 1024 chars) */
    description: string;
    /** Optional: License identifier */
    license?: string;
    /** Optional: Metadata object */
    metadata?: SkillMetadata;
    /** Platform-specific extensions */
    [key: string]: unknown;
}

/**
 * Skill metadata structure
 */
export type InteractionPattern =
    | 'tool-wrapper'
    | 'generator'
    | 'reviewer'
    | 'inversion'
    | 'pipeline'
    | 'knowledge-only';

export interface SkillMetadata {
    author?: string;
    version?: string;
    platforms?: string;
    /** ADK interaction patterns describing runtime behavior */
    interactions?: InteractionPattern[];
    /** Optional keyword hints for tool-wrapper skills */
    trigger_keywords?: string[];
    /** Optional severity levels for reviewer skills */
    severity_levels?: string[];
    /** Optional named steps for pipeline skills */
    pipeline_steps?: string[];
    /** OpenClaw-specific metadata */
    openclaw?: OpenClawMetadata;
    /** Other platform metadata */
    [key: string]: unknown;
}

/**
 * OpenClaw-specific metadata
 */
export interface OpenClawMetadata {
    emoji?: string;
    requires?: {
        bins?: string[];
        env?: string[];
        [key: string]: unknown;
    };
}

/**
 * Complete skill structure
 */
export interface Skill {
    /** Parsed frontmatter */
    frontmatter: SkillFrontmatter;
    /** Markdown body */
    body: string;
    /** Raw content */
    raw: string;
    /** File path */
    path: string;
    /** Skill directory */
    directory: string;
    /** Resources (scripts, references, assets) */
    resources: SkillResources;
}

// ============================================================================
// Resource Types
// ============================================================================

export type ResourceType = 'scripts' | 'references' | 'assets' | 'agents';

export interface SkillResources {
    scripts?: string[];
    references?: string[];
    assets?: string[];
    agents?: string[];
}

// ============================================================================
// Platform Types
// ============================================================================

export type Platform = 'claude' | 'codex' | 'antigravity' | 'opencode' | 'openclaw';

export interface PlatformSupport {
    platform: Platform;
    supported: boolean;
    companions: string[];
    issues: string[];
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationFinding {
    severity: 'error' | 'warning' | 'info';
    message: string;
    suggestion?: string;
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    /** Structured findings (shared validation-findings compatible) */
    findings?: ValidationFinding[];
}

export interface ValidationReport extends ValidationResult {
    skillPath: string;
    skillName: string;
    frontmatter: SkillFrontmatter | null;
    resources: SkillResources;
    platforms: PlatformSupport[];
    timestamp: string;
}

// ============================================================================
// EVALUATION TYPES
// ============================================================================

export type EvaluationScope = 'basic' | 'full';

// Feature flags extracted from evaluation
export interface EvaluationFeatures {
    // Frontmatter features
    hasFrontmatter: boolean;
    hasName: boolean;
    nameValidFormat: boolean;
    hasDescription: boolean;
    descriptionLength: number; // 0 = missing, <20 = short, 20-500 = good, >500 = long
    hasMetadata: boolean;

    // Structure features
    lineCount: number;
    hasSkillMd: boolean;
    hasScripts: boolean;
    hasReferences: boolean;
    hasAssets: boolean;
    hasAgents: boolean;

    // Content features
    hasOverview: boolean;
    hasQuickStart: boolean;
    hasExamples: boolean;
    hasCodeBlocks: boolean;
    hasWorkflows: boolean;
    hasPlatformNotes: boolean;

    // Trigger features
    hasWhenToUse: boolean;
    triggerPhrases: string[]; // "create X", "implement Y", etc.

    // Security features
    hasBlacklistMatch: boolean;
    hasGreylistMatch: boolean;
    securityIssues: string[];

    // Best practices features
    hasTodo: boolean;
    todoCount: number;
    hasPlaceholders: boolean;
    placeholderCount: number;
    usesSecondPerson: boolean;
    hasWindowsPaths: boolean;
    hasNestedRefs: boolean;
    timeSensitiveCount: number;
    hasCircularRef: boolean;
    contentLength: number; // chars
    hasSectionHeaders: boolean;
    headingCount: number;

    // Completeness features
    hasAdditionalResources: boolean;
    hasSeeAlso: boolean;
    hasPlatforms: boolean;

    // Platform features
    platformsSupported: string[];
    hasEvalIgnore: boolean;
}

export interface EvaluationDimension {
    name: string;
    category?: string; // Added at output time
    weight: number;
    score: number;
    maxScore: number;
    percentage?: number;
    passed?: boolean;
    findings: string[];
    recommendations: string[];
}

export interface EvaluationReport {
    skillPath: string;
    skillName: string;
    scope: EvaluationScope;
    overallScore: number;
    maxScore: number;
    percentage: number;
    dimensions: EvaluationDimension[];
    timestamp: string;
    passed: boolean;
    // Security gatekeeper fields
    rejected?: boolean;
    rejectReason?: string;
    testsPassed?: boolean;
    platformErrors?: string[];
    platformWarnings?: string[];
    securityScan?: {
        blacklistFound: boolean;
        greylistFound: boolean;
        greylistPenalty: number;
    };
}

// ============================================================================
// Scaffolding Types
// ============================================================================

export type SkillType = 'technique' | 'pattern' | 'reference';

export interface ScaffoldOptions {
    /** Skill name (will be normalized to hyphen-case) */
    name: string;
    /** Output directory */
    path: string;
    /** Skill type template to use */
    template?: SkillType;
    /** Skill description (replaces TODO placeholder in SKILL.md) */
    description?: string;
    /** Resource directories to create */
    resources?: ResourceType[];
    /** ADK interaction patterns to inject into metadata */
    interactions?: InteractionPattern[];
    /** Create example files in resource directories */
    examples?: boolean;
    /** Platform targets for companion generation */
    platforms?: Platform[];
    /** Interface overrides for openai.yaml */
    interfaceOverrides?: Record<string, string>;
    /** Enable migration mode for rd2 skills */
    migrate?: boolean;
}

export interface ScaffoldResult {
    success: boolean;
    skillPath: string;
    skillName: string;
    created: string[];
    errors: string[];
    warnings: string[];
}

// ============================================================================
// Adapter Types
// ============================================================================

export interface AdapterContext {
    /** The skill being processed */
    skill: Skill;
    /** Scaffolding options */
    options: ScaffoldOptions;
    /** Output path for generated files */
    outputPath: string;
    /** Skill file path */
    skillPath: string;
    /** Skill name */
    skillName: string;
    /** Parsed frontmatter */
    frontmatter: SkillFrontmatter;
    /** Skill body content */
    body: string;
    /** Skill resources */
    resources: SkillResources;
}

export interface AdapterResult {
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
    /** Info messages */
    messages?: string[];
}

/**
 * Base adapter interface
 * All platform adapters must implement this interface
 */
export interface IPlatformAdapter {
    /** Platform identifier */
    readonly platform: Platform;

    /** Human-readable platform name */
    readonly displayName: string;

    /**
     * Validate skill for platform compatibility
     */
    validate(skill: Skill): Promise<AdapterResult>;

    /**
     * Generate platform-specific companion files
     */
    generateCompanions(context: AdapterContext): Promise<AdapterResult>;

    /**
     * Check if skill has platform-specific features
     */
    detectPlatformFeatures(skill: Skill): string[];
}

// ============================================================================
// Package Types
// ============================================================================

export interface PackageOptions {
    skillPath: string;
    outputPath: string;
    platforms: Platform[];
    includeSource?: boolean;
}

export interface PackageResult {
    success: boolean;
    outputPath: string;
    size: number;
    platforms: Platform[];
    errors: string[];
}

// ============================================================================
// Command Types
// ============================================================================

export interface CommandOptions {
    /** Platform filter */
    platform?: Platform | 'all';
    /** Evaluation scope */
    scope?: EvaluationScope;
    /** Enable migration mode */
    migrate?: boolean;
    /** Output format */
    output?: 'json' | 'markdown' | 'text';
    /** Verbose output */
    verbose?: boolean;
}
