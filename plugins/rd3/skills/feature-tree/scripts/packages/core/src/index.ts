// @ftree/core — barrel export

// Config
export { CORE_CONFIG } from './config';

// Database
export type { Database, DbAdapter, DbAdapterConfig } from './db/adapter';
export { createDbAdapter } from './db/adapter';
export { _resetAdapter, getDb, getDefaultAdapter } from './db/client';
export { features, featureWbsLinks } from './db/schema';

// Errors
export type { ErrorCode } from './errors';
export {
    AppError,
    ConflictError,
    InternalError,
    isAppError,
    NotFoundError,
    ValidationError,
} from './errors';
export { parseFeature, parseMetadata, parseWbsLink, serializeMetadata } from './lib/dao/parsers';
export { FEATURE_SQL, SCHEMA_SQL, TEMPLATE_SQL } from './lib/dao/sql';
// Lib
export {
    computeRollupStatus,
    describeTransition,
    getValidTransitions,
    TRANSITION_MAP,
    validateTransition,
} from './lib/state-machine';
export {
    buildFeatureTree,
    findNode,
    findParent,
    formatNodeStatus,
    formatStatus,
    renderTree,
    renderTreeNode,
} from './lib/tree-utils';
// Logger
export { logger } from './logger';
export { getLoggerConfig } from './logging';
export type { FeatureSelect, LinkWbs, NewFeature } from './schemas/feature';
// Schemas
export {
    featureInsertSchema,
    featureLinkWbsSchema,
    featureSelectSchema,
} from './schemas/feature';
// Services
export { FeatureService, initSchema } from './services/feature-service';
export type {
    ContextView,
    DoneCheckResult,
    Feature,
    FeatureNode,
    FeatureStatus,
    TemplateNode,
    TransitionMap,
    WbsLink,
} from './types/feature';
export { FEATURE_STATUSES } from './types/feature';
// Types
export type { Result } from './types/result';
