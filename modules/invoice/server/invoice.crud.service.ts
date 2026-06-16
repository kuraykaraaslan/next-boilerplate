import 'reflect-metadata';
import type { EntityManager } from 'typeorm';
import { Invoice as InvoiceEntity } from './entities/invoice.entity';
import type { SafeInvoice, SafeInvoiceLine, CreateInvoiceInput } from './invoice.types';
import InvoiceTransitionService from './invoice.transition.service';
import { create } from './invoice.create.service';
import { updateDraft, getById, getLines, list, type ListInvoicesQuery } from './invoice.read.service';
import { periodSegment, allocateNumber, getNextInvoiceNumber } from './invoice.number.service';

export { InvoiceTransitionService };

/**
 * Invoice CRUD service facade. The implementation is split across focused
 * modules (`invoice.create.service` create + tax computation,
 * `invoice.read.service` updateDraft/getById/getLines/list,
 * `invoice.number.service` gap-free numbering); this class preserves the single
 * `InvoiceCrudService.*` entry point its callers (and `invoice.service`'s
 * `.bind(InvoiceCrudService)`) depend on.
 */
export default class InvoiceCrudService {
  static create(tenantId: string, input: CreateInvoiceInput): Promise<SafeInvoice> {
    return create(tenantId, input);
  }

  static updateDraft(
    tenantId: string,
    invoiceId: string,
    patch: Partial<Pick<InvoiceEntity, 'customerEmail' | 'customerName' | 'customerTaxId' | 'customerAddress' | 'dueDate' | 'notes' | 'metadata'>>,
  ): Promise<SafeInvoice> {
    return updateDraft(tenantId, invoiceId, patch);
  }

  static getById(tenantId: string, invoiceId: string): Promise<SafeInvoice> {
    return getById(tenantId, invoiceId);
  }

  static getLines(tenantId: string, invoiceId: string): Promise<SafeInvoiceLine[]> {
    return getLines(tenantId, invoiceId);
  }

  static list(tenantId: string, query: ListInvoicesQuery = {}): Promise<{ invoices: SafeInvoice[]; total: number }> {
    return list(tenantId, query);
  }

  static periodSegment(resetPolicy?: string, fiscalStartMonthStr?: string, at: Date = new Date()): string {
    return periodSegment(resetPolicy, fiscalStartMonthStr, at);
  }

  static allocateNumber(
    manager: EntityManager,
    tenantId: string,
    opts: { prefix?: string; padding?: string; resetPolicy?: string; fiscalStartMonth?: string; at?: Date } = {},
  ): Promise<string> {
    return allocateNumber(manager, tenantId, opts);
  }

  static getNextInvoiceNumber(tenantId: string, prefix?: string, paddingStr?: string): Promise<string> {
    return getNextInvoiceNumber(tenantId, prefix, paddingStr);
  }

  // State transition delegates
  static issue     = InvoiceTransitionService.issue.bind(InvoiceTransitionService);
  static markPaid  = InvoiceTransitionService.markPaid.bind(InvoiceTransitionService);
  static markVoid  = InvoiceTransitionService.markVoid.bind(InvoiceTransitionService);
}
