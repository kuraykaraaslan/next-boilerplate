import type { SettingFieldDef } from '@nb/setting/server/setting-fields.types';

// UI metadata for the Webhooks settings page. Keys cover the per-delivery
// knobs and the reliability controls. The global worker-pool knob
// (webhookWorkerConcurrency) is intentionally excluded — it is a shared
// resource, not a per-tenant setting. webhook.service.ts reads these per tenant
// (`_resolveDeliveryConfig`) with the documented defaults as fallback.
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
  {
    key: 'webhookCircuitBreakerThreshold',
    label: 'Circuit Breaker Threshold',
    description: 'Auto-disable an endpoint after this many consecutive failed deliveries. A success resets the counter.',
    group: 'Reliability',
    type: 'number',
    defaultValue: '10',
    placeholder: '10',
  },
  {
    key: 'webhookDefaultRateLimitPerMinute',
    label: 'Default Rate Limit (per minute)',
    description: 'Fallback per-endpoint delivery rate limit when a webhook has none set. Leave blank for unlimited.',
    group: 'Reliability',
    type: 'number',
    placeholder: '600',
  },
];
