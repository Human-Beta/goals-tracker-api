# Data Model (Minimum MVP)

## `users`

- `id` (uuid)
- `timezone` (IANA string, for example `Europe/Uzhgorod`)
- `telegram_user_id` (bigint, unique, nullable)
- `created_at`

## `goals`

- `id` (uuid)
- `user_id` (foreign key -> users.id)
- `title` (text)
- `unit` (enum)
- `target_value` (`numeric(12,2)`)
- `start_date` (date)
- `end_date` (date)
- `status` (enum: `active | completed`)
- `created_at`
- `updated_at`

Indexes:

- `(user_id, status)`
- `(user_id, end_date)`

## `progress_events`

- `id` (uuid)
- `goal_id` (foreign key -> goals.id)
- `date` (date)
- `delta_value` (`numeric(12,2)`)
- `note` (text, nullable)
- `created_at`
- `updated_at`

Indexes:

- `(goal_id, date)`
