'use client';
import { use, useState, useEffect, useCallback } from 'react';
import { Select } from '@nb/common/ui/Select';
import { AlertBanner } from '@nb/common/ui/AlertBanner';
import { PageHeader } from '@nb/common/ui/PageHeader';
import api from '@nb/common/server/axios';

type Summary = {
  totalEvents: number;
  uniqueUsers: number;
  uniqueSessions: number;
  topEvents: { name: string; count: number }[];
};
type Point = { bucket: string; count: number };

const RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-2xl font-semibold tabular-nums text-text-primary">{value.toLocaleString()}</div>
      <div className="text-sm text-text-secondary">{label}</div>
    </div>
  );
}

export default function AnalyticsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const [days, setDays] = useState('30');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    const to = new Date();
    const from = new Date(to.getTime() - Number(days) * 24 * 60 * 60 * 1000);
    const range = { from: from.toISOString(), to: to.toISOString() };
    try {
      const [s, t] = await Promise.all([
        api.get(`/tenant/${tenantId}/api/analytics/summary`, { params: range }),
        api.get(`/tenant/${tenantId}/api/analytics/timeseries`, { params: { ...range, interval: 'day' } }),
      ]);
      setSummary(s.data);
      setPoints(t.data.points ?? []);
    } catch (err: unknown) {
      setError(extractMessage(err, 'Failed to load analytics.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId, days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const maxTop = Math.max(1, ...(summary?.topEvents ?? []).map((e) => e.count));
  const maxPoint = Math.max(1, ...points.map((p) => p.count));

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <PageHeader title="Analytics" subtitle="Product event analytics — volume, reach and top events." />

      <div className="max-w-xs">
        <Select
          id="analytics-range"
          label="Range"
          value={days}
          onChange={(e) => setDays(e.target.value)}
          options={RANGE_OPTIONS}
        />
      </div>

      {error && <AlertBanner variant="error" message={error} />}

      {loading ? (
        <div className="px-3 py-6 text-center text-text-secondary">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Total events" value={summary?.totalEvents ?? 0} />
            <StatCard label="Unique users" value={summary?.uniqueUsers ?? 0} />
            <StatCard label="Unique sessions" value={summary?.uniqueSessions ?? 0} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <h2 className="mb-3 text-sm font-medium text-text-primary">Top events</h2>
              {(summary?.topEvents ?? []).length === 0 ? (
                <p className="text-sm text-text-secondary">No events in this range.</p>
              ) : (
                <div className="space-y-2">
                  {summary!.topEvents.map((e) => (
                    <div key={e.name}>
                      <div className="mb-0.5 flex justify-between text-xs text-text-secondary">
                        <span className="font-mono text-text-primary">{e.name}</span>
                        <span className="tabular-nums">{e.count.toLocaleString()}</span>
                      </div>
                      <div className="h-2 w-full rounded bg-surface-sunken">
                        <div className="h-2 rounded bg-primary" style={{ width: `${(e.count / maxTop) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border p-4">
              <h2 className="mb-3 text-sm font-medium text-text-primary">Daily events</h2>
              {points.length === 0 ? (
                <p className="text-sm text-text-secondary">No data.</p>
              ) : (
                <div className="flex h-40 items-end gap-px overflow-x-auto">
                  {points.map((p) => (
                    <div
                      key={p.bucket}
                      title={`${p.bucket.slice(0, 10)}: ${p.count}`}
                      className="min-w-[3px] flex-1 rounded-t bg-primary"
                      style={{ height: `${Math.max(2, (p.count / maxPoint) * 100)}%` }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
