'use client';
import { useEffect, useState } from 'react';
import api from '@/libs/axios';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Card } from '@/modules_next/common/ui/Card';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { TabGroup } from '@/modules_next/common/ui/TabGroup';
import { AIChatBox } from '@/modules_next/ai/ui/AIChatBox';
import { Badge } from '@/modules_next/common/ui/Badge';
import { DateRangePicker, DateRange } from '@/modules_next/common/ui/DateRangePicker';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faChartBar, faServer } from '@fortawesome/free-solid-svg-icons';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { cn } from '@/libs/utils/cn';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend);

type ModelInfo    = { model: string; provider: string };
type ProviderInfo = { provider: string; configured: boolean };
type UsageEntry   = { daily: Record<string, number>; total: number };

type Preset = '1d' | '7d' | '30d' | 'custom';

const PROVIDER_COLORS: Record<string, { border: string; bg: string }> = {
  openai:    { border: 'rgb(16, 163, 127)',  bg: 'rgba(16, 163, 127, 0.1)'  },
  anthropic: { border: 'rgb(209, 94, 56)',   bg: 'rgba(209, 94, 56, 0.1)'   },
  google:    { border: 'rgb(59, 130, 246)',  bg: 'rgba(59, 130, 246, 0.1)'  },
};
const FALLBACK_COLOR = { border: 'rgb(107, 114, 128)', bg: 'rgba(107, 114, 128, 0.1)' };

const PRESETS: { id: Preset; label: string }[] = [
  { id: '1d',  label: '1G'  },
  { id: '7d',  label: '7G'  },
  { id: '30d', label: '30G' },
  { id: 'custom', label: 'Aralık' },
];

function filterDates(dates: string[], preset: Preset, custom: DateRange): string[] {
  const today = new Date().toISOString().split('T')[0];
  if (preset === '1d') return dates.filter((d) => d === today);
  if (preset === '7d') {
    const cutoff = new Date(Date.now() - 6 * 86_400_000).toISOString().split('T')[0];
    return dates.filter((d) => d >= cutoff);
  }
  if (preset === '30d') return dates;
  if (preset === 'custom' && custom.start && custom.end) {
    const s = custom.start.toISOString().split('T')[0];
    const e = custom.end.toISOString().split('T')[0];
    return dates.filter((d) => d >= s && d <= e);
  }
  return dates;
}

export default function AIPage() {
  const [models,    setModels]    = useState<ModelInfo[]>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [usage,     setUsage]     = useState<Record<string, UsageEntry>>({});
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  const [preset,      setPreset]      = useState<Preset>('30d');
  const [customRange, setCustomRange] = useState<DateRange>({ start: null, end: null });

  useEffect(() => {
    Promise.all([
      api.get('/system/api/ai/models').catch(() => ({ data: { models: [] } })),
      api.get('/system/api/ai/providers').catch(() => ({ data: { providers: [] } })),
      api.get('/system/api/ai/usage?days=30').catch(() => ({ data: { usage: {} } })),
    ])
      .then(([modelsRes, providersRes, usageRes]) => {
        setModels(modelsRes.data.models ?? []);
        setProviders(providersRes.data.providers ?? []);
        setUsage(usageRes.data.usage ?? {});
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const totalTokens = Object.values(usage).reduce((sum, u) => sum + (u.total ?? 0), 0);

  // Build combined chart data
  const allDates = [...new Set(
    Object.values(usage).flatMap((u) => Object.keys(u.daily ?? {}))
  )].sort();

  const visibleDates = filterDates(allDates, preset, customRange);

  const chartData = {
    labels: visibleDates,
    datasets: Object.entries(usage).map(([provider, u]) => {
      const color = PROVIDER_COLORS[provider] ?? FALLBACK_COLOR;
      return {
        label: provider,
        data: visibleDates.map((d) => (u.daily?.[d] as number) ?? 0),
        borderColor: color.border,
        backgroundColor: color.bg,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      };
    }),
  };

  return (
    <div className="space-y-6">
      <PageHeader title="AI" subtitle="Playground and usage statistics" />
      {error && <AlertBanner variant="error" message={error} />}

      <TabGroup
        label="AI sections"
        tabs={[
          {
            id: 'usage',
            label: 'Usage',
            content: (
              <div className="space-y-4">
                {/* Summary row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatCard label="Total Tokens (30d)" value={totalTokens.toLocaleString()} icon={faChartBar} />
                  {Object.entries(usage).map(([provider, u]) => (
                    <StatCard
                      key={provider}
                      label={`${provider} tokens`}
                      value={(u.total ?? 0).toLocaleString()}
                      icon={faRobot}
                    />
                  ))}
                </div>

                {/* Range selector */}
                <Card>
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="flex rounded-lg overflow-hidden border border-border">
                      {PRESETS.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setPreset(p.id)}
                          className={cn(
                            'px-4 py-2 text-sm font-medium transition-colors',
                            preset === p.id
                              ? 'bg-primary text-white'
                              : 'bg-surface-base text-text-secondary hover:bg-surface-overlay'
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {preset === 'custom' && (
                      <DateRangePicker
                        id="usage-range"
                        label="Tarih Aralığı"
                        value={customRange}
                        onChange={setCustomRange}
                        className="flex-1 min-w-[280px]"
                      />
                    )}
                  </div>
                </Card>

                {/* Combined line chart */}
                <Card title="Daily Token Usage">
                  {visibleDates.length === 0 ? (
                    <p className="text-sm text-text-secondary py-4">Bu aralıkta veri yok.</p>
                  ) : (
                    <Line
                      data={chartData}
                      options={{
                        responsive: true,
                        plugins: { legend: { position: 'top' } },
                        scales: { y: { beginAtZero: true } },
                      }}
                    />
                  )}
                </Card>
              </div>
            ),
          },
          {
            id: 'providers',
            label: 'Providers & Models',
            content: (
              <div className="space-y-4">
                <Card title="Providers">
                  <div className="divide-y divide-border">
                    {providers.map((p) => (
                      <div key={p.provider} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <FontAwesomeIcon icon={faServer} className="w-4 h-4 text-text-secondary" />
                          <span className="text-sm font-medium text-text-primary">{p.provider}</span>
                        </div>
                        <Badge variant={p.configured ? 'success' : 'neutral'} dot>
                          {p.configured ? 'Configured' : 'Not configured'}
                        </Badge>
                      </div>
                    ))}
                    {providers.length === 0 && (
                      <p className="text-sm text-text-secondary py-4">No providers available.</p>
                    )}
                  </div>
                </Card>

                <Card title="Available Models">
                  <div className="divide-y divide-border">
                    {models.map((m) => (
                      <div key={`${m.provider}-${m.model}`} className="flex items-center justify-between py-3">
                        <span className="text-sm font-mono text-text-primary">{m.model}</span>
                        <Badge variant="neutral" size="sm">{m.provider}</Badge>
                      </div>
                    ))}
                    {models.length === 0 && (
                      <p className="text-sm text-text-secondary py-4">No models available.</p>
                    )}
                  </div>
                </Card>
              </div>
            ),
          },
        ]}
      />

      <AIChatBox title="AI Playground" subtitle="Test your AI configuration" />
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: any }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-subtle text-primary shrink-0">
          <FontAwesomeIcon icon={icon} className="w-4 h-4" />
        </span>
        <div>
          <p className="text-xs text-text-secondary">{label}</p>
          <p className="text-xl font-bold text-text-primary tabular-nums mt-0.5">{value}</p>
        </div>
      </div>
    </Card>
  );
}
