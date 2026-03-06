# Database

## Engine

- This project uses **PostgreSQL** as the primary database.
- Node.js driver: [`pg`](https://www.npmjs.com/package/pg), configured in [`src/db/postgres.ts`](../../src/db/postgres.ts).
- Connection string comes from `DATABASE_URL`.

## Connection Behavior

- A shared `Pool` instance is cached on `globalThis` to avoid recreating connections during local hot reload/serverless runtime reuse.
- Pool config:
  - `max: 5`
  - `idleTimeoutMillis: 10000`
  - `connectionTimeoutMillis: 10000`
- SSL mode:
  - `development`: SSL disabled
  - `test/production`: SSL enabled with `rejectUnauthorized: false` (common managed Postgres setup)

## Data Model Reference

Business-level schema (tables, fields, and indexes) is documented in:

- [`docs/business-spec/04-data-model.md`](../business-spec/04-data-model.md)

MVP entities currently described there:

- `users`
- `goals`
- `progress_events`

## Health Check

- Endpoint: `/api/health/db`
- Query: `SELECT 1`
- Success response: `200` with `{ "ok": true, "database": "up" }`
- Failure response: `503` with `{ "ok": false, "database": "down" }`

## Practical Notes

- If `DATABASE_URL` is missing, database queries throw `DATABASE_URL is not set.`
- No migration framework is configured in this repository yet (no Prisma/Drizzle/Knex/TypeORM migration setup).
- Use parameterized SQL via `queryPostgres(text, values)` for any dynamic values.
