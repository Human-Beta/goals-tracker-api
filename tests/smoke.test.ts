import { describe, expect, it } from 'vitest';
import { AxiosUtils } from '../src';

describe('scaffold', () => {
  it('loads relative imports', () => {
    expect(typeof AxiosUtils.noop).toBe('function');
  });
});
