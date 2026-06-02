'use client';
import { use } from 'react';
import { SettingsPanelHost } from '@/modules_next/setting/ui/SettingsPanelHost';
import { PlatformPaymentTab } from '@/modules_next/setting/ui/PlatformSettingsTabs';

export default function PaymentsSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <SettingsPanelHost
      tenantId={tenantId}
      title="Payments"
      subtitle="Currency, tax, and payment provider credentials"
      parentCrumb={{ label: 'Settings', href: `/tenant/${tenantId}/admin/settings` }}
    >
      {(p) => <PlatformPaymentTab {...p} />}
    </SettingsPanelHost>
  );
}
