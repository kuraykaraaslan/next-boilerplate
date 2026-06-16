'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@nb/common/ui/Card';
import { DateRangePicker, DateRange } from '@nb/common/ui/DateRangePicker';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faChartBar } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@nb/common/server/utils/cn';

// chart.js + react-chartjs-2 are heavy and only needed once this tab paints a
// chart — code-split them out of the admin bundle.
const UsageChart = dynamic(() => import('./usage-chart.component'), {
  ssr: false,
  loading: () => <div className="h-64 rounded bg-surface-sunken animate-pulse" />,
});

type UsageEntry = { daily: Record<string, number>; total: number };
type Preset = '1d' | '7d' | '30d' | 'custom';

const PROVIDER_COLORS: Record<string, { border: string; bg: string }> = {
  openai:    { border: 'rgb(16, 163, 127)',  bg: 'rgba(16, 163, 127, 0.1)'  },
  anthropic: { border: 'rgb(209, 94, 56)',   bg: 'rgba(209, 94, 56, 0.1)'   },
  google:    { border: 'rgb(59, 130, 246)',  bg: 'rgba(59, 130, 246, 0.1)'  },
};
const FALLBACK_COLOR = { border: 'rgb(107, 114, 128)', bg: 'rgba(107, 114, 128, 0.1)' };

const PRESETS: { id: Preset; label: string }[] = [
  { id: '1d',     label: '1G'    },
  { id: '7d',     label: '7G'    },
  { id: '30d',    label: '30G'   },
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

interface Props {
  usage: Record<string, UsageEntry>;
}

export function AIUsageTab({ usage }: Props) {
  const [preset,      setPreset]      = useState<Preset>('30d');
  const [customRange, setCustomRange] = useState<DateRange>({ start: null, end: null });

  const totalTokens = Object.values(usage).reduce((sum, u) => sum + (u.total ?? 0), 0);

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
    <div className="space-y-4">
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

      <Card title="Daily Token Usage">
        {visibleDates.length === 0 ? (
          <p className="text-sm text-text-secondary py-4">Bu aralıkta veri yok.</p>
        ) : (
          <UsageChart data={chartData} />
        )}
      </Card>
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
