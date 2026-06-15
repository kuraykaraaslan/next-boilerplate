export const GIB_TEST_URL = 'https://earsivportaltest.efatura.gov.tr';
export const GIB_PROD_URL = 'https://earsivportal.efatura.gov.tr';

/**
 * Flat invoice payload the portal expects for `EARSIV_PORTAL_FATURA_OLUSTUR`.
 * Numbers are Turkish-formatted strings ("1.234,56"); dates are "dd/mm/yyyy".
 * Built by `tr_earsiv.adapter.ts#buildGibPortalInvoice`.
 */
export interface GibPortalInvoice {
  faturaUuid: string;
  belgeNumarasi: string;     // '' → portal auto-assigns
  faturaTarihi: string;      // dd/mm/yyyy
  saat: string;              // HH:MM:SS
  paraBirimi: string;        // 'TRY' | 'USD' | …
  dovizKuru: string;         // '0' for TRY
  faturaTipi: string;        // 'SATIS'
  vknTckn: string;           // recipient TCKN/VKN, or '11111111111' for retail
  aliciUnvan: string;        // company name (B2B)
  aliciAdi: string;          // first name (B2C)
  aliciSoyadi: string;       // last name (B2C)
  bulvarcaddesokak: string;
  mahalleSemtIlce: string;
  sehir: string;
  postaKodu: string;
  ulke: string;
  vergiDairesi: string;
  tel: string;
  eposta: string;
  malHizmetTable: GibPortalLine[];
  matrah: string;
  malhizmetToplamTutari: string;
  toplamIskonto: string;
  hesaplanankdv: string;
  vergilerToplami: string;
  vergilerDahilToplamTutar: string;
  odenecekTutar: string;
  not: string;
  [extra: string]: unknown;
}

export interface GibPortalLine {
  malHizmet: string;
  miktar: string;
  birim: string;             // 'C62'
  birimFiyat: string;
  fiyat: string;
  iskontoArttirim: string;   // 'İskonto'
  iskontoOrani: string;
  iskontoTutari: string;
  iskontoNedeni: string;
  malHizmetTutari: string;
  kdvOrani: string;          // '20'
  kdvTutari: string;
  vergiOrani: string;
  [extra: string]: unknown;
}

export interface GibDirectCreateResult {
  /** GİB UUID (the one we generated and the portal echoes back). */
  uuid: string;
  /** GİB document number (belge no / ETTN) once known. */
  documentNumber?: string;
  /** CREATED = draft exists but unsigned; SIGNED = finalised. */
  status: 'CREATED' | 'SIGNED' | 'REJECTED';
}

export interface DispatchResponse {
  data?: unknown;
  error?: string | null;
  messages?: Array<{ type?: string; text?: string }>;
}
