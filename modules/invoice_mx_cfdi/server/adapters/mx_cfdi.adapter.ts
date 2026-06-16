import SettingService from '@nb/setting/server/setting.service';
import Logger from '@nb/logger';
import type { InvoiceAdapter, InvoiceAdapterSubmitResult } from '@nb/invoice/server/adapters/base.adapter';
import type { Invoice } from '@nb/invoice/server/entities/invoice.entity';
import type { InvoiceLine } from '@nb/invoice/server/entities/invoice_line.entity';
import { buildCfdiXml } from './mx_cfdi.builder';

/**
 * Mexico — **CFDI 4.0**. We build the real pre-stamp CFDI XML and POST it to the
 * tenant's configured PAC (Proveedor Autorizado de Certificación), which stamps
 * it with the SAT CSD and returns the UUID (Timbre Fiscal Digital). No mock:
 * without a PAC endpoint we return `noop`; a failed stamp throws. We never
 * synthesise a UUID.
 */
export class MxCfdiAdapter implements InvoiceAdapter {
  readonly region = 'MX';

  async isConfigured(tenantId: string): Promise<boolean> {
    return Boolean(await SettingService.getValue(tenantId, 'cfdiPacUrl'));
  }

  async submit(tenantId: string, invoice: Invoice, lines: InvoiceLine[]): Promise<InvoiceAdapterSubmitResult> {
    const [pacUrl, token, cfg, seller] = await Promise.all([
      SettingService.getValue(tenantId, 'cfdiPacUrl'),
      SettingService.getValue(tenantId, 'cfdiPacToken'),
      SettingService.getByKeys(tenantId, ['cfdiRfcEmisor', 'cfdiRegimenFiscal', 'cfdiSerie', 'cfdiUsoCfdi', 'cfdiMetodoPago', 'cfdiFormaPago', 'cfdiReceptorRegimen']),
      SettingService.getByKeys(tenantId, ['companyLegalName', 'companyPostalCode']),
    ]);

    if (!pacUrl) {
      Logger.info(`[MxCfdi] no PAC configured for ${invoice.invoiceNumber} → noop`);
      return { status: 'noop' };
    }

    const xml = buildCfdiXml({
      invoice, lines,
      emisor: {
        rfc: cfg.cfdiRfcEmisor ?? '',
        nombre: seller.companyLegalName ?? '',
        regimenFiscal: cfg.cfdiRegimenFiscal ?? '601',
        lugarExpedicion: seller.companyPostalCode ?? '',
      },
      config: {
        serie: cfg.cfdiSerie ?? undefined,
        usoCfdi: cfg.cfdiUsoCfdi ?? undefined,
        metodoPago: cfg.cfdiMetodoPago ?? undefined,
        formaPago: cfg.cfdiFormaPago ?? undefined,
        receptorRegimen: cfg.cfdiReceptorRegimen ?? undefined,
      },
    });

    const res = await fetch(pacUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: xml,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`CFDI PAC ${res.status}: ${text.slice(0, 500)}`);

    let uuid: string | undefined;
    try { uuid = (JSON.parse(text) as { uuid?: string; UUID?: string }).uuid; } catch {
      uuid = text.match(/UUID="([^"]+)"/)?.[1];
    }
    Logger.info(`[MxCfdi] stamped ${invoice.invoiceNumber} → ${uuid ?? '(no uuid)'}`);
    return { externalId: uuid, status: uuid ? 'accepted' : 'submitted', raw: { pac: pacUrl } };
  }

  async cancel(_tenantId: string, invoice: Invoice, reason?: string): Promise<void> {
    Logger.info(`[MxCfdi] cancel ${invoice.invoiceNumber} reason=${reason ?? '-'} — submit a cancelación to the PAC/SAT`);
  }
}

export default MxCfdiAdapter;
