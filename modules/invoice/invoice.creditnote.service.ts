import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import { Invoice as InvoiceEntity } from './entities/invoice.entity';
import { InvoiceLine as InvoiceLineEntity } from './entities/invoice_line.entity';
import SettingService from '@/modules/setting/setting.service';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import Logger from '@/modules/logger';
import InvoiceMessages from './invoice.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { SafeInvoiceSchema, type SafeInvoice } from './invoice.types';
import InvoiceCrudService from './invoice.crud.service';
import WebhookService from '@/modules/webhook/webhook.service';

const round4 = (n: number) => Math.round(n * 10000) / 10000;

export interface CreditNoteLineInput {
  /** Original invoice line being credited. */
  invoiceLineId: string;
  /** Quantity to credit (defaults to the original line's full quantity). */
  quantity?: number;
}

export interface CreditNoteInput {
  /** Subset of lines to credit. Omit for a full reversal of the invoice. */
  lines?: CreditNoteLineInput[];
  reason?: string;
}

/**
 * Credit notes — the legally required mechanism for correcting an issued
 * invoice (TR e-Fatura iade, EU credit memo, US credit memo). A credit note is
 * a counter-document with negative amounts that references the original; the
 * original stays immutable. Supports both full reversal and partial (per-line,
 * per-quantity) credits, with its own gap-free `CN-` sequence.
 */
export default class InvoiceCreditNoteService {
  static async create(tenantId: string, originalInvoiceId: string, input: CreditNoteInput = {}): Promise<SafeInvoice> {
    const ds = await tenantDataSourceFor(tenantId);
    const original = await ds.getRepository(InvoiceEntity).findOne({ where: { tenantId, invoiceId: originalInvoiceId } });
    if (!original) throw new AppError(InvoiceMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (original.status !== 'issued' && original.status !== 'paid') {
      throw new AppError(InvoiceMessages.CREDIT_NOTE_SOURCE_NOT_ISSUED, 409, ErrorCode.CONFLICT);
    }

    const originalLines = await ds.getRepository(InvoiceLineEntity).find({ where: { tenantId, invoiceId: originalInvoiceId } });
    const byId = new Map(originalLines.map((l) => [l.invoiceLineId, l]));

    // Resolve which lines (and quantities) are being credited.
    const selections: Array<{ src: InvoiceLineEntity; quantity: number }> = [];
    if (input.lines?.length) {
      for (const sel of input.lines) {
        const src = byId.get(sel.invoiceLineId);
        if (!src) throw new AppError(InvoiceMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
        const qty = sel.quantity ?? src.quantity;
        if (qty <= 0 || qty > src.quantity) throw new AppError(InvoiceMessages.CREDIT_NOTE_LINE_INVALID, 422, ErrorCode.VALIDATION_ERROR);
        selections.push({ src, quantity: qty });
      }
    } else {
      for (const src of originalLines) selections.push({ src, quantity: src.quantity });
    }

    let subtotal = 0;
    let taxAmount = 0;
    const creditLines = selections.map(({ src, quantity }) => {
      const proportion = src.quantity > 0 ? quantity / src.quantity : 0;
      const lineNet = round4(-(src.unitPrice * quantity));
      const lineTax = round4(-(src.taxAmount * proportion));
      subtotal += lineNet;
      taxAmount += lineTax;
      return {
        description: `Credit: ${src.description}`,
        quantity,
        unitPrice: src.unitPrice,
        taxRate: src.taxRate,
        taxAmount: lineTax,
        lineTotal: round4(lineNet + lineTax),
        sourceType: 'credit',
        sourceId: src.invoiceLineId,
      };
    });
    subtotal = round4(subtotal);
    taxAmount = round4(taxAmount);

    const prefix = (await SettingService.getValue(tenantId, 'invoiceCreditNotePrefix')) || 'CN';

    const creditNote = await ds.transaction(async (manager) => {
      const invoiceRepo = manager.getRepository(InvoiceEntity);
      const lineRepo = manager.getRepository(InvoiceLineEntity);

      const invoiceNumber = await InvoiceCrudService.allocateNumber(manager, tenantId, { prefix });

      const cn = await invoiceRepo.save(invoiceRepo.create({
        tenantId,
        invoiceNumber,
        customerEmail: original.customerEmail,
        customerName: original.customerName,
        customerTaxId: original.customerTaxId,
        customerAddress: original.customerAddress,
        customerCountryCode: original.customerCountryCode,
        issueDate: new Date(),
        subtotal,
        discountAmount: 0,
        taxAmount,
        totalAmount: round4(subtotal + taxAmount),
        currency: original.currency,
        status: 'issued', // a credit note is issued at creation
        region: original.region,
        taxScheme: original.taxScheme,
        notes: input.reason,
        metadata: { creditNoteOf: originalInvoiceId, originalInvoiceNumber: original.invoiceNumber, documentType: 'credit_note' },
      }));

      for (const cl of creditLines) {
        await lineRepo.save(lineRepo.create({ ...cl, tenantId, invoiceId: cn.invoiceId }));
      }
      return cn;
    });

    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'invoice.credit_note.created',
      resourceType: 'invoice', resourceId: creditNote.invoiceId,
      metadata: { creditNoteNumber: creditNote.invoiceNumber, originalInvoiceId, total: creditNote.totalAmount, reason: input.reason },
    }).catch(() => {});

    await WebhookService.dispatchEvent(tenantId, 'invoice.credit_note.created', {
      invoiceId: creditNote.invoiceId,
      invoiceNumber: creditNote.invoiceNumber,
      creditNoteOf: originalInvoiceId,
      totalAmount: creditNote.totalAmount,
      currency: creditNote.currency,
    }).catch((err: unknown) => Logger.warn(`[Invoice.creditNote] webhook failed: ${err instanceof Error ? err.message : err}`));

    return SafeInvoiceSchema.parse(creditNote);
  }
}
