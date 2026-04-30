export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type ActivationMode =
    | 'always'
    | 'glob'
    | 'manual'
    | 'model_decision'
    | 'agent_requested'
    | 'jit_subtree'
    | 'configured';

export type ScopeKind = 'global' | 'project' | 'directory' | 'path' | 'manual';

export type ModularityKind = 'native_import' | 'config_instructions' | 'frontmatter' | 'manual_lazy_load' | 'none';

export type OperationSupport = 'parse' | 'generate' | 'validate' | 'adapt' | 'multi_file';

export type PlatformId =
    | 'agents-md'
    | 'codex'
    | 'claude-code'
    | 'gemini-cli'
    | 'opencode'
    | 'cursor'
    | 'copilot'
    | 'windsurf'
    | 'cline'
    | 'zed'
    | 'amp'
    | 'aider'
    | 'openclaw'
    | 'antigravity'
    | 'pi'
    | 'generic';

export interface SourceEvidence {
    title: string;
    url: string;
    verifiedOn: string;
    confidence: ConfidenceLevel;
}

export interface PlatformCapability {
    id: PlatformId;
    displayName: string;
    nativeFiles: string[];
    discovery: string;
    precedence: string;
    modularity: ModularityKind[];
    scoping: ScopeKind[];
    activationModes: ActivationMode[];
    limits: string[];
    supports: OperationSupport[];
    confidence: ConfidenceLevel;
    sources: SourceEvidence[];
    notes: string[];
}

export interface DocumentMetadata {
    title?: string;
    frontmatter?: Record<string, unknown>;
    imports: string[];
}

export interface InstructionDocument {
    path: string;
    platform: PlatformId;
    content: string;
    sections: MarkdownSection[];
    metadata: DocumentMetadata;
}

export interface MarkdownSection {
    level: number;
    heading: string;
    content: string;
}

export interface AgentRule {
    name: string;
    content: string;
    activation: ActivationMode;
    scope: ScopeKind;
    globs: string[];
    sourcePath: string;
}

export interface PersonaProfile {
    name?: string;
    role?: string;
    tone?: string;
    sourcePath: string;
}

export interface MemoryPolicy {
    files: string[];
    updatePolicy: string;
    sourcePath: string;
}

export interface PermissionPolicy {
    tool: string;
    policy: 'allow' | 'ask' | 'deny' | 'documented';
    sourcePath: string;
}

export interface PlatformBinding {
    platform: PlatformId;
    capability: PlatformCapability;
}

export interface MainAgentWorkspace {
    documents: InstructionDocument[];
    rules: AgentRule[];
    personas: PersonaProfile[];
    memories: MemoryPolicy[];
    permissions: PermissionPolicy[];
    platformBindings: PlatformBinding[];
    sourceEvidence: SourceEvidence[];
}

export interface GeneratedFile {
    path: string;
    content: string;
}

export interface AdaptationWarning {
    severity: 'info' | 'warning' | 'error';
    feature: string;
    message: string;
}

export interface AdaptationReport {
    sourcePlatform: PlatformId;
    targetPlatform: PlatformId;
    mapped: string[];
    approximated: string[];
    dropped: string[];
    warnings: AdaptationWarning[];
}

export interface GeneratedWorkspace {
    files: GeneratedFile[];
    report: AdaptationReport;
}

export interface ValidationIssue {
    severity: 'error' | 'warning' | 'info';
    message: string;
    path?: string;
}

export interface ValidationResult {
    ok: boolean;
    issues: ValidationIssue[];
}

export interface EvaluationResult {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    dimensions: Record<string, number>;
    findings: string[];
}

export interface RefineSuggestion {
    kind: 'split' | 'scope' | 'safety' | 'evidence' | 'modularity';
    message: string;
    targetPlatform?: PlatformId;
}
