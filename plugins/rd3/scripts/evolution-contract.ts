/**
 * Shared evolution contract for rd3 meta-agent skills.
 *
 * This defines the common language for proposal-driven, longitudinal
 * improvement workflows across cc-magents, cc-agents, cc-skills, and
 * cc-commands. The contract is intentionally implementation-agnostic:
 * skill-specific scripts can extend these base types with local path fields
 * and domain-specific proposal metadata.
 */

export const EVOLUTION_COMMANDS = ["analyze", "propose", "apply", "history", "rollback"] as const;
export type EvolutionCommand = (typeof EVOLUTION_COMMANDS)[number];

export const EVOLUTION_SAFETY_LEVELS = ["L1", "L2", "L3"] as const;
export type EvolutionLevel = (typeof EVOLUTION_SAFETY_LEVELS)[number];
export type EvolutionSafetyLevel = EvolutionLevel;

export const EVOLUTION_DATA_SOURCES = [
  "git-history",
  "ci-results",
  "user-feedback",
  "memory-md",
  "interaction-logs",
] as const;
export type EvolutionDataSource = (typeof EVOLUTION_DATA_SOURCES)[number];

export const EVOLUTION_CHANGE_TYPES = ["add", "modify", "remove", "reorder"] as const;
export type EvolutionChangeType = (typeof EVOLUTION_CHANGE_TYPES)[number];

export const EVOLUTION_PATTERN_TYPES = ["success", "failure", "improvement", "degradation", "gap"] as const;
export type EvolutionPatternType = (typeof EVOLUTION_PATTERN_TYPES)[number];

export interface EvolutionDiffPreview {
  before: string;
  after: string;
}

export interface EvolutionProposal<
  SectionName extends string = string,
  Source extends string = EvolutionDataSource,
> {
  id: string;
  targetSection: SectionName;
  changeType: EvolutionChangeType;
  description: string;
  rationale: string;
  source: Source;
  confidence: number;
  affectsCritical: boolean;
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

export interface EvolutionRunResultBase<
  Analysis,
  ProposalResult,
  Snapshot,
> {
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
