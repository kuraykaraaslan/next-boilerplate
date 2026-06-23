'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@kuraykaraaslan/setting/ui/module-settings-page.component';
import type { SettingFieldDef } from '@kuraykaraaslan/setting/server/setting-fields.types';

const FIELDS: SettingFieldDef[] = [
  {
    key: 'formSubmissionRetentionDays',
    label: 'Retention (days)',
    description: 'Auto-delete submissions older than this. 0 = keep forever.',
    group: 'Retention',
    type: 'number',
    defaultValue: '0',
  },
  {
    key: 'formSubmissionExportFormat',
    label: 'Default Export Format',
    group: 'Export',
    type: 'select',
    options: [
      { value: 'CSV', label: 'CSV' },
      { value: 'JSON', label: 'JSON' },
    ],
    defaultValue: 'CSV',
  },
  {
    key: 'formSubmissionNotifyOnNew',
    label: 'Notify on New Submission',
    group: 'Notifications',
    type: 'boolean',
    defaultValue: 'false',
  },
];

export default function FormSubmissionsSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Submissions"
      subtitle="Retention and handling of form submissions"
      parentCrumb={{ label: 'Submissions', href: `/tenant/${tenantId}/admin/forms/submissions` }}
      fields={FIELDS}
    />
  );
}
