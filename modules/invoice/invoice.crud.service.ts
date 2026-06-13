import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import { Invoice as InvoiceEntity } from './entities/invoice.entity';
import { InvoiceLine as InvoiceLineEntity } from './entities/invoice_line.entity';
import SettingService from '@/modules/setting/setting.service';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import { isRootTenant } from '@/modules/tenant/tenant.constants';
import TenantFeatureGateService from '@/modules/tenant_subscription/tenant_subscription.feature.service';
import { FEATURE_KEYS } from '@/modules/tenant_subscription/tenant_subscription.feature-keys';
import Logger from '@/modules/logger';
import InvoiceMessages from './invoice.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import {
  SafeInvoiceSchema, SafeInvoiceLineSchema,
  CreateInvoiceInputSchema,
  type SafeInvoice, type SafeInvoiceLine,
  type CreateInvoiceInput,
} from './invoice.types';
import WebhookService from '@/modules/webhook/webhook.service';
import InvoiceTransitionService from './invoice.transition.service';
import InvoiceTaxService from './invoice.tax.service';
import type { EntityManager } from 'typeorm';

export { InvoiceTransitionService };

interface ListInvoicesQuery {
  page?: number;
  pageSize?: number;
  status?: string;
}

export default class InvoiceCrudService {

  static async create(tenantId: string, input: CreateInvoiceInput): Promise<SafeInvoice> {
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
      const invoiceNumber = await InvoiceCrudService.allocateNumber(manager, tenantId, {
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

  /**
   * Editable fields on a *draft* invoice. Once issued, an invoice is legally
   * immutable (TR GİB, EU VAT Directive, US GAAP) — corrections must go through
   * a credit note. Only `draft` invoices may be patched here.
   */
  static async updateDraft(
    tenantId: string,
    invoiceId: string,
    patch: Partial<Pick<InvoiceEntity, 'customerEmail' | 'customerName' | 'customerTaxId' | 'customerAddress' | 'dueDate' | 'notes' | 'metadata'>>,
  ): Promise<SafeInvoice> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(InvoiceEntity);
    const invoice = await repo.findOne({ where: { tenantId, invoiceId } });
    if (!invoice) throw new AppError(InvoiceMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (invoice.status !== 'draft') throw new AppError(InvoiceMessages.LOCKED, 409, ErrorCode.CONFLICT);

    Object.assign(invoice, patch);
    await repo.save(invoice);

    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'invoice.updated',
      resourceType: 'invoice', resourceId: invoiceId,
      metadata: { invoiceNumber: invoice.invoiceNumber, fields: Object.keys(patch) },
    }).catch(() => {});

    return SafeInvoiceSchema.parse(invoice);
  }

  static async getById(tenantId: string, invoiceId: string): Promise<SafeInvoice> {
    const ds = await tenantDataSourceFor(tenantId);
    const row = await ds.getRepository(InvoiceEntity).findOne({ where: { tenantId, invoiceId } });
    if (!row) throw new AppError(InvoiceMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    return SafeInvoiceSchema.parse(row);
  }

  static async getLines(tenantId: string, invoiceId: string): Promise<SafeInvoiceLine[]> {
    const ds = await tenantDataSourceFor(tenantId);
    const rows = await ds.getRepository(InvoiceLineEntity).find({
      where: { tenantId, invoiceId },
      order: { createdAt: 'ASC' },
    });
    return rows.map((r) => SafeInvoiceLineSchema.parse(r));
  }

  static async list(tenantId: string, query: ListInvoicesQuery = {}): Promise<{ invoices: SafeInvoice[]; total: number }> {
    const page = query.page ?? 0;
    const pageSize = query.pageSize ?? 20;
    const ds = await tenantDataSourceFor(tenantId);
    const where: Record<string, unknown> = { tenantId };
    if (query.status) where.status = query.status;
    const [rows, total] = await ds.getRepository(InvoiceEntity).findAndCount({
      where, skip: page * pageSize, take: pageSize, order: { issueDate: 'DESC' },
    });
    return { invoices: rows.map((r) => SafeInvoiceSchema.parse(r)), total };
  }

  /**
   * Compute the period segment of an invoice number from the tenant's reset
   * policy. `yearly` → `2025`, `monthly` → `2025-06`, `fiscal` → fiscal year
   * label honouring `invoiceFiscalYearStartMonth` (1-12), `never` → `''`.
   */
  static periodSegment(resetPolicy?: string, fiscalStartMonthStr?: string, at: Date = new Date()): string {
    const policy = (resetPolicy ?? 'yearly').toLowerCase();
    const y = at.getUTCFullYear();
    const m = at.getUTCMonth() + 1; // 1-12
    if (policy === 'never') return '';
    if (policy === 'monthly') return `${y}-${String(m).padStart(2, '0')}`;
    if (policy === 'fiscal') {
      const start = Math.min(12, Math.max(1, fiscalStartMonthStr ? parseInt(fiscalStartMonthStr, 10) || 1 : 1));
      // Fiscal year is labelled by the calendar year in which it begins.
      const fiscalYear = m >= start ? y : y - 1;
      return String(fiscalYear);
    }
    return String(y); // yearly (default)
  }

  /**
   * Allocate the next gap-free invoice number for `(tenant, prefix, period)`.
   * MUST run inside a transaction: a `pg_advisory_xact_lock` serialises
   * concurrent allocations and a rollback releases the number without a gap.
   */
  static async allocateNumber(
    manager: EntityManager,
    tenantId: string,
    opts: { prefix?: string; padding?: string; resetPolicy?: string; fiscalStartMonth?: string; at?: Date } = {},
  ): Promise<string> {
    const padding = opts.padding ? parseInt(opts.padding, 10) : 5;
    const usedPrefix = opts.prefix ?? 'INV';
    const period = InvoiceCrudService.periodSegment(opts.resetPolicy, opts.fiscalStartMonth, opts.at ?? new Date());
    const search = period ? `${usedPrefix}-${period}-` : `${usedPrefix}-`;

    // Serialise per (tenant, prefix, period) so two concurrent creates can't
    // read the same MAX and collide on the unique (tenantId, invoiceNumber).
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1)::bigint)', [`inv:${tenantId}:${search}`]);

    const row = await manager.getRepository(InvoiceEntity).createQueryBuilder('i')
      .select('i.invoiceNumber', 'invoiceNumber')
      .where('i.tenantId = :tid', { tid: tenantId })
      .andWhere('i.invoiceNumber LIKE :prefix', { prefix: `${search}%` })
      .orderBy('LENGTH(i.invoiceNumber)', 'DESC')
      .addOrderBy('i.invoiceNumber', 'DESC')
      .limit(1)
      .getRawOne<{ invoiceNumber: string }>();
    const lastSeq = row?.invoiceNumber ? parseInt(row.invoiceNumber.split('-').pop() ?? '0', 10) : 0;
    const next = (lastSeq + 1).toString().padStart(padding, '0');
    return `${search}${next}`;
  }

  /** Backward-compatible standalone allocator (own transaction). */
  static async getNextInvoiceNumber(tenantId: string, prefix?: string, paddingStr?: string): Promise<string> {
    const ds = await tenantDataSourceFor(tenantId);
    return ds.transaction((manager) =>
      InvoiceCrudService.allocateNumber(manager, tenantId, { prefix, padding: paddingStr }),
    );
  }

  // State transition delegates
  static issue     = InvoiceTransitionService.issue.bind(InvoiceTransitionService);
  static markPaid  = InvoiceTransitionService.markPaid.bind(InvoiceTransitionService);
  static markVoid  = InvoiceTransitionService.markVoid.bind(InvoiceTransitionService);
}
