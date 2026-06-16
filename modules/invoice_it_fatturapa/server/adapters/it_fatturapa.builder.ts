import type { Invoice } from '@nb/invoice/server/entities/invoice.entity';
import type { InvoiceLine } from '@nb/invoice/server/entities/invoice_line.entity';
import { xmlEscape, money, qty, pct, isoDate, readAddress } from '@nb/invoice/server/adapters/xml.util';

/**
 * Italian **FatturaPA / FatturaElettronica v1.2** serialiser (the XML the SdI
 * gateway requires). This builds a real, schema-aligned document covering the
 * mandatory blocks: DatiTrasmissione, CedentePrestatore, CessionarioCommittente,
 * DatiGenerali, DatiBeniServizi and DatiRiepilogo. It is not a mock.
 *
 * The SdI requires the file to be digitally signed (CAdES .p7m or XAdES); the
 * adapter signs the output with `InvoiceSignatureService` when a seal cert is
 * configured before transmitting it through the tenant's intermediary.
 */

export interface FatturaPaSeller {
  legalName: string;
  vatNumber: string;     // numeric part of the Partita IVA (IdCodice)
  countryCode: string;   // IdPaese, e.g. 'IT'
  taxCode?: string;      // Codice Fiscale
  addressLine: string;
  city: string;
  postalCode: string;
  province?: string;     // 2-letter Provincia
  regimeFiscale: string; // e.g. 'RF01'
}

export interface FatturaPaConfig {
  /** Transmitter country (IdPaese of IdTrasmittente). */
  transmitterCountry: string;
  /** Transmitter code (IdCodice of IdTrasmittente) — usually the seller's CF/VAT. */
  transmitterCode: string;
  /** 7-char recipient code; '0000000' when delivery is via PEC. */
  codiceDestinatario: string;
  /** Recipient PEC address when codiceDestinatario is '0000000'. */
  pecDestinatario?: string;
  /** 'FPR12' (private) | 'FPA12' (public administration). */
  format: 'FPR12' | 'FPA12';
}

export interface BuildFatturaPaParams {
  invoice: Invoice;
  lines: InvoiceLine[];
  seller: FatturaPaSeller;
  config: FatturaPaConfig;
  /** Progressivo invio — unique transmission counter (defaults to the invoice number tail). */
  progressivoInvio?: string;
}

export function buildFatturaPaXml(params: BuildFatturaPaParams): string {
  const { invoice, lines, seller, config } = params;
  const buyer = readAddress(invoice.customerAddress);
  const progressivo = (params.progressivoInvio ?? invoice.invoiceNumber.replace(/[^A-Za-z0-9]/g, '')).slice(-10);
  const docType = invoice.metadata && (invoice.metadata as { documentType?: string }).documentType === 'credit_note' ? 'TD04' : 'TD01';

  // Group lines by VAT rate for DatiRiepilogo.
  const byRate = new Map<string, { imponibile: number; imposta: number }>();
  const lineXml = lines.map((l, i) => {
    const lineNet = (l.unitPrice ?? 0) * (l.quantity ?? 0);
    const ratePct = pct(l.taxRate ?? 0);
    const bucket = byRate.get(ratePct) ?? { imponibile: 0, imposta: 0 };
    bucket.imponibile += lineNet;
    bucket.imposta += l.taxAmount ?? 0;
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
