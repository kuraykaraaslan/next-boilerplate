import 'reflect-metadata';
import { tenantDataSourceFor } from '@nb/db';
import { Invoice as InvoiceEntity } from './entities/invoice.entity';
import { InvoiceLine as InvoiceLineEntity } from './entities/invoice_line.entity';
import AuditLogService from '@nb/audit_log/server/audit_log.service';
import InvoiceMessages from './invoice.messages';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import {
  SafeInvoiceSchema, SafeInvoiceLineSchema,
  type SafeInvoice, type SafeInvoiceLine,
} from './invoice.types';

export interface ListInvoicesQuery {
  page?: number;
  pageSize?: number;
  status?: string;
}

/**
 * Editable fields on a *draft* invoice. Once issued, an invoice is legally
 * immutable (TR GİB, EU VAT Directive, US GAAP) — corrections must go through
 * a credit note. Only `draft` invoices may be patched here.
 */
export async function updateDraft(
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

export async function getById(tenantId: string, invoiceId: string): Promise<SafeInvoice> {
  const ds = await tenantDataSourceFor(tenantId);
  const row = await ds.getRepository(InvoiceEntity).findOne({ where: { tenantId, invoiceId } });
  if (!row) throw new AppError(InvoiceMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  return SafeInvoiceSchema.parse(row);
}

export async function getLines(tenantId: string, invoiceId: string): Promise<SafeInvoiceLine[]> {
  const ds = await tenantDataSourceFor(tenantId);
  const rows = await ds.getRepository(InvoiceLineEntity).find({
    where: { tenantId, invoiceId },
    order: { createdAt: 'ASC' },
  });
  return rows.map((r) => SafeInvoiceLineSchema.parse(r));
}

export async function list(tenantId: string, query: ListInvoicesQuery = {}): Promise<{ invoices: SafeInvoice[]; total: number }> {
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
