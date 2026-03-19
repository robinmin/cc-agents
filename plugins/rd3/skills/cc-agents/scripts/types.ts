/**
 * Shared types for rd3:cc-agents
 *
 * These types define the Universal Agent Model (UAM) and all supporting
 * data structures used across scaffolding, validation, evaluation,
 * refinement, and cross-platform adaptation of subagent definitions.
 *
 * Key difference from cc-skills and cc-commands:
 * - Agents have a UAM (Universal Agent Model) as the internal superset representation
 * - Agents support bidirectional adaptation (parse FROM + generate TO any platform)
 * - Agents have 3 tiered templates (minimal, standard, specialist)
 * - "agent" here means "subagent" (secondary agent spawned by a main agent)
 */

// ============================================================================
// Platform Types
// ============================================================================

/**
 * Supported platforms for agent adaptation.
 * All 6 platforms with formal or semi-formal agent definition systems.
 */
export type AgentPlatform = 'claude' | 'gemini' | 'opencode' | 'codex' | 'openclaw' | 'antigravity';

export const ALL_AGENT_PLATFORMS: AgentPlatform[] = [
    'claude',
    'gemini',
    'opencode',
    'codex',
    'openclaw',
    'antigravity',
];

/**
 * Platform display names for reporting.
 */
export const PLATFORM_DISPLAY_NAMES: Record<AgentPlatform, string> = {
    claude: 'Claude Code',
    gemini: 'Gemini CLI',
    opencode: 'OpenCode',
    codex: 'Codex',
    openclaw: 'OpenClaw',
    antigravity: 'Antigravity',
};

// ============================================================================
// Universal Agent Model (UAM)
// ============================================================================

/**
 * Universal Agent Model -- the internal superset representation
 * that captures ALL fields from all 6 platform agent formats.
 *
 * All platform-specific formats are parsed INTO UAM and generated FROM UAM.
 * Optional fields are platform-specific; only `name`, `description`, and `body`
 * are universally required.
 */
export interface UniversalAgent {
    // --- Required fields (all platforms) ---

    /** Agent identifier (lowercase hyphen-case) */
    name: string;
    /** Agent purpose / delegation trigger description */
    description: string;
    /** System prompt content (markdown body) */
    body: string;

    // --- Optional fields (platform-specific) ---

    /** Allowed tools list -- Claude Code, Gemini CLI, OpenCode */
    tools?: string[];
    /** Disallowed tools list -- Claude Code only */
    disallowedTools?: string[];
    /** Model to use -- All platforms */
    model?: string;
    /** Maximum conversation turns -- Claude (maxTurns), Gemini (max_turns), OpenCode (steps) */
    maxTurns?: number;
    /** Timeout in minutes -- Gemini (timeout_mins), Codex (job_max_runtime_seconds / 60) */
    timeout?: number;
    /** Temperature for generation -- Gemini, OpenCode */
    temperature?: number;
    /** Permission mode -- Claude Code only */
    permissionMode?: string;
    /** Skills to delegate to -- Claude Code only */
    skills?: string[];
    /** MCP servers configuration -- Claude Code only */
    mcpServers?: string[] | Record<string, unknown>[];
    /** Hook configuration -- Claude Code only */
    hooks?: Record<string, unknown>;
    /** Memory/context file path -- Claude Code only */
    memory?: string;
    /** Run in background -- Claude Code only */
    background?: boolean;
    /** Isolation mode -- Claude Code only */
    isolation?: string;
    /** Display color -- Claude Code, OpenCode */
    color?: string;
    /** Agent kind -- Gemini CLI only (local/remote) */
    kind?: string;
    /** Hidden from UI -- OpenCode only */
    hidden?: boolean;
    /** Permission configuration -- OpenCode only */
    permissions?: Record<string, unknown>;
    /** Sandbox mode -- Codex only */
    sandboxMode?: string;
    /** Reasoning effort level -- Codex only */
    reasoningEffort?: string;
    /** Display nickname candidates -- Codex only */
    nicknameCandidates?: string[];

    // --- Metadata ---

    /** Platform-specific extensions that don't map to UAM fields */
    platformExtensions?: Record<string, unknown>;
}

// ============================================================================
// Agent Frontmatter Types (per-platform)
// ============================================================================

