import { z } from 'zod';

// Search backends. Only `postgres` (PostgreSQL full-text search) ships today;
// the enum is the extension point — adding `meilisearch`/`elastic` here plus a
// concrete provider is the whole job.
export const SearchProviderEnum = z.enum(['postgres']);
export type SearchProvider = z.infer<typeof SearchProviderEnum>;
