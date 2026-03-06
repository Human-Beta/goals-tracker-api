import { describe, expect, it } from 'vitest';

import { getUserLocalToday } from '../src';

describe('getUserLocalToday', () => {
  it('returns local date in YYYY-MM-DD format for timezone', () => {
    const now = new Date('2026-03-06T23:30:00.000Z');

    expect(getUserLocalToday('Europe/Uzhgorod', now)).toBe('2026-03-07');
    expect(getUserLocalToday('America/Los_Angeles', now)).toBe('2026-03-06');
  });

  it('throws clear error for invalid timezone', () => {
    expect(() => getUserLocalToday('Invalid/Timezone')).toThrow(
      'Invalid IANA timezone: Invalid/Timezone'
    );
  });
});
