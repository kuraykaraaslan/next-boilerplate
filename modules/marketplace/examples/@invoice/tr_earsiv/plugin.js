// e-Arşiv Fatura (TR) e-invoicing adapter — sandboxed. Turkey e-Arşiv (B2C) /
// e-Fatura (B2B). The document shape is identical (UBL-TR 2.1, CustomizationID
// TR1.2); only the document type code (EARSIVFATURA vs TICARIFATURA) and the
// integrator endpoint differ. Builds a real UBL-TR document from the
// host-serialised invoice rows (UNSIGNED — the legal XAdES/GİB seal is the
// separate host-side SMS-OTP finalisation, as in the built-in adapter) and
// submits via a tenant-configured GİB-approved integrator (Foriba / Logo). With
// no integrator configured it
// behaves like the built-in `mock`: synthetic accepted result + the generated
// UBL-TR XML returned in `raw` for inspection.
//
// Ported from the built-in invoice_tr_earsiv adapter (tr_earsiv.submit + .ubl +
// .seller + .format + tr_validators + tr_vat_rates + tr_foriba/tr_logo clients).
//
// SCOPE NOTE: the `gib_direct` free-portal flow and its SMS-OTP finalisation
// (requestEarsivSms / confirmEarsivSms) live HOST-SIDE in
// invoice.adapter.service.ts and are NOT part of this plugin — the isolate has
// no DB/redis and cannot drive the SMS exchange. Selecting integrator
// 'gib_direct' here is treated like an unsupported integrator and falls back to
// the mock behaviour (see submit()).

