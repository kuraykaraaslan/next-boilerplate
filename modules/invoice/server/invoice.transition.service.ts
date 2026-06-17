import 'reflect-metadata';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import { Invoice as InvoiceEntity } from './entities/invoice.entity';
import { InvoiceLine as InvoiceLineEntity } from './entities/invoice_line.entity';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import AuditLogService from '@kuraykaraaslan/audit_log/server/audit_log.service';
import Logger from '@kuraykaraaslan/logger';
import InvoiceMessages from './invoice.messages';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { SafeInvoiceSchema, type SafeInvoice } from './invoice.types';
import { resolveInvoiceAdapter } from './adapters/registry';
import MailTemplatesService from '@kuraykaraaslan/notification_mail/server/notification_mail.templates.service';
import WebhookService from '@kuraykaraaslan/webhook/server/webhook.service';

export default class InvoiceTransitionService {

  static async issue(tenantId: string, invoiceId: string): Promise<SafeInvoice> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(InvoiceEntity);
    const invoice = await repo.findOne({ where: { tenantId, invoiceId } });
    if (!invoice) throw new AppError(InvoiceMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (invoice.status !== 'draft') throw new AppError(InvoiceMessages.ALREADY_ISSUED, 409, ErrorCode.CONFLICT);

    // Issuer-country regime wins (FatturaPA/Chorus Pro/ZUGFeRD/CFDI/GST),
    // otherwise the tenant's region adapter (TR e-Arşiv / EU Peppol / US).
    const adapter = await resolveInvoiceAdapter(tenantId, invoice.region);
    if (adapter && await adapter.isConfigured(tenantId)) {
      try {
        const lines = await ds.getRepository(InvoiceLineEntity).find({ where: { tenantId, invoiceId } });
        const result = await adapter.submit(tenantId, invoice, lines);
        if (adapter.region === 'TR') {
          invoice.earsivUuid = result.externalId;
          invoice.earsivStatus = result.status;
          invoice.earsivIntegrator = (await SettingService.getValue(tenantId, 'earsivIntegrator')) ?? 'mock';
        } else if (adapter.region === 'EU') {
          invoice.peppolDocumentId = result.externalId;
          invoice.peppolStatus = result.status;
        } else if (result.status !== 'noop') {
          // Country-specific regimes (IT/FR/DE/MX/IN, …): persist the provider
          // reference generically in metadata so no schema change is needed.
          invoice.metadata = {
            ...(invoice.metadata as Record<string, unknown> | undefined),
            eInvoice: { provider: adapter.region, externalId: result.externalId ?? null, status: result.status },
          };
        }
        // Provider-agnostic: when the e-invoicing provider returns its own
        // signed/legal PDF, persist its URL so we serve that document verbatim
        // instead of self-rendering one.
        if (result.pdfUrl) invoice.providerPdfUrl = result.pdfUrl;
      } catch (err) {
        Logger.warn(`[Invoice.issue] regional submit failed for ${invoice.invoiceNumber}: ${err instanceof Error ? err.message : err}`);
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

    const adapter = await resolveInvoiceAdapter(tenantId, invoice.region);
    const eInvoice = (invoice.metadata as { eInvoice?: { externalId?: string } } | undefined)?.eInvoice;
    if (adapter && (invoice.earsivUuid || invoice.peppolDocumentId || eInvoice?.externalId)) {
      await adapter.cancel(tenantId, invoice, reason).catch(() => {});
    }

    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'invoice.voided',
      resourceType: 'invoice', resourceId: invoiceId,
      metadata: { invoiceNumber: invoice.invoiceNumber, reason },
    }).catch(() => {});

    return SafeInvoiceSchema.parse(invoice);
  }
}
