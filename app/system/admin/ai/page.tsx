'use client';
// AI playground + usage stats
// Uses AIChatBox from next_components (adapted)
import { useEffect, useState } from 'react';
import api from '@/libs/axios';
import { PageHeader } from '@/modules/ui/PageHeader';
import { Card } from '@/modules/ui/Card';
import { Spinner } from '@/modules/ui/Spinner';
import { AlertBanner } from '@/modules/ui/AlertBanner';
import { TabGroup } from '@/modules/ui/TabGroup';
import { AIChatBox } from '@/modules/ai/ui/ai.chat-box';
import { Badge } from '@/modules/ui/Badge';
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

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend);

const PROVIDER_COLORS: Record<string, string> = {
  openai:    'rgb(16, 163, 127)',
  anthropic: 'rgb(209, 94, 56)',
  google:    'rgb(59, 130, 246)',
};

type ModelInfo = { model: string; provider: string };
type ProviderInfo = { provider: string; configured: boolean };
type UsageEntry = { daily: Record<string, number>; total: number };

export default function AIPage() {
  const [models, setModels]       = useState<ModelInfo[]>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [usage, setUsage]         = useState<Record<string, UsageEntry>>({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

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
                  <StatCard
                    label="Total Tokens (30d)"
                    value={totalTokens.toLocaleString()}
                    icon={faChartBar}
                  />
                  {Object.entries(usage).map(([provider, u]) => (
                    <StatCard
                      key={provider}
                      label={`${provider} tokens`}
                      value={(u.total ?? 0).toLocaleString()}
                      icon={faRobot}
                    />
                  ))}
                </div>

                {/* Per-provider daily breakdown */}
                {Object.entries(usage).map(([provider, u]) => {
                  const days = Object.entries(u.daily ?? {}).sort(([a], [b]) => a.localeCompare(b)).slice(-14);
                  if (!days.length) return null;
                  const color = PROVIDER_COLORS[provider] ?? 'rgb(107, 114, 128)';
                  const chartData = {
                    labels: days.map(([date]) => date),
                    datasets: [{
                      label: 'Tokens',
                      data: days.map(([, tokens]) => tokens as number),
                      borderColor: color,
                      backgroundColor: color.replace('rgb(', 'rgba(').replace(')', ', 0.1)'),
                      fill: true,
                      tension: 0.4,
                      pointRadius: 3,
                    }],
                  };
                  return (
                    <Card key={provider} title={`${provider} — Daily tokens (last 14 days)`}>
                      <Line
                        data={chartData}
                        options={{
                          responsive: true,
                          plugins: { legend: { display: false } },
                          scales: { y: { beginAtZero: true } },
                        }}
                      />
                    </Card>
                  );
                })}
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

      {/* Floating AI Chat — next_components ChatBox adapted */}
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
