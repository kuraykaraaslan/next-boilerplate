import 'reflect-metadata';
import { In } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import { Invoice as InvoiceEntity } from './entities/invoice.entity';
import { InvoiceLine as InvoiceLineEntity } from './entities/invoice_line.entity';
import { GibDirectClient } from './adapters/tr_gib_direct.client';
import SettingService from '@/modules/setting/setting.service';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import { ROOT_TENANT_ID, isRootTenant } from '@/modules/tenant/tenant.constants';
import TenantFeatureGateService from '@/modules/tenant_subscription/tenant_subscription.feature.service';
import { FEATURE_KEYS } from '@/modules/tenant_subscription/tenant_subscription.feature-keys';
import Logger from '@/modules/logger';
import InvoiceMessages from './invoice.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import redis from '@/modules/redis';
import {
  SafeInvoiceSchema, SafeInvoiceLineSchema,
  CreateInvoiceInputSchema,
  type SafeInvoice, type SafeInvoiceLine,
  type CreateInvoiceInput,
} from './invoice.types';
import { getInvoiceAdapter } from './adapters/registry';
import MailTemplatesService from '@/modules/notification_mail/notification_mail.templates.service';
import WebhookService from '@/modules/webhook/webhook.service';

interface ListInvoicesQuery {
  page?: number;
  pageSize?: number;
  status?: string;
}

export default class InvoiceService {
  // ───────────────────────────────────────────────────────────────────────────
  // CRUD
  // ───────────────────────────────────────────────────────────────────────────

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

    // Roll up totals
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
    const invoiceNumber = await this.getNextInvoiceNumber(tenantId, settings.invoiceNumberPrefix, settings.invoiceNumberPadding);

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

  // ───────────────────────────────────────────────────────────────────────────
  // State transitions
  // ───────────────────────────────────────────────────────────────────────────

