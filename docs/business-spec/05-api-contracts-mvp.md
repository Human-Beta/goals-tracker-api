# API Contracts (MVP)

## Bot Authentication Context

All bot-server requests must include:

- `Authorization: Bearer <BOT_SERVICE_TOKEN>`
- Telegram identity context (`telegram_user_id`) in header or request body

## Users

### `POST /bot/users/upsert`

Creates or updates a user by `telegram_user_id`, returns internal `user_id`.

Example payload:

```json
{
  "telegram_user_id": 123456,
  "timezone": "Europe/Uzhgorod"
}
```

## Goals

### `POST /goals`

Example payload:

```json
{
  "title": "Read Clean Code",
  "unit": "pages",
  "target_value": 464,
  "start_date": "2026-02-10",
  "end_date": "2026-03-15"
}
```

### `GET /goals` (short list)

Returns at least:

- `id`
- `title`
- `percent_complete`
- `days_left`
- `pace_current_7d`

### `GET /goals/{goalId}` (detailed)

Returns all goal fields plus computed analytics fields.

### `PATCH /goals/{goalId}`

Allowed updates:

- `title`
- `target_value`
- `start_date`
- `end_date`

Not allowed:

- `unit` (immutable after creation)

Validation follows rules in:

- `02-goal-rules.md`
- `03-progress-rules.md`

## Progress

### `POST /goals/{goalId}/progress`

Adds a delta event.

```json
{
  "delta_value": 20,
  "date": "2026-02-23",
  "note": "evening session"
}
```

### `GET /goals/{goalId}/progress?from=YYYY-MM-DD&to=YYYY-MM-DD`

Returns progress events history for chart/table use.
Optional `sort=asc|desc` can be supported.

### `PATCH /goals/{goalId}/progress/{eventId}`

Edits a specific event.

```json
{
  "delta_value": 15,
  "date": "2026-02-23",
  "note": "corrected value"
}
```

### `DELETE /goals/{goalId}/progress/{eventId}`

Deletes a specific incorrect event.
