/**
 * Shared evolution contract for rd3 meta-agent skills.
 *
 * This defines the common language for proposal-driven, longitudinal
 * improvement workflows across cc-magents, cc-agents, cc-skills, and
 * cc-commands. The contract is intentionally implementation-agnostic:
 * skill-specific scripts can extend these base types with local path fields
 * and domain-specific proposal metadata.
 */

export const EVOLUTION_COMMANDS = ['analyze', 'propose', 'apply', 'history', 'rollback'] as const;
export type EvolutionCommand = (typeof EVOLUTION_COMMANDS)[number];

export const EVOLUTION_SAFETY_LEVELS = ['L1', 'L2', 'L3'] as const;
export type EvolutionLevel = (typeof EVOLUTION_SAFETY_LEVELS)[number];
export type EvolutionSafetyLevel = EvolutionLevel;

export const EVOLUTION_DATA_SOURCES = [
    'git-history',
    'ci-results',
    'user-feedback',
    'memory-md',
    'interaction-logs',
] as const;
export type EvolutionDataSource = (typeof EVOLUTION_DATA_SOURCES)[number];

export const EVOLUTION_CHANGE_TYPES = ['add', 'modify', 'remove', 'reorder'] as const;
export type EvolutionChangeType = (typeof EVOLUTION_CHANGE_TYPES)[number];

export const EVOLUTION_PATTERN_TYPES = ['success', 'failure', 'improvement', 'degradation', 'gap'] as const;
export type EvolutionPatternType = (typeof EVOLUTION_PATTERN_TYPES)[number];

export const EVOLUTION_TARGET_KINDS = ['skill', 'command', 'agent', 'magent'] as const;
export type EvolutionTargetKind = (typeof EVOLUTION_TARGET_KINDS)[number];

export const EVOLUTION_IMPROVEMENT_OBJECTIVES = [
    'quality',
    'portability',
    'safety',
    'maintainability',
    'discoverability',
    'evolution-readiness',
] as const;
export type EvolutionImprovementObjective = (typeof EVOLUTION_IMPROVEMENT_OBJECTIVES)[number];

export const EVOLUTION_PROPOSAL_SCOPES = [
    'content',
    'structure',
    'metadata',
    'adapters',
    'tests',
    'workflows',
] as const;
export type EvolutionProposalScope = (typeof EVOLUTION_PROPOSAL_SCOPES)[number];

export const EVOLUTION_EVIDENCE_TYPES = [
    'evaluation',
    'adaptation-warning',
    'test-failure',
    'platform-gap',
    'user-feedback',
    'history-pattern',
] as const;
export type EvolutionEvidenceType = (typeof EVOLUTION_EVIDENCE_TYPES)[number];

export const EVOLUTION_APPLY_RISKS = ['low', 'medium', 'high'] as const;
export type EvolutionApplyRisk = (typeof EVOLUTION_APPLY_RISKS)[number];

export const EVOLUTION_APPLY_MODES = ['auto', 'confirm-required', 'manual-only'] as const;
export type EvolutionApplyMode = (typeof EVOLUTION_APPLY_MODES)[number];

export interface EvolutionDiffPreview {
    before: string;
    after: string;
}

export interface EvolutionVerificationPlan {
    checks: string[];
    testsRequired: boolean;
    rollbackAvailable: boolean;
    mustPass?: boolean;
    minimumScore?: number;
    requiresImprovement?: boolean;
    mustNotDecrease?: boolean;
    rationale?: string;
}

export interface EvolutionProposal<SectionName extends string = string, Source extends string = EvolutionDataSource> {
    id: string;
    targetSection: SectionName;
    changeType: EvolutionChangeType;
    description: string;
    rationale: string;
    source: Source;
    confidence: number;
    affectsCritical: boolean;
    targetKind?: EvolutionTargetKind;
    objective?: EvolutionImprovementObjective;
    scope?: EvolutionProposalScope;
    evidenceType?: EvolutionEvidenceType;
    applyRisk?: EvolutionApplyRisk;
    applyMode?: EvolutionApplyMode;
    verificationPlan?: EvolutionVerificationPlan;
    evidence?: string[];
    diff?: EvolutionDiffPreview;
}

export interface EvolutionResult<
    Source extends string = EvolutionDataSource,
    Proposal extends EvolutionProposal<string, Source> = EvolutionProposal<string, Source>,
    Grade extends string = string,
> {
    filePath: string;
    sourcesUsed: Source[];
    proposals: Proposal[];
    currentGrade: Grade;
    predictedGrade: Grade;
    safetyWarnings: string[];
    timestamp: string;
    targetKind?: EvolutionTargetKind;
}

export interface EvolutionHistoryEntry<Grade extends string = string> {
    timestamp: string;
    appliedProposals: string[];
    gradeBefore: Grade;
    gradeAfter: Grade;
    backupPath: string;
}

export interface EvolutionPattern<Source extends string = EvolutionDataSource> {
    type: EvolutionPatternType;
    source: Source;
    description: string;
    evidence: string[];
    confidence: number;
    affectedSection?: string;
}

export interface EvolutionAnalysis<
    Source extends string = EvolutionDataSource,
    Pattern extends EvolutionPattern<Source> = EvolutionPattern<Source>,
> {
    patterns: Pattern[];
    dataSourceAvailability: Record<Source, boolean>;
    summary: string;
}

export interface EvolutionVersionSnapshot<Grade extends string = string> {
    version: string;
    timestamp: string;
    content: string;
    grade: Grade;
    changeDescription: string;
    proposalsApplied: string[];
}

export interface EvolutionApplyResult {
    success: boolean;
    backupPath?: string;
    error?: string;
}

export interface EvolutionRollbackResult {
    success: boolean;
    content?: string;
    error?: string;
}

export interface EvolutionRunOptionsBase {
    command: EvolutionCommand;
    safetyLevel?: EvolutionSafetyLevel;
    proposalId?: string;
    versionId?: string;
    confirm?: boolean;
}

export interface EvolutionRunResultBase<Analysis, ProposalResult, Snapshot> {
    analysis?: Analysis;
    proposals?: ProposalResult;
    applyResult?: EvolutionApplyResult;
    versions?: Snapshot[];
    rollbackResult?: EvolutionRollbackResult;
}

export interface EvolutionPlaceholderResultBase {
    success: false;
    implemented: false;
    skill: string;
    command: EvolutionCommand;
    message: string;
    nextStep: string;
}
