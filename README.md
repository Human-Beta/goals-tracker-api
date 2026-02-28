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

## Scripts

- `npm run dev:vercel` - run API locally via Vercel runtime
- `npm run build` - compile TypeScript to `dist/`
- `npm run typecheck` - run TypeScript checks without emitting files
- `npm run lint` - run ESLint
- `npm run format` - run Prettier
- `npm test` - run tests

## Deployment

Deploy with `vercel deploy`.

## Docs

Business/product specification: `docs/project-business-spec.md`.

## Security

Never commit `.env` files or real secrets. This repository ignores `.env` by default.
