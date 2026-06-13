import { z } from 'zod';
import {
  CountryCodeEnum,
  CurrencyCodeEnum,
  CountryCodeInput as CustomerCountryCodeInput,
  CurrencyCodeInput,
} from '@/modules/common';
import { InvoiceStatusEnum, InvoiceRegionEnum, TaxSchemeEnum, InvoiceLineSourceEnum } from './invoice.enums';

export const InvoiceLineInputSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.number().nonnegative(),
  taxRate: z.number().min(0).max(1).default(0),
  sourceType: InvoiceLineSourceEnum.optional(),
  sourceId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type InvoiceLineInput = z.infer<typeof InvoiceLineInputSchema>;

export const CreateInvoiceInputSchema = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
  customerTaxId: z.string().optional(),
  customerAddress: z.record(z.string(), z.unknown()).optional(),
  customerCountryCode: CustomerCountryCodeInput,

  currency: CurrencyCodeInput.optional(),
  dueDate: z.date().optional(),

  lines: z.array(InvoiceLineInputSchema).min(1),

  paymentId: z.string().uuid().optional(),
  subscriptionId: z.string().uuid().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceInputSchema>;

export const SafeInvoiceLineSchema = z.object({
  invoiceLineId: z.string().uuid(),
  tenantId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  taxRate: z.number(),
  taxAmount: z.number(),
  lineTotal: z.number(),
  sourceType: z.string().nullable().optional(),
  sourceId: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  createdAt: z.date(),
});
export type SafeInvoiceLine = z.infer<typeof SafeInvoiceLineSchema>;

export const SafeInvoiceSchema = z.object({
  invoiceId: z.string().uuid(),
  tenantId: z.string().uuid(),
  invoiceNumber: z.string(),
  paymentId: z.string().uuid().nullable().optional(),
  subscriptionId: z.string().uuid().nullable().optional(),
  customerEmail: z.string(),
  customerName: z.string(),
  customerTaxId: z.string().nullable().optional(),
  customerAddress: z.record(z.string(), z.unknown()).nullable().optional(),
  customerCountryCode: CountryCodeEnum,
  issueDate: z.date(),
  dueDate: z.date().nullable().optional(),
  paidAt: z.date().nullable().optional(),
  subtotal: z.number(),
  discountAmount: z.number(),
  taxAmount: z.number(),
  totalAmount: z.number(),
  currency: CurrencyCodeEnum,
  status: InvoiceStatusEnum,
  region: InvoiceRegionEnum,
  taxScheme: TaxSchemeEnum,
  earsivUuid: z.string().nullable().optional(),
  earsivStatus: z.string().nullable().optional(),
  earsivIntegrator: z.string().nullable().optional(),
  peppolDocumentId: z.string().nullable().optional(),
  peppolStatus: z.string().nullable().optional(),
  stripeTaxCalculationId: z.string().nullable().optional(),
  providerPdfUrl: z.string().nullable().optional(),
  pdfStorageKey: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type SafeInvoice = z.infer<typeof SafeInvoiceSchema>;
