import InvoiceCrudService from './invoice.crud.service';
import InvoiceAdapterService from './invoice.adapter.service';
import InvoiceCreditNoteService from './invoice.creditnote.service';

export { InvoiceCrudService, InvoiceAdapterService, InvoiceCreditNoteService };

export default class InvoiceService {

  // ──────────────────────────────────────────────
  // CRUD
  // ──────────────────────────────────────────────

  static create              = InvoiceCrudService.create.bind(InvoiceCrudService);
  static updateDraft         = InvoiceCrudService.updateDraft.bind(InvoiceCrudService);
  static getById             = InvoiceCrudService.getById.bind(InvoiceCrudService);
  static getLines            = InvoiceCrudService.getLines.bind(InvoiceCrudService);
  static list                = InvoiceCrudService.list.bind(InvoiceCrudService);
  static issue               = InvoiceCrudService.issue.bind(InvoiceCrudService);
  static markPaid            = InvoiceCrudService.markPaid.bind(InvoiceCrudService);
  static markVoid            = InvoiceCrudService.markVoid.bind(InvoiceCrudService);
  static getNextInvoiceNumber = InvoiceCrudService.getNextInvoiceNumber.bind(InvoiceCrudService);

  // ──────────────────────────────────────────────
  // Credit notes
  // ──────────────────────────────────────────────

  static createCreditNote    = InvoiceCreditNoteService.create.bind(InvoiceCreditNoteService);

  // ──────────────────────────────────────────────
  // TR e-Arşiv Adapter
  // ──────────────────────────────────────────────

  static requestEarsivSms  = InvoiceAdapterService.requestEarsivSms.bind(InvoiceAdapterService);
  static confirmEarsivSms  = InvoiceAdapterService.confirmEarsivSms.bind(InvoiceAdapterService);
}
