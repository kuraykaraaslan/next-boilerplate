'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@kuraykaraaslan/setting/ui/module-settings-page.component';
import type { SettingFieldDef } from '@kuraykaraaslan/setting/server/setting-fields.types';

const FIELDS: SettingFieldDef[] = [
  {
    key: 'leaveRequireApproval',
    label: 'Require Approval',
    group: 'Policy',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    key: 'leaveAllowOverlap',
    label: 'Allow Overlapping Leave',
    group: 'Policy',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    key: 'leaveMaxDaysPerRequest',
    label: 'Max Days per Request',
    group: 'Policy',
    type: 'number',
    defaultValue: '30',
  },
  {
    key: 'leaveDefaultStatus',
    label: 'Default Status',
    group: 'Defaults',
    type: 'select',
    options: [
      { value: 'PENDING', label: 'Pending' },
      { value: 'APPROVED', label: 'Approved' },
    ],
    defaultValue: 'PENDING',
  },
];

export default function HrLeaveSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Leave"
      subtitle="Approval and policy for leave requests"
      parentCrumb={{ label: 'Leave', href: `/tenant/${tenantId}/admin/hr/leave` }}
      fields={FIELDS}
    />
  );
}
