import { describe, expect, it } from 'vitest';

import { addIsoDays, diffIsoDays, formatIsoDate, getIsoDateDaysAgoInclusive, isIsoDate, parseIsoDate } from '../src';

describe('iso-date utils', () => {
  it('validates ISO dates in YYYY-MM-DD format', () => {
    expect(isIsoDate('2026-03-08')).toBe(true);
    expect(isIsoDate('2024-02-29')).toBe(true);
  });

  it('rejects malformed or calendar-invalid ISO dates', () => {
    expect(isIsoDate('2026-3-8')).toBe(false);
    expect(isIsoDate('08-03-2026')).toBe(false);
    expect(isIsoDate('2026/03/08')).toBe(false);
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('2026-00-01')).toBe(false);
    expect(isIsoDate('2026-04-31')).toBe(false);
  });

  it('parses ISO date as UTC midnight date object', () => {
    const date = parseIsoDate('2026-03-08');

    expect(date.toISOString()).toBe('2026-03-08T00:00:00.000Z');
  });

  it('formats date object as YYYY-MM-DD', () => {
    const date = new Date('2026-03-08T15:30:45.123Z');

    expect(formatIsoDate(date)).toBe('2026-03-08');
  });

  it('calculates day difference between ISO dates', () => {
    expect(diffIsoDays('2026-03-01', '2026-03-08')).toBe(7);
    expect(diffIsoDays('2026-03-08', '2026-03-01')).toBe(-7);
  });

  it('adds calendar days to ISO date', () => {
    expect(addIsoDays('2026-03-08', 3)).toBe('2026-03-11');
    expect(addIsoDays('2026-03-08', -8)).toBe('2026-02-28');
  });

  it('resolves inclusive start date for N-day window ending today', () => {
    expect(getIsoDateDaysAgoInclusive('2026-03-08', 7)).toBe('2026-03-02');
    expect(getIsoDateDaysAgoInclusive('2026-03-08', 30)).toBe('2026-02-07');
  });
});
