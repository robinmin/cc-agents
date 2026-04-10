/**
 * ftree — Type definitions
 */

import type { Result } from '../../../scripts/libs/result';

// ─── Core types ────────────────────────────────────────────────────────────

/** Feature status state machine states */
export type FeatureStatus = 'backlog' | 'validated' | 'executing' | 'done' | 'blocked';

/** All valid statuses */
export const FEATURE_STATUSES: FeatureStatus[] = ['backlog', 'validated', 'executing', 'done', 'blocked'];

// ─── Database models ───────────────────────────────────────────────────────

/** Feature record as stored in the database */
export interface Feature {
    readonly id: string;
    readonly parent_id: string | null;
    readonly title: string;
    readonly status: FeatureStatus;
    readonly metadata: string; // JSON string
    readonly depth: number;
    readonly position: number;
    readonly created_at: string;
    readonly updated_at: string;
}

/** WBS link record */
export interface WbsLink {
    readonly feature_id: string;
    readonly wbs_id: string;
    readonly created_at: string;
}

// ─── Tree output types ─────────────────────────────────────────────────────

/** Tree node with children (for human-readable output) */
export interface FeatureNode {
    readonly id: string;
    readonly title: string;
    readonly status: FeatureStatus;
    readonly storedStatus: FeatureStatus; // what was stored (may differ from rollup)
    readonly metadata: Record<string, unknown>;
    readonly depth: number;
    readonly position: number;
    readonly children: FeatureNode[];
    readonly wbs_ids: string[];
}

// ─── Query result types ─────────────────────────────────────────────────────

/** Agent-optimized context view */
export interface ContextView {
    readonly node: FeatureNode;
    readonly parent: { id: string; title: string } | null;
    readonly children: FeatureNode[];
    readonly linked_wbs: string[];
}

// ─── CLI result types ──────────────────────────────────────────────────────

/** CLI command result — exit code + optional payload */
export type CliResult = Result<unknown, string>;

// ─── Status transition types ───────────────────────────────────────────────

/** Status transition map: from -> allowed to[] */
export type TransitionMap = Record<FeatureStatus, Set<FeatureStatus>>;

// ─── Database path resolution ─────────────────────────────────────────────

/** DB path resolution tiers */
export type DbPathTier = '--db flag' | 'FTREE_DB env' | 'CWD default';

/** Resolved database configuration */
export interface DbConfig {
    readonly path: string;
    readonly tier: DbPathTier;
}

// ─── Template types ────────────────────────────────────────────────────────

/** Template format — JSON tree matching ftree import schema */
export interface TemplateNode {
    readonly title: string;
    readonly status?: FeatureStatus;
    readonly children?: TemplateNode[];
}

// ─── Command option types ──────────────────────────────────────────────────

/** Options for ftree init */
export interface InitOptions {
    readonly db: string | undefined;
    readonly template: string | undefined;
}

/** Options for ftree add */
export interface AddOptions {
    readonly title: string;
    readonly parent: string | undefined;
    readonly status: FeatureStatus | undefined;
    readonly metadata: string | undefined;
    readonly db: string | undefined;
}

/** Options for ftree link */
export interface LinkOptions {
    readonly featureId: string;
    readonly wbsIds: string[];
    readonly db: string | undefined;
}

/** Options for ftree ls */
export interface LsOptions {
    readonly root: string | undefined;
    readonly depth: number | undefined;
    readonly status: FeatureStatus | undefined;
    readonly json: boolean | undefined;
    readonly db: string | undefined;
}
