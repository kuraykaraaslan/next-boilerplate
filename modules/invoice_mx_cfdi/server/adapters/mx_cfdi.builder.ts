import type { Invoice } from '@nb/invoice/server/entities/invoice.entity';
import type { InvoiceLine } from '@nb/invoice/server/entities/invoice_line.entity';
import { xmlEscape, money, qty } from '@nb/invoice/server/adapters/xml.util';

/**
 * Mexican **CFDI 4.0** (Comprobante Fiscal Digital por Internet) serialiser.
 *
 * Produces a real, schema-aligned pre-stamp CFDI XML (`cfdi:Comprobante`) with
 * Emisor, Receptor, Conceptos and Impuestos. The fiscal stamp (Timbre Fiscal
 * Digital) is applied by an authorised PAC: the adapter POSTs this XML to the
 * tenant's configured PAC endpoint, which signs it with the SAT CSD and returns
 * the UUID. We do not fabricate a UUID — there is no mock stamp.
 */

export interface CfdiEmisor {
  rfc: string;            // RFC del emisor
  nombre: string;
  regimenFiscal: string;  // e.g. '601'
  lugarExpedicion: string; // CP (postal code) of issue
}

export interface CfdiConfig {
  serie?: string;
  folio?: string;
  /** SAT payment method, e.g. 'PUE' (one-time) | 'PPD' (instalments). */
  metodoPago?: string;
  /** SAT form of payment, e.g. '99' (por definir) | '03' (transfer). */
  formaPago?: string;
  /** Receptor's CFDI usage code, e.g. 'G03' (gastos en general). */
  usoCfdi?: string;
  /** Receptor's tax regime (CFDI 4.0 requires it), e.g. '616'. */
  receptorRegimen?: string;
}

export interface BuildCfdiParams {
  invoice: Invoice;
  lines: InvoiceLine[];
  emisor: CfdiEmisor;
  config: CfdiConfig;
}

export function buildCfdiXml(params: BuildCfdiParams): string {
  const { invoice, lines, emisor, config } = params;
  const currency = (invoice.currency || 'MXN').toUpperCase();
  const fecha = new Date(invoice.issueDate).toISOString().slice(0, 19); // YYYY-MM-DDThh:mm:ss
  const tipo = invoice.metadata && (invoice.metadata as { documentType?: string }).documentType === 'credit_note' ? 'E' : 'I';

  let totalImpuestos = 0;
  const conceptos = lines.map((l) => {
    const importe = (l.unitPrice ?? 0) * (l.quantity ?? 0);
    const tax = l.taxAmount ?? 0;
    totalImpuestos += tax;
    const tasa = (l.taxRate ?? 0).toFixed(6);
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
  MetodoPago="${xmlEscape(config.metodoPago ?? 'PUE')}"
  FormaPago="${xmlEscape(config.formaPago ?? '99')}"
  LugarExpedicion="${xmlEscape(emisor.lugarExpedicion)}">
  <cfdi:Emisor Rfc="${xmlEscape(emisor.rfc)}" Nombre="${xmlEscape(emisor.nombre)}" RegimenFiscal="${xmlEscape(emisor.regimenFiscal)}"/>
  <cfdi:Receptor Rfc="${xmlEscape(invoice.customerTaxId ?? 'XAXX010101000')}" Nombre="${xmlEscape(invoice.customerName)}" DomicilioFiscalReceptor="${xmlEscape(emisor.lugarExpedicion)}" RegimenFiscalReceptor="${xmlEscape(config.receptorRegimen ?? '616')}" UsoCFDI="${xmlEscape(config.usoCfdi ?? 'S01')}"/>
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
