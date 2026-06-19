// FatturaPA / FatturaElettronica 1.2 (IT) e-invoicing adapter — sandboxed. Builds
// the real schema-aligned FatturaElettronica XML the SdI requires (DatiTrasmissione,
// CedentePrestatore, CessionarioCommittente, DatiGenerali, DatiBeniServizi,
// DatiRiepilogo), signs it host-side via host.crypto.signXml (the tenant seal key
// never enters the isolate — the SdI legally requires a digital signature), and —
// when a gateway is configured — POSTs it to the tenant's SdI intermediary. With no
// gateway it returns 'noop'. Ported from the built-in invoice_it_fatturapa adapter +
// invoice/adapters/xml.util.

// ── shared serialisation helpers (ported from invoice/adapters/xml.util) ─────────
function xmlEscape(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function money(n, dp) { dp = dp == null ? 2 : dp; return (Math.round((n || 0) * Math.pow(10, dp)) / Math.pow(10, dp)).toFixed(dp); }
function pct(rateDecimal) { return money(Math.round((rateDecimal || 0) * 10000) / 100); }
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
    region: String(a.region || a.state || a.province || ''),
  };
}

// ── FatturaElettronica 1.2 builder (ported from it_fatturapa.builder) ────────────
function buildFatturaPaXml(params) {
  const invoice = params.invoice;
  const lines = params.lines || [];
  const seller = params.seller;
  const config = params.config;
  const buyer = readAddress(invoice.customerAddress);
  const progressivo = (params.progressivoInvio || String(invoice.invoiceNumber).replace(/[^A-Za-z0-9]/g, '')).slice(-10);
  const docType = invoice.metadata && invoice.metadata.documentType === 'credit_note' ? 'TD04' : 'TD01';

  // Group lines by VAT rate for DatiRiepilogo.
  const byRate = new Map();
  const lineXml = lines.map((l, i) => {
    const lineNet = (l.unitPrice || 0) * (l.quantity || 0);
    const ratePct = pct(l.taxRate || 0);
    const bucket = byRate.get(ratePct) || { imponibile: 0, imposta: 0 };
    bucket.imponibile += lineNet;
    bucket.imposta += l.taxAmount || 0;
    byRate.set(ratePct, bucket);
    return `        <DettaglioLinee>
          <NumeroLinea>${i + 1}</NumeroLinea>
          <Descrizione>${xmlEscape(l.description)}</Descrizione>
          <Quantita>${money(l.quantity, 2)}</Quantita>
          <PrezzoUnitario>${money(l.unitPrice, 2)}</PrezzoUnitario>
          <PrezzoTotale>${money(lineNet, 2)}</PrezzoTotale>
          <AliquotaIVA>${ratePct}</AliquotaIVA>
        </DettaglioLinee>`;
  }).join('\n');

  const riepilogo = [...byRate.entries()].map(([ratePct, v]) => `        <DatiRiepilogo>
          <AliquotaIVA>${ratePct}</AliquotaIVA>
          <ImponibileImporto>${money(v.imponibile, 2)}</ImponibileImporto>
          <Imposta>${money(v.imposta, 2)}</Imposta>
        </DatiRiepilogo>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="${config.format}"
  xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>${xmlEscape(config.transmitterCountry)}</IdPaese>
        <IdCodice>${xmlEscape(config.transmitterCode)}</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>${xmlEscape(progressivo)}</ProgressivoInvio>
      <FormatoTrasmissione>${config.format}</FormatoTrasmissione>
      <CodiceDestinatario>${xmlEscape(config.codiceDestinatario)}</CodiceDestinatario>
      ${config.pecDestinatario ? `<PECDestinatario>${xmlEscape(config.pecDestinatario)}</PECDestinatario>` : ''}
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA><IdPaese>${xmlEscape(seller.countryCode)}</IdPaese><IdCodice>${xmlEscape(seller.vatNumber)}</IdCodice></IdFiscaleIVA>
        ${seller.taxCode ? `<CodiceFiscale>${xmlEscape(seller.taxCode)}</CodiceFiscale>` : ''}
        <Anagrafica><Denominazione>${xmlEscape(seller.legalName)}</Denominazione></Anagrafica>
        <RegimeFiscale>${xmlEscape(seller.regimeFiscale)}</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${xmlEscape(seller.addressLine)}</Indirizzo>
        <CAP>${xmlEscape(seller.postalCode)}</CAP>
        <Comune>${xmlEscape(seller.city)}</Comune>
        ${seller.province ? `<Provincia>${xmlEscape(seller.province)}</Provincia>` : ''}
        <Nazione>${xmlEscape(seller.countryCode)}</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        ${invoice.customerTaxId ? `<IdFiscaleIVA><IdPaese>${xmlEscape(invoice.customerCountryCode)}</IdPaese><IdCodice>${xmlEscape(invoice.customerTaxId)}</IdCodice></IdFiscaleIVA>` : ''}
        <Anagrafica><Denominazione>${xmlEscape(invoice.customerName)}</Denominazione></Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${xmlEscape(buyer.line)}</Indirizzo>
        <CAP>${xmlEscape(buyer.postal)}</CAP>
        <Comune>${xmlEscape(buyer.city)}</Comune>
        <Nazione>${xmlEscape(invoice.customerCountryCode)}</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>${docType}</TipoDocumento>
        <Divisa>${(invoice.currency || 'EUR').toUpperCase()}</Divisa>
        <Data>${isoDate(invoice.issueDate)}</Data>
        <Numero>${xmlEscape(invoice.invoiceNumber)}</Numero>
        <ImportoTotaleDocumento>${money(invoice.totalAmount, 2)}</ImportoTotaleDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
${lineXml}
${riepilogo}
    </DatiBeniServizi>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`;
}

// Map the host-resolved SellerProfile (tenant company settings) onto the FatturaPA
// CedentePrestatore party. The VAT number drops a leading 'IT' prefix (IdCodice is
// the numeric part of the Partita IVA). companyProvince comes from the seller.
function sellerParty(s, regimeFiscale) {
  s = s || {};
  const vat = String(s.euVatNumber || s.companyTaxId || '').replace(/^IT/i, '');
  return {
    legalName: s.companyLegalName || '',
    vatNumber: vat,
    countryCode: (s.companyCountryCode || 'IT').toUpperCase(),
    taxCode: s.companyTaxId || undefined,
    addressLine: s.companyAddressLine1 || '',
    city: s.companyCity || '',
    postalCode: s.companyPostalCode || '',
    province: s.companyProvince || undefined,
    regimeFiscale: regimeFiscale || 'RF01',
  };
}

globalThis.__plugin = {
  providers: {
    'invoice:adapter': {
      // Configured when a gateway URL is set (mirrors the original isConfigured).
      isConfigured: async (_input, host) => Boolean(await host.settings.get('fatturapaGatewayUrl')),

      submit: async ({ invoice, lines, seller }, host) => {
        const cfg = await host.settings.getMany([
          'fatturapaGatewayUrl',
          'fatturapaTransmitterCountry',
          'fatturapaTransmitterCode',
          'fatturapaCodiceDestinatario',
          'fatturapaPecDestinatario',
          'fatturapaFormat',
          'fatturapaRegimeFiscale',
        ]);
        const gatewayUrl = cfg.fatturapaGatewayUrl;

        // No gateway → build nothing, return noop (matches the original).
        if (!gatewayUrl) {
          return { status: 'noop' };
        }

        const party = sellerParty(seller, cfg.fatturapaRegimeFiscale);
        let xml = buildFatturaPaXml({
          invoice, lines,
          seller: party,
          config: {
            transmitterCountry: cfg.fatturapaTransmitterCountry || party.countryCode,
            transmitterCode: cfg.fatturapaTransmitterCode || party.vatNumber,
            codiceDestinatario: cfg.fatturapaCodiceDestinatario || '0000000',
            pecDestinatario: cfg.fatturapaPecDestinatario || undefined,
            format: cfg.fatturapaFormat || 'FPR12',
          },
        });

        // SdI requires a signed file; sign host-side (XAdES via the tenant seal cert,
        // no-op if no seal configured). The seal key never enters the isolate.
        xml = await host.crypto.signXml(xml);

        const res = await host.http.fetch(gatewayUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/xml', authorization: 'Bearer {{secret:fatturapaGatewayToken}}' },
          body: xml,
        });
        if (res.status >= 400) throw new Error('FatturaPA gateway ' + res.status + ': ' + String(res.body).slice(0, 500));

        // externalId = SdI identifier from the gateway's JSON response, when present.
        let externalId;
        try {
          const j = JSON.parse(String(res.body));
          externalId = j.sdiId || j.identificativoSdI || j.id;
        } catch (_e) { /* non-JSON response */ }

        return { externalId, status: 'submitted', raw: { gateway: gatewayUrl, response: String(res.body).slice(0, 1000) } };
      },

      // Cancellation in Italy is a nota di credito (TD04) issued on our side — no
      // transmission to undo here.
      cancel: async () => null,
    },
  },
};
