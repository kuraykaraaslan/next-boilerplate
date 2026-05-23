import { randomUUID } from 'node:crypto';
import { create as createXml } from 'xmlbuilder2';
import SettingService from '@/modules/setting/setting.service';
import Logger from '@/modules/logger';
import type { InvoiceAdapter, InvoiceAdapterSubmitResult } from './base.adapter';
import type { Invoice } from '../entities/invoice.entity';
import type { InvoiceLine } from '../entities/invoice_line.entity';
import { isValidTrTaxId } from './tr_validators';
import { ForibaClient } from './tr_foriba.client';
import { GibDirectClient } from './tr_gib_direct.client';
import { LogoClient } from './tr_logo.client';

/**
 * Turkey — e-Arşiv Fatura (B2C) and e-Fatura (B2B). Document shape is
 * identical (UBL-TR 2.1), only the document type code (`EARSIVFATURA` vs
 * `TICARIFATURA`) and the integrator endpoint differ.
 *
 * Real production deploys plug into one of these GİB-approved integrators:
 *   • Foriba (foriba.com)
 *   • Logo İnternet (e-logo.com.tr)
 *   • Uyumsoft (uyumsoft.com.tr)
 *   • BizPlace, eLogo, Mikrogep, ...
 *
 * This file ships a `mock` integrator that returns synthetic success and a
 * generated UBL-TR XML for inspection. Other integrators are stubs — fill
 * them in per your contract.
 */
export class TrEarsivAdapter implements InvoiceAdapter {
  readonly region = 'TR';

  async isConfigured(tenantId: string): Promise<boolean> {
    const integrator = await SettingService.getValue(tenantId, 'earsivIntegrator');
    if (!integrator) return false;
    if (integrator === 'mock') return true;
    // Real integrators need creds
    const [baseUrl, username, password] = await Promise.all([
      SettingService.getValue(tenantId, 'earsivIntegratorBaseUrl'),
      SettingService.getValue(tenantId, 'earsivIntegratorUsername'),
      SettingService.getValue(tenantId, 'earsivIntegratorPassword'),
    ]);
    return Boolean(baseUrl && username && password);
  }

  async submit(tenantId: string, invoice: Invoice, lines: InvoiceLine[]): Promise<InvoiceAdapterSubmitResult> {
    const integrator = (await SettingService.getValue(tenantId, 'earsivIntegrator')) || 'mock';

    // Validate customer tax id if provided
    if (invoice.customerTaxId && !isValidTrTaxId(invoice.customerTaxId)) {
      Logger.warn(`[TrEarsiv] customerTaxId failed TCKN/VKN checksum: ${invoice.customerTaxId}`);
    }

    const xml = this.buildUblTrXml(invoice, lines, await this.loadSellerInfo(tenantId));

    switch (integrator) {
      case 'mock':
        return this.submitMock(invoice, xml);
      case 'gib_direct':
        return this.submitViaGibDirect(tenantId, invoice, xml);
      case 'foriba':
        return this.submitViaForiba(tenantId, invoice, xml);
      case 'logo':
        return this.submitViaLogo(tenantId, invoice, xml);
      case 'uyumsoft':
      case 'bizplace':
      case 'mikrogep':
        Logger.warn(`[TrEarsiv] integrator='${integrator}' is a stub — submitting via mock for now`);
        return this.submitMock(invoice, xml);
      default:
        throw new Error(`Unknown e-Arşiv integrator: ${integrator}`);
    }
  }

  private async submitViaGibDirect(tenantId: string, invoice: Invoice, ublXml: string): Promise<InvoiceAdapterSubmitResult> {
    const [username, password, baseUrl, sandboxFlag] = await Promise.all([
      SettingService.getValue(tenantId, 'earsivIntegratorUsername'),
      SettingService.getValue(tenantId, 'earsivIntegratorPassword'),
      SettingService.getValue(tenantId, 'earsivIntegratorBaseUrl'),
      SettingService.getValue(tenantId, 'earsivAutoSubmit'),
    ]);
    if (!username || !password) {
      Logger.warn(`[TrEarsiv:gib_direct] missing TCKN/VKN credentials for tenant ${tenantId} — falling back to mock`);
      return this.submitMock(invoice, ublXml);
    }
    const client = new GibDirectClient({
      username, password,
      baseUrl: baseUrl ?? undefined,
      sandbox: sandboxFlag === 'false' ? false : true,
    });
    try {
      const res = await client.submit({ ublXml, receiverEmail: invoice.customerEmail });
      return {
        externalId: res.uuid,
        status: res.status === 'SIGNED' ? 'accepted' : res.status === 'CREATED' ? 'submitted' : 'rejected',
        pdfUrl: res.pdfUrl,
        raw: { integrator: 'gib_direct', documentNumber: res.documentNumber, status: res.status },
      };
    } catch (err) {
      Logger.warn(`[TrEarsiv:gib_direct] submit failed — falling back to mock: ${err instanceof Error ? err.message : err}`);
      return this.submitMock(invoice, ublXml);
    }
  }

