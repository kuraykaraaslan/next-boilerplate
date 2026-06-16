/**
 * Direct GİB e-Arşiv Portal client — https://earsivportal.efatura.gov.tr/
 *
 * Why direct?
 *   Small businesses (and many freelancers) in TR don't pay an integrator —
 *   they use GİB's free public portal directly. The portal exposes a REST/
 *   AJAX surface (not officially documented, reverse-engineered from the
 *   browser) which is stable enough for production for low-volume issuers.
 *
 * Setup per tenant (Settings → Integrations → Invoicing / e-Arşiv):
 *   • earsivIntegrator           = 'gib_direct'
 *   • earsivIntegratorUsername   = TCKN (11 digits) or VKN (10 digits)
 *   • earsivIntegratorPassword   = your portal password
 *   • earsivIntegratorSandbox    = 'true' (TEST, default) | 'false' (PROD)
 *   • earsivIntegratorBaseUrl    = (optional override; defaults to the GİB TEST
 *                                   portal `https://earsivportaltest.efatura.gov.tr`)
 *
 * Contract
 *   The portal does NOT accept UBL-TR XML. It takes a flat JSON invoice
 *   object on `/earsiv-services/dispatch` and builds the UBL itself. The
 *   request shapes below match the publicly-known portal contract (the same
 *   one used by mlevent/fatura, furkankadioglu/e-arsiv, …). GİB rotates
 *   these periodically — verify against the live/TEST portal with real
 *   credentials before flipping `earsivIntegratorSandbox` to 'false'.
 *
 * Finalisation (imzalama)
 *   `createDraft()` produces a real e-Arşiv document with a belge/ETTN, but it
 *   is created UNSIGNED ("Onaylanmadı"). Making it legally final requires an
 *   SMS-OTP step (`sendSmsCode()` → operator reads the code → `verifySmsCode()`).
 *   That OTP cannot be completed unattended from a webhook — see InvoiceService
 *   / the Invoices admin UI for the two-step signing flow.
 *
 * Limits
 *   • GİB e-Arşiv Portal is rate-limited (a few hundred docs/day per account).
 *     High-volume issuers must use a paid integrator (Foriba / Logo).
 *   • The portal can only issue e-Arşiv (B2C). For e-Fatura (B2B) you need
 *     an integrator with a GİB-approved API.
 */
import { randomUUID } from 'node:crypto';
import axios, { AxiosInstance } from 'axios';
import Logger from '@nb/logger';
import {
  GIB_TEST_URL, GIB_PROD_URL,
  type GibPortalInvoice, type GibDirectCreateResult, type DispatchResponse,
} from './tr_gib_direct.types';

// Re-exported so existing `tr_gib_direct.client` import sites keep working.
export { GIB_TEST_URL, GIB_PROD_URL };
export type { GibPortalInvoice, GibPortalLine, GibDirectCreateResult } from './tr_gib_direct.types';

export class GibDirectClient {
  private readonly client: AxiosInstance;
  private token: string | null = null;

