'use client';
import { use, useState, useCallback } from 'react';
import { Button } from '@nb/common/ui/Button';
import { Input } from '@nb/common/ui/Input';
import { Badge } from '@nb/common/ui/Badge';
import { AlertBanner } from '@nb/common/ui/AlertBanner';
import { PageHeader } from '@nb/common/ui/PageHeader';
import api from '@nb/common/server/axios';

type Hit = {
  entityType: string;
  entityId: string;
  title: string;
  url: string | null;
  snippet: string;
  rank: number;
};

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

// ts_headline returns <b>…</b> match markers; render as plain text to avoid XSS.
function stripTags(s: string): string {
  return s.replace(/<\/?[^>]+>/g, '');
}

export default function SearchPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const [q, setQ] = useState('');
  const [entityType, setEntityType] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(async () => {
    if (!q.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/search`, {
        params: { q, ...(entityType ? { entityType } : {}), limit: 50 },
      });
      setHits(res.data.hits ?? []);
      setTotal(res.data.total ?? 0);
      setSearched(true);
    } catch (err: unknown) {
      setError(extractMessage(err, 'Search failed.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId, q, entityType]);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <PageHeader
        title="Search"
        subtitle="Full-text search across indexed content (PostgreSQL FTS)."
      />

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch();
        }}
      >
        <div className="flex-1 min-w-64">
          <Input
            id="search-q"
            label="Query"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='e.g. checkout "exact phrase" -legacy'
          />
        </div>
        <div className="w-48">
          <Input
            id="search-entity-type"
            label="Entity type (optional)"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            placeholder="blog_post"
          />
        </div>
        <Button type="submit" variant="primary" disabled={loading || !q.trim()}>
          {loading ? 'Searching…' : 'Search'}
        </Button>
      </form>

      {error && <AlertBanner variant="error" message={error} />}

      {searched && (
        <p className="text-sm text-text-secondary">
          {total} result{total === 1 ? '' : 's'}
        </p>
      )}

      <div className="space-y-2">
        {hits.map((h) => (
          <div key={`${h.entityType}:${h.entityId}`} className="rounded-lg border border-border p-3">
            <div className="mb-1 flex items-center gap-2">
              <Badge variant="info" size="sm">{h.entityType}</Badge>
              {h.url ? (
                <a href={h.url} className="font-medium text-primary hover:underline">{h.title}</a>
              ) : (
                <span className="font-medium text-text-primary">{h.title}</span>
              )}
              <span className="ml-auto tabular-nums text-xs text-text-secondary">
                rank {h.rank.toFixed(3)}
              </span>
            </div>
            {h.snippet && <p className="text-sm text-text-secondary">{stripTags(h.snippet)}</p>}
          </div>
        ))}
        {searched && !loading && hits.length === 0 && !error && (
          <div className="rounded-lg border border-border px-3 py-6 text-center text-text-secondary">
            No matches.
          </div>
        )}
      </div>
    </div>
  );
}
