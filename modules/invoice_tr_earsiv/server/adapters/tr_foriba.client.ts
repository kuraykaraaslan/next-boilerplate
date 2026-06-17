/**
 * Foriba (https://foriba.com) e-Arşiv / e-Fatura integrator client.
 *
 * Production setup
 * ────────────────
 * 1. Sign a contract with Foriba; you receive (a) an integrator base URL,
 *    (b) a SOAP/REST username, and (c) a password. Foriba's documentation
 *    typically routes through `https://earsivportaltestifi.izibiz.com.tr/`
 *    in the GİB testbed and a production URL specified per customer.
 * 2. Set per-tenant settings:
 *      earsivIntegrator           = 'foriba'
 *      earsivIntegratorBaseUrl    = '<your-foriba-endpoint>'
 *      earsivIntegratorUsername   = '<your-username>'
 *      earsivIntegratorPassword   = '<your-password>'
 *
 * Wire details Foriba publishes change over time — the methods below are
 * documented placeholders. Replace the bodies with the real SOAP/REST
 * calls per your contract; the surface (submit/cancel/status) stays.
 */
import axios, { AxiosInstance } from 'axios';
import Logger from '@kuraykaraaslan/logger';

export interface ForibaSubmitRequest {
  ublXml: string;
  documentType: 'EARSIVFATURA' | 'TICARIFATURA';
  receiverEmail?: string;
}

export interface ForibaSubmitResponse {
  uuid: string;
  status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  pdfUrl?: string;
  rawXml?: string;
}

export class ForibaClient {
  private readonly client: AxiosInstance;

  constructor(private readonly opts: { baseUrl: string; username: string; password: string }) {
    this.client = axios.create({
      baseURL: opts.baseUrl,
      headers: { 'Content-Type': 'application/xml' },
      auth: { username: opts.username, password: opts.password },
      timeout: 30_000,
    });
  }

  /**
   * Submit a UBL-TR XML to Foriba. Returns the GİB UUID and status. The
   * exact endpoint path + envelope shape varies by Foriba product (Connect
   * Direct, ePortal, …) — operators override this for their contract.
   *
   * For now this is a documented stub that throws so callers know it isn't
   * wired. Switch back to the `mock` integrator in dev.
   */
  async submit(_req: ForibaSubmitRequest): Promise<ForibaSubmitResponse> {
    Logger.warn('[ForibaClient.submit] stub — implement against your Foriba contract');
    throw new Error('Foriba integration is a stub — fill in modules/invoice/adapters/tr_foriba.client.ts per your contract');
  }

  async cancel(_uuid: string, _reason: string): Promise<void> {
    Logger.warn('[ForibaClient.cancel] stub — implement against your Foriba contract');
    throw new Error('Foriba cancel is a stub');
  }

  async getStatus(_uuid: string): Promise<'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'UNKNOWN'> {
    Logger.warn('[ForibaClient.getStatus] stub — implement against your Foriba contract');
    return 'UNKNOWN';
  }
}
