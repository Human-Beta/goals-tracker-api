# AGENTS.md

Instructions for Codex in this repository.

## 1) General rules
- Make only the minimum necessary changes and avoid unnecessary refactoring.
- Do not break existing API contracts or public behavior unless explicitly requested.
- After changes, provide a short summary of what was changed, which files were touched, and how it was verified.

## 1.1) Business-context loading (required)
- Start business/domain tasks from `docs/business-spec/README.md`.
- Read only the domain files that match the current change scope (do not load the full legacy monolith by default).
- Use `docs/project-business-spec.md` only as a fallback reference.

## 2) Checks before each commit (required)
Before **every** commit creation, run the commands that match GitHub Actions (`.github/workflows/ci.yml`):

```bash
npm ci
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