  constructor(private readonly opts: {
    username: string;     // TCKN / VKN
    password: string;
    baseUrl?: string;     // override the default TEST / PROD URL
    sandbox?: boolean;    // pick the TEST endpoint when no baseUrl is given (default true)
  }) {
    const base = opts.baseUrl || (opts.sandbox === false ? GIB_PROD_URL : GIB_TEST_URL);
    this.client = axios.create({
      baseURL: base.replace(/\/+$/, ''),
      timeout: 30_000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: '*/*',
        'User-Agent': 'Mozilla/5.0 (compatible; next-boilerplate/earsiv)',
      },
    });
  }

  /**
   * Acquire a session token. The portal's `assos-login` endpoint accepts a
   * form-urlencoded body and returns `{ token }`. The command differs between
   * the TEST portal (`login`) and PROD (`anologin`).
   */
  async login(): Promise<string> {
    if (this.token) return this.token;
    const cmd = this.opts.sandbox === false ? 'anologin' : 'login';
    const body = new URLSearchParams({
      assoscmd: cmd,
      rtype: 'json',
      userid: this.opts.username,
      sifre: this.opts.password,
      sifre2: this.opts.password,
      parola: '1',
    });
    const resp = await this.client.post('/earsiv-services/assos-login', body);
    const token = (resp.data as { token?: string })?.token;
    if (!token) {
      throw new Error(`GibDirect login failed — no token returned (check TCKN/VKN + password)`);
    }
    this.token = token;
    return token;
  }

  /**
   * Low-level call against `/earsiv-services/dispatch`. Every portal action is
   * a `cmd` + `pageName` + JSON `jp` payload, authenticated by the session token.
   */
  private async dispatch(cmd: string, pageName: string, payload: unknown): Promise<DispatchResponse> {
    if (!this.token) await this.login();
    const body = new URLSearchParams({
      cmd,
      callid: randomUUID(),
      pageName,
      token: this.token!,
      jp: JSON.stringify(payload ?? {}),
    });
    const resp = await this.client.post('/earsiv-services/dispatch', body);
    const data = resp.data as DispatchResponse;
    if (data?.error) {
      throw new Error(`GibDirect ${cmd} error: ${data.error}`);
    }
    return data;
  }

  /** Create an UNSIGNED e-Arşiv draft. Returns the UUID + (best-effort) belge no. */
  async createDraft(invoice: GibPortalInvoice): Promise<GibDirectCreateResult> {
    await this.dispatch('EARSIV_PORTAL_FATURA_OLUSTUR', 'RG_BASITFATURA', invoice);
    let documentNumber: string | undefined;
    try {
      const info = await this.getInvoice(invoice.faturaUuid);
      documentNumber = info?.belgeNumarasi;
    } catch (err) {
      Logger.warn(`[GibDirect] created ${invoice.faturaUuid} but belge no lookup failed: ${err instanceof Error ? err.message : err}`);
    }
    return { uuid: invoice.faturaUuid, documentNumber, status: 'CREATED' };
  }

  /** Read back a created invoice (belgeNumarasi / onayDurumu). */
  async getInvoice(uuid: string): Promise<{ belgeNumarasi?: string; onayDurumu?: string } | null> {
    const resp = await this.dispatch('EARSIV_PORTAL_FATURA_GETIR', 'RG_BASITTASLAKLAR', { faturaUuid: uuid });
    const data = resp.data as { belgeNumarasi?: string; onayDurumu?: string } | undefined;
    return data ?? null;
  }

  /**
   * List the day's drafts so the caller can pass the matching rows to
   * `verifySmsCode`. Dates are "dd/mm/yyyy".
   */
  async listDrafts(startDate: string, endDate: string): Promise<Array<Record<string, unknown>>> {
    const resp = await this.dispatch('EARSIV_PORTAL_TASLAKLAR_GETIR', 'RG_BASITTASLAKLAR', {
      baslangic: startDate,
      bitis: endDate,
      hangiTip: '5000',
      table: [],
    });
    const data = resp.data;
    return Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
  }

  /** Step 1 of signing — sends an OTP to the account's registered phone. Returns the `oid`. */
  async sendSmsCode(): Promise<string> {
    const resp = await this.dispatch('EARSIV_PORTAL_SMSSIFRE_GONDER', 'RG_SMSONAY', {});
    const oid = (resp.data as { oid?: string })?.oid;
    if (!oid) throw new Error('GibDirect sendSmsCode failed — no oid returned');
    return oid;
  }

  /**
   * Step 2 of signing — verifies the OTP and finalises (imzalar) the given
   * draft rows. `drafts` are the row objects from `listDrafts`.
   */
  async verifySmsCode(oid: string, code: string, drafts: Array<Record<string, unknown>>): Promise<void> {
    await this.dispatch('EARSIV_PORTAL_SMSSIFRE_DOGRULA', 'RG_SMSONAY', {
      SIFRE: code,
      OID: oid,
      OPR: 1,
      DATA: drafts,
    });
  }

  /** Cancel / delete an unsigned draft. (Signed e-Arşiv documents are cancelled via an iptal request.) */
  async cancel(uuid: string, reason: string): Promise<void> {
    await this.dispatch('EARSIV_PORTAL_FATURA_SIL', 'RG_TASLAKLAR', {
      silinecekler: [{ ettn: uuid }],
      aciklama: reason,
    });
  }

  /** Fetch the GİB-rendered HTML for a document (base64 or raw HTML). */
  async getInvoiceHtml(uuid: string): Promise<string> {
    const resp = await this.dispatch('EARSIV_PORTAL_FATURA_GOSTER', 'RG_TASLAKLAR', { ettn: uuid, onayDurumu: 'Onaylandı' });
    return typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data ?? '');
  }
}
