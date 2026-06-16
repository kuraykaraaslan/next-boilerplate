import { z } from 'zod';
import { WebhookEventEnum } from './webhook.enums';

// ─── Custom headers ────────────────────────────────────────────────────────────

/**
 * Transport/signature headers a custom header must never override. Enforced both
 * here (input validation) and in `WebhookService._executeDelivery` (defense in
 * depth — see {@link isReservedHeaderName}).
 */
export const RESERVED_HEADER_NAMES = new Set(['content-type', 'content-length', 'host', 'user-agent']);

export function isReservedHeaderName(name: string): boolean {
  const lower = name.toLowerCase();
  return RESERVED_HEADER_NAMES.has(lower) || lower.startsWith('x-webhook-');
}

// RFC 7230 token characters — also blocks CR/LF, so header-name injection is impossible.
const HEADER_NAME_RE = /^[A-Za-z0-9!#$%&'*+\-.^_`|~]+$/;

const CustomHeadersSchema = z
  .record(z.string(), z.string())
  .refine((h) => Object.keys(h).length <= 20, { message: 'At most 20 custom headers are allowed.' })
  .refine((h) => Object.keys(h).every((k) => HEADER_NAME_RE.test(k)), {
    message: 'Header names may only contain RFC 7230 token characters.',
  })
  .refine((h) => Object.keys(h).every((k) => !isReservedHeaderName(k)), {
    message: 'Reserved headers (Content-Type, User-Agent, X-Webhook-*, …) cannot be overridden.',
  })
  .refine((h) => Object.values(h).every((v) => v.length <= 1000 && !/[\r\n]/.test(v)), {
    message: 'Header values must be single-line and at most 1000 characters.',
  });

// Per-event payload filters: { '<event>': { '<dot.path>': expectedValue } }.
const EventFiltersSchema = z
  .record(z.string(), z.record(z.string(), z.unknown()))
  .refine((f) => Object.keys(f).length <= 50, { message: 'Too many event filters.' });

const TagsSchema = z.array(z.string().min(1).max(40)).max(20);

// IPs or IPv4 CIDRs the destination host is allowed to resolve to (SSRF override).
const IpAllowlistSchema = z
  .array(z.string().regex(/^[0-9a-fA-F:.]+(\/\d{1,3})?$/, 'Each allowlist entry must be an IP or CIDR.'))
  .max(50);

export const CreateWebhookDTO = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  url: z.string().url().refine((u) => u.startsWith('https://') || u.startsWith('http://'), {
    message: 'URL must start with https:// or http://',
  }),
  events: z.array(WebhookEventEnum).min(1),
  headers: CustomHeadersSchema.optional(),
  eventFilters: EventFiltersSchema.optional(),
  tags: TagsSchema.optional(),
  rateLimitPerMinute: z.number().int().min(1).max(100_000).nullable().optional(),
  ipAllowlist: IpAllowlistSchema.optional(),
});

export const UpdateWebhookDTO = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  url: z.string().url().optional(),
  events: z.array(WebhookEventEnum).min(1).optional(),
  isActive: z.boolean().optional(),
  // Nullable so an admin can clear a previously-set value.
  headers: CustomHeadersSchema.nullable().optional(),
  eventFilters: EventFiltersSchema.nullable().optional(),
  tags: TagsSchema.nullable().optional(),
  rateLimitPerMinute: z.number().int().min(1).max(100_000).nullable().optional(),
  ipAllowlist: IpAllowlistSchema.nullable().optional(),
});

export const TriggerWebhookDTO = z.object({
  event: WebhookEventEnum,
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const ListWebhooksDTO = z.object({
  tenantId: z.string().uuid(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const ListDeliveriesDTO = z.object({
  tenantId: z.string().uuid(),
  webhookId: z.string().uuid(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type CreateWebhookInput = z.infer<typeof CreateWebhookDTO>;
export type UpdateWebhookInput = z.infer<typeof UpdateWebhookDTO>;
export type TriggerWebhookInput = z.infer<typeof TriggerWebhookDTO>;
export type ListWebhooksInput = z.infer<typeof ListWebhooksDTO>;
export type ListDeliveriesInput = z.infer<typeof ListDeliveriesDTO>;
