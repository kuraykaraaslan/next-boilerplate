import { z } from 'zod';
import { AgreementTypeEnum, AgreementVersionStatusEnum } from './terms_consent.enums';

export const AgreementSchema = z.object({
  agreementId: z.string().uuid(),
  tenantId: z.string().uuid(),
  type: AgreementTypeEnum,
  key: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  requiresAcceptance: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Agreement = z.infer<typeof AgreementSchema>;

export const AgreementVersionSchema = z.object({
  versionId: z.string().uuid(),
  agreementId: z.string().uuid(),
  tenantId: z.string().uuid(),
  version: z.number().int(),
  content: z.string(),
  contentHash: z.string(),
  language: z.string(),
  status: AgreementVersionStatusEnum,
  effectiveFrom: z.coerce.date().nullable(),
  publishedAt: z.coerce.date().nullable(),
  isCurrent: z.boolean(),
  createdAt: z.coerce.date(),
});
export type AgreementVersion = z.infer<typeof AgreementVersionSchema>;

export const AgreementAcceptanceSchema = z.object({
  acceptanceId: z.string().uuid(),
  tenantId: z.string().uuid(),
  agreementId: z.string().uuid().nullable(),
  agreementType: AgreementTypeEnum,
  versionId: z.string().uuid().nullable(),
  subjectUserId: z.string().uuid().nullable(),
  subjectAnonymousId: z.string().nullable(),
  accepted: z.boolean(),
  contentHash: z.string(),
  contentSnapshot: z.string().nullable(),
  versionLabel: z.string().nullable(),
  orderRef: z.string().nullable(),
  context: z.record(z.string(), z.unknown()).nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.coerce.date(),
});
export type AgreementAcceptance = z.infer<typeof AgreementAcceptanceSchema>;

// A document ready to present to the user — either a reusable version's content
// or an order-specific rendered document. `versionId` is null for the latter.
export interface RenderedAgreement {
  type: z.infer<typeof AgreementTypeEnum>;
  agreementId: string | null;
  versionId: string | null;
  versionLabel: string | null;
  title: string;
  content: string;
  contentHash: string;
  language: string;
}

// Minimal order shape used to render order-specific agreements. Kept generic so
// the checkout flow can pass whatever it has without coupling to a payment type.
export interface OrderContext {
  orderRef: string;
  currency: string;
  total: number;
  items?: { name: string; quantity: number; unitPrice: number; total?: number }[];
  buyer?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  // ISO date string for the order; the service falls back to "now" when absent.
  orderDate?: string;
}