/**
 * Claude Code agent frontmatter fields.
 * Markdown + YAML frontmatter in `.claude/agents/` or `agents/` directories.
 */
export interface ClaudeAgentFrontmatter {
    name: string;
    description: string;
    tools?: string[];
    disallowedTools?: string[];
    model?: string;
    maxTurns?: number;
    permissionMode?: string;
    skills?: string[];
    mcpServers?: string[] | Record<string, unknown>[];
    hooks?: Record<string, unknown>;
    memory?: string;
    background?: boolean;
    isolation?: string;
    color?: string;
    /** Allow unknown fields for forward compatibility */
    [key: string]: unknown;
}

/**
 * Gemini CLI agent frontmatter fields.
 * Markdown + YAML frontmatter in `.gemini/agents/` directories.
 */
export interface GeminiAgentFrontmatter {
    name: string;
    description: string;
    tools?: string[];
    model?: string;
    max_turns?: number;
    timeout_mins?: number;
    temperature?: number;
    kind?: string;
    [key: string]: unknown;
}

/**
 * OpenCode agent definition (can be JSON config or Markdown).
 */
export interface OpenCodeAgentConfig {
    description: string;
    model?: string;
    tools?: Record<string, boolean>;
    steps?: number;
    temperature?: number;
    color?: string;
    hidden?: boolean;
    permissions?: Record<string, unknown>;
    [key: string]: unknown;
}

/**
 * Codex agent configuration (standalone TOML file).
 * Official format: root-level fields in .codex/agents/{name}.toml
 */
export interface CodexAgentConfig {
    name?: string;
    description: string;
    model?: string;
    developer_instructions?: string;
    sandbox_mode?: string;
    model_reasoning_effort?: string;
    nickname_candidates?: string[];
    mcp_servers?: Record<string, { url: string; [key: string]: unknown }>;
    [key: string]: unknown;
}

/**
 * OpenClaw agent configuration (JSON config).
 */
export interface OpenClawAgentConfig {
    description?: string;
    purpose?: string;
    tools?: Record<string, unknown>;
    runTimeoutSeconds?: number;
    [key: string]: unknown;
}

// ============================================================================
// Known Fields (for validation)
// ============================================================================

/**
 * Valid Claude Code agent frontmatter fields.
 */
export const VALID_CLAUDE_AGENT_FIELDS = [
    'name',
    'description',
    'tools',
    'disallowedTools',
    'model',
    'maxTurns',
    'permissionMode',
    'skills',
    'mcpServers',
    'hooks',
    'memory',
    'background',
    'isolation',
    'color',
] as const;

export type ValidClaudeAgentField = (typeof VALID_CLAUDE_AGENT_FIELDS)[number];

/**
 * Valid Gemini CLI agent frontmatter fields.
 */
export const VALID_GEMINI_AGENT_FIELDS = [
    'name',
    'description',
    'tools',
    'model',
    'max_turns',
    'timeout_mins',
    'temperature',
    'kind',
] as const;

export type ValidGeminiAgentField = (typeof VALID_GEMINI_AGENT_FIELDS)[number];

/**
 * Valid OpenCode agent frontmatter fields.
 */
export const VALID_OPENCODE_AGENT_FIELDS = [
    'name',
    'description',
    'model',
    'tools',
    'steps',
    'temperature',
    'color',
    'hidden',
    'permissions',
    'mode',
    'prompt',
] as const;

export type ValidOpenCodeAgentField = (typeof VALID_OPENCODE_AGENT_FIELDS)[number];

/**
 * Valid Codex agent config fields.
 */
export const VALID_CODEX_AGENT_FIELDS = [
    'name',
    'description',
    'model',
    'developer_instructions',
    'sandbox_mode',
    'model_reasoning_effort',
    'nickname_candidates',
    'mcp_servers',
] as const;

export type ValidCodexAgentField = (typeof VALID_CODEX_AGENT_FIELDS)[number];

/**
 * Valid OpenClaw agent config fields.
 */
export const VALID_OPENCLAW_AGENT_FIELDS = [
    'name',
    'description',
    'model',
    'tools',
    'disallowedTools',
    'runTimeoutSeconds',
    'maxSpawnDepth',
    'maxConcurrent',
    'platformExtensions',
] as const;

