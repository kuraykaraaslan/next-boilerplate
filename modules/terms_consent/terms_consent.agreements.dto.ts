import { z } from 'zod';
import { AgreementTypeEnum } from './terms_consent.enums';

// Stable slug for an agreement: lowercase letters, digits, dash.
export const AgreementKeySchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'Invalid agreement key');

export const CreateAgreementDTO = z.object({
  type: AgreementTypeEnum,
  key: AgreementKeySchema,
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  requiresAcceptance: z.boolean().default(true),
});

export const UpdateAgreementDTO = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  requiresAcceptance: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const ListAgreementsQuery = z.object({
  type: AgreementTypeEnum.optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

// Create a new DRAFT version. Order-specific types store a TEMPLATE here.
export const CreateVersionDTO = z.object({
  content: z.string().min(1).max(200_000),
  language: z.string().max(16).default('en'),
  effectiveFrom: z.coerce.date().optional(),
});

// Accept a reusable agreement's CURRENT version. Identify the agreement by id or
// type; identify the subject by userId or anonymousId.
export const AcceptAgreementDTO = z
  .object({
    agreementId: z.string().uuid().optional(),
    type: AgreementTypeEnum.optional(),
    accepted: z.boolean().default(true),
    userId: z.string().uuid().optional(),
    anonymousId: z.string().max(256).optional(),
  })
  .refine((d) => !!d.agreementId || !!d.type, {
    message: 'agreementId or type is required',
  })
  .refine((d) => !!d.userId || !!d.anonymousId, {
    message: 'userId or anonymousId is required',
  });

export const ListAcceptancesQuery = z.object({
  page: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  agreementType: AgreementTypeEnum.optional(),
  subjectUserId: z.string().uuid().optional(),
  orderRef: z.string().max(256).optional(),
});

// ── Checkout (order-specific) ──────────────────────────────────────────────────

const OrderItemDTO = z.object({
  name: z.string().min(1).max(300),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  total: z.number().min(0).optional(),
});

export const OrderContextDTO = z.object({
  orderRef: z.string().min(1).max(256),
  currency: z.string().min(1).max(8),
  total: z.number().min(0),
  items: z.array(OrderItemDTO).max(500).optional(),
  buyer: z
    .object({
      name: z.string().max(300).optional(),
      email: z.string().email().max(320).optional(),
      phone: z.string().max(40).optional(),
      address: z.string().max(2000).optional(),
    })
    .optional(),
  orderDate: z.string().max(64).optional(),
});

// Preview the rendered order agreements for display before payment.
export const RenderCheckoutDTO = z.object({
  order: OrderContextDTO,
  // Override which types to render; defaults to the tenant's configured set.
  types: z.array(AgreementTypeEnum).max(10).optional(),
});

// Record acceptance of the order agreements. The server RE-renders authoritative
// text and stores it verbatim — the client cannot smuggle altered content.
export const AcceptCheckoutDTO = z.object({
  order: OrderContextDTO,
  types: z.array(AgreementTypeEnum).max(10).optional(),
  userId: z.string().uuid().optional(),
  anonymousId: z.string().max(256).optional(),
});

export type CreateAgreementInput = z.infer<typeof CreateAgreementDTO>;
export type UpdateAgreementInput = z.infer<typeof UpdateAgreementDTO>;
export type ListAgreementsQueryInput = z.infer<typeof ListAgreementsQuery>;
export type CreateVersionInput = z.infer<typeof CreateVersionDTO>;
export type AcceptAgreementInput = z.infer<typeof AcceptAgreementDTO>;
export type ListAcceptancesQueryInput = z.infer<typeof ListAcceptancesQuery>;
export type OrderContextInput = z.infer<typeof OrderContextDTO>;
export type RenderCheckoutInput = z.infer<typeof RenderCheckoutDTO>;
export type AcceptCheckoutInput = z.infer<typeof AcceptCheckoutDTO>;
