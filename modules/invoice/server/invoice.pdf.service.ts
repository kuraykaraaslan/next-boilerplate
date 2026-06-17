import 'reflect-metadata';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import { Invoice } from './entities/invoice.entity';
import { InvoiceLine } from './entities/invoice_line.entity';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import StorageService from '@kuraykaraaslan/storage/server/storage.service';
import { type UploadFileDTO } from '@kuraykaraaslan/storage/server/storage.dto';
import InvoiceMessages from './invoice.messages';
import InvoicePdfRendererService, { type SellerInfo, type PdfTemplateOptions } from './invoice.pdf.renderer.service';

export { InvoicePdfRendererService };

export default class InvoicePdfService {

  static async render(tenantId: string, invoiceId: string): Promise<Buffer> {
    const ds = await tenantDataSourceFor(tenantId);
    const invoice = await ds.getRepository(Invoice).findOne({ where: { tenantId, invoiceId } });
    if (!invoice) throw new Error(InvoiceMessages.NOT_FOUND);

    // When the e-invoicing provider (e-Arşiv via Foriba/Logo, or any provider
    // that returns a signed document) issued its own legal PDF, that document is
    // authoritative — serve it verbatim and never substitute a self-rendered one.
    if (invoice.providerPdfUrl) {
      return InvoicePdfService.fetchProviderPdf(invoice.providerPdfUrl);
    }

    const lines = await ds.getRepository(InvoiceLine).find({ where: { tenantId, invoiceId }, order: { createdAt: 'ASC' } });
    const [seller, tpl] = await Promise.all([
      InvoicePdfService.loadSeller(tenantId),
      InvoicePdfService.loadTemplateOptions(tenantId),
    ]);
    return InvoicePdfRendererService.buildPdf(invoice, lines, seller, tpl);
  }

  /**
   * Download the provider-rendered legal PDF. We deliberately do NOT fall back
   * to a self-rendered document on failure: a provider-backed invoice must show
   * the official document or a clear error, never a look-alike we generated.
   */
  private static async fetchProviderPdf(url: string): Promise<Buffer> {
    if (!/^https?:\/\//i.test(url)) {
      throw new Error(InvoiceMessages.PROVIDER_PDF_UNAVAILABLE);
    }
    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      throw new Error(InvoiceMessages.PROVIDER_PDF_UNAVAILABLE);
    }
    if (!res.ok) throw new Error(InvoiceMessages.PROVIDER_PDF_UNAVAILABLE);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

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
    return InvoicePdfRendererService.buildPdf(sampleInvoice, sampleLines, seller, tpl);
  }

  static async renderAndStore(tenantId: string, invoiceId: string): Promise<string> {
    const buffer = await InvoicePdfService.render(tenantId, invoiceId);
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(Invoice);
    const invoice = await repo.findOne({ where: { tenantId, invoiceId } });
    if (!invoice) throw new Error(InvoiceMessages.NOT_FOUND);

    const file = new File([new Uint8Array(buffer)], `${invoice.invoiceNumber}.pdf`, { type: 'application/pdf' });
    const uploadPayload: UploadFileDTO = {
      file,
      folder: 'invoices',
      filename: `${invoice.invoiceNumber}.pdf`,
    };
    const result = await StorageService.uploadFile(tenantId, uploadPayload);

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
}
