import { Pool, type PoolConfig, type QueryResult, type QueryResultRow } from 'pg';

import { env } from '../config/env';

type PostgresCache = {
  pool: Pool | null;
};

const globalForPostgres = globalThis as typeof globalThis & {
  __postgresCache__?: PostgresCache;
};

const postgresCache: PostgresCache = globalForPostgres.__postgresCache__ ?? {
  pool: null,
};

globalForPostgres.__postgresCache__ = postgresCache;

function createPoolConfig(): PoolConfig {
  return {
    connectionString: env.DATABASE_POSTGRES_PRISMA_URL,
    // Best practice for most managed Postgres providers in serverless environments.
    ssl: env.NODE_ENV === 'development' ? false : { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  };
}

export function getPostgresPool(): Pool {
  if (postgresCache.pool) {
    return postgresCache.pool;
  }

  if (!env.DATABASE_POSTGRES_PRISMA_URL) {
    throw new Error('DATABASE_POSTGRES_PRISMA_URL is not set.');
  }

  const pool = new Pool(createPoolConfig());
  postgresCache.pool = pool;

  return pool;
}

export async function queryPostgres<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values?: unknown[]
): Promise<QueryResult<T>> {
  return getPostgresPool().query<T>(text, values);
}
