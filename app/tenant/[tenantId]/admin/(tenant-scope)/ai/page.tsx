'use client';
import { use, useEffect, useState } from 'react';
import api from '@nb/common/server/axios';
import { PageHeader } from '@nb/common/ui/PageHeader';
import { Card } from '@nb/common/ui/Card';
import { Spinner } from '@nb/common/ui/Spinner';
import { AlertBanner } from '@nb/common/ui/AlertBanner';
import { TabGroup } from '@nb/common/ui/TabGroup';
import { AIChatBox } from '@nb/ai/ui/AIChatBox';
import { AIUsageTab } from '@nb/ai/ui/AIUsageTab';
import { Badge } from '@nb/common/ui/Badge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faServer, faGear } from '@fortawesome/free-solid-svg-icons';

type ModelInfo    = { model: string; provider: string };
type ProviderInfo = { provider: string; configured: boolean };
type UsageEntry   = { daily: Record<string, number>; total: number };

export default function AIPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [models,    setModels]    = useState<ModelInfo[]>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [usage,     setUsage]     = useState<Record<string, UsageEntry>>({});
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/tenant/${tenantId}/api/ai/models`).catch(() => ({ data: { models: [] } })),
      api.get(`/tenant/${tenantId}/api/ai/providers`).catch(() => ({ data: { providers: [] } })),
      api.get(`/tenant/${tenantId}/api/ai/usage?days=30`).catch(() => ({ data: { usage: {} } })),
    ])
      .then(([modelsRes, providersRes, usageRes]) => {
        setModels(modelsRes.data.models ?? []);
        setProviders(providersRes.data.providers ?? []);
        setUsage(usageRes.data.usage ?? {});
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tenantId]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI"
        subtitle="Playground and usage statistics"
        actions={[
          { label: <FontAwesomeIcon icon={faGear} />, href: `/tenant/${tenantId}/admin/ai/settings`, variant: 'ghost' as const },
        ]}
      />
      {error && <AlertBanner variant="error" message={error} />}

      <TabGroup
        label="AI sections"
        tabs={[
          {
            id: 'usage',
            label: 'Usage',
            content: <AIUsageTab usage={usage} />,
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
