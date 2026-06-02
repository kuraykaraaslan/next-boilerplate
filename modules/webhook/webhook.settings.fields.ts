import type { SettingFieldDef } from '@/modules_next/setting/setting-fields.types';

// UI metadata for the Webhooks settings page. Keys mirror
// modules/webhook/POSIBBLE_SETTING_KEYS.md (per-delivery knobs). The global
// worker-pool knob (webhookWorkerConcurrency) is intentionally excluded — it is
// a shared resource, not a per-tenant setting. Phase 2 wires webhook.service.ts
// to read these per tenant with the documented defaults as fallback.
export const WEBHOOK_SETTINGS_FIELDS: SettingFieldDef[] = [
  {
    key: 'webhookMaxAttempts',
    label: 'Max Delivery Attempts',
    description: 'How many times to retry a webhook before marking it failed.',
    group: 'Delivery & Retries',
    type: 'number',
    defaultValue: '3',
    placeholder: '3',
  },
  {
    key: 'webhookRetryDelaysMs',
    label: 'Retry Backoff (ms)',
    description: 'Comma-separated backoff delays in milliseconds between retries. Default: 60000,300000,900000',
    group: 'Delivery & Retries',
    type: 'text',
    defaultValue: '60000,300000,900000',
    placeholder: '60000,300000,900000',
  },
  {
    key: 'webhookRequestTimeoutMs',
    label: 'Request Timeout (ms)',
    description: 'Per-request timeout for a webhook delivery, in milliseconds.',
    group: 'Delivery & Retries',
    type: 'number',
    defaultValue: '15000',
    placeholder: '15000',
  },
];
