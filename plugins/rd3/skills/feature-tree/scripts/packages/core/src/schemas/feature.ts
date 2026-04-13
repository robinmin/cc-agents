import { z } from '@hono/zod-openapi';
import { CORE_CONFIG } from '../config';

const { titleMinLength, titleMaxLength } = CORE_CONFIG.feature;

export const featureInsertSchema = z
    .object({
        title: z.string().min(titleMinLength).max(titleMaxLength),
        parentId: z.string().nullable().optional(),
        status: z.enum(['backlog', 'validated', 'executing', 'done', 'blocked']).optional().default('backlog'),
        metadata: z.string().optional().default('{}'),
    })
    .openapi('NewFeature');

export const featureSelectSchema = z
    .object({
        id: z.string(),
        parentId: z.string().nullable(),
        title: z.string(),
        status: z.enum(['backlog', 'validated', 'executing', 'done', 'blocked']),
        metadata: z.string(),
        depth: z.number(),
        position: z.number(),
        createdAt: z.string(),
        updatedAt: z.string(),
    })
    .openapi('Feature');

export const featureLinkWbsSchema = z
    .object({
        featureId: z.string().min(1),
        wbsIds: z.array(z.string().min(1)).min(1),
    })
    .openapi('LinkWbs');

export type NewFeature = z.infer<typeof featureInsertSchema>;
export type FeatureSelect = z.infer<typeof featureSelectSchema>;
export type LinkWbs = z.infer<typeof featureLinkWbsSchema>;
