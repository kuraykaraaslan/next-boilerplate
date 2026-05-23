import 'reflect-metadata';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { tenantDataSourceFor } from '@/modules/db';
import { Invoice } from './entities/invoice.entity';
import { InvoiceLine } from './entities/invoice_line.entity';
import SettingService from '@/modules/setting/setting.service';
import StorageService from '@/modules/storage/storage.service';
import Logger from '@/modules/logger';
import InvoiceMessages from './invoice.messages';

interface SellerInfo {
  legalName: string;
  taxId: string;
  taxOffice?: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  email?: string;
  phone?: string;
  iban?: string;
  logoUrl?: string;
}

interface PdfTemplateOptions {
  primaryColor: string;
  accentColor: string;
  textColor: string;
  mutedColor: string;
  fontFamily: 'helvetica' | 'courier' | 'times';
  paperSize: 'a4' | 'letter';
  language: 'en' | 'tr' | 'de' | 'fr';
  showLogo: boolean;
  showIban: boolean;
  showTaxOffice: boolean;
  footerText?: string;
  footerTermsUrl?: string;
  headerTagline?: string;
  watermark: string;
}

const PDF_LABELS: Record<PdfTemplateOptions['language'], Record<string, string>> = {
  en: { invoice: 'INVOICE', issue: 'Issue', due: 'Due', status: 'Status', billTo: 'Bill to',
        desc: 'Description', qty: 'Qty', unit: 'Unit', vat: 'VAT', tax: 'Tax', total: 'Total',
        subtotal: 'Subtotal', discount: 'Discount', grandTotal: 'Total', taxId: 'Tax ID',
        paymentToIban: 'Payment to IBAN' },
  tr: { invoice: 'FATURA', issue: 'Düzenleme', due: 'Vade', status: 'Durum', billTo: 'Müşteri',
        desc: 'Açıklama', qty: 'Adet', unit: 'Birim', vat: 'KDV', tax: 'Vergi', total: 'Tutar',
        subtotal: 'Ara toplam', discount: 'İndirim', grandTotal: 'Genel toplam', taxId: 'V.K.N./T.C.K.N.',
        paymentToIban: 'IBAN' },
  de: { invoice: 'RECHNUNG', issue: 'Datum', due: 'Fällig', status: 'Status', billTo: 'Rechnung an',
        desc: 'Beschreibung', qty: 'Menge', unit: 'Preis', vat: 'MwSt', tax: 'Steuer', total: 'Summe',
        subtotal: 'Zwischensumme', discount: 'Rabatt', grandTotal: 'Gesamt', taxId: 'USt-IdNr.',
        paymentToIban: 'IBAN' },
  fr: { invoice: 'FACTURE', issue: 'Émission', due: 'Échéance', status: 'Statut', billTo: 'Facturé à',
        desc: 'Description', qty: 'Qté', unit: 'Unitaire', vat: 'TVA', tax: 'Taxe', total: 'Total',
        subtotal: 'Sous-total', discount: 'Remise', grandTotal: 'Total', taxId: 'N° TVA',
        paymentToIban: 'IBAN' },
};

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '').match(/[0-9a-fA-F]{2}/g);
  if (!m || m.length < 3) return [33, 37, 41];
  return [parseInt(m[0], 16), parseInt(m[1], 16), parseInt(m[2], 16)];
}

/**
 * Renders an invoice into a PDF buffer using jsPDF + jspdf-autotable.
 *
 * The same PDF is used for every region — the legal e-document (UBL-TR XML,
 * Peppol BIS XML, Stripe Tax calc) is produced by the adapter at issue time
 * and tracked via `Invoice.earsivUuid` / `peppolDocumentId`. The PDF here is
 * the human-readable copy.
 */
export default class InvoicePdfService {
  static async render(tenantId: string, invoiceId: string): Promise<Buffer> {
    const ds = await tenantDataSourceFor(tenantId);
    const invoice = await ds.getRepository(Invoice).findOne({ where: { tenantId, invoiceId } });
    if (!invoice) throw new Error(InvoiceMessages.NOT_FOUND);
    const lines = await ds.getRepository(InvoiceLine).find({ where: { tenantId, invoiceId }, order: { createdAt: 'ASC' } });
    const [seller, tpl] = await Promise.all([
      InvoicePdfService.loadSeller(tenantId),
      InvoicePdfService.loadTemplateOptions(tenantId),
    ]);
    return InvoicePdfService.buildPdf(invoice, lines, seller, tpl);
  }

