# Progress Event Rules (MVP)

## Progress Event Model

- Progress is recorded as delta events (`delta_value`), not as absolute totals.
- Each event belongs to a goal and contributes to cumulative progress.

## Event Input Rules

- `delta_value`: required numeric delta.
- `date`: optional, defaults to user-local `today`.
- Event `date` may be in the past.
- Event `date` cannot be in the future.
- Preferred validation: `event.date >= goal.start_date`.
  - If not, user should move `start_date` earlier first.

## Editing and Correction

- `PATCH /goals/{goalId}/progress/{eventId}` is used to fix wrong entries.
- `DELETE /goals/{goalId}/progress/{eventId}` is supported and preferred over an "undo" abstraction:
  - Keeps history transparent.
  - Allows correcting specific day entries.
  - Keeps stats/pace calculation logic straightforward.

## Goal Auto-Completion

If cumulative progress reaches or exceeds target:

- `sum(progress_events.delta_value) >= goals.target_value` -> `goals.status = completed`.
