# Goal Tracker API

## Requirements

- Node.js 20+

## Run locally

```bash
npm i
cp .env.example .env
npm run dev:vercel
```

Then open `http://localhost:3000/api/health`.

API docs:

- `http://localhost:3000/api/docs` - Swagger UI
- `http://localhost:3000/api/openapi` - OpenAPI YAML

## Scripts

- `npm run dev:vercel` - run API locally via Vercel runtime
- `npm run build` - compile TypeScript to `dist/`
- `npm run build:vercel` - run production migrations on Vercel (`VERCEL_ENV=production`) and then build
- `npm run typecheck` - run TypeScript checks without emitting files
- `npm run lint` - run ESLint
- `npm run format` - run Prettier
- `npm test` - run tests
- `npm run prisma:generate` - generate Prisma client
- `npm run prisma:migrate:dev` - create/apply local Prisma migration
- `npm run prisma:migrate:deploy` - apply committed migrations
- `npm run prisma:migrate:status` - show migration status

## Deployment

Deploy with `vercel deploy`.

Set environment variables in Vercel:

- `DATABASE_POSTGRES_PRISMA_URL` - Prisma runtime connection string
- `DATABASE_POSTGRES_URL_NON_POOLING` - direct database connection string for Prisma migrations

`vercel.json` uses `npm run build:vercel`, which applies `prisma migrate deploy` automatically only for production deployments.

## Docs

- Primary modular business spec: `docs/business-spec/README.md`
- Technical docs index: `docs/technical/README.md`
- Database notes: `docs/technical/database.md`
- Legacy monolithic draft: `docs/project-business-spec.md`

## Security

Never commit `.env` files or real secrets. This repository ignores `.env` by default.
