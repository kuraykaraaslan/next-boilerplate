import { randomUUID } from 'node:crypto';
import { create as createXml } from 'xmlbuilder2';
import type { Invoice } from '../entities/invoice.entity';
import type { InvoiceLine } from '../entities/invoice_line.entity';
import type { SellerInfo } from './tr_earsiv.seller';
import { formatGibInvoiceNumber } from './tr_earsiv.format';

export function buildUblTrXml(
  invoice: Invoice,
  lines: InvoiceLine[],
  seller: SellerInfo,
): string {
  const docTypeCode = 'SATIS';
  const profileId = 'EARSIVFATURA'; // override to 'TICARIFATURA' for B2B
  const gibId = formatGibInvoiceNumber(invoice.invoiceNumber, invoice.issueDate);

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