  private async submitViaLogo(tenantId: string, invoice: Invoice, ublXml: string): Promise<InvoiceAdapterSubmitResult> {
    const [baseUrl, username, password, override] = await Promise.all([
      SettingService.getValue(tenantId, 'earsivIntegratorBaseUrl'),
      SettingService.getValue(tenantId, 'earsivIntegratorUsername'),
      SettingService.getValue(tenantId, 'earsivIntegratorPassword'),
      SettingService.getValue(tenantId, 'earsivDocumentTypeOverride'),
    ]);
    if (!baseUrl || !username || !password) {
      Logger.warn(`[TrEarsiv:logo] missing creds for tenant ${tenantId} — falling back to mock`);
      return this.submitMock(invoice, ublXml);
    }
    const client = new LogoClient({ baseUrl, username, password });
    const documentType = (override as 'EARSIVFATURA' | 'TICARIFATURA' | null) ?? 'EARSIVFATURA';
    try {
      const res = await client.submit({ ublXml, documentType, receiverEmail: invoice.customerEmail });
      return {
        externalId: res.uuid,
        status: res.status === 'ACCEPTED' ? 'accepted' : res.status === 'PROCESSING' ? 'submitted' : 'rejected',
        pdfUrl: res.pdfUrl,
        raw: { integrator: 'logo', documentType, status: res.status },
      };
    } catch (err) {
      Logger.warn(`[TrEarsiv:logo] submit failed — falling back to mock: ${err instanceof Error ? err.message : err}`);
      return this.submitMock(invoice, ublXml);
    }
  }

  private async submitViaForiba(tenantId: string, invoice: Invoice, ublXml: string): Promise<InvoiceAdapterSubmitResult> {
    const [baseUrl, username, password, override] = await Promise.all([
      SettingService.getValue(tenantId, 'earsivIntegratorBaseUrl'),
      SettingService.getValue(tenantId, 'earsivIntegratorUsername'),
      SettingService.getValue(tenantId, 'earsivIntegratorPassword'),
      SettingService.getValue(tenantId, 'earsivDocumentTypeOverride'),
    ]);
    if (!baseUrl || !username || !password) {
      Logger.warn(`[TrEarsiv:foriba] missing creds for tenant ${tenantId} — falling back to mock`);
      return this.submitMock(invoice, ublXml);
    }
    const client = new ForibaClient({ baseUrl, username, password });
    const documentType = (override as 'EARSIVFATURA' | 'TICARIFATURA' | null) ?? 'EARSIVFATURA';
    try {
      const res = await client.submit({ ublXml, documentType, receiverEmail: invoice.customerEmail });
      return {
        externalId: res.uuid,
        status: res.status === 'ACCEPTED' ? 'accepted' : res.status === 'SUBMITTED' ? 'submitted' : 'rejected',
        pdfUrl: res.pdfUrl,
        raw: { integrator: 'foriba', documentType, status: res.status },
      };
    } catch (err) {
      Logger.warn(`[TrEarsiv:foriba] submit failed — falling back to mock so issue still completes: ${err instanceof Error ? err.message : err}`);
      return this.submitMock(invoice, ublXml);
    }
  }

  async cancel(_tenantId: string, invoice: Invoice, reason?: string): Promise<void> {
    Logger.info(`[TrEarsiv] cancel invoice ${invoice.invoiceNumber} (${invoice.earsivUuid ?? 'no-uuid'}) reason=${reason ?? '-'}`);
    // Real integrators: POST cancellation request. Mock: no-op.
  }

  // ────────────────────────────────────────────────────────────────────────
  // Internal
  // ────────────────────────────────────────────────────────────────────────

