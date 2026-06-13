import type { Invoice } from '../entities/invoice.entity';
import type { InvoiceLine } from '../entities/invoice_line.entity';
import { xmlEscape, money, qty, pct, compactDate, readAddress } from './xml.util';

/**
 * UN/CEFACT Cross Industry Invoice (CII) D16B serialiser — the XML at the heart
 * of **ZUGFeRD 2.x (Germany)** and **Factur-X (France)**. Both are the same CII
 * syntax, differing only by the `GuidelineSpecifiedDocumentContextParameter` ID
 * (the conformance profile) and how the XML is delivered (embedded in a PDF/A-3
 * for the hybrid format, or sent standalone to Chorus Pro / a Peppol AP).
 *
 * This produces real, well-formed EN 16931-aligned CII — not a mock. Embedding
 * it into a PDF/A-3 (the hybrid container) is a separate rendering concern.
 */

export type CiiProfile = 'EN16931' | 'BASIC' | 'EXTENDED' | 'XRECHNUNG';

const PROFILE_URN: Record<CiiProfile, string> = {
  EN16931: 'urn:cen.eu:en16931:2017',
  BASIC: 'urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic',
  EXTENDED: 'urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:extended',
  XRECHNUNG: 'urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0',
};

export interface CiiParty {
  name: string;
  vatNumber: string;
  taxId: string;
  addressLine: string;
  city: string;
  postalCode: string;
  countryCode: string;
}

export interface BuildCiiParams {
  invoice: Invoice;
  lines: InvoiceLine[];
  seller: CiiParty;
  profile?: CiiProfile;
  /** 380 = invoice, 381 = credit note. */
  typeCode?: '380' | '381';
}

export function buildCiiInvoiceXml(params: BuildCiiParams): string {
  const { invoice, lines, seller } = params;
  const currency = (invoice.currency || 'EUR').toUpperCase();
  const profile = params.profile ?? 'EN16931';
  const typeCode = params.typeCode ?? '380';
  const buyerAddr = readAddress(invoice.customerAddress);

  const lineXml = lines.map((l, i) => {
    const lineNet = (l.unitPrice ?? 0) * (l.quantity ?? 0);
    const ratePct = pct(l.taxRate ?? 0);
    return `    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument><ram:LineID>${i + 1}</ram:LineID></ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct><ram:Name>${xmlEscape(l.description)}</ram:Name></ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice><ram:ChargeAmount>${money(l.unitPrice, 4)}</ram:ChargeAmount></ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="C62">${qty(l.quantity)}</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${Number(l.taxRate) > 0 ? 'S' : 'Z'}</ram:CategoryCode>
          <ram:RateApplicablePercent>${ratePct}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${money(lineNet)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>${xmlEscape(PROFILE_URN[profile])}</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${xmlEscape(invoice.invoiceNumber)}</ram:ID>
    <ram:TypeCode>${typeCode}</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">${compactDate(invoice.issueDate)}</udt:DateTimeString></ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
${lineXml}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${xmlEscape(seller.name)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${xmlEscape(seller.postalCode)}</ram:PostcodeCode>
          <ram:LineOne>${xmlEscape(seller.addressLine)}</ram:LineOne>
          <ram:CityName>${xmlEscape(seller.city)}</ram:CityName>
          <ram:CountryID>${xmlEscape(seller.countryCode)}</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${xmlEscape(seller.vatNumber)}</ram:ID></ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${xmlEscape(invoice.customerName)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${xmlEscape(buyerAddr.postal)}</ram:PostcodeCode>
          <ram:LineOne>${xmlEscape(buyerAddr.line)}</ram:LineOne>
          <ram:CityName>${xmlEscape(buyerAddr.city)}</ram:CityName>
          <ram:CountryID>${xmlEscape(invoice.customerCountryCode)}</ram:CountryID>
        </ram:PostalTradeAddress>
        ${invoice.customerTaxId ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${xmlEscape(invoice.customerTaxId)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${currency}</ram:InvoiceCurrencyCode>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${money(invoice.taxAmount)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${money(invoice.subtotal)}</ram:BasisAmount>
      </ram:ApplicableTradeTax>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${money(invoice.subtotal)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${money(invoice.subtotal)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${currency}">${money(invoice.taxAmount)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${money(invoice.totalAmount)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${money(invoice.totalAmount)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
}
