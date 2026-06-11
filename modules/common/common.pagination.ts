import { z } from 'zod';

/**
 * Canonical pagination envelopes so every list endpoint returns the same shape
 * to API/SDK/webhook consumers. Offset-based (`PaginatedResult`) and
 * cursor-based (`CursorPage`) variants are both provided.
 *
 * Dependency-free: Zod only.
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const PaginationDTO = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof PaginationDTO>;

/** Wrap a page slice in a `PaginatedResult`, computing `pageCount` from total/limit. */
export function paginate<T>(items: T[], total: number, page: number, limit: number): PaginatedResult<T> {
  const pageCount = limit > 0 ? Math.ceil(total / limit) : 0;
  return { items, total, page, limit, pageCount };
}
