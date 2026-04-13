/**
 * Core package configuration.
 *
 * Compile-time constants and runtime defaults for @ftree/core.
 * Environment-dependent values (DATABASE_URL) are resolved at the adapter level.
 */
export const CORE_CONFIG = {
    /** Default SQLite database path when DATABASE_URL is not set */
    defaultDbPath: 'docs/.ftree/db.sqlite',

    /** SQLite pragmas applied on connection */
    pragmas: {
        journalMode: 'PRAGMA journal_mode = WAL',
        synchronous: 'PRAGMA synchronous = NORMAL',
        foreignKeys: 'PRAGMA foreign_keys = ON',
        busyTimeout: 'PRAGMA busy_timeout = 5000',
    },

    /** Feature field constraints */
    feature: {
        titleMaxLength: 200,
        titleMinLength: 1,
    },
} as const;
