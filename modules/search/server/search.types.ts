import { z } from 'zod';

// The persisted document shape, validated on the way out of the repository.
export const SearchDocumentSchema = z.object({
  docId: z.string().uuid(),
  tenantId: z.string().uuid(),
  entityType: z.string(),
  entityId: z.string(),
  title: z.string(),
  body: z.string(),
  url: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  language: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type SearchDocumentType = z.infer<typeof SearchDocumentSchema>;

// A single ranked result row returned to the caller. `snippet` is the
// `ts_headline` fragment (may contain <b>…</b> match markers); `rank` is the
// `ts_rank` score (higher = more relevant).
export interface SearchHit {
  entityType: string;
  entityId: string;
  title: string;
  url: string | null;
  snippet: string;
  rank: number;
  metadata: Record<string, unknown> | null;
}

export interface SearchResult {
  hits: SearchHit[];
  total: number;
}

// Options accepted by the provider/service search call.
export interface SearchOptions {
  entityType?: string;
  limit: number;
  offset: number;
}