  /** Render a synthetic preview invoice using current template settings — for the Settings UI. */
  static async renderPreview(tenantId: string): Promise<Buffer> {
    const [seller, tpl] = await Promise.all([
      InvoicePdfService.loadSeller(tenantId),
      InvoicePdfService.loadTemplateOptions(tenantId),
    ]);
    const now = new Date();
    const due = new Date(now.getTime() + 14 * 86_400_000);
    const sampleInvoice = {
      invoiceNumber: 'INV-PREVIEW-00001',
      issueDate: now, dueDate: due, paidAt: undefined,
      customerName: 'Acme Corp', customerEmail: 'billing@acme.example.com',
      customerCountryCode: 'TR', customerAddress: { line1: '123 Demo Street', city: 'Istanbul', postal: '34000' },
      customerTaxId: '1234567890',
      subtotal: 1000, discountAmount: 0, taxAmount: 200, totalAmount: 1200,
      currency: 'TRY', status: 'issued', region: 'TR', taxScheme: 'KDV',
      earsivUuid: 'PREVIEW-UUID-1234',
      notes: 'This is a preview rendered with your current template settings.',
    } as unknown as Invoice;
    const sampleLines = [
      { description: 'Pro Plan — monthly', quantity: 1, unitPrice: 800, taxRate: 0.20, taxAmount: 160, lineTotal: 960 },
      { description: 'Extra seats × 2',     quantity: 2, unitPrice: 100, taxRate: 0.20, taxAmount: 40,  lineTotal: 240 },
    ] as unknown as InvoiceLine[];
    return InvoicePdfService.buildPdf(sampleInvoice, sampleLines, seller, tpl);
  }

  /** Render + upload to storage, return the storage key. */
  static async renderAndStore(tenantId: string, invoiceId: string): Promise<string> {
    const buffer = await InvoicePdfService.render(tenantId, invoiceId);
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(Invoice);
    const invoice = await repo.findOne({ where: { tenantId, invoiceId } });
    if (!invoice) throw new Error(InvoiceMessages.NOT_FOUND);

    const file = new File([new Uint8Array(buffer)], `${invoice.invoiceNumber}.pdf`, { type: 'application/pdf' });
    const result = await StorageService.uploadFile(tenantId, {
      file,
      folder: 'invoices',
      filename: `${invoice.invoiceNumber}.pdf`,
    } as any);

    invoice.pdfStorageKey = result.key;
    await repo.save(invoice);
    return result.key;
  }

  private static async loadTemplateOptions(tenantId: string): Promise<PdfTemplateOptions> {
    const s = await SettingService.getByKeys(tenantId, [
      'invoicePdfPrimaryColor', 'invoicePdfAccentColor', 'invoicePdfTextColor', 'invoicePdfMutedColor',
      'invoicePdfFontFamily', 'invoicePdfPaperSize', 'invoicePdfLanguage',
      'invoicePdfShowLogo', 'invoicePdfShowIban', 'invoicePdfShowTaxOffice',
      'invoicePdfFooterText', 'invoicePdfFooterTermsUrl', 'invoicePdfHeaderTagline',
      'invoicePdfWatermark',
    ]);
    return {
      primaryColor: s.invoicePdfPrimaryColor ?? '#212529',
      accentColor: s.invoicePdfAccentColor ?? '#0d6efd',
      textColor: s.invoicePdfTextColor ?? '#212529',
      mutedColor: s.invoicePdfMutedColor ?? '#6c757d',
      fontFamily: ((s.invoicePdfFontFamily as PdfTemplateOptions['fontFamily']) ?? 'helvetica'),
      paperSize: ((s.invoicePdfPaperSize as PdfTemplateOptions['paperSize']) ?? 'a4'),
      language: ((s.invoicePdfLanguage as PdfTemplateOptions['language']) ?? 'en'),
      showLogo: s.invoicePdfShowLogo !== 'false',
      showIban: s.invoicePdfShowIban !== 'false',
      showTaxOffice: s.invoicePdfShowTaxOffice !== 'false',
      footerText: s.invoicePdfFooterText,
      footerTermsUrl: s.invoicePdfFooterTermsUrl,
      headerTagline: s.invoicePdfHeaderTagline,
      watermark: s.invoicePdfWatermark ?? '',
    };
  }

