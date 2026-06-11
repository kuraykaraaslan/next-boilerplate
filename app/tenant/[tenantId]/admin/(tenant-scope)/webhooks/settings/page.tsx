'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@/modules_next/setting/ui/ModuleSettingsPage';
import { WEBHOOK_SETTINGS_FIELDS } from '@/modules/webhook/webhook.settings.fields';

export default function WebhooksSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Webhooks"
      subtitle="Tune how webhook deliveries are retried and timed out"
      parentCrumb={{ label: 'Webhooks', href: `/tenant/${tenantId}/admin/webhooks` }}
      fields={WEBHOOK_SETTINGS_FIELDS}
    />
  );
}