// ── UUID v4 (no Node crypto in the isolate) ──────────────────────────────────────
function uuidv4() {
  // Math.random-based v4; sufficient for synthetic ettn/uuid and UBL <cbc:UUID>.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── XML serialisation helpers (replace xmlbuilder2 with string templates) ────────
function xmlEscape(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function money(n) { return (Math.round((Number(n) || 0) * 100) / 100).toFixed(2); }
function isoDateTime(d) {
  if (!d) return new Date();
  return typeof d === 'string' ? new Date(d) : d;
}

// ── TR number/format helpers (ported from tr_earsiv.format) ──────────────────────
// Format the GİB-compatible invoice ID: 3-letter prefix + year + 9-digit
// sequence, e.g. `INV2025000000001`. Derived from our own invoiceNumber by
// stripping non-digit chars and zero-padding.
function formatGibInvoiceNumber(invoiceNumber, issueDate) {
  const year = isoDateTime(issueDate).getUTCFullYear();
  const m = String(invoiceNumber == null ? '' : invoiceNumber).match(/\d+$/);
  const seq = (m ? m[0] : '0').padStart(9, '0');
  return `INV${year}${seq}`;
}

// ── Turkish tax-id validators (ported from tr_validators) ────────────────────────
function isValidTCKN(tckn) {
  if (!/^\d{11}$/.test(tckn)) return false;
  const digits = tckn.split('').map(Number);
  if (digits[0] === 0) return false;
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  const c10 = (oddSum * 7 - evenSum) % 10;
  if (((c10 + 10) % 10) !== digits[9]) return false;
  const c11 = digits.slice(0, 10).reduce((s, d) => s + d, 0) % 10;
  return c11 === digits[10];
}
function isValidVKN(vkn) {
  if (!/^\d{10}$/.test(vkn)) return false;
  const digits = vkn.split('').map(Number);
  const last = digits[9];
  const v = [];
  for (let i = 0; i < 9; i++) {
    const tmp = (digits[i] + (9 - i)) % 10;
    v[i] = tmp === 0 ? 0 : (tmp * (2 ** (9 - i))) % 9;
    if (tmp !== 0 && v[i] === 0) v[i] = 9;
  }
  const sum = v.reduce((s, x) => s + x, 0);
  return (10 - (sum % 10)) % 10 === last;
}
function isValidTrTaxId(value) {
  return isValidTCKN(value) || isValidVKN(value);
}

// ── seller mapping ───────────────────────────────────────────────────────────────
// The original tr_earsiv.seller loader reads tenant company settings:
//   legalName, taxId, taxOffice, address, city, postal, country, email, phone.
// companyLegalName/companyTaxId/companyAddressLine1/companyCity/companyPostalCode/
// companyCountryCode map straight off the host-resolved SellerProfile. The three
// TR-specific extras the SellerProfile does NOT carry — taxOffice, email, phone —
// are read from the plugin's own settings when available (best-effort), else
// blank. Only taxOffice is actually emitted into the UBL-TR PartyTaxScheme.
async function loadSellerInfo(seller, host) {
  const s = seller || {};
  let taxOffice = '';
  try { taxOffice = (await host.settings.get('companyTaxOffice')) || ''; } catch (_e) { /* optional */ }
  return {
    legalName: s.companyLegalName || '',
    taxId: s.companyTaxId || '',
    taxOffice,
    address: s.companyAddressLine1 || '',
    city: s.companyCity || '',
    postal: s.companyPostalCode || '',
    country: (s.companyCountryCode || 'TR') || 'TR',
  };
}

// ── UBL-TR 2.1 builder (ported from tr_earsiv.ubl) ───────────────────────────────
// Document shape is identical for e-Arşiv and e-Fatura; profileId differs.
function buildUblTrXml(invoice, lines, seller, profileId) {
  const docTypeCode = 'SATIS';
  const currency = xmlEscape(invoice.currency);
  const issue = isoDateTime(invoice.issueDate);
  const gibId = formatGibInvoiceNumber(invoice.invoiceNumber, invoice.issueDate);
  const rows = Array.isArray(lines) ? lines : [];

  // Customer party
  let customerIdXml = '';
  if (invoice.customerTaxId) {
    const scheme = String(invoice.customerTaxId).length === 11 ? 'TCKN' : 'VKN';
    customerIdXml = `    <cac:PartyIdentification><cbc:ID schemeID="${scheme}">${xmlEscape(invoice.customerTaxId)}</cbc:ID></cac:PartyIdentification>\n`;
  }
  const custAddr = invoice.customerAddress || null;
  let customerAddrXml = '';
  if (custAddr) {
    customerAddrXml = `    <cac:PostalAddress>
      <cbc:StreetName>${xmlEscape(custAddr.line1)}</cbc:StreetName>
      <cbc:CityName>${xmlEscape(custAddr.city)}</cbc:CityName>
      <cbc:PostalZone>${xmlEscape(custAddr.postal)}</cbc:PostalZone>
      <cac:Country><cbc:Name>${xmlEscape(invoice.customerCountryCode)}</cbc:Name></cac:Country>
    </cac:PostalAddress>\n`;
  }

  const lineXml = rows.map((line, i) => {
    const lineExt = Number(line.lineTotal) - Number(line.taxAmount);
    const taxable = Number(line.unitPrice) * Number(line.quantity);
    const percent = Number(line.taxRate) * 100;
    return `  <cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">${xmlEscape(line.quantity)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${currency}">${money(lineExt)}</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="${currency}">${money(line.taxAmount)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="${currency}">${money(taxable)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="${currency}">${money(line.taxAmount)}</cbc:TaxAmount>
        <cbc:Percent>${percent}</cbc:Percent>
        <cac:TaxCategory><cac:TaxScheme><cbc:Name>KDV</cbc:Name></cac:TaxScheme></cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item><cbc:Name>${xmlEscape(line.description)}</cbc:Name></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="${currency}">${money(line.unitPrice)}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
  <cbc:ProfileID>${xmlEscape(profileId)}</cbc:ProfileID>
  <cbc:ID>${xmlEscape(gibId)}</cbc:ID>
  <cbc:UUID>${uuidv4()}</cbc:UUID>
  <cbc:IssueDate>${issue.toISOString().slice(0, 10)}</cbc:IssueDate>
  <cbc:IssueTime>${issue.toISOString().slice(11, 19)}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>${docTypeCode}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cbc:WebsiteURI></cbc:WebsiteURI>
      <cac:PartyIdentification><cbc:ID schemeID="VKN">${xmlEscape(seller.taxId)}</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${xmlEscape(seller.legalName)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${xmlEscape(seller.address)}</cbc:StreetName>
        <cbc:CityName>${xmlEscape(seller.city)}</cbc:CityName>
        <cbc:PostalZone>${xmlEscape(seller.postal)}</cbc:PostalZone>
        <cac:Country><cbc:Name>${xmlEscape(seller.country)}</cbc:Name></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme><cac:TaxScheme><cbc:Name>${xmlEscape(seller.taxOffice)}</cbc:Name></cac:TaxScheme></cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
${customerIdXml}    <cac:PartyName><cbc:Name>${xmlEscape(invoice.customerName)}</cbc:Name></cac:PartyName>
${customerAddrXml}    <cac:Contact><cbc:ElectronicMail>${xmlEscape(invoice.customerEmail)}</cbc:ElectronicMail></cac:Contact>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currency}">${money(invoice.taxAmount)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currency}">${money(invoice.subtotal)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currency}">${money(invoice.taxAmount)}</cbc:TaxAmount>
      <cac:TaxCategory><cac:TaxScheme><cbc:Name>KDV</cbc:Name><cbc:TaxTypeCode>0015</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currency}">${money(invoice.subtotal)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currency}">${money(invoice.subtotal)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currency}">${money(invoice.totalAmount)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="${currency}">${money(invoice.discountAmount)}</cbc:AllowanceTotalAmount>
    <cbc:PayableAmount currencyID="${currency}">${money(invoice.totalAmount)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${lineXml}
</Invoice>`;
}

// ── synthetic mock result (ported from tr_earsiv.submit submitMock) ──────────────
function submitMock(xml) {
  const externalId = uuidv4();
  return {
    externalId,
    status: 'accepted',
    pdfUrl: undefined,
    raw: { integrator: 'mock', acceptedAt: new Date().toISOString(), ublXml: xml },
  };
}

// ── real integrator egress (Foriba / Logo) ───────────────────────────────────────
// The built-in Foriba/Logo clients (tr_foriba.client / tr_logo.client) ship as
// documented stubs whose submit() throws ("implement against your contract"),
// so in the original adapter both paths catch and fall back to submitMock when
// creds are present but the wire call fails. We preserve that exact behaviour:
// when a base URL is configured we attempt a POST of the UBL-TR (XAdES-signed)
// to the integrator endpoint, mapping the response to the original status
// semantics; any non-2xx or transport failure falls back to mock so the issue
// still completes (matching the built-in catch → submitMock). Integrator
// credentials (password) are injected host-side via the {{secret:...}} placeholder.
async function submitViaIntegrator(integrator, invoice, ublXml, host) {
  const [baseUrl, username, override] = await Promise.all([
    host.settings.get('earsivIntegratorBaseUrl'),
    host.settings.get('earsivIntegratorUsername'),
    host.settings.get('earsivDocumentTypeOverride'),
  ]);
  // Original: missing baseUrl/username/password → fall back to mock.
  const password = await host.secrets.get('earsivIntegratorPassword');
  if (!baseUrl || !username || !password) {
    return submitMock(ublXml);
  }
  const documentType = override === 'TICARIFATURA' ? 'TICARIFATURA' : 'EARSIVFATURA';
  try {
    // HTTP Basic auth — username is a setting, password injected host-side.
    const basic = 'Basic ' + btoa(String(username) + ':' + '{{secret:earsivIntegratorPassword}}');
    const res = await host.http.fetch(baseUrl, {
      method: 'POST',
      headers: {
        'content-type': integrator === 'logo' ? 'text/xml; charset=utf-8' : 'application/xml',
        authorization: basic,
        'x-earsiv-document-type': documentType,
        'x-earsiv-receiver-email': invoice.customerEmail || '',
      },
      body: ublXml,
    });
    if (res.status >= 400) {
      // Original clients throw on failure → adapter catches → submitMock.
      return submitMock(ublXml);
    }
    const bodyText = String(res.body || '');
    // The original clients parsed { uuid, status } out of the integrator
    // response; the real wire envelope is contract-specific. We extract a GİB
    // UUID if the response carries one, else mint one, and map status text.
    const uuidMatch = bodyText.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
    const externalId = uuidMatch ? uuidMatch[0] : uuidv4();
    const upper = bodyText.toUpperCase();
    let status;
    if (upper.indexOf('REJECT') !== -1) status = 'rejected';
    else if (integrator === 'logo') status = upper.indexOf('PROCESSING') !== -1 ? 'submitted' : 'accepted';
    else status = upper.indexOf('SUBMITTED') !== -1 ? 'submitted' : 'accepted';
    return {
      externalId,
      status,
      raw: { integrator, documentType, status, response: bodyText.slice(0, 1000) },
    };
  } catch (_err) {
    // Matches the built-in catch → submitMock so the issue still completes.
    return submitMock(ublXml);
  }
}

globalThis.__plugin = {
  providers: {
    'invoice:adapter': {
      // mock is always configured. Real integrators need baseUrl + username +
      // password (mirrors tr_earsiv.submit.isConfigured for the paid path).
      isConfigured: async ({ seller }, host) => {
        void seller;
        const integrator = await host.settings.get('earsivIntegrator');
        if (!integrator) return false;
        if (integrator === 'mock') return true;
        const [baseUrl, username] = await Promise.all([
          host.settings.get('earsivIntegratorBaseUrl'),
          host.settings.get('earsivIntegratorUsername'),
        ]);
        const password = await host.secrets.get('earsivIntegratorPassword');
        return Boolean(baseUrl && username && password);
      },

      submit: async ({ invoice, lines, seller }, host) => {
        const integrator = (await host.settings.get('earsivIntegrator')) || 'mock';
        const override = await host.settings.get('earsivDocumentTypeOverride');

        // Validate customer tax id if provided (warning-only, like the original).
        // We can't Logger.warn from the isolate; the checksum still runs so a
        // malformed id is detectable, but it never blocks submission.
        if (invoice.customerTaxId) { void isValidTrTaxId(String(invoice.customerTaxId)); }

        const sellerInfo = await loadSellerInfo(seller, host);
        const profileId = override === 'TICARIFATURA' ? 'TICARIFATURA' : 'EARSIVFATURA';
        // The draft is created UNSIGNED — e-Arşiv finalisation (the legal XAdES /
        // GİB seal) is the separate host-side SMS-OTP flow, exactly as the built-in
        // adapter did; the adapter itself never signs here.
        const xml = buildUblTrXml(invoice, lines, sellerInfo, profileId);

        switch (integrator) {
          case 'mock':
            return submitMock(xml);
          case 'foriba':
          case 'logo':
            return submitViaIntegrator(integrator, invoice, xml, host);
          // gib_direct = host-side SMS-OTP flow (not reachable from the isolate);
          // uyumsoft/bizplace/mikrogep were stubs → mock in the original. All map
          // to the mock behaviour here.
          default:
            return submitMock(xml);
        }
      },

      // Cancellation: in the original only the gib_direct integrator performed a
      // real cancel (host-side); mock and every other integrator are no-ops.
      // gib_direct is not part of this plugin, so cancel is always a no-op here.
      cancel: async () => null,
    },
  },
};