export type ValidOpenClawAgentField = (typeof VALID_OPENCLAW_AGENT_FIELDS)[number];

// ============================================================================
// Agent Template Types
// ============================================================================

/**
 * Agent template tiers.
 * - minimal: 20-50 lines, simple focused agents
 * - standard: 80-200 lines, most production agents
 * - specialist: 200-500 lines, complex domain experts (full 8-section anatomy)
 */
export type AgentTemplate = 'minimal' | 'standard' | 'specialist';

/**
 * Options for scaffolding a new agent.
 */
export interface AgentScaffoldOptions {
    /** Agent name (will be normalized to hyphen-case) */
    name: string;
    /** Output directory for the .md file */
    path: string;
    /** Template tier to use */
    template?: AgentTemplate;
    /** Target platform(s) for generation */
    platforms?: AgentPlatform[];
    /** Agent description */
    description?: string;
    /** Tools to include */
    tools?: string[];
    /** Model override */
    model?: string;
    /** Display color */
    color?: string;
    /** Plugin name context */
    pluginName?: string;
    /** Skills to delegate to (populates frontmatter skills field) */
    skills?: string[];
}

/**
 * Result of scaffolding an agent.
 */
export interface AgentScaffoldResult {
    success: boolean;
    agentPath: string;
    agentName: string;
    /** All created files */
    created: string[];
    errors: string[];
    warnings: string[];
}

// ============================================================================
// Parsed Agent Types
// ============================================================================

/**
 * Complete parsed agent structure.
 *
 * This represents an agent as parsed from any platform format,
 * before conversion to UAM.
 */
export interface ParsedAgent {
    /** Parsed frontmatter (platform-specific) */
    frontmatter: Record<string, unknown> | null;
    /** Markdown body content (system prompt) */
    body: string;
    /** Raw file content */
    raw: string;
    /** Absolute file path */
    path: string;
    /** Filename without extension */
    filename: string;
    /** Source platform */
    sourcePlatform: AgentPlatform;
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
 * Result of validating an agent.
 */
export interface AgentValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    findings: ValidationFinding[];
}

/**
 * Full validation report for an agent.
 */
export interface AgentValidationReport extends AgentValidationResult {
    agentPath: string;
    agentName: string;
    frontmatter: Record<string, unknown> | null;
    /** Unknown fields found in frontmatter */
    unknownFields: string[];
    /** Body analysis results */
    bodyAnalysis: AgentBodyAnalysis;
    /** Detected template tier */
    detectedTier: AgentTemplate;
    timestamp: string;
}

/**
 * Analysis of the agent body content.
 */
export interface AgentBodyAnalysis {
    /** Total line count */
    lineCount: number;
    /** Detected markdown sections (## headings) */
    sections: string[];
    /** Whether body uses 8-section anatomy */
    has8SectionAnatomy: boolean;
    /** Detected 8-section anatomy sections present */
    anatomySections: string[];
    /** Whether body has second-person language */
    hasSecondPerson: boolean;
    /** Whether body references skills */
    referencesSkills: boolean;
    /** Whether body has rules (do/don't lists) */
    hasRules: boolean;
    /** Whether body has output format section */
    hasOutputFormat: boolean;
    /** Content character count */
    contentLength: number;
}

// ============================================================================
// Evaluation Types
// ============================================================================

/** Evaluation scope */
export type EvaluationScope = 'basic' | 'full';

/**
 * Weight profile identifier.
 * thin-wrapper: agents that delegate to skills (higher weight on delegation)
 * specialist: complex domain expert agents (higher weight on body quality)
 */
export type AgentWeightProfile = 'thin-wrapper' | 'specialist';

/**
 * Names of the 10 MECE evaluation dimensions for agents.
 * MECE: Mutually Exclusive, Collectively Exhaustive
 */
export type AgentDimensionName =
    | 'frontmatter-quality'
    | 'description-effectiveness'
    | 'body-quality'
    | 'tool-restriction'
    | 'thin-wrapper-compliance'
    | 'platform-compatibility'
    | 'naming-convention'
    | 'operational-readiness'
    | 'security-posture'
    | 'instruction-clarity';

/**
 * Single evaluation dimension result.
 */
export interface AgentEvaluationDimension {
    name: AgentDimensionName;
    displayName: string;
    weight: number;
    score: number;
    maxScore: number;
    findings: string[];
    recommendations: string[];
}

