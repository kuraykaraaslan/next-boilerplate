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
    ]);
    if (!settings.companyLegalName || !settings.companyTaxId || !settings.companyCountryCode) {
      throw new AppError(InvoiceMessages.COMPANY_INFO_MISSING, 422, ErrorCode.VALIDATION_ERROR);
    }

    const region = (settings.billingRegion as 'TR' | 'EU' | 'US' | 'OTHER' | undefined) ?? 'OTHER';
    const taxScheme = region === 'TR' ? 'KDV' : region === 'EU' ? 'VAT' : region === 'US' ? 'SALES_TAX' : 'NONE';
    const currency = (parsed.currency ?? settings.invoiceDefaultCurrency ?? 'USD').toUpperCase();
    const defaultVat = settings.invoiceDefaultVatRate ? parseFloat(settings.invoiceDefaultVatRate) : 0;
    const dueDays = settings.invoiceDefaultDueDays ? parseInt(settings.invoiceDefaultDueDays, 10) : 0;

    let subtotal = 0;
    let taxAmount = 0;
    const computedLines = parsed.lines.map((l) => {
      const lineSubtotal = l.unitPrice * l.quantity;
      const rate = l.taxRate ?? defaultVat;
      const lineTax = Math.round(lineSubtotal * rate * 10000) / 10000;
      subtotal += lineSubtotal;
      taxAmount += lineTax;
      return {
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxRate: rate,
        taxAmount: lineTax,
        lineTotal: Math.round((lineSubtotal + lineTax) * 10000) / 10000,
        sourceType: l.sourceType,
        sourceId: l.sourceId,
        metadata: l.metadata,
      };
    });

    const issueDate = new Date();
    const dueDate = parsed.dueDate ?? (dueDays > 0 ? new Date(issueDate.getTime() + dueDays * 86_400_000) : undefined);
    const invoiceNumber = await InvoiceCrudService.getNextInvoiceNumber(tenantId, settings.invoiceNumberPrefix, settings.invoiceNumberPadding);

    const ds = await tenantDataSourceFor(tenantId);
    const invoice = await ds.transaction(async (manager) => {
      const invoiceRepo = manager.getRepository(InvoiceEntity);
      const lineRepo = manager.getRepository(InvoiceLineEntity);

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
        metadata: parsed.metadata,
      }));

      for (const cl of computedLines) {
        await lineRepo.save(lineRepo.create({ ...cl, tenantId, invoiceId: inv.invoiceId }));
      }

      return inv;
    });

    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'invoice.created',
      resourceType: 'invoice', resourceId: invoice.invoiceId,
      metadata: { invoiceNumber, total: invoice.totalAmount, currency },
    }).catch(() => {});

    await WebhookService.dispatchEvent(tenantId, 'invoice.created', {
      invoiceId: invoice.invoiceId,
      invoiceNumber,
      totalAmount: invoice.totalAmount,
      currency,
      status: invoice.status,
    });

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

  static async getNextInvoiceNumber(tenantId: string, prefix?: string, paddingStr?: string): Promise<string> {
    const padding = paddingStr ? parseInt(paddingStr, 10) : 5;
    const usedPrefix = prefix ?? 'INV';
    const year = new Date().getUTCFullYear();
    const ds = await tenantDataSourceFor(tenantId);
    const search = `${usedPrefix}-${year}-`;
    const rows = await ds.getRepository(InvoiceEntity).createQueryBuilder('i')
      .select('i.invoiceNumber', 'invoiceNumber')
      .where('i.tenantId = :tid', { tid: tenantId })
      .andWhere('i.invoiceNumber LIKE :prefix', { prefix: `${search}%` })
      .orderBy('i.invoiceNumber', 'DESC').limit(1)
      .getRawOne<{ invoiceNumber: string }>();
    const lastSeq = rows?.invoiceNumber ? parseInt(rows.invoiceNumber.split('-').pop() ?? '0', 10) : 0;
    const next = (lastSeq + 1).toString().padStart(padding, '0');
    return `${usedPrefix}-${year}-${next}`;
  }

  // State transition delegates
  static issue     = InvoiceTransitionService.issue.bind(InvoiceTransitionService);
  static markPaid  = InvoiceTransitionService.markPaid.bind(InvoiceTransitionService);
  static markVoid  = InvoiceTransitionService.markVoid.bind(InvoiceTransitionService);
}
