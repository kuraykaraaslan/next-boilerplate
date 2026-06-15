import type { SearchDocumentType, SearchResult, SearchOptions } from '../search.types';

// A document as pushed in by an owning module (no generated/audit columns).
export type IndexableDocument = Pick<
  SearchDocumentType,
  'entityType' | 'entityId' | 'title' | 'body' | 'url' | 'metadata' | 'language'
>;

/**
 * Pluggable search backend contract. The PostgreSQL provider ships today; adding
 * Meilisearch/Elastic is implementing this interface plus a factory case.
 *
 * Every method is tenant-scoped — implementations MUST constrain all reads and
 * writes to `tenantId` (defense-in-depth alongside row-level security).
 */
export default abstract class SearchProviderBase {
  /** Upsert a document into the index, keyed on (tenantId, entityType, entityId). */
  abstract index(tenantId: string, doc: IndexableDocument): Promise<void>;

  /** Remove a document from the index by its source key. */
  abstract remove(tenantId: string, entityType: string, entityId: string): Promise<void>;

  /**
   * Run a full-text search. `query` is already normalized (non-blank). Results
   * are ranked most-relevant first.
   */
  abstract search(tenantId: string, query: string, opts: SearchOptions): Promise<SearchResult>;
}
