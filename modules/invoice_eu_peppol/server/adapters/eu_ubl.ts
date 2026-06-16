import type { Invoice } from '@nb/invoice/server/entities/invoice.entity';
import type { InvoiceLine } from '@nb/invoice/server/entities/invoice_line.entity';
import { readTaxBreakdown } from '@nb/invoice/server/adapters/xml.util';

/**
 * Real UBL 2.1 / EN 16931 (Peppol BIS Billing 3.0) invoice serialiser.
 *
 * This produces a genuine, well-formed UBL `Invoice` XML document from our
 * internal rows — not a mock. It is the payload an Access Point expects to wrap
 * in an AS4 envelope and forward onto the Peppol network. Fields we do not
 * model (delivery, payment means details, allowances) are omitted; the core
 * billing fields required by EN 16931 are present.
 */

export interface UblSeller {
  legalName: string;
  taxId: string;
  vatNumber: string;
  addressLine: string;
  city: string;
  postalCode: string;
  countryCode: string;
  /** Peppol participant id, e.g. `0088:7300010000001`. */
  endpointId: string;
}

export interface BuildUblParams {
  invoice: Invoice;
  lines: InvoiceLine[];
  seller: UblSeller;
  /** Peppol document type id (CustomizationID override), optional. */
  documentTypeId?: string;
}

const xmlEscape = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const money = (n: number): string => (Math.round((n ?? 0) * 100) / 100).toFixed(2);
const qty = (n: number): string => String(n ?? 0);
const isoDate = (d: Date | string | undefined): string => {
  if (!d) return new Date().toISOString().slice(0, 10);
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toISOString().slice(0, 10);
};

/** Parse a free-form address object into UBL street/city/postal/country parts. */
function readAddress(addr: unknown): { line: string; city: string; postal: string } {
  const a = (addr ?? {}) as Record<string, unknown>;
  return {
    line: String(a.line1 ?? a.addressLine1 ?? a.street ?? a.line ?? ''),
    city: String(a.city ?? a.town ?? ''),
    postal: String(a.postalCode ?? a.postal_code ?? a.zip ?? ''),
  };
}

export function buildUblInvoiceXml(params: BuildUblParams): string {
  const { invoice, lines, seller } = params;
  const currency = (invoice.currency || 'EUR').toUpperCase();
  const customization = params.documentTypeId
    || 'urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0';
  const buyerAddr = readAddress(invoice.customerAddress);

  const lineXml = lines.map((l, i) => {
    const lineNet = (l.unitPrice ?? 0) * (l.quantity ?? 0);
    const ratePct = Math.round((l.taxRate ?? 0) * 10000) / 100; // 0.20 → 20
    return `  <cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">${qty(l.quantity)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${currency}">${money(lineNet)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${xmlEscape(l.description)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>${ratePct > 0 ? 'S' : 'Z'}</cbc:ID>
        <cbc:Percent>${money(ratePct)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${currency}">${money(l.unitPrice)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`;
  }).join('\n');

  // Per-rate tax summary (EN 16931 BG-23). One TaxSubtotal per rate when the
  // engine breakdown is present; otherwise a single subtotal at the doc rate.
  const breakdown = readTaxBreakdown(invoice.metadata) ?? [
    { ratePercent: invoice.subtotal > 0 ? Math.round((invoice.taxAmount / invoice.subtotal) * 10000) / 100 : 0, taxableAmount: invoice.subtotal, taxAmount: invoice.taxAmount },
  ];
  const taxSubtotalXml = breakdown.map((b) => `    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currency}">${money(b.taxableAmount)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currency}">${money(b.taxAmount)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>${b.ratePercent > 0 ? 'S' : 'Z'}</cbc:ID>
        <cbc:Percent>${money(b.ratePercent)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>${xmlEscape(customization)}</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${xmlEscape(invoice.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${isoDate(invoice.issueDate)}</cbc:IssueDate>
  ${invoice.dueDate ? `<cbc:DueDate>${isoDate(invoice.dueDate)}</cbc:DueDate>` : ''}
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      ${seller.endpointId ? `<cbc:EndpointID schemeID="0088">${xmlEscape(seller.endpointId)}</cbc:EndpointID>` : ''}
      <cac:PartyName><cbc:Name>${xmlEscape(seller.legalName)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${xmlEscape(seller.addressLine)}</cbc:StreetName>
        <cbc:CityName>${xmlEscape(seller.city)}</cbc:CityName>
        <cbc:PostalZone>${xmlEscape(seller.postalCode)}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>${xmlEscape(seller.countryCode)}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${xmlEscape(seller.vatNumber)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${xmlEscape(seller.legalName)}</cbc:RegistrationName>
        <cbc:CompanyID>${xmlEscape(seller.taxId)}</cbc:CompanyID>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${xmlEscape(invoice.customerName)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${xmlEscape(buyerAddr.line)}</cbc:StreetName>
        <cbc:CityName>${xmlEscape(buyerAddr.city)}</cbc:CityName>
        <cbc:PostalZone>${xmlEscape(buyerAddr.postal)}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>${xmlEscape(invoice.customerCountryCode)}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      ${invoice.customerTaxId ? `<cac:PartyTaxScheme>
        <cbc:CompanyID>${xmlEscape(invoice.customerTaxId)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>` : ''}
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${xmlEscape(invoice.customerName)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currency}">${money(invoice.taxAmount)}</cbc:TaxAmount>
${taxSubtotalXml}
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currency}">${money(invoice.subtotal)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currency}">${money(invoice.subtotal)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currency}">${money(invoice.totalAmount)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${currency}">${money(invoice.totalAmount)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${lineXml}
</Invoice>`;
}
