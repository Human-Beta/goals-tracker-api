# Post-MVP Roadmap (Deferred)

## Reminders

- Reminder models (`daily | weekly | every_other_day | custom`)
- Reminder time and channel (`telegram | push | email`)
- Scheduler/job runner and "last sent at" persistence

## Templates

- `template_id` in goal creation
- Title prefixes, default units, and custom fields

## Data Optimization

- Optional denormalized cache: `goals.current_value`
- Trigger/job to keep cache in sync on progress event `INSERT/UPDATE/DELETE`

## Expanded Goal States

- Add states: `paused`, `canceled`, `archived`
- Support manual completion and reopen actions

## Rule Editing Extensions

- Optional unit changes with event migration/conversion
- Example conversions: `minutes <-> hours`, `km <-> m`, `pages` potentially integer-only

## Statistics and Aggregations

- Endpoints like `/stats?range=week|month|quarter|year&group_by=day|week|month`
- Week aggregation aligned to Monday
- Statistics caching layer