/** Letter grade */
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Full evaluation report for an agent.
 */
export interface AgentEvaluationReport {
    agentPath: string;
    agentName: string;
    scope: EvaluationScope;
    weightProfile: AgentWeightProfile;
    overallScore: number;
    maxScore: number;
    percentage: number;
    grade: Grade;
    dimensions: AgentEvaluationDimension[];
    timestamp: string;
    passed: boolean;
    /** Security gatekeeper fields */
    rejected?: boolean;
    rejectReason?: string;
}

// ============================================================================
// Adapter Types
// ============================================================================

/**
 * Result of parsing a platform-native agent format into UAM.
 */
export interface AgentParseResult {
    /** Whether parsing succeeded */
    success: boolean;
    /** Parsed universal agent (null if parsing failed) */
    agent: UniversalAgent | null;
    /** Source platform */
    sourcePlatform: AgentPlatform;
    /** Error messages */
    errors: string[];
    /** Warning messages */
    warnings: string[];
}

/**
 * Context passed to platform adapters for generation.
 */
export interface AgentAdapterContext {
    /** The UAM agent being adapted */
    agent: UniversalAgent;
    /** Output directory for generated files */
    outputPath: string;
    /** Target platform */
    targetPlatform: AgentPlatform;
    /** Template tier hint */
    templateHint?: AgentTemplate;
}

/**
 * Result from a platform adapter operation (validate/generate).
 */
export interface AgentAdapterResult {
    /** Whether the operation succeeded */
    success: boolean;
    /** Generated output content (the platform-native format string) */
    output?: string;
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
 * Base adapter interface for agent platform adapters.
 * All platform adapters must implement this interface.
 *
 * Key difference from cc-skills/cc-commands: Agent adapters have a `parse()` method
 * because agents can be imported FROM any platform format, not just exported TO them.
 */
export interface IAgentPlatformAdapter {
    /** Platform identifier */
    readonly platform: AgentPlatform;
    /** Human-readable platform name */
    readonly displayName: string;

    /**
     * Parse platform-native format into UAM.
     */
    parse(input: string, filePath: string): Promise<AgentParseResult>;

    /**
     * Validate agent for this platform's constraints.
     */
    validate(agent: UniversalAgent): Promise<AgentAdapterResult>;

    /**
     * Generate platform-native output from UAM.
     */
    generate(agent: UniversalAgent, context: AgentAdapterContext): Promise<AgentAdapterResult>;

    /**
     * Detect platform-specific features used by an agent.
     */
    detectFeatures(agent: UniversalAgent): string[];
}

// ============================================================================
// Platform Support Types
// ============================================================================

/**
 * Platform support assessment for an agent.
 */
export interface AgentPlatformSupport {
    platform: AgentPlatform;
    supported: boolean;
    /** Generated output files for this platform */
    companions: string[];
    /** Issues preventing full support */
    issues: string[];
    /** Non-blocking warnings */
    warnings: string[];
    /** Platform-specific features used */
    features: string[];
}

// ============================================================================
// Refinement Types
// ============================================================================

/**
 * Options for refining an agent.
 */
export interface AgentRefineOptions {
    /** Path to the agent file */
    agentPath: string;
    /** Evaluation report to base refinement on */
    fromEval?: string;
    /** Enable rd2 migration mode */
    migrate?: boolean;
    /** Target platform for companion generation */
    platform?: AgentPlatform | 'all';
    /** Output path (defaults to in-place) */
    output?: string;
}

/**
 * Result of refining an agent.
 */
export interface AgentRefineResult {
    success: boolean;
    agentPath: string;
    changes: string[];
    /** Generated platform companion files */
    companions: string[];
    errors: string[];
    warnings: string[];
}

// ============================================================================
// CLI / Command Options Types
// ============================================================================

/**
 * Shared CLI options across scripts.
 */
export interface AgentCLIOptions {
    /** Platform filter */
    platform?: AgentPlatform | 'all';
    /** Evaluation scope */
    scope?: EvaluationScope;
    /** Enable migration mode */
    migrate?: boolean;
    /** Output format */
    output?: 'json' | 'markdown' | 'text';
    /** Verbose output */
    verbose?: boolean;
}
