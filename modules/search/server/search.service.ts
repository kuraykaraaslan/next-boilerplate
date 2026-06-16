import 'reflect-metadata';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { getSearchProvider } from './search.provider-factory';
import type { IndexableDocument } from './providers/base.provider';
import { normalizeQuery, isBlankQuery } from './search.query';
import { SEARCH_MESSAGES as MSG } from './search.messages';
import type { SearchResult, SearchOptions } from './search.types';
import type { IndexDocInput } from './search.dto';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Tenant-scoped search facade. Delegates to the configured provider
 * (PostgreSQL FTS by default) and owns input normalization so callers don't
 * have to. Owning modules call `index`/`remove` to keep the index in sync with
 * their data; `search` is the read path.
 */
export default class SearchService {
  /** Upsert a searchable document for an owning module. */
  static async index(tenantId: string, input: IndexDocInput): Promise<void> {
    const doc: IndexableDocument = {
      entityType: input.entityType,
      entityId: input.entityId,
      title: input.title,
      body: input.body,
      url: input.url ?? null,
      metadata: input.metadata ?? null,
      language: input.language ?? 'english',
    };
    await getSearchProvider().index(tenantId, doc);
  }

  /** Remove a document from the index by its source key. */
  static async remove(tenantId: string, entityType: string, entityId: string): Promise<void> {
    await getSearchProvider().remove(tenantId, entityType, entityId);
  }

  /**
   * Full-text search. Throws `EMPTY_QUERY` (400) when the query is blank after
   * normalization. Results are ranked most-relevant first.
   */
  static async search(
    tenantId: string,
    rawQuery: string,
    opts?: Partial<SearchOptions>,
  ): Promise<SearchResult> {
    if (isBlankQuery(rawQuery)) {
      throw new AppError(MSG.EMPTY_QUERY, 400, ErrorCode.VALIDATION_ERROR);
    }
    const query = normalizeQuery(rawQuery);
    const limit = Math.min(Math.max(opts?.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const offset = Math.max(opts?.offset ?? 0, 0);
    return getSearchProvider().search(tenantId, query, {
      entityType: opts?.entityType,
      limit,
      offset,
    });
  }
}
