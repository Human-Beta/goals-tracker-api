import { describe, expect, it } from 'vitest';

import { INT64_MAX, INT64_MIN, parseInt64 } from '../src';

describe('int64 utils', () => {
  it('exposes expected int64 boundaries', () => {
    expect(INT64_MIN).toBe(-9223372036854775808n);
    expect(INT64_MAX).toBe(9223372036854775807n);
  });

  it('parses valid int64 values', () => {
    expect(parseInt64('0')).toBe(0n);
    expect(parseInt64(' 42 ')).toBe(42n);
    expect(parseInt64('-42')).toBe(-42n);
    expect(parseInt64(INT64_MIN.toString())).toBe(INT64_MIN);
    expect(parseInt64(INT64_MAX.toString())).toBe(INT64_MAX);
  });

  it('returns null for malformed numbers', () => {
    expect(parseInt64('')).toBeNull();
    expect(parseInt64('abc')).toBeNull();
    expect(parseInt64('1.5')).toBeNull();
    expect(parseInt64('+10')).toBeNull();
    expect(parseInt64('12a')).toBeNull();
  });

  it('returns null for values outside int64 range', () => {
    expect(parseInt64((INT64_MAX + 1n).toString())).toBeNull();
    expect(parseInt64((INT64_MIN - 1n).toString())).toBeNull();
  });
});
