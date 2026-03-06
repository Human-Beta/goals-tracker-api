# AGENTS.md

Instructions for Codex in this repository.

## 1) General rules
- Make only the minimum necessary changes and avoid unnecessary refactoring.
- Do not break existing API contracts or public behavior unless explicitly requested.
- Prefer shortened imports via `src/index.ts` (barrel exports) when available; use deep imports only when a symbol is not exported from the barrel.
- After changes, provide a short summary of what was changed, which files were touched, and how it was verified.
- Use `gh` for GitHub-related operations (for example, creating/viewing PRs) when `gh` is available in the environment.
- If a PR was created as part of the task, always include a link to that PR in the final report.
- If the user asks to make changes, create a PR or push a commit to an existing PR unless the user explicitly asks not to create/update a PR.
- If the user says "good job Jarvis", treat it as task completion, squash commits into one when later commits are just fixes to earlier commits, then force-push the updated branch to the PR.

## 1.1) Business-context loading (required)
- Start business/domain tasks from `docs/business-spec/README.md`.
- Read only the domain files that match the current change scope (do not load the full legacy monolith by default).
- Use `docs/project-business-spec.md` only as a fallback reference.

## 1.2) Technical-context loading
- For implementation/runtime/infrastructure tasks, start from `docs/technical/README.md`.
- Keep technical implementation docs in `docs/technical/`.
- For DB-related changes, read `docs/technical/database.md` and only then load extra files if needed.

## 2) Checks before each commit (required)
Before **every** commit creation, run the commands that match GitHub Actions (`.github/workflows/ci.yml`):

```bash
npm ci
npm run format
npm run typecheck
npm run lint
npm test
```

If any command fails, fix the issues first, then create the commit.

## 3) Work format
- For each non-trivial task, provide a short action plan before making changes.
- If there are risks or assumptions, state them explicitly.
- If local checks could not be run, explicitly mention that in the final report.

## 4) Scope
- These rules apply to all new tasks in this repository.
