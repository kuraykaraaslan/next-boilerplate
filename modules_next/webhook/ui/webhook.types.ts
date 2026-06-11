import type { WebhookEvent } from '@/modules/webhook/webhook.enums';

export type Webhook = {
  webhookId: string;
  name: string;
  description: string | null;
  url: string;
  events: WebhookEvent[];
  headers: Record<string, string> | null;
  eventFilters: Record<string, Record<string, unknown>> | null;
  tags: string[] | null;
  rateLimitPerMinute: number | null;
  isActive: boolean;
  consecutiveFailures: number;
  autoDisabledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Delivery = {
  deliveryId: string;
  event: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'DEAD_LETTERED';
  attempts: number;
  maxAttempts: number;
  responseStatus: number | null;
  errorMessage: string | null;
  duration: number | null;
  createdAt: string;
};

export const statusVariant = (s: Delivery['status']): 'success' | 'error' | 'warning' =>
  s === 'SUCCESS' ? 'success' : s === 'FAILED' || s === 'DEAD_LETTERED' ? 'error' : 'warning';

export const STATUS_LABEL: Record<Delivery['status'], string> = {
  PENDING: 'Pending',
  SUCCESS: 'Success',
  FAILED: 'Failed',
  DEAD_LETTERED: 'Dead-lettered',
};

export function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}
