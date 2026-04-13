import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import type * as schema from './schema';

export type Database = BunSQLiteDatabase<typeof schema>;

export interface DbAdapter {
    getDb(): Database;
    close(): void;
}

export type DbAdapterConfig = { driver: 'bun-sqlite'; url?: string };

export async function createDbAdapter(config: DbAdapterConfig): Promise<DbAdapter> {
    const { BunSqliteAdapter } = await import('./adapters/bun-sqlite');
    return new BunSqliteAdapter(config.url);
}
