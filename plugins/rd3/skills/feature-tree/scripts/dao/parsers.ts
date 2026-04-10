/**
 * ftree — DAO Row Parsers
 *
 * Centralized row-to-record parsing functions.
 * Follows the DAO pattern from orchestration-v2.
 */

import type { Feature, WbsLink, FeatureStatus } from '../types';

/**
 * Parse a database row to a Feature record.
 *
 * @param row - Raw database row
 * @returns Parsed Feature record
 */
export function parseFeature(row: Record<string, unknown>): Feature {
    return {
        id: row.id as string,
        parent_id: row.parent_id as string | null,
        title: row.title as string,
        status: row.status as FeatureStatus,
        metadata: row.metadata as string,
        depth: row.depth as number,
        position: row.position as number,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
    };
}

/**
 * Parse a WBS link row.
 *
 * @param row - Raw database row
 * @returns Parsed WbsLink record
 */
export function parseWbsLink(row: Record<string, unknown>): WbsLink {
    return {
        feature_id: row.feature_id as string,
        wbs_id: row.wbs_id as string,
        created_at: row.created_at as string,
    };
}

/**
 * Parse metadata JSON string to object.
 *
 * @param metadata - JSON string from database
 * @returns Parsed object or empty object on parse error
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
 *
 * @param metadata - Metadata object
 * @returns JSON string
 */
export function serializeMetadata(metadata: Record<string, unknown>): string {
    return JSON.stringify(metadata ?? {});
}