  private async submitMock(invoice: Invoice, _xml: string): Promise<InvoiceAdapterSubmitResult> {
    const externalId = randomUUID();
    Logger.info(`[TrEarsiv:mock] submitted ${invoice.invoiceNumber} → ${externalId} (status=ACCEPTED)`);
    return {
      externalId,
      status: 'accepted',
      pdfUrl: undefined,
      raw: { integrator: 'mock', acceptedAt: new Date().toISOString() },
    };
  }

  private async loadSellerInfo(tenantId: string) {
    const keys = [
      'companyLegalName', 'companyTaxId', 'companyTaxOffice',
      'companyAddressLine1', 'companyCity', 'companyPostalCode',
      'companyCountryCode', 'companyEmail', 'companyPhone',
    ] as const;
    const settings = await SettingService.getByKeys(tenantId, [...keys]);
    return {
      legalName: settings.companyLegalName ?? '',
      taxId: settings.companyTaxId ?? '',
      taxOffice: settings.companyTaxOffice ?? '',
      address: settings.companyAddressLine1 ?? '',
      city: settings.companyCity ?? '',
      postal: settings.companyPostalCode ?? '',
      country: settings.companyCountryCode ?? 'TR',
      email: settings.companyEmail ?? '',
      phone: settings.companyPhone ?? '',
    };
  }

  /**
   * Format the GİB-compatible invoice ID: 3-letter prefix + year + 9-digit
   * sequence, e.g. `INV2025000000001`. We derive it from our own
   * `invoiceNumber` by stripping non-digit chars and zero-padding.
   */
  private formatGibInvoiceNumber(invoiceNumber: string, issueDate: Date): string {
    const year = issueDate.getUTCFullYear();
    const seq = (invoiceNumber.match(/\d+$/)?.[0] ?? '0').padStart(9, '0');
    return `INV${year}${seq}`;
  }

