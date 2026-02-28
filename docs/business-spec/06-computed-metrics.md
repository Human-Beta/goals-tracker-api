# Computed Metrics for `GET /goals/{id}`

Use these variables:

- `C = sum(progress_events.delta_value)` for the goal
- `T = goals.target_value`
- `today` in user timezone (date only)
- `S = goals.start_date`
- `E = goals.end_date`

## Core Values

- `current_value = C`
- `remaining_value = max(T - C, 0)`
- `percent_complete = min(100, (C / T) * 100)`

## Date Values

- `days_left = max((E - today).days, 0)` (does not count today)
- `days_left_for_pace = max((E - today).days + 1, 0)` (counts today)
- `days_total = (E - S).days + 1`
- `days_elapsed = (today - S).days + 1` (with invariant: `S` is not in the future)

## Pace Metrics

- `pace_expected_per_day = T / days_total`
- `pace_required_per_day = remaining_value / days_left_for_pace`
  - If `days_left_for_pace = 0`, return `0`.
- `pace_current_7d = sum(delta in last 7 days including today) / 7`
- `pace_current_30d = sum(delta in last 30 days) / 30`
- `pace_current_all = C / days_elapsed`

## ETA (Expected Completion Date)

Using `pace_current_7d` as baseline:

- If `pace_current_7d > 0`:
  - `eta_days = ceil(remaining_value / pace_current_7d)`
  - `eta_date = today + eta_days`
- Else:
  - `eta_date = null`

## Schedule Deviation

- `expected_by_today = pace_expected_per_day * days_elapsed`
- `behind_value = expected_by_today - C`
- Interpretation:
  - `behind_value > 0`: behind schedule by `behind_value` units
  - `behind_value < 0`: ahead of schedule by `abs(behind_value)` units

## Catch-Up Pace for Next 7 Days

- `expected_by_today_plus_7 = pace_expected_per_day * (days_elapsed + 7)`
- `need_next_7_days = max(expected_by_today_plus_7 - C, 0)`
- `catchup_pace_next_7_days = need_next_7_days / 7`
