import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import { Invoice as InvoiceEntity } from './entities/invoice.entity';
import { InvoiceLine as InvoiceLineEntity } from './entities/invoice_line.entity';
import SettingService from '@/modules/setting/setting.service';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import { isRootTenant } from '@/modules/tenant/tenant.constants';
import TenantFeatureGateService from '@/modules/tenant_subscription/tenant_subscription.feature.service';
import { FEATURE_KEYS } from '@/modules/tenant_subscription/tenant_subscription.feature-keys';
import InvoiceMessages from './invoice.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import {
  SafeInvoiceSchema, CreateInvoiceInputSchema,
  type SafeInvoice, type CreateInvoiceInput,
} from './invoice.types';
import WebhookService from '@/modules/webhook/webhook.service';
import InvoiceTaxService from './invoice.tax.service';
import { allocateNumber } from './invoice.number.service';

export async function create(tenantId: string, input: CreateInvoiceInput): Promise<SafeInvoice> {
  if (!isRootTenant(tenantId)) {
    await TenantFeatureGateService.assertFeatureAccess(tenantId, FEATURE_KEYS.FEATURE_INVOICING);
  }
  const parsed = CreateInvoiceInputSchema.parse(input);

  const settings = await SettingService.getByKeys(tenantId, [
    'companyLegalName', 'companyTaxId', 'companyCountryCode',
    'billingRegion', 'invoiceDefaultCurrency', 'invoiceDefaultDueDays',
    'invoiceDefaultVatRate', 'invoiceNumberPrefix', 'invoiceNumberPadding',
    'invoiceNumberResetPolicy', 'invoiceFiscalYearStartMonth',
  ]);
  if (!settings.companyLegalName || !settings.companyTaxId || !settings.companyCountryCode) {
    throw new AppError(InvoiceMessages.COMPANY_INFO_MISSING, 422, ErrorCode.VALIDATION_ERROR);
  }

  const region = (settings.billingRegion as 'TR' | 'EU' | 'US' | 'OTHER' | undefined) ?? 'OTHER';
  const taxScheme = region === 'TR' ? 'KDV' : region === 'EU' ? 'VAT' : region === 'US' ? 'SALES_TAX' : 'NONE';
  const currency = (parsed.currency ?? settings.invoiceDefaultCurrency ?? 'USD').toUpperCase();
  const defaultVat = settings.invoiceDefaultVatRate ? parseFloat(settings.invoiceDefaultVatRate) : 0;
  const dueDays = settings.invoiceDefaultDueDays ? parseInt(settings.invoiceDefaultDueDays, 10) : 0;

  // ── Tax: tenant's own payment_tax engine is the source of truth ──────────
  // We only fall back to the manual `invoiceDefaultVatRate` / per-line rate
  // when the caller supplied explicit rates or the tenant has no matching
  // tax_rates configured (engine returns null). The engine resolves
  // destination-matched VAT/KDV/sales tax including compound & inclusive.
  const addr = (parsed.customerAddress ?? {}) as { region?: string; state?: string; postalCode?: string; postal_code?: string };
  const hasManualRates = parsed.lines.some((l) => l.taxRate != null);
  const engineResult = hasManualRates
    ? null
    : await InvoiceTaxService.computeForLines(tenantId, {
        currency,
        destination: {
          countryCode: parsed.customerCountryCode.toUpperCase(),
          region: addr.region ?? addr.state,
          postalCode: addr.postalCode ?? addr.postal_code,
        },
        lines: parsed.lines.map((l, i) => ({
          reference: String(i),
          amount: l.unitPrice,
          quantity: l.quantity,
          taxClassCode: (l.metadata as { taxClassCode?: string } | undefined)?.taxClassCode,
        })),
      });

  let subtotal = 0;
  let taxAmount = 0;
  const computedLines = parsed.lines.map((l, i) => {
    const lineSubtotal = l.unitPrice * l.quantity;
    const engineLine = engineResult?.lines[i];
    const rate = engineLine ? engineLine.effectiveRate : (l.taxRate ?? defaultVat);
    const lineTax = engineLine ? engineLine.taxAmount : Math.round(lineSubtotal * rate * 10000) / 10000;
    const lineTotal = engineLine ? engineLine.grossAmount : Math.round((lineSubtotal + lineTax) * 10000) / 10000;
    subtotal += engineLine ? engineLine.netAmount : lineSubtotal;
    taxAmount += lineTax;
    return {
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxRate: rate,
      taxAmount: lineTax,
      lineTotal,
      sourceType: l.sourceType,
      sourceId: l.sourceId,
      metadata: l.metadata,
    };
  });
  subtotal = Math.round(subtotal * 10000) / 10000;
  taxAmount = Math.round(taxAmount * 10000) / 10000;

  const issueDate = new Date();
  const dueDate = parsed.dueDate ?? (dueDays > 0 ? new Date(issueDate.getTime() + dueDays * 86_400_000) : undefined);

  const ds = await tenantDataSourceFor(tenantId);
  const invoice = await ds.transaction(async (manager) => {
    const invoiceRepo = manager.getRepository(InvoiceEntity);
    const lineRepo = manager.getRepository(InvoiceLineEntity);

    // Gap-free: allocate the sequence number inside the same transaction as
    // the insert, under a per-(tenant, period) advisory lock. A rollback
    // releases the number without leaving a gap.
    const invoiceNumber = await allocateNumber(manager, tenantId, {
      prefix: settings.invoiceNumberPrefix,
      padding: settings.invoiceNumberPadding,
      resetPolicy: settings.invoiceNumberResetPolicy,
      fiscalStartMonth: settings.invoiceFiscalYearStartMonth,
    });

    const inv = await invoiceRepo.save(invoiceRepo.create({
      tenantId,
      invoiceNumber,
      paymentId: parsed.paymentId,
      subscriptionId: parsed.subscriptionId,
      customerEmail: parsed.customerEmail,
      customerName: parsed.customerName,
      customerTaxId: parsed.customerTaxId,
      customerAddress: parsed.customerAddress,
      customerCountryCode: parsed.customerCountryCode.toUpperCase(),
      issueDate,
      dueDate,
      subtotal,
      discountAmount: 0,
      taxAmount,
      totalAmount: Math.round((subtotal + taxAmount) * 10000) / 10000,
      currency,
      status: 'draft',
      region,
      taxScheme,
      notes: parsed.notes,
      // Persist the per-rate tax breakdown so adapters can itemise each tax
      // (UBL TaxSubtotal / CII ApplicableTradeTax / FatturaPA DatiRiepilogo).
      metadata: engineResult
        ? { ...(parsed.metadata as Record<string, unknown> | undefined), taxBreakdown: engineResult.taxBreakdown }
        : parsed.metadata,
    }));

    for (const cl of computedLines) {
      await lineRepo.save(lineRepo.create({ ...cl, tenantId, invoiceId: inv.invoiceId }));
    }

    return inv;
  });

  AuditLogService.log({
    tenantId, actorType: 'SYSTEM', action: 'invoice.created',
    resourceType: 'invoice', resourceId: invoice.invoiceId,
    metadata: { invoiceNumber: invoice.invoiceNumber, total: invoice.totalAmount, currency },
  }).catch(() => {});

  await WebhookService.dispatchEvent(tenantId, 'invoice.created', {
    invoiceId: invoice.invoiceId,
    invoiceNumber: invoice.invoiceNumber,
    totalAmount: invoice.totalAmount,
    currency,
    status: invoice.status,
  });

  return SafeInvoiceSchema.parse(invoice);
}
