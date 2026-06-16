import { describe, it, expect } from 'vitest';
import { resolveIcon } from '../icon-map';

describe('resolveIcon', () => {
  it('resolves "fas fa-gear", "fa-gear" and "gear" to the same icon', () => {
    const a = resolveIcon('fas fa-gear');
    expect(a).toBeDefined();
    expect(resolveIcon('fa-gear')).toBe(a);
    expect(resolveIcon('gear')).toBe(a);
  });

  it('returns undefined for unknown / empty input', () => {
    expect(resolveIcon('fa-does-not-exist')).toBeUndefined();
    expect(resolveIcon(undefined)).toBeUndefined();
    expect(resolveIcon('')).toBeUndefined();
  });
});
