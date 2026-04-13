import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const features = sqliteTable('features', {
    id: text('id').primaryKey(),
    parentId: text('parent_id'),
    title: text('title').notNull(),
    status: text('status', {
        enum: ['backlog', 'validated', 'executing', 'done', 'blocked'],
    })
        .notNull()
        .default('backlog'),
    metadata: text('metadata').notNull().default('{}'),
    depth: integer('depth').notNull().default(0),
    position: integer('position').notNull().default(0),
    createdAt: text('created_at').notNull().default("(datetime('now'))"),
    updatedAt: text('updated_at').notNull().default("(datetime('now'))"),
});

export const featuresIndexParentId = index('idx_features_parent_id').on(features.parentId);
export const featuresIndexStatus = index('idx_features_status').on(features.status);

export const featureWbsLinks = sqliteTable(
    'feature_wbs_links',
    {
        featureId: text('feature_id').notNull(),
        wbsId: text('wbs_id').notNull(),
        createdAt: text('created_at').notNull().default("(datetime('now'))"),
    },
    (table) => [
        index('idx_feature_wbs_links_feature_id').on(table.featureId),
        index('idx_feature_wbs_links_wbs_id').on(table.wbsId),
    ],
);