  private static async loadSeller(tenantId: string): Promise<SellerInfo> {
    const settings = await SettingService.getByKeys(tenantId, [
      'companyLegalName', 'companyTaxId', 'companyTaxOffice',
      'companyAddressLine1', 'companyCity', 'companyPostalCode',
      'companyCountryCode', 'companyEmail', 'companyPhone',
      'companyIban', 'companyLogoUrl',
    ]);
    return {
      legalName: settings.companyLegalName ?? '—',
      taxId: settings.companyTaxId ?? '',
      taxOffice: settings.companyTaxOffice,
      address: settings.companyAddressLine1 ?? '',
      city: settings.companyCity ?? '',
      postalCode: settings.companyPostalCode ?? '',
      country: settings.companyCountryCode ?? '',
      email: settings.companyEmail,
      phone: settings.companyPhone,
      iban: settings.companyIban,
      logoUrl: settings.companyLogoUrl,
    };
  }

  private static buildPdf(invoice: Invoice, lines: InvoiceLine[], seller: SellerInfo, tpl: PdfTemplateOptions): Buffer {
    const doc = new jsPDF({ unit: 'mm', format: tpl.paperSize });
    const L = PDF_LABELS[tpl.language];
    const [tr, tg, tb] = hexToRgb(tpl.textColor);
    const [pr, pg, pb] = hexToRgb(tpl.primaryColor);
    const [ar, ag, ab] = hexToRgb(tpl.accentColor);
    const [mr, mg, mb] = hexToRgb(tpl.mutedColor);
    const pageW = doc.internal.pageSize.getWidth();
    const left = 15;
    let y = 20;

    // Header — seller
    doc.setTextColor(pr, pg, pb);
    doc.setFontSize(18); doc.setFont(tpl.fontFamily, 'bold');
    doc.text(seller.legalName, left, y);
    y += 6;
    if (tpl.headerTagline) {
      doc.setFontSize(9); doc.setFont(tpl.fontFamily, 'italic'); doc.setTextColor(mr, mg, mb);
      doc.text(tpl.headerTagline, left, y); y += 4;
    }
    doc.setFontSize(9); doc.setFont(tpl.fontFamily, 'normal'); doc.setTextColor(tr, tg, tb);
    if (seller.address) { doc.text(seller.address, left, y); y += 4; }
    if (seller.city || seller.postalCode) { doc.text(`${seller.postalCode} ${seller.city}`.trim(), left, y); y += 4; }
    if (seller.country) { doc.text(seller.country, left, y); y += 4; }
    if (seller.taxId) {
      const tax = tpl.showTaxOffice && seller.taxOffice ? `${L.taxId}: ${seller.taxId} • ${seller.taxOffice}` : `${L.taxId}: ${seller.taxId}`;
      doc.text(tax, left, y); y += 4;
    }
    if (seller.email) { doc.text(seller.email, left, y); y += 4; }
    if (seller.phone) { doc.text(seller.phone, left, y); y += 4; }

    // Right — invoice meta
    let yRight = 20;
    doc.setTextColor(pr, pg, pb);
    doc.setFontSize(22); doc.setFont(tpl.fontFamily, 'bold');
    doc.text(L.invoice, pageW - left, yRight, { align: 'right' });
    yRight += 8;
    doc.setFontSize(10); doc.setFont(tpl.fontFamily, 'normal'); doc.setTextColor(tr, tg, tb);
    doc.text(`# ${invoice.invoiceNumber}`, pageW - left, yRight, { align: 'right' }); yRight += 5;
    doc.text(`${L.issue}: ${invoice.issueDate.toISOString().slice(0, 10)}`, pageW - left, yRight, { align: 'right' }); yRight += 5;
    if (invoice.dueDate) {
      doc.text(`${L.due}: ${new Date(invoice.dueDate).toISOString().slice(0, 10)}`, pageW - left, yRight, { align: 'right' }); yRight += 5;
    }
    doc.text(`${L.status}: ${invoice.status.toUpperCase()}`, pageW - left, yRight, { align: 'right' }); yRight += 5;
    if (invoice.earsivUuid) {
      doc.text(`e-Arşiv: ${invoice.earsivUuid.slice(0, 13)}…`, pageW - left, yRight, { align: 'right' }); yRight += 5;
    } else if (invoice.peppolDocumentId) {
      doc.text(`Peppol: ${invoice.peppolDocumentId.slice(0, 18)}…`, pageW - left, yRight, { align: 'right' }); yRight += 5;
    }

    y = Math.max(y, yRight) + 6;

    // Bill-to block
    doc.setTextColor(pr, pg, pb);
    doc.setFontSize(10); doc.setFont(tpl.fontFamily, 'bold');
    doc.text(L.billTo, left, y); y += 5;
    doc.setTextColor(tr, tg, tb); doc.setFont(tpl.fontFamily, 'normal');
    doc.text(invoice.customerName, left, y); y += 4;
    const addr = invoice.customerAddress as Record<string, string> | undefined;
    if (addr?.line1) { doc.text(addr.line1, left, y); y += 4; }
    if (addr?.city || addr?.postal) { doc.text(`${addr?.postal ?? ''} ${addr?.city ?? ''}`.trim(), left, y); y += 4; }
    doc.text(invoice.customerCountryCode, left, y); y += 4;
    if (invoice.customerTaxId) { doc.text(`${L.taxId}: ${invoice.customerTaxId}`, left, y); y += 4; }
    doc.text(invoice.customerEmail, left, y); y += 6;

    // Lines table
    autoTable(doc, {
      startY: y + 2,
      head: [[L.desc, L.qty, L.unit, L.vat, L.tax, L.total]],
      body: lines.map((l) => [
        l.description,
        String(l.quantity),
        Number(l.unitPrice).toFixed(2),
        `${(Number(l.taxRate) * 100).toFixed(0)}%`,
        Number(l.taxAmount).toFixed(2),
        Number(l.lineTotal).toFixed(2),
      ]),
      styles: { fontSize: 9, cellPadding: 2, font: tpl.fontFamily, textColor: [tr, tg, tb] },
      headStyles: { fillColor: [ar, ag, ab], textColor: 255, font: tpl.fontFamily },
      columnStyles: {
        1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' },
        4: { halign: 'right' }, 5: { halign: 'right' },
      },
    });

    // Totals (under table)
    // @ts-expect-error — lastAutoTable is added by the autotable plugin
    let totalsY = (doc.lastAutoTable?.finalY ?? y + 50) + 6;
    const lblX = pageW - 60;
    const valX = pageW - left;

    const totalsRow = (label: string, value: string, opts?: { bold?: boolean; accent?: boolean }) => {
      if (opts?.bold) doc.setFont(tpl.fontFamily, 'bold'); else doc.setFont(tpl.fontFamily, 'normal');
      if (opts?.accent) doc.setTextColor(ar, ag, ab); else doc.setTextColor(tr, tg, tb);
      doc.text(label, lblX, totalsY);
      doc.text(value, valX, totalsY, { align: 'right' });
      totalsY += 5;
    };
    totalsRow(L.subtotal, `${Number(invoice.subtotal).toFixed(2)} ${invoice.currency}`);
    if (Number(invoice.discountAmount) > 0) totalsRow(L.discount, `-${Number(invoice.discountAmount).toFixed(2)} ${invoice.currency}`);
    totalsRow(invoice.taxScheme === 'KDV' ? L.vat : invoice.taxScheme === 'VAT' ? L.vat : L.tax,
      `${Number(invoice.taxAmount).toFixed(2)} ${invoice.currency}`);
    totalsRow(L.grandTotal, `${Number(invoice.totalAmount).toFixed(2)} ${invoice.currency}`, { bold: true, accent: true });

    // Watermark
    if (tpl.watermark) {
      doc.saveGraphicsState?.();
      // @ts-expect-error — GState exists on jsPDF
      doc.setGState?.(new doc.GState({ opacity: 0.12 }));
      doc.setTextColor(ar, ag, ab);
      doc.setFontSize(80); doc.setFont(tpl.fontFamily, 'bold');
      doc.text(tpl.watermark, pageW / 2, doc.internal.pageSize.getHeight() / 2, { align: 'center', angle: 30 });
      doc.restoreGraphicsState?.();
    }

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setTextColor(mr, mg, mb);
    if (tpl.showIban && seller.iban) {
      doc.setFontSize(8); doc.setFont(tpl.fontFamily, 'italic');
      doc.text(`${L.paymentToIban}: ${seller.iban}`, left, footerY);
    }
    if (tpl.footerText) {
      doc.setFontSize(8); doc.setFont(tpl.fontFamily, 'italic');
      doc.text(tpl.footerText, pageW / 2, footerY, { align: 'center' });
    }
    if (tpl.footerTermsUrl) {
      doc.setFontSize(7); doc.text(tpl.footerTermsUrl, pageW - left, footerY, { align: 'right' });
    }
    if (invoice.notes) {
      doc.setTextColor(tr, tg, tb);
      doc.setFontSize(9); doc.setFont(tpl.fontFamily, 'normal');
      doc.text(invoice.notes, left, footerY - 10, { maxWidth: pageW - 30 });
    }

    const arrayBuffer = doc.output('arraybuffer');
    return Buffer.from(arrayBuffer);
  }
}
