import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import { SearchDocument } from '../entities/search_document.entity';
import SearchProviderBase, { type IndexableDocument } from './base.provider';
import type { SearchHit, SearchResult, SearchOptions } from '../search.types';

// Fixed text-search configuration for the MVP. Both the indexed tsvector and the
// query tsquery use the same config so matches are consistent. Per-document
// `language` is stored for a future multi-config upgrade; today we search with
// 'english'. The value is a constant (never user input) so it is safe to inline
// into the SQL as a `::regconfig` literal-by-parameter.
const TS_CONFIG = 'english';

/**
 * PostgreSQL full-text search provider. Builds the document `tsvector` from
 * `title || ' ' || body` at query time and ranks with `ts_rank`. User input is
 * always bound as a parameter and parsed by `websearch_to_tsquery` — never
 * interpolated into SQL — so it is injection-safe.
 */
export default class PostgresSearchProvider extends SearchProviderBase {
  async index(tenantId: string, doc: IndexableDocument): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(SearchDocument);
    const existing = await repo.findOne({
      where: { tenantId, entityType: doc.entityType, entityId: doc.entityId },
    });
    if (existing) {
      existing.title = doc.title;
      existing.body = doc.body;
      existing.url = doc.url ?? null;
      existing.metadata = doc.metadata ?? null;
      existing.language = doc.language || TS_CONFIG;
      await repo.save(existing);
      return;
    }
    await repo.save(
      repo.create({
        tenantId,
        entityType: doc.entityType,
        entityId: doc.entityId,
        title: doc.title,
        body: doc.body,
        url: doc.url ?? null,
        metadata: doc.metadata ?? null,
        language: doc.language || TS_CONFIG,
      }),
    );
  }

  async remove(tenantId: string, entityType: string, entityId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    await ds.getRepository(SearchDocument).delete({ tenantId, entityType, entityId });
  }

  async search(tenantId: string, query: string, opts: SearchOptions): Promise<SearchResult> {
    const ds = await tenantDataSourceFor(tenantId);

    // $1 tenantId, $2 ts config, $3 query, then optional entityType, then limit/offset.
    const params: unknown[] = [tenantId, TS_CONFIG, query];
    let entityClause = '';
    if (opts.entityType) {
      params.push(opts.entityType);
      entityClause = `AND "entityType" = $${params.length}`;
    }

    const matchExpr = `to_tsvector($2::regconfig, coalesce("title",'') || ' ' || coalesce("body",'')) @@ websearch_to_tsquery($2::regconfig, $3)`;

    const limitIdx = params.push(opts.limit);
    const offsetIdx = params.push(opts.offset);

    const rows = (await ds.query(
      `SELECT "entityType", "entityId", "title", "url", "metadata",
              ts_rank(to_tsvector($2::regconfig, coalesce("title",'') || ' ' || coalesce("body",'')),
                      websearch_to_tsquery($2::regconfig, $3)) AS rank,
              ts_headline($2::regconfig, coalesce("body",''),
                      websearch_to_tsquery($2::regconfig, $3),
                      'MaxFragments=1,MinWords=5,MaxWords=20') AS snippet
       FROM "search_documents"
       WHERE "tenantId" = $1 ${entityClause} AND ${matchExpr}
       ORDER BY rank DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    )) as Array<{
      entityType: string;
      entityId: string;
      title: string;
      url: string | null;
      metadata: Record<string, unknown> | null;
      rank: string | number;
      snippet: string;
    }>;

    // COUNT uses the same WHERE (tenant + optional entityType + match) without
    // the limit/offset params.
    const countParams = params.slice(0, opts.entityType ? 4 : 3);
    const countRows = (await ds.query(
      `SELECT COUNT(*)::int AS total
       FROM "search_documents"
       WHERE "tenantId" = $1 ${entityClause} AND ${matchExpr}`,
      countParams,
    )) as Array<{ total: number }>;

    const hits: SearchHit[] = rows.map((r) => ({
      entityType: r.entityType,
      entityId: r.entityId,
      title: r.title,
      url: r.url,
      snippet: r.snippet ?? '',
      rank: typeof r.rank === 'number' ? r.rank : parseFloat(r.rank),
      metadata: r.metadata ?? null,
    }));

    return { hits, total: countRows[0]?.total ?? 0 };
  }
}
