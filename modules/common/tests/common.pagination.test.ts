import { describe, it, expect } from 'vitest';
import { PaginationDTO, paginate } from '../common.pagination';

describe('paginate', () => {
  it('computes pageCount with ceiling division', () => {
    expect(paginate([1, 2], 100, 1, 20).pageCount).toBe(5);
    expect(paginate([1], 101, 1, 20).pageCount).toBe(6);
    expect(paginate([], 0, 1, 20).pageCount).toBe(0);
  });

  it('echoes the items, total, page and limit', () => {
    const result = paginate(['a', 'b'], 2, 1, 20);
    expect(result).toEqual({ items: ['a', 'b'], total: 2, page: 1, limit: 20, pageCount: 1 });
  });

  it('returns pageCount 0 when limit is 0 (no division by zero)', () => {
    expect(paginate([], 10, 1, 0).pageCount).toBe(0);
  });
});

describe('PaginationDTO', () => {
  it('applies defaults', () => {
    const parsed = PaginationDTO.parse({});
    expect(parsed).toEqual({ page: 1, limit: 20 });
  });

  it('coerces string query params', () => {
    expect(PaginationDTO.parse({ page: '3', limit: '50' })).toEqual({ page: 3, limit: 50 });
  });

  it('rejects limit over 100', () => {
    expect(PaginationDTO.safeParse({ limit: 101 }).success).toBe(false);
  });
});
