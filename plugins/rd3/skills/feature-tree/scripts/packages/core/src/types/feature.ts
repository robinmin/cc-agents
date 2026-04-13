/**
 * ftree — Core domain types
 */

// ─── Core types ────────────────────────────────────────────────────────────

/** Feature status state machine states */
export type FeatureStatus = 'backlog' | 'validated' | 'executing' | 'done' | 'blocked';

/** All valid statuses */
export const FEATURE_STATUSES: FeatureStatus[] = ['backlog', 'validated', 'executing', 'done', 'blocked'];

// ─── Database models ───────────────────────────────────────────────────────

/** Feature record as stored in the database */
export interface Feature {
    readonly id: string;
    readonly parentId: string | null;
    readonly title: string;
    readonly status: FeatureStatus;
    readonly metadata: string;
    readonly depth: number;
    readonly position: number;
    readonly createdAt: string;
    readonly updatedAt: string;
}

/** WBS link record */
export interface WbsLink {
    readonly featureId: string;
    readonly wbsId: string;
    readonly createdAt: string;
}

// ─── Tree output types ─────────────────────────────────────────────────────

/** Tree node with children (for human-readable output) */
export interface FeatureNode {
    readonly id: string;
    readonly title: string;
    readonly status: FeatureStatus;
    readonly storedStatus: FeatureStatus;
    readonly metadata: Record<string, unknown>;
    readonly depth: number;
    readonly position: number;
    readonly children: FeatureNode[];
    readonly wbsIds: string[];
}

// ─── Query result types ─────────────────────────────────────────────────────

/** Agent-optimized context view */
export interface ContextView {
    readonly node: FeatureNode;
    readonly parent: { id: string; title: string } | null;
    readonly children: FeatureNode[];
    readonly linkedWbs: string[];
}

/** Result of checking if a feature is eligible for done status */
export interface DoneCheckResult {
    readonly eligible: boolean;
    readonly reasons: string[];
}

// ─── Status transition types ───────────────────────────────────────────────

/** Status transition map: from -> allowed to[] */
export type TransitionMap = Record<FeatureStatus, Set<FeatureStatus>>;

// ─── Template types ────────────────────────────────────────────────────────

/** Template format — JSON tree matching ftree import schema */
export interface TemplateNode {
    readonly title: string;
    readonly status?: FeatureStatus;
    readonly children?: TemplateNode[];
}
