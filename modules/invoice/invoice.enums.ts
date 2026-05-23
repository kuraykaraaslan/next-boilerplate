import { z } from 'zod';

export const InvoiceStatusEnum = z.enum(['draft', 'issued', 'paid', 'void', 'refunded']);
export type InvoiceStatus = z.infer<typeof InvoiceStatusEnum>;

export const InvoiceRegionEnum = z.enum(['TR', 'EU', 'US', 'OTHER']);
export type InvoiceRegion = z.infer<typeof InvoiceRegionEnum>;

export const TaxSchemeEnum = z.enum(['KDV', 'VAT', 'SALES_TAX', 'NONE']);
export type TaxScheme = z.infer<typeof TaxSchemeEnum>;

export const InvoiceLineSourceEnum = z.enum([
  'subscription', 'one_off', 'usage', 'credit', 'proration',
]);
export type InvoiceLineSource = z.infer<typeof InvoiceLineSourceEnum>;
