// CFDI 4.0 (MX) e-invoicing adapter — sandboxed. Builds a real pre-stamp
// cfdi:Comprobante (Emisor, Receptor, Conceptos, Impuestos) and POSTs it to the
// tenant-configured PAC (Proveedor Autorizado de Certificación), which stamps it
// with the SAT CSD and returns the UUID (Timbre Fiscal Digital). We never
// fabricate a UUID — no PAC endpoint → status 'noop'; a failed stamp throws.
// The CFDI is stamped/timbrado by the PAC, not by us, so there is NO host-side
// XAdES signing here. Ported faithfully from the built-in invoice_mx_cfdi adapter.

// ── shared serialisation helpers (ported from invoice/adapters/xml.util) ─────────
function xmlEscape(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function money(n, dp) { dp = dp == null ? 2 : dp; return (Math.round((n || 0) * Math.pow(10, dp)) / Math.pow(10, dp)).toFixed(dp); }
function qty(n) { return String(n == null ? 0 : n); }

// ── CFDI 4.0 builder (ported from invoice_mx_cfdi/adapters/mx_cfdi.builder) ───────
// emisor = { rfc, nombre, regimenFiscal, lugarExpedicion }
// config = { serie?, folio?, metodoPago?, formaPago?, usoCfdi?, receptorRegimen? }
function buildCfdiXml(params) {
  const invoice = params.invoice;
  const lines = params.lines || [];
  const emisor = params.emisor;
  const config = params.config || {};
  const currency = (invoice.currency || 'MXN').toUpperCase();
  const fecha = new Date(invoice.issueDate).toISOString().slice(0, 19); // YYYY-MM-DDThh:mm:ss
  const tipo = invoice.metadata && invoice.metadata.documentType === 'credit_note' ? 'E' : 'I';

  let totalImpuestos = 0;
  const conceptos = lines.map((l) => {
    const importe = (l.unitPrice || 0) * (l.quantity || 0);
    const tax = l.taxAmount || 0;
    totalImpuestos += tax;
    const tasa = Number(l.taxRate || 0).toFixed(6);
    return `    <cfdi:Concepto ClaveProdServ="01010101" Cantidad="${qty(l.quantity)}" ClaveUnidad="ACT" Descripcion="${xmlEscape(l.description)}" ValorUnitario="${money(l.unitPrice, 2)}" Importe="${money(importe, 2)}" ObjetoImp="${tax > 0 ? '02' : '01'}">
      ${tax > 0 ? `<cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="${money(importe, 2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="${tasa}" Importe="${money(tax, 2)}"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>` : ''}
    </cfdi:Concepto>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd"
  Version="4.0"${config.serie ? ` Serie="${xmlEscape(config.serie)}"` : ''}${config.folio ? ` Folio="${xmlEscape(config.folio)}"` : ''}
  Fecha="${fecha}"
  Moneda="${currency}"
  SubTotal="${money(invoice.subtotal, 2)}"
  Total="${money(invoice.totalAmount, 2)}"
  TipoDeComprobante="${tipo}"
  Exportacion="01"
  MetodoPago="${xmlEscape(config.metodoPago || 'PUE')}"
  FormaPago="${xmlEscape(config.formaPago || '99')}"
  LugarExpedicion="${xmlEscape(emisor.lugarExpedicion)}">
  <cfdi:Emisor Rfc="${xmlEscape(emisor.rfc)}" Nombre="${xmlEscape(emisor.nombre)}" RegimenFiscal="${xmlEscape(emisor.regimenFiscal)}"/>
  <cfdi:Receptor Rfc="${xmlEscape(invoice.customerTaxId || 'XAXX010101000')}" Nombre="${xmlEscape(invoice.customerName)}" DomicilioFiscalReceptor="${xmlEscape(emisor.lugarExpedicion)}" RegimenFiscalReceptor="${xmlEscape(config.receptorRegimen || '616')}" UsoCFDI="${xmlEscape(config.usoCfdi || 'S01')}"/>
  <cfdi:Conceptos>
${conceptos}
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="${money(totalImpuestos, 2)}">
    <cfdi:Traslados>
      <cfdi:Traslado Base="${money(invoice.subtotal, 2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${money(totalImpuestos, 2)}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
</cfdi:Comprobante>`;
}

globalThis.__plugin = {
  providers: {
    'invoice:adapter': {
      // Tenant has configured a PAC endpoint to stamp the CFDI.
      isConfigured: async (_input, host) => Boolean(await host.settings.get('cfdiPacUrl')),

      submit: async ({ invoice, lines, seller }, host) => {
        const cfg = await host.settings.getMany([
          'cfdiPacUrl', 'cfdiRfcEmisor', 'cfdiRegimenFiscal', 'cfdiSerie',
          'cfdiUsoCfdi', 'cfdiMetodoPago', 'cfdiFormaPago', 'cfdiReceptorRegimen',
        ]);
        const pacUrl = cfg.cfdiPacUrl;
        const s = seller || {};

        // No PAC configured → we never synthesise a stamp. Return noop.
        if (!pacUrl) {
          return { status: 'noop' };
        }

        const xml = buildCfdiXml({
          invoice, lines,
          emisor: {
            rfc: cfg.cfdiRfcEmisor || '',
            nombre: s.companyLegalName || '',
            regimenFiscal: cfg.cfdiRegimenFiscal || '601',
            lugarExpedicion: s.companyPostalCode || '',
          },
          config: {
            serie: cfg.cfdiSerie || undefined,
            usoCfdi: cfg.cfdiUsoCfdi || undefined,
            metodoPago: cfg.cfdiMetodoPago || undefined,
            formaPago: cfg.cfdiFormaPago || undefined,
            receptorRegimen: cfg.cfdiReceptorRegimen || undefined,
          },
        });

        // Inject the PAC bearer token host-side (never seen by the isolate). The
        // original only sent Authorization when a token was set, so we add the
        // header conditionally on whether the secret exists.
        const hasToken = Boolean(await host.secrets.get('cfdiPacToken'));
        const headers = { 'content-type': 'application/xml' };
        if (hasToken) headers.authorization = 'Bearer {{secret:cfdiPacToken}}';

        const res = await host.http.fetch(pacUrl, { method: 'POST', headers, body: xml });
        const text = String(res.body == null ? '' : res.body);
        if (res.status >= 400) throw new Error('CFDI PAC ' + res.status + ': ' + text.slice(0, 500));

        // The PAC returns the Timbre Fiscal Digital UUID (folio fiscal) either as
        // JSON { uuid } or inside the stamped XML (UUID="...").
        let uuid;
        try {
          uuid = JSON.parse(text).uuid;
        } catch (e) {
          const m = text.match(/UUID="([^"]+)"/);
          uuid = m ? m[1] : undefined;
        }
        return { externalId: uuid, status: uuid ? 'accepted' : 'submitted', raw: { pac: pacUrl } };
      },

      // Cancellation requires submitting a cancelación to the PAC/SAT; the
      // built-in adapter only logs and performs no remote call here.
      cancel: async () => null,
    },
  },
};
