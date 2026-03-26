/**
 * Shared types for knowledge-extraction reconciliation engine.
 * These types define the data structures used across detect-conflicts.ts,
 * score-quality.ts, and reconcile.ts.
 */

// ===== Source Content =====

export interface SourceContent {
    /** Unique identifier for this source (e.g., "source-a", "rd2:tasks") */
    name: string;
    /** Full filesystem path to the source (for reference) */
    path: string;
    /** The actual content as a string */
    content: string;
    /** Optional metadata about the source */
    metadata?: Record<string, string>;
}

// ===== Conflict Detection =====

export type ConflictType = 'file' | 'section' | 'paragraph' | 'line';

export interface Conflict {
    /** Unique identifier for this conflict */
    id: string;
    /** Type of conflict at the finest granular level detected */
    type: ConflictType;
    /** Human-readable location (e.g., "SKILL.md", "## Background", "para 3") */
    location: string;
    /** Relative file path where conflict occurs (e.g., "SKILL.md", "scripts/index.ts") */
    filePath: string;
    /** Names of sources that contributed to this conflict */
    sources: string[];
    /** The conflicting content from each source */
    snippets: Record<string, string>;
    /** How this conflict was resolved */
    resolution: string;
    /** Which source contributed what to the resolution */
    attribution: Record<string, string>;
}

export interface ConflictManifest {
    /** All conflicts detected across all sources */
    conflicts: Conflict[];
    /** Map of file path -> list of conflict IDs in that file */
    conflictsByFile: Record<string, string[]>;
    /** Map of file path -> content from each source (for files with no conflicts) */
    nonConflictingFiles: Record<string, Record<string, string>>;
    /** Summary statistics */
    summary: {
        totalConflicts: number;
        fileLevelConflicts: number;
        sectionLevelConflicts: number;
        paragraphLevelConflicts: number;
        lineLevelConflicts: number;
        sources: string[];
    };
}

// ===== Quality Scoring =====

export interface QualityDimensions {
    coherence: number; // 0-25: Does merged text read as one document?
    completeness: number; // 0-25: Are all unique insights from all sources preserved?
    nonRedundancy: number; // 0-25: Are there duplicates, repeats, or contradictions?
    traceability: number; // 0-25: Is it clear which source contributed what?
}

export interface QualityScore {
    /** Overall score 0-100 */
    score: number;
    /** Individual dimension scores */
    dimensions: QualityDimensions;
    /** Brief explanation of the score */
    justification: string;
    /** Warnings for scores below threshold */
    warnings: string[];
    /** Which dimension(s) dragged the score down */
    weakDimensions: string[];
}

// ===== Reconciliation Result =====

export interface ReconciliationResult {
    /** The reconciled content */
    mergedContent: string;
    /** Quality score 0-100 */
    qualityScore: number;
    /** Brief explanation of the score */
    qualityJustification: string;
    /** All conflicts detected and how they were resolved */
    conflictManifest: ConflictManifest;
    /** Which source contributed what (map of source -> description) */
    sourceAttributions: Record<string, string>;
    /** Warnings for human review (e.g., score < 70) */
    warnings: string[];
    /** Whether the merge was deterministic */
    deterministic: boolean;
    /** Timestamp of the merge */
    timestamp: string;
}

// ===== Utility Types =====

export interface BenchmarkCase {
    /** Unique identifier */
    id: string;
    /** Human-readable description */
    description: string;
    /** The conflict type(s) this case tests */
    conflictTypes: ConflictType[];
    /** Input sources */
    sources: SourceContent[];
    /** Expected merged output (or quality bar) */
    expectedOutput?: string;
    /** Minimum acceptable quality score */
    minQualityScore?: number;
    /** Whether this case should produce deterministic output */
    deterministic?: boolean;
}

export interface BenchmarkResult {
    caseId: string;
    passed: boolean;
    qualityScore: number;
    qualityJustification: string;
    conflictsDetected: number;
    conflictsResolved: number;
    deterministic: boolean;
    error: string | undefined;
}