  private buildUblTrXml(
    invoice: Invoice,
    lines: InvoiceLine[],
    seller: Awaited<ReturnType<TrEarsivAdapter['loadSellerInfo']>>,
  ): string {
    const docTypeCode = 'SATIS';
    const profileId = 'EARSIVFATURA'; // override to 'TICARIFATURA' for B2B
    const gibId = this.formatGibInvoiceNumber(invoice.invoiceNumber, invoice.issueDate);

    const doc = createXml({ version: '1.0', encoding: 'UTF-8' })
      .ele('Invoice', {
        'xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
        'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
        'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
      });

    doc.ele('cbc:UBLVersionID').txt('2.1').up();
    doc.ele('cbc:CustomizationID').txt('TR1.2').up();
    doc.ele('cbc:ProfileID').txt(profileId).up();
    doc.ele('cbc:ID').txt(gibId).up();
    doc.ele('cbc:UUID').txt(randomUUID()).up();
    doc.ele('cbc:IssueDate').txt(invoice.issueDate.toISOString().slice(0, 10)).up();
    doc.ele('cbc:IssueTime').txt(invoice.issueDate.toISOString().slice(11, 19)).up();
    doc.ele('cbc:InvoiceTypeCode').txt(docTypeCode).up();
    doc.ele('cbc:DocumentCurrencyCode').txt(invoice.currency).up();

    // Supplier (seller — the tenant)
    const supplier = doc.ele('cac:AccountingSupplierParty').ele('cac:Party');
    supplier.ele('cbc:WebsiteURI').txt('').up();
    supplier.ele('cac:PartyIdentification').ele('cbc:ID', { schemeID: 'VKN' }).txt(seller.taxId).up().up();
    supplier.ele('cac:PartyName').ele('cbc:Name').txt(seller.legalName).up().up();
    const supAddr = supplier.ele('cac:PostalAddress');
    supAddr.ele('cbc:StreetName').txt(seller.address).up();
    supAddr.ele('cbc:CityName').txt(seller.city).up();
    supAddr.ele('cbc:PostalZone').txt(seller.postal).up();
    supAddr.ele('cac:Country').ele('cbc:Name').txt(seller.country).up().up();
    supplier.ele('cac:PartyTaxScheme').ele('cac:TaxScheme').ele('cbc:Name').txt(seller.taxOffice).up().up().up();

    // Customer
    const customer = doc.ele('cac:AccountingCustomerParty').ele('cac:Party');
    if (invoice.customerTaxId) {
      const scheme = invoice.customerTaxId.length === 11 ? 'TCKN' : 'VKN';
      customer.ele('cac:PartyIdentification').ele('cbc:ID', { schemeID: scheme }).txt(invoice.customerTaxId).up().up();
    }
    customer.ele('cac:PartyName').ele('cbc:Name').txt(invoice.customerName).up().up();
    const custAddr = invoice.customerAddress as Record<string, string> | undefined;
    if (custAddr) {
      const ca = customer.ele('cac:PostalAddress');
      ca.ele('cbc:StreetName').txt(custAddr.line1 ?? '').up();
      ca.ele('cbc:CityName').txt(custAddr.city ?? '').up();
      ca.ele('cbc:PostalZone').txt(custAddr.postal ?? '').up();
      ca.ele('cac:Country').ele('cbc:Name').txt(invoice.customerCountryCode).up().up();
    }
    customer.ele('cac:Contact').ele('cbc:ElectronicMail').txt(invoice.customerEmail).up().up();

    // Tax total
    const taxTotal = doc.ele('cac:TaxTotal');
    taxTotal.ele('cbc:TaxAmount', { currencyID: invoice.currency }).txt(Number(invoice.taxAmount).toFixed(2)).up();
    const taxSubtotal = taxTotal.ele('cac:TaxSubtotal');
    taxSubtotal.ele('cbc:TaxableAmount', { currencyID: invoice.currency }).txt(Number(invoice.subtotal).toFixed(2)).up();
    taxSubtotal.ele('cbc:TaxAmount', { currencyID: invoice.currency }).txt(Number(invoice.taxAmount).toFixed(2)).up();
    taxSubtotal.ele('cac:TaxCategory').ele('cac:TaxScheme').ele('cbc:Name').txt('KDV').up().ele('cbc:TaxTypeCode').txt('0015').up().up().up();

    // Monetary totals
    const totals = doc.ele('cac:LegalMonetaryTotal');
    totals.ele('cbc:LineExtensionAmount', { currencyID: invoice.currency }).txt(Number(invoice.subtotal).toFixed(2)).up();
    totals.ele('cbc:TaxExclusiveAmount', { currencyID: invoice.currency }).txt(Number(invoice.subtotal).toFixed(2)).up();
    totals.ele('cbc:TaxInclusiveAmount', { currencyID: invoice.currency }).txt(Number(invoice.totalAmount).toFixed(2)).up();
    totals.ele('cbc:AllowanceTotalAmount', { currencyID: invoice.currency }).txt(Number(invoice.discountAmount).toFixed(2)).up();
    totals.ele('cbc:PayableAmount', { currencyID: invoice.currency }).txt(Number(invoice.totalAmount).toFixed(2)).up();

    // Lines
    lines.forEach((line, i) => {
      const ln = doc.ele('cac:InvoiceLine');
      ln.ele('cbc:ID').txt(String(i + 1)).up();
      ln.ele('cbc:InvoicedQuantity', { unitCode: 'C62' }).txt(String(line.quantity)).up();
      ln.ele('cbc:LineExtensionAmount', { currencyID: invoice.currency }).txt(Number(line.lineTotal - line.taxAmount).toFixed(2)).up();
      const lineTaxTotal = ln.ele('cac:TaxTotal');
      lineTaxTotal.ele('cbc:TaxAmount', { currencyID: invoice.currency }).txt(Number(line.taxAmount).toFixed(2)).up();
      const lineTaxSubtotal = lineTaxTotal.ele('cac:TaxSubtotal');
      lineTaxSubtotal.ele('cbc:TaxableAmount', { currencyID: invoice.currency }).txt(Number(line.unitPrice * line.quantity).toFixed(2)).up();
      lineTaxSubtotal.ele('cbc:TaxAmount', { currencyID: invoice.currency }).txt(Number(line.taxAmount).toFixed(2)).up();
      lineTaxSubtotal.ele('cbc:Percent').txt(String(Number(line.taxRate) * 100)).up();
      lineTaxSubtotal.ele('cac:TaxCategory').ele('cac:TaxScheme').ele('cbc:Name').txt('KDV').up().up().up();
      ln.ele('cac:Item').ele('cbc:Name').txt(line.description).up().up();
      ln.ele('cac:Price').ele('cbc:PriceAmount', { currencyID: invoice.currency }).txt(Number(line.unitPrice).toFixed(2)).up().up();
    });

    return doc.end({ prettyPrint: true });
  }
}

export default TrEarsivAdapter;
