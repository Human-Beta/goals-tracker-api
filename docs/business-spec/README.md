# Goal Tracker Business Spec (Modular)

This folder is the main business-logic context for Codex and contributors.
Start here, then open only the domain files that match your change.

## How to Use During Changes

1. Identify the affected domain (auth, goals, progress, metrics, etc.).
2. Open only the matching file(s) from the map below.
3. If a change crosses domains, read all linked files before implementation.

## Domain Map (What to Read)

- Bot auth/session rules and trust boundaries: [01-auth-and-access.md](./01-auth-and-access.md)
- Goal lifecycle validations and invariants: [02-goal-rules.md](./02-goal-rules.md)
- Progress event behavior and constraints: [03-progress-rules.md](./03-progress-rules.md)
- Database schema and indexes: [04-data-model.md](./04-data-model.md)
- API endpoints and payload contracts (MVP): [05-api-contracts-mvp.md](./05-api-contracts-mvp.md)
- Computed fields and formulas for goal analytics: [06-computed-metrics.md](./06-computed-metrics.md)
- Deferred items after MVP: [07-post-mvp-roadmap.md](./07-post-mvp-roadmap.md)

## Legacy Source

The original monolithic draft is kept for reference in [../project-business-spec.md](../project-business-spec.md).
