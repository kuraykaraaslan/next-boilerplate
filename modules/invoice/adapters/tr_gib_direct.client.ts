/**
 * Direct GİB e-Arşiv Portal client — https://earsivportal.efatura.gov.tr/
 *
 * Why direct?
 *   Small businesses (and many freelancers) in TR don't pay an integrator —
 *   they use GİB's free public portal directly. The portal exposes a REST/
 *   AJAX surface (not officially documented, reverse-engineered from the
 *   browser) which is stable enough for production for low-volume issuers.
 *
 * Setup per tenant (Settings → Integrations → Invoicing → TR):
 *   • earsivIntegrator           = 'gib_direct'
 *   • earsivIntegratorUsername   = TCKN (11 digits) or VKN (10 digits)
 *   • earsivIntegratorPassword   = your portal password
 *   • earsivIntegratorBaseUrl    = (optional override; defaults to TEST sandbox
 *                                   `https://earsivportaltestifi.izibiz.com.tr/` —
 *                                   set the production URL once you're past TEST)
 *
 * Limits
 *   • GİB e-Arşiv Portal is rate-limited (a few hundred docs/day per account).
 *     High-volume issuers must use a paid integrator (Foriba / Logo).
 *   • The portal can only issue e-Arşiv (B2C). For e-Fatura (B2B) you need
 *     an integrator with a GİB-approved API.
 *
 * NOTE: The endpoints below match the publicly-known portal request shapes,
 * but GİB changes them periodically. The methods are intentionally stubbed
 * — operators must verify against the current portal before flipping the
 * integrator to `'gib_direct'` in production.
 */
import axios, { AxiosInstance } from 'axios';
import Logger from '@/modules/logger';

const DEFAULT_TEST_URL = 'https://earsivportaltest.efatura.gov.tr';
const PRODUCTION_URL   = 'https://earsivportal.efatura.gov.tr';

export interface GibDirectSubmitRequest {
  /** UBL-TR XML produced by `tr_earsiv.adapter.ts`. */
  ublXml: string;
  /** When the receiver has an email address, GİB also sends them a copy. */
  receiverEmail?: string;
}

export interface GibDirectSubmitResponse {
  /** GİB UUID for the document. */
  uuid: string;
  /** GİB document number (ETTN). */
  documentNumber?: string;
  status: 'CREATED' | 'SIGNED' | 'REJECTED';
  pdfUrl?: string;
}

export class GibDirectClient {
  private readonly client: AxiosInstance;
  private token: string | null = null;

  constructor(private readonly opts: {
    username: string;     // TCKN / VKN
    password: string;
    baseUrl?: string;     // override the default sandbox / prod URL
    sandbox?: boolean;    // pick TEST endpoint when no baseUrl is given
  }) {
    const base = opts.baseUrl ?? (opts.sandbox === false ? PRODUCTION_URL : DEFAULT_TEST_URL);
    this.client = axios.create({
      baseURL: base,
      timeout: 30_000,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      withCredentials: true,
    });
  }

  /**
   * Acquire a session token. The portal's `assos-login` endpoint accepts a
   * form-urlencoded body and returns a JSON `{token}` payload that subsequent
   * dispatch calls echo as a Cookie / Bearer.
   *
   * GİB rotates this contract — keep the implementation behind the stub.
   */
  async login(): Promise<string> {
    Logger.warn('[GibDirectClient.login] stub — verify against the current portal shape before enabling');
    // Example shape (subject to change):
    // const resp = await this.client.post('/earsiv-services/assos-login', new URLSearchParams({
    //   assoscmd: 'anologin', rtype: 'json',
    //   userid: this.opts.username, sifre: this.opts.password,
    //   sifre2: this.opts.password, parola: '1',
    // }));
    // this.token = resp.data.token;
    // return this.token!;
    throw new Error('GibDirect login is a stub — fill in modules/invoice/adapters/tr_gib_direct.client.ts');
  }

  async submit(_req: GibDirectSubmitRequest): Promise<GibDirectSubmitResponse> {
    if (!this.token) await this.login();
    Logger.warn('[GibDirectClient.submit] stub — implement against GİB portal contract');
    throw new Error('GibDirect submit is a stub');
  }

  async cancel(_uuid: string, _reason: string): Promise<void> {
    Logger.warn('[GibDirectClient.cancel] stub');
    throw new Error('GibDirect cancel is a stub');
  }

  async getStatus(_uuid: string): Promise<GibDirectSubmitResponse['status'] | 'UNKNOWN'> {
    return 'UNKNOWN';
  }

  async downloadPdf(_uuid: string): Promise<Buffer> {
    throw new Error('GibDirect downloadPdf is a stub');
  }
}