  static async issue(tenantId: string, invoiceId: string): Promise<SafeInvoice> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(InvoiceEntity);
    const invoice = await repo.findOne({ where: { tenantId, invoiceId } });
    if (!invoice) throw new AppError(InvoiceMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (invoice.status !== 'draft') throw new AppError(InvoiceMessages.ALREADY_ISSUED, 409, ErrorCode.CONFLICT);

    // Submit to regional adapter (if configured)
    const adapter = getInvoiceAdapter(invoice.region);
    if (adapter && await adapter.isConfigured(tenantId)) {
      try {
        const lines = await ds.getRepository(InvoiceLineEntity).find({ where: { tenantId, invoiceId } });
        const result = await adapter.submit(tenantId, invoice, lines);
        if (invoice.region === 'TR') {
          invoice.earsivUuid = result.externalId;
          invoice.earsivStatus = result.status;
          invoice.earsivIntegrator = (await SettingService.getValue(tenantId, 'earsivIntegrator')) ?? 'mock';
        } else if (invoice.region === 'EU') {
          invoice.peppolDocumentId = result.externalId;
          invoice.peppolStatus = result.status;
        } else if (invoice.region === 'US' && result.externalId) {
          invoice.stripeTaxCalculationId = result.externalId;
        }
      } catch (err) {
        Logger.warn(`[Invoice.issue] regional submit failed for ${invoice.invoiceNumber}: ${err instanceof Error ? err.message : err}`);
        // Best-effort — invoice still issues locally; admin can retry submit.
      }
    }

    invoice.status = 'issued';
    await repo.save(invoice);

    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'invoice.issued',
      resourceType: 'invoice', resourceId: invoiceId,
      metadata: { invoiceNumber: invoice.invoiceNumber, region: invoice.region },
    }).catch(() => {});

    await WebhookService.dispatchEvent(tenantId, 'invoice.issued', {
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      region: invoice.region,
      totalAmount: invoice.totalAmount,
      currency: invoice.currency,
    });

    // Issued email — fire-and-forget.
    MailTemplatesService.sendInvoiceIssuedEmail({
      tenantId,
      email: invoice.customerEmail,
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        totalAmount: invoice.totalAmount,
        currency: invoice.currency,
        earsivUuid: invoice.earsivUuid,
        peppolDocumentId: invoice.peppolDocumentId,
        customerName: invoice.customerName,
      },
    }).catch((err) => Logger.warn(`[Invoice.issue] issued email failed: ${err instanceof Error ? err.message : err}`));

    return SafeInvoiceSchema.parse(invoice);
  }

  static async markPaid(tenantId: string, invoiceId: string, paymentId?: string): Promise<SafeInvoice> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(InvoiceEntity);
    const invoice = await repo.findOne({ where: { tenantId, invoiceId } });
    if (!invoice) throw new AppError(InvoiceMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (invoice.status === 'paid') return SafeInvoiceSchema.parse(invoice);
    invoice.status = 'paid';
    invoice.paidAt = new Date();
    if (paymentId) invoice.paymentId = paymentId;
    await repo.save(invoice);

    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'invoice.paid',
      resourceType: 'invoice', resourceId: invoiceId,
      metadata: { invoiceNumber: invoice.invoiceNumber, paymentId },
    }).catch(() => {});

    await WebhookService.dispatchEvent(tenantId, 'invoice.paid', {
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      currency: invoice.currency,
      paymentId: paymentId ?? null,
    });

    // Receipt email — fire-and-forget. Failure does not roll back the paid state.
    MailTemplatesService.sendInvoicePaidEmail({
      tenantId,
      email: invoice.customerEmail,
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        currency: invoice.currency,
        paidAt: invoice.paidAt,
        customerName: invoice.customerName,
      },
    }).catch((err) => Logger.warn(`[Invoice.markPaid] receipt email failed: ${err instanceof Error ? err.message : err}`));

    return SafeInvoiceSchema.parse(invoice);
  }

  static async markVoid(tenantId: string, invoiceId: string, reason?: string): Promise<SafeInvoice> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(InvoiceEntity);
    const invoice = await repo.findOne({ where: { tenantId, invoiceId } });
    if (!invoice) throw new AppError(InvoiceMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (invoice.status === 'paid') throw new AppError(InvoiceMessages.CANNOT_VOID_PAID, 409, ErrorCode.CONFLICT);
    invoice.status = 'void';
    await repo.save(invoice);

    // Cancel at adapter level too
    const adapter = getInvoiceAdapter(invoice.region);
    if (adapter && (invoice.earsivUuid || invoice.peppolDocumentId)) {
      await adapter.cancel(tenantId, invoice, reason).catch(() => {});
    }

    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'invoice.voided',
      resourceType: 'invoice', resourceId: invoiceId,
      metadata: { invoiceNumber: invoice.invoiceNumber, reason },
    }).catch(() => {});

    return SafeInvoiceSchema.parse(invoice);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TR e-Arşiv — SMS finalisation (gib_direct only)
  //
  // The free GİB portal creates drafts UNSIGNED. Making them legal needs an
  // SMS-OTP: requestEarsivSms() sends the code to the account's phone, then the
  // admin enters it in confirmEarsivSms() which signs the matching drafts.
  // ───────────────────────────────────────────────────────────────────────────

  private static async buildGibClient(tenantId: string): Promise<GibDirectClient> {
    const integrator = await SettingService.getValue(tenantId, 'earsivIntegrator');
    if (integrator !== 'gib_direct') throw new AppError(InvoiceMessages.EARSIV_NOT_GIB_DIRECT, 422, ErrorCode.VALIDATION_ERROR);
    const [username, password, baseUrl, sandboxFlag] = await Promise.all([
      SettingService.getValue(tenantId, 'earsivIntegratorUsername'),
      SettingService.getValue(tenantId, 'earsivIntegratorPassword'),
      SettingService.getValue(tenantId, 'earsivIntegratorBaseUrl'),
      SettingService.getValue(tenantId, 'earsivIntegratorSandbox'),
    ]);
    if (!username || !password) throw new AppError(InvoiceMessages.EARSIV_NOT_CONFIGURED, 422, ErrorCode.VALIDATION_ERROR);
    return new GibDirectClient({
      username, password,
      baseUrl: baseUrl || undefined,
      sandbox: sandboxFlag === 'false' ? false : true,
    });
  }

  private static readonly EARSIV_SMS_SEND_LIMIT = 5;    // per 10-minute window
  private static readonly EARSIV_SMS_SEND_WINDOW = 600; // seconds
  private static readonly EARSIV_SMS_VERIFY_LIMIT = 5;  // per oid

  /** Step 1 — ask the GİB portal to SMS an OTP to the account's phone. */
  static async requestEarsivSms(tenantId: string): Promise<{ oid: string }> {
    // Rate-limit SMS send attempts per tenant (max 5 per 10 minutes)
    const sendRateKey = `earsiv:sms:send:${tenantId}`;
    try {
      const count = await redis.incr(sendRateKey);
      if (count === 1) await redis.expire(sendRateKey, InvoiceService.EARSIV_SMS_SEND_WINDOW);
      if (count > InvoiceService.EARSIV_SMS_SEND_LIMIT) {
        throw new AppError(InvoiceMessages.EARSIV_SMS_SEND_FAILED, 429, ErrorCode.RATE_LIMIT_EXCEEDED);
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      Logger.warn(`[Invoice.requestEarsivSms] rate-limit Redis error (fail-open): ${err instanceof Error ? err.message : err}`);
    }

    const client = await this.buildGibClient(tenantId);
    try {
      await client.login();
      const oid = await client.sendSmsCode();
      return { oid };
    } catch (err) {
      Logger.warn(`[Invoice.requestEarsivSms] ${err instanceof Error ? err.message : err}`);
      throw new AppError(InvoiceMessages.EARSIV_SMS_SEND_FAILED, 502, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Step 2 — verify the OTP and sign the unsigned drafts. When `invoiceIds` is
   * omitted, every 'submitted' (created-but-unsigned) TR invoice is signed.
   * Returns how many invoices were finalised.
   */
  static async confirmEarsivSms(tenantId: string, oid: string, code: string, invoiceIds?: string[]): Promise<{ signed: number }> {
    // Rate-limit verify attempts per oid (max 5 attempts)
    const verifyAttemptKey = `earsiv:sms:verify:${tenantId}:${oid}`;
    try {
      const attempts = await redis.incr(verifyAttemptKey);
      if (attempts === 1) await redis.expire(verifyAttemptKey, InvoiceService.EARSIV_SMS_SEND_WINDOW);
      if (attempts > InvoiceService.EARSIV_SMS_VERIFY_LIMIT) {
        throw new AppError(InvoiceMessages.EARSIV_SMS_VERIFY_FAILED, 429, ErrorCode.RATE_LIMIT_EXCEEDED);
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      Logger.warn(`[Invoice.confirmEarsivSms] rate-limit Redis error (fail-open): ${err instanceof Error ? err.message : err}`);
    }

    const client = await this.buildGibClient(tenantId);
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(InvoiceEntity);

    const rows = invoiceIds?.length
      ? await repo.find({ where: { tenantId, invoiceId: In(invoiceIds) } })
      : await repo.find({ where: { tenantId, region: 'TR', earsivStatus: 'submitted' } });
    const invoices = rows.filter((i) => i.earsivUuid && i.earsivStatus !== 'accepted');
    if (invoices.length === 0) return { signed: 0 };

    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) => `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
    const earliest = new Date(Math.min(...invoices.map((i) => i.issueDate.getTime())));

    try {
      await client.login();
      const drafts = await client.listDrafts(fmt(earliest), fmt(new Date()));
      const uuids = new Set(invoices.map((i) => i.earsivUuid));
      const toSign = drafts.filter((r) => uuids.has(String(r.ettn ?? r.belgeId ?? r.faturaUuid ?? '')));
      if (toSign.length === 0) throw new AppError(InvoiceMessages.EARSIV_NO_DRAFTS, 404, ErrorCode.NOT_FOUND);

      await client.verifySmsCode(oid, code, toSign);
    } catch (err) {
      if (err instanceof AppError) throw err;
      Logger.warn(`[Invoice.confirmEarsivSms] ${err instanceof Error ? err.message : err}`);
      throw new AppError(InvoiceMessages.EARSIV_SMS_VERIFY_FAILED, 502, ErrorCode.INTERNAL_ERROR);
    }

    for (const inv of invoices) {
      inv.earsivStatus = 'accepted';
      await repo.save(inv);
    }
    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'invoice.earsiv.signed',
      resourceType: 'invoice', resourceId: invoices.map((i) => i.invoiceId).join(','),
      metadata: { count: invoices.length },
    }).catch(() => {});

    return { signed: invoices.length };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Internal — invoice number sequence
  // ───────────────────────────────────────────────────────────────────────────

  static async getNextInvoiceNumber(tenantId: string, prefix?: string, paddingStr?: string): Promise<string> {
    const padding = paddingStr ? parseInt(paddingStr, 10) : 5;
    const usedPrefix = prefix ?? 'INV';
    const year = new Date().getUTCFullYear();
    const ds = await tenantDataSourceFor(tenantId);
    // Find max sequence for this tenant + year
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
}
