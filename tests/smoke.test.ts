import { describe, expect, it } from 'vitest';
import { AxiosUtils } from '@/index';

describe('scaffold', () => {
  it('loads alias imports', () => {
    expect(typeof AxiosUtils.noop).toBe('function');
  });
});
