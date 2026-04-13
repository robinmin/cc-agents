/**
 * ftree — Raw SQL constants for queries Drizzle cannot express natively.
 *
 * Recursive CTEs for subtree/descendant queries must use raw SQL.
 */

// ─── Schema DDL ─────────────────────────────────────────────────────────────

export const SCHEMA_SQL = {
    createFeaturesTable: `
        CREATE TABLE IF NOT EXISTS features (
            id          TEXT PRIMARY KEY,
            parent_id   TEXT,
            title       TEXT NOT NULL,
            status      TEXT NOT NULL DEFAULT 'backlog',
            metadata    TEXT NOT NULL DEFAULT '{}',
            depth       INTEGER NOT NULL DEFAULT 0,
            position    INTEGER NOT NULL DEFAULT 0,
            created_at  TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (parent_id) REFERENCES features(id) ON DELETE CASCADE
        )
    `,

    createFeatureWbsLinksTable: `
        CREATE TABLE IF NOT EXISTS feature_wbs_links (
            feature_id  TEXT NOT NULL,
            wbs_id      TEXT NOT NULL,
            created_at  TEXT NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY (feature_id, wbs_id),
            FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
        )
    `,

    createIndexes: `
        CREATE INDEX IF NOT EXISTS idx_features_parent_id ON features(parent_id);
        CREATE INDEX IF NOT EXISTS idx_features_status ON features(status);
        CREATE INDEX IF NOT EXISTS idx_feature_wbs_links_feature_id ON feature_wbs_links(feature_id);
        CREATE INDEX IF NOT EXISTS idx_feature_wbs_links_wbs_id ON feature_wbs_links(wbs_id);
    `,

    createAutoTimestampTrigger: `
        CREATE TRIGGER IF NOT EXISTS features_updated_at
        AFTER UPDATE ON features
        FOR EACH ROW
        BEGIN
            UPDATE features SET updated_at = datetime('now') WHERE id = OLD.id;
        END
    `,
} as const;

// ─── Feature SQL (CTE queries) ──────────────────────────────────────────────

export const FEATURE_SQL = {
    /** Select subtree under a root (inclusive) — recursive CTE */
    selectSubtree: `
        WITH RECURSIVE subtree AS (
            SELECT * FROM features WHERE id = ?
            UNION ALL
            SELECT f.* FROM features f
            INNER JOIN subtree s ON f.parent_id = s.id
        )
        SELECT * FROM subtree ORDER BY depth, position
    `,

    /** Select descendants of a feature (excludes the feature itself) */
    selectDescendants: `
        WITH RECURSIVE subtree AS (
            SELECT * FROM features WHERE id = ?
            UNION ALL
            SELECT f.* FROM features f
            INNER JOIN subtree s ON f.parent_id = s.id
        )
        SELECT * FROM subtree WHERE id != ? ORDER BY depth, position
    `,

    /** Check if feature has children */
    hasChildren: `
        SELECT EXISTS(SELECT 1 FROM features WHERE parent_id = ?) AS found
    `,

    /** Check if feature has WBS links */
    hasWbsLinks: `
        SELECT EXISTS(SELECT 1 FROM feature_wbs_links WHERE feature_id = ?) AS found
    `,
} as const;

// ─── Template Seeding SQL ──────────────────────────────────────────────────

export const TEMPLATE_SQL = {
    /** Insert feature with explicit created_at for template seeding */
    insertWithTimestamp: `
        INSERT INTO features (id, parent_id, title, status, metadata, depth, position, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,

    /** Insert WBS link with explicit created_at */
    insertWbsWithTimestamp: `
        INSERT OR IGNORE INTO feature_wbs_links (feature_id, wbs_id, created_at)
        VALUES (?, ?, ?)
    `,
} as const;
