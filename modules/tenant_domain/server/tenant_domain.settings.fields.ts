import type { SettingFieldDef } from '@kuraykaraaslan/setting/server/setting-fields.types';

// UI metadata for the Domains settings page. Keys are already read per-tenant
// by tenant_domain.service.ts via SettingService.getByKey(tenantId, ...).
export const TENANT_DOMAIN_SETTINGS_FIELDS: SettingFieldDef[] = [
  {
    key: 'maxDomains',
    label: 'Max Custom Domains',
    description: 'Maximum number of custom domains for this organization. Leave blank for the system default.',
    group: 'Limits',
    type: 'number',
    placeholder: '5',
  },
  {
    key: 'maxSubdomains',
    label: 'Max Subdomains',
    description: 'Maximum number of subdomains for this organization. Leave blank for the system default.',
    group: 'Limits',
    type: 'number',
    placeholder: '10',
  },
];
