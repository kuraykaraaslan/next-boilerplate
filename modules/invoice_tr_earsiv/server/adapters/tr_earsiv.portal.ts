import { randomUUID } from 'node:crypto';
import type { Invoice } from '@kuraykaraaslan/invoice/server/entities/invoice.entity';
import type { InvoiceLine } from '@kuraykaraaslan/invoice/server/entities/invoice_line.entity';
import type { GibPortalInvoice } from '@kuraykaraaslan/invoice/server/adapters/tr_gib_direct.client';
import type { SellerInfo } from './tr_earsiv.seller';
import { trNum } from './tr_earsiv.format';

/**
 * Map our Invoice + lines to the flat JSON the free GİB portal expects for
 * `EARSIV_PORTAL_FATURA_OLUSTUR`. Numbers are TR-formatted ("1.234,56"),
 * date is dd/mm/yyyy. e-Arşiv is B2C: an 11-digit customerTaxId (TCKN) maps
 * to ad/soyad, a 10-digit one (VKN) to ünvan; no tax id → retail buyer.
 */
export function buildGibPortalInvoice(
  invoice: Invoice,
  lines: InvoiceLine[],
  seller: SellerInfo,
): GibPortalInvoice {
  void seller; // seller identity comes from the authenticated portal account
  const issue = invoice.issueDate;
  const dd = String(issue.getUTCDate()).padStart(2, '0');
  const mm = String(issue.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = issue.getUTCFullYear();

  const taxId = invoice.customerTaxId?.replace(/\D/g, '') ?? '';
  const isCompany = taxId.length === 10;
  const nameParts = (invoice.customerName ?? '').trim().split(/\s+/);
  const aliciSoyadi = !isCompany && nameParts.length > 1 ? nameParts.pop()! : '';
  const aliciAdi = !isCompany ? nameParts.join(' ') : '';

  const addr = (invoice.customerAddress ?? {}) as Record<string, string>;
  const currency = invoice.currency.toUpperCase();

  return {
    faturaUuid: invoice.earsivUuid || randomUUID(),
    belgeNumarasi: '',
    faturaTarihi: `${dd}/${mm}/${yyyy}`,
    saat: issue.toISOString().slice(11, 19),
    paraBirimi: currency === 'TRY' ? 'TRY' : currency,
    dovizKuru: currency === 'TRY' ? '0' : '1',
    faturaTipi: 'SATIS',
    vknTckn: taxId || '11111111111',
    aliciUnvan: isCompany ? invoice.customerName : '',
    aliciAdi,
    aliciSoyadi,
    bulvarcaddesokak: addr.line1 ?? addr.street ?? '',
    mahalleSemtIlce: addr.district ?? addr.line2 ?? '',
    sehir: addr.city ?? '',
    postaKodu: addr.postal ?? addr.postalCode ?? '',
    ulke: 'Türkiye',
    vergiDairesi: '',
    tel: '',
    eposta: invoice.customerEmail ?? '',
    malHizmetTable: lines.map((line) => {
      const lineSubtotal = Number(line.unitPrice) * Number(line.quantity);
      return {
        malHizmet: line.description,
        miktar: String(line.quantity),
        birim: 'C62',
        birimFiyat: trNum(Number(line.unitPrice)),
        fiyat: trNum(lineSubtotal),
        iskontoArttirim: 'İskonto',
        iskontoOrani: '0',
        iskontoTutari: '0',
        iskontoNedeni: '',
        malHizmetTutari: trNum(lineSubtotal),
        kdvOrani: String(Math.round(Number(line.taxRate) * 100)),
        kdvTutari: trNum(Number(line.taxAmount)),
        vergiOrani: '0',
      };
    }),
    matrah: trNum(Number(invoice.subtotal)),
    malhizmetToplamTutari: trNum(Number(invoice.subtotal)),
    toplamIskonto: trNum(Number(invoice.discountAmount)),
    hesaplanankdv: trNum(Number(invoice.taxAmount)),
    vergilerToplami: trNum(Number(invoice.taxAmount)),
    vergilerDahilToplamTutar: trNum(Number(invoice.totalAmount)),
    odenecekTutar: trNum(Number(invoice.totalAmount)),
    not: invoice.notes ?? '',
  };
}
