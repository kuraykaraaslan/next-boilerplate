// ZUGFeRD / XRechnung (DE) e-invoicing adapter — sandboxed. Generates real
// EN 16931-aligned UN/CEFACT CII (the XML at the heart of ZUGFeRD 2.x), signs it
// host-side via host.crypto.signXml (the tenant seal key never enters the isolate),
// and — when a gateway is configured — POSTs it. With no gateway it returns the CII
// in `raw` for PDF/A-3 embedding (status 'noop'). Ported from the built-in
// invoice/cii_xml + invoice_de_zugferd adapter.

// ── shared serialisation helpers (ported from invoice/adapters/xml.util) ─────────
function xmlEscape(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function money(n, dp) { dp = dp == null ? 2 : dp; return (Math.round((n || 0) * Math.pow(10, dp)) / Math.pow(10, dp)).toFixed(dp); }
function qty(n) { return String(n == null ? 0 : n); }
function pct(rateDecimal) { return money(Math.round((rateDecimal || 0) * 10000) / 100); }
function isoDate(d) {
  if (!d) return new Date().toISOString().slice(0, 10);
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toISOString().slice(0, 10);
}
function compactDate(d) { return isoDate(d).replace(/-/g, ''); }
function readAddress(addr) {
  const a = addr || {};
  return {
    line: String(a.line1 || a.addressLine1 || a.street || a.line || ''),
    city: String(a.city || a.town || ''),
    postal: String(a.postalCode || a.postal_code || a.zip || ''),
    region: String(a.region || a.state || a.province || ''),
  };
}
function readTaxBreakdown(metadata) {
  const md = metadata || {};
  if (!Array.isArray(md.taxBreakdown) || md.taxBreakdown.length === 0) return null;
  const rows = md.taxBreakdown.map((r) => ({
    ratePercent: Number(r.ratePercent) || 0,
    taxableAmount: Number(r.taxableAmount) || 0,
    taxAmount: Number(r.taxAmount) || 0,
  })).filter((r) => r.taxableAmount > 0 || r.taxAmount > 0);
  return rows.length > 0 ? rows : null;
}

// ── CII builder (ported from invoice/adapters/cii_xml) ───────────────────────────
const PROFILE_URN = {
  EN16931: 'urn:cen.eu:en16931:2017',
  BASIC: 'urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic',
  EXTENDED: 'urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:extended',
  XRECHNUNG: 'urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0',
};

function buildCiiInvoiceXml(params) {
  const invoice = params.invoice;
  const lines = params.lines || [];
  const seller = params.seller;
  const currency = (invoice.currency || 'EUR').toUpperCase();
  const profile = PROFILE_URN[params.profile] ? params.profile : 'EN16931';
  const typeCode = params.typeCode || '380';
  const buyerAddr = readAddress(invoice.customerAddress);

  const lineXml = lines.map((l, i) => {
    const lineNet = (l.unitPrice || 0) * (l.quantity || 0);
    const ratePct = pct(l.taxRate || 0);
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

  const breakdown = readTaxBreakdown(invoice.metadata) || [
    { ratePercent: invoice.subtotal > 0 ? Math.round((invoice.taxAmount / invoice.subtotal) * 10000) / 100 : 0, taxableAmount: invoice.subtotal, taxAmount: invoice.taxAmount },
  ];

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
${breakdown.map((b) => `      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${money(b.taxAmount)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${money(b.taxableAmount)}</ram:BasisAmount>
        <ram:CategoryCode>${b.ratePercent > 0 ? 'S' : 'Z'}</ram:CategoryCode>
        <ram:RateApplicablePercent>${money(b.ratePercent)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>`).join('\n')}
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

// Map the host-resolved SellerProfile (tenant company settings) onto the CII party.
function sellerParty(s) {
  s = s || {};
  return {
    name: s.companyLegalName || '',
    vatNumber: s.euVatNumber || s.companyTaxId || '',
    taxId: s.companyTaxId || '',
    addressLine: s.companyAddressLine1 || '',
    city: s.companyCity || '',
    postalCode: s.companyPostalCode || '',
    countryCode: (s.companyCountryCode || 'DE').toUpperCase(),
  };
}

globalThis.__plugin = {
  providers: {
    'invoice:adapter': {
      // Germany can always generate the document; gateway transmission is optional.
      isConfigured: async () => true,

      submit: async ({ invoice, lines, seller }, host) => {
        const gatewayUrl = await host.settings.get('zugferdGatewayUrl');
        const profile = (await host.settings.get('zugferdProfile')) || 'EN16931';

        let xml = buildCiiInvoiceXml({ invoice, lines, seller: sellerParty(seller), profile });
        xml = await host.crypto.signXml(xml); // XAdES host-side; no-op if no seal configured

        if (!gatewayUrl) {
          return { status: 'noop', raw: { format: 'cii', xml } };
        }
        const res = await host.http.fetch(gatewayUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/xml', authorization: 'Bearer {{secret:zugferdGatewayToken}}' },
          body: xml,
        });
        if (res.status >= 400) throw new Error('ZUGFeRD gateway ' + res.status + ': ' + String(res.body).slice(0, 500));
        return { status: 'submitted', raw: { gateway: gatewayUrl, response: String(res.body).slice(0, 1000) } };
      },

      // Cancellation in Germany is a credit note (TypeCode 381) on our side — no
      // transmission to undo here.
      cancel: async () => null,
    },
  },
};
