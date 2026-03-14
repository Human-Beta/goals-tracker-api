# Database

## Engine

- This project uses **PostgreSQL** as the primary database.
- Primary DB layer: **Prisma ORM** (`prisma` + `@prisma/client`).
- Prisma datasource runtime connection string comes from `DATABASE_POSTGRES_PRISMA_URL`.
- Prisma migration/direct connection string comes from `DATABASE_POSTGRES_URL_NON_POOLING` (via `datasource db.directUrl` in schema).

## Prisma Files

- Schema: [`prisma/schema.prisma`](../../prisma/schema.prisma)
- Migrations: `prisma/migrations/<timestamp>_*/migration.sql`
- Prisma client singleton: [`src/db/prisma.ts`](../../src/db/prisma.ts)

## Data Model

Prisma schema defines MVP entities and enums from business spec:

- `users`
- `goals`
- `progress_events`
- `GoalUnit` (`pages | minutes | km`)
- `GoalStatus` (`active | completed`)

Indexes/FK from business spec are included in the initial migration:

- `goals(user_id, status)`
- `goals(user_id, end_date)`
- `progress_events(goal_id, date)`
- FK `goals.user_id -> users.id`
- FK `progress_events.goal_id -> goals.id`

## Data Model Reference

Business-level schema (tables, fields, and indexes) is documented in:

- [`docs/business-spec/04-data-model.md`](../business-spec/04-data-model.md)

MVP entities currently described there:

- `users`
- `goals`
- `progress_events`

## Migrations

Available scripts:

- `npm run prisma:generate`
- `npm run prisma:migrate:dev`
- `npm run prisma:migrate:deploy`
- `npm run prisma:migrate:status`

For CI/production, use `prisma migrate deploy`.
For local iterative schema changes, use `prisma migrate dev`.

## Local Prisma Workflow

Use this sequence for local development:

1. Configure environment variables in `.env`:
   - `DATABASE_POSTGRES_PRISMA_URL`
   - `DATABASE_POSTGRES_URL_NON_POOLING`
2. Install dependencies and generate client:
   - `npm ci`
   - `npm run prisma:generate`
3. Apply committed migrations to local DB:
   - `npm run prisma:migrate:deploy`
4. Verify migration state:
   - `npm run prisma:migrate:status`
5. If you changed schema locally, create/apply a new migration:
   - `npm run prisma:migrate:dev`

## Local Verification Before Commit

Run the same baseline checks as project CI plus formatting:

1. `npm run format`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`

### Vercel Deployment Flow

- Vercel build command is `npm run build:vercel`.
- `build:vercel` runs `prisma migrate deploy` only when `VERCEL_ENV=production`.
- For preview deployments, migrations are skipped and only TypeScript build runs.
- Set both `DATABASE_POSTGRES_PRISMA_URL` and `DATABASE_POSTGRES_URL_NON_POOLING` in Vercel project environment variables.

## Health Check

- Endpoint: `/api/health/db`
- Query: `SELECT 1`
- Success response: `200` with `{ "ok": true, "database": "up" }`
- Failure response: `503` with `{ "ok": false, "database": "down" }`
- Current DB health endpoint still uses lightweight `pg` query helper in [`src/db/postgres.ts`](../../src/db/postgres.ts).

## Shared Infrastructure for Upcoming Endpoints

- Bot service auth guard: [`src/auth/bot-service-auth.ts`](../../src/auth/bot-service-auth.ts)
  - Validates `Authorization: Bearer <BOT_SERVICE_TOKEN>`
- Unified error payload helpers: [`src/http/error.ts`](../../src/http/error.ts)
  - Standard format: `{ code, message }`
- User-local "today" helper (IANA timezone): [`src/utils/user-local-today.ts`](../../src/utils/user-local-today.ts)

## Practical Notes

- If `DATABASE_POSTGRES_PRISMA_URL` or `DATABASE_POSTGRES_URL_NON_POOLING` is missing, Prisma/database operations fail at runtime.
- Keep timezone strings as valid IANA identifiers (for example, `Europe/Uzhgorod`).
