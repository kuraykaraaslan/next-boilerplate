// Peppol BIS Billing 3.0 (EU) e-invoicing adapter — sandboxed. Builds a real
// UBL 2.1 / EN 16931 invoice document from the host-serialised rows and POSTs it
// (unsigned — the Access Point seals transport-level) to the tenant-configured
// Peppol Access Point. There is
// no mock fallback: with no Access Point configured submit() returns 'noop';
// when the Access Point call fails the error is surfaced. Ported from the
// built-in invoice_eu_peppol adapter (eu_peppol.adapter + eu_ubl + xml.util).

// ── shared serialisation helpers (ported from invoice/adapters/xml.util) ─────────
function xmlEscape(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function money(n) { return (Math.round((n || 0) * 100) / 100).toFixed(2); }
function qty(n) { return String(n == null ? 0 : n); }
function isoDate(d) {
  if (!d) return new Date().toISOString().slice(0, 10);
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toISOString().slice(0, 10);
}
function readAddress(addr) {
  const a = addr || {};
  return {
    line: String(a.line1 || a.addressLine1 || a.street || a.line || ''),
    city: String(a.city || a.town || ''),
    postal: String(a.postalCode || a.postal_code || a.zip || ''),
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

// ── UBL 2.1 builder (ported from invoice_eu_peppol/adapters/eu_ubl) ──────────────
function buildUblInvoiceXml(params) {
  const invoice = params.invoice;
  const lines = params.lines || [];
  const seller = params.seller;
  const currency = (invoice.currency || 'EUR').toUpperCase();
  const customization = params.documentTypeId
    || 'urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0';
  const buyerAddr = readAddress(invoice.customerAddress);

  const lineXml = lines.map((l, i) => {
    const lineNet = (l.unitPrice || 0) * (l.quantity || 0);
    const ratePct = Math.round((l.taxRate || 0) * 10000) / 100; // 0.20 → 20
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
  const breakdown = readTaxBreakdown(invoice.metadata) || [
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

// Map the host-resolved SellerProfile (tenant company settings) + plugin endpoint
// id onto the UBL supplier party.
function sellerParty(s, endpointId) {
  s = s || {};
  return {
    legalName: s.companyLegalName || '',
    taxId: s.companyTaxId || '',
    vatNumber: s.euVatNumber || s.companyTaxId || '',
    addressLine: s.companyAddressLine1 || '',
    city: s.companyCity || '',
    postalCode: s.companyPostalCode || '',
    countryCode: (s.companyCountryCode || 'EU').toUpperCase(),
    endpointId: endpointId || '',
  };
}

globalThis.__plugin = {
  providers: {
    'invoice:adapter': {
      // Configured only when BOTH a Peppol Endpoint ID and an Access Point URL
      // are set (mirrors the built-in adapter).
      isConfigured: async (_input, host) => {
        const cfg = await host.settings.getMany(['peppolEndpointId', 'peppolAccessPointUrl']);
        return Boolean(cfg && cfg.peppolEndpointId && cfg.peppolAccessPointUrl);
      },

      submit: async ({ invoice, lines, seller }, host) => {
        const cfg = await host.settings.getMany([
          'peppolAccessPointUrl', 'peppolEndpointId', 'peppolDocumentTypeId',
        ]);
        const accessPointUrl = cfg.peppolAccessPointUrl;
        const endpointId = cfg.peppolEndpointId;
        const docTypeId = cfg.peppolDocumentTypeId || undefined;

        // No Access Point configured → honestly do nothing (no fake document id).
        if (!accessPointUrl) {
          return { status: 'noop' };
        }

        // Peppol BIS UBL is transmitted UNSIGNED — the Access Point applies any
        // transport-level signature/AS4 sealing, so the built-in adapter never
        // XAdES-signed here (and neither do we).
        const xml = buildUblInvoiceXml({
          invoice,
          lines,
          seller: sellerParty(seller, endpointId),
          documentTypeId: docTypeId,
        });

        // Only attach the bearer token when one is configured (mirrors the
        // built-in adapter). The host substitutes {{secret:...}} so the isolate
        // never sees the raw token.
        const hasToken = Boolean(await host.secrets.get('peppolAccessPointToken'));
        const headers = { 'Content-Type': 'application/xml' };
        if (hasToken) headers.Authorization = 'Bearer {{secret:peppolAccessPointToken}}';

        const res = await host.http.fetch(accessPointUrl, {
          method: 'POST',
          headers,
          body: xml,
        });

        const responseText = String(res.body == null ? '' : res.body);
        if (res.status >= 400) {
          throw new Error('Peppol Access Point ' + res.status + ': ' + responseText.slice(0, 500));
        }

        // Best-effort extraction of the Access Point's document reference.
        let externalId;
        try {
          const json = JSON.parse(responseText);
          externalId = json.documentId || json.id || json.messageId;
        } catch (e) {
          const m = responseText.match(/<(?:DocumentId|MessageId|Id)>([^<]+)</i);
          externalId = m ? m[1] : undefined;
        }

        return {
          externalId,
          status: 'submitted',
          raw: { protocol: 'peppol-bis-3.0', accessPoint: accessPointUrl },
        };
      },

      // Peppol has no generic recall; cancellation is expressed as a credit note
      // on our side. Nothing to call on the Access Point.
      cancel: async () => null,
    },
  },
};
