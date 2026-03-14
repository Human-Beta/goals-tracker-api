import { addIsoDays, diffIsoDays } from '../utils/iso-date';

export type GoalMetricsInput = {
  target_value: number;
  start_date: string;
  end_date: string;
  today: string;
  current_value: number;
  current_7d_sum: number;
  current_30d_sum: number;
};

export type GoalComputedMetrics = {
  current_value: number;
  remaining_value: number;
  percent_complete: number;
  days_left: number;
  days_left_for_pace: number;
  days_total: number;
  days_elapsed: number;
  pace_expected_per_day: number;
  pace_required_per_day: number;
  pace_current_7d: number;
  pace_current_30d: number;
  pace_current_all: number;
  eta_date: string | null;
  expected_by_today: number;
  behind_value: number;
  catchup_pace_next_7_days: number;
};

export function computeGoalMetrics(input: GoalMetricsInput): GoalComputedMetrics {
  const currentValue = input.current_value;
  const remainingValue = Math.max(input.target_value - currentValue, 0);
  const percentComplete = Math.min(100, (currentValue / input.target_value) * 100);

  const rawDaysLeft = diffIsoDays(input.today, input.end_date);
  const daysLeft = Math.max(rawDaysLeft, 0);
  const daysLeftForPace = Math.max(rawDaysLeft + 1, 0);
  const daysTotal = diffIsoDays(input.start_date, input.end_date) + 1;
  const daysElapsed = diffIsoDays(input.start_date, input.today) + 1;
  const current7dDays = Math.min(7, daysElapsed);
  const current30dDays = Math.min(30, daysElapsed);

  const paceExpectedPerDay = input.target_value / daysTotal;
  const paceRequiredPerDay = daysLeftForPace === 0 ? 0 : remainingValue / daysLeftForPace;
  const paceCurrent7d = input.current_7d_sum / current7dDays;
  const paceCurrent30d = input.current_30d_sum / current30dDays;
  const paceCurrentAll = currentValue / daysElapsed;

  const expectedByToday = paceExpectedPerDay * daysElapsed;
  const behindValue = expectedByToday - currentValue;
  const expectedByTodayPlus7 = paceExpectedPerDay * (daysElapsed + 7);
  const needNext7Days = Math.max(expectedByTodayPlus7 - currentValue, 0);
  const catchupPaceNext7Days = needNext7Days / 7;

  let etaDate: string | null = null;
  if (paceCurrent7d > 0) {
    const etaDays = Math.ceil(remainingValue / paceCurrent7d);
    etaDate = addIsoDays(input.today, etaDays);
  }

  return {
    current_value: currentValue,
    remaining_value: remainingValue,
    percent_complete: percentComplete,
    days_left: daysLeft,
    days_left_for_pace: daysLeftForPace,
    days_total: daysTotal,
    days_elapsed: daysElapsed,
    pace_expected_per_day: paceExpectedPerDay,
    pace_required_per_day: paceRequiredPerDay,
    pace_current_7d: paceCurrent7d,
    pace_current_30d: paceCurrent30d,
    pace_current_all: paceCurrentAll,
    eta_date: etaDate,
    expected_by_today: expectedByToday,
    behind_value: behindValue,
    catchup_pace_next_7_days: catchupPaceNext7Days,
  };
}
