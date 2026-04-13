/**
 * ftree — DAO Row Parsers
 *
 * Centralized row-to-record parsing for raw SQL query results.
 */

import type { Feature, FeatureStatus, WbsLink } from '../../types/feature';

/**
 * Parse a database row to a Feature record.
 */
export function parseFeature(row: Record<string, unknown>): Feature {
    return {
        id: row.id as string,
        parentId: (row.parent_id ?? null) as string | null,
        title: row.title as string,
        status: row.status as FeatureStatus,
        metadata: row.metadata as string,
        depth: row.depth as number,
        position: row.position as number,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
    };
}

/**
 * Parse a WBS link row.
 */
export function parseWbsLink(row: Record<string, unknown>): WbsLink {
    return {
        featureId: row.feature_id as string,
        wbsId: row.wbs_id as string,
        createdAt: row.created_at as string,
    };
}

/**
 * Parse metadata JSON string to object.
 */
export function parseMetadata(metadata: string): Record<string, unknown> {
    try {
        return JSON.parse(metadata) as Record<string, unknown>;
    } catch {
        return {};
    }
}

/**
 * Serialize metadata object to JSON string.
 */
export function serializeMetadata(metadata: Record<string, unknown>): string {
    return JSON.stringify(metadata ?? {});
}
