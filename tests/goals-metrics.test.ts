import { describe, expect, it } from 'vitest';

import { computeGoalMetrics } from '../src';

describe('computeGoalMetrics', () => {
  it('calculates metrics for a baseline case from business formulas', () => {
    const metrics = computeGoalMetrics({
      target_value: 100,
      start_date: '2026-03-01',
      end_date: '2026-03-10',
      today: '2026-03-08',
      current_value: 40,
      current_7d_sum: 35,
      current_30d_sum: 40,
    });

    expect(metrics).toMatchObject({
      current_value: 40,
      remaining_value: 60,
      percent_complete: 40,
      days_left: 2,
      days_left_for_pace: 3,
      days_total: 10,
      days_elapsed: 8,
      pace_expected_per_day: 10,
      pace_required_per_day: 20,
      pace_current_7d: 5,
      pace_current_30d: 5,
      pace_current_all: 5,
      eta_date: '2026-03-20',
      expected_by_today: 80,
      behind_value: 40,
    });
    expect(metrics.catchup_pace_next_7_days).toBeCloseTo(110 / 7);
  });

  it('does not count days before start_date for 30d pace', () => {
    const metrics = computeGoalMetrics({
      target_value: 100,
      start_date: '2026-03-01',
      end_date: '2026-03-25',
      today: '2026-03-10',
      current_value: 50,
      current_7d_sum: 35,
      current_30d_sum: 50,
    });

    expect(metrics.days_elapsed).toBe(10);
    expect(metrics.pace_current_30d).toBe(5);
    expect(metrics.pace_current_all).toBe(5);
  });

  it('handles boundary case when no days are left and pace is zero', () => {
    const metrics = computeGoalMetrics({
      target_value: 100,
      start_date: '2026-03-01',
      end_date: '2026-03-07',
      today: '2026-03-08',
      current_value: 20,
      current_7d_sum: 0,
      current_30d_sum: 20,
    });

    expect(metrics.days_left).toBe(0);
    expect(metrics.days_left_for_pace).toBe(0);
    expect(metrics.pace_required_per_day).toBe(0);
    expect(metrics.pace_current_7d).toBe(0);
    expect(metrics.eta_date).toBeNull();
  });

  it('caps completion percent and floors remaining value when progress is above target', () => {
    const metrics = computeGoalMetrics({
      target_value: 100,
      start_date: '2026-03-01',
      end_date: '2026-03-20',
      today: '2026-03-10',
      current_value: 120,
      current_7d_sum: 14,
      current_30d_sum: 60,
    });

    expect(metrics.remaining_value).toBe(0);
    expect(metrics.percent_complete).toBe(100);
    expect(metrics.eta_date).toBe('2026-03-10');
  });

  it('floors catch-up pace at zero when progress is already above expected trajectory', () => {
    const metrics = computeGoalMetrics({
      target_value: 100,
      start_date: '2026-03-01',
      end_date: '2026-03-20',
      today: '2026-03-10',
      current_value: 200,
      current_7d_sum: 21,
      current_30d_sum: 200,
    });

    expect(metrics.behind_value).toBeLessThan(0);
    expect(metrics.catchup_pace_next_7_days).toBe(0);
  });
});
