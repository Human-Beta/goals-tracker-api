import { describe, expect, it } from 'vitest';

import { formatIsoDate, isIsoDate, parseIsoDate } from '../src';

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
});
