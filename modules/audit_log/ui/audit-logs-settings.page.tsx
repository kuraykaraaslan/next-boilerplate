'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@kuraykaraaslan/setting/ui/module-settings-page.component';
import { AUDIT_LOG_SETTINGS_FIELDS } from '@kuraykaraaslan/audit_log/server/audit_log.settings.fields';

export default function AuditLogsSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Audit Logs"
      subtitle="Retention policy for this tenant's audit trail"
      parentCrumb={{ label: 'Audit Logs', href: `/tenant/${tenantId}/admin/audit-logs` }}
      fields={AUDIT_LOG_SETTINGS_FIELDS}
    />
  );
}
