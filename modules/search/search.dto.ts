import { z } from 'zod';

export const IndexDocDTO = z.object({
  entityType: z.string().min(1).max(64),
  entityId: z.string().min(1).max(256),
  title: z.string().min(1).max(512),
  body: z.string().max(100_000).default(''),
  url: z.string().url().max(2048).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  // A PostgreSQL text-search config name; defaults to 'english' in the entity.
  language: z.string().max(64).optional(),
});

export const RemoveDocDTO = z.object({
  entityType: z.string().min(1).max(64),
  entityId: z.string().min(1).max(256),
});

export const SearchQueryDTO = z.object({
  q: z.string().min(1).max(200),
  entityType: z.string().max(64).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type IndexDocInput = z.infer<typeof IndexDocDTO>;
export type RemoveDocInput = z.infer<typeof RemoveDocDTO>;
export type SearchQueryInput = z.infer<typeof SearchQueryDTO>;
