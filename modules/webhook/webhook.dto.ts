import { z } from 'zod';
import { WebhookEventEnum } from './webhook.enums';

export const CreateWebhookDTO = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  url: z.string().url().refine((u) => u.startsWith('https://') || u.startsWith('http://'), {
    message: 'URL must start with https:// or http://',
  }),
  events: z.array(WebhookEventEnum).min(1),
});

export const UpdateWebhookDTO = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  url: z.string().url().optional(),
  events: z.array(WebhookEventEnum).min(1).optional(),
  isActive: z.boolean().optional(),
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
export type ListWebhooksInput = z.infer<typeof ListWebhooksDTO>;
export type ListDeliveriesInput = z.infer<typeof ListDeliveriesDTO>;
