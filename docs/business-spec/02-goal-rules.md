# Goal Rules (MVP)

## Goal Fields and Validations

- `title`: required.
- `unit`: required enum, one of `pages | minutes | km`.
- `target_value`: required, `> 0`, numeric with 2 decimals (`decimal(...,2)` in the original spec).
- `start_date`: optional, defaults to user-local `today`; can be in the past, cannot be in the future.
- `end_date`: required; must be strictly after user-local `today`.
- `status`: `active | completed`.

## Invariants

- `unit` cannot be changed after goal creation.
- `target_value` cannot be reduced below current progress (`sum(progress_events.delta_value)`).
- When this invalid reduction is attempted, API returns `409 Conflict`.

## Timezone Rule

All "today/past/future" checks must use the user's timezone (IANA timezone in user profile).
