/**
 * Logo eFatura / eArşiv integrator client (https://e-logo.com.tr).
 *
 * Setup per tenant:
 *   • earsivIntegrator           = 'logo'
 *   • earsivIntegratorBaseUrl    = your Logo eFatura web-service URL (Logo
 *                                   provides separate TEST and PROD URLs per
 *                                   customer; e.g. https://efaturaws.e-logo.com.tr/EFaturaEDM.svc)
 *   • earsivIntegratorUsername   = SOAP / API username from Logo
 *   • earsivIntegratorPassword   = SOAP / API password
 *
 * Logo uses a SOAP-style EDM web service. The standard operations are:
 *   • SendInvoice         — submit an outgoing invoice (UBL-TR XML envelope)
 *   • InvoiceStatusReport — fetch current status by UUID
 *   • CancelInvoice       — cancel a previously submitted invoice
 *
 * Real customer contracts are usually shipped with WSDL — generate clients
 * from that. The shape below documents the surface so callers can wire it
 * up without re-reading Logo's reference docs.
 */
import axios, { AxiosInstance } from 'axios';
import Logger from '@/modules/logger';

export interface LogoSubmitRequest {
  ublXml: string;
  documentType: 'EARSIVFATURA' | 'TICARIFATURA';
  receiverEmail?: string;
}

export interface LogoSubmitResponse {
  uuid: string;
  status: 'PROCESSING' | 'ACCEPTED' | 'REJECTED';
  pdfUrl?: string;
}

export class LogoClient {
  private readonly client: AxiosInstance;

  constructor(private readonly opts: { baseUrl: string; username: string; password: string }) {
    this.client = axios.create({
      baseURL: opts.baseUrl,
      timeout: 30_000,
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
      auth: { username: opts.username, password: opts.password },
    });
  }

  /** SendInvoice — SOAP envelope wraps the UBL-TR payload. */
  async submit(_req: LogoSubmitRequest): Promise<LogoSubmitResponse> {
    Logger.warn('[LogoClient.submit] stub — generate a SOAP client from your Logo WSDL');
    // Example pseudo:
    // const soap = `<soapenv:Envelope ...><soapenv:Body>
    //   <ws:SendInvoice><ws:invoiceData>${Buffer.from(req.ublXml).toString('base64')}</ws:invoiceData></ws:SendInvoice>
    // </soapenv:Body></soapenv:Envelope>`;
    // const resp = await this.client.post('/EFaturaEDM.svc', soap, { headers: { SOAPAction: '"SendInvoice"' } });
    // … parse XML response → { uuid, status }
    throw new Error('Logo SendInvoice is a stub — implement per your WSDL');
  }

  async getStatus(_uuid: string): Promise<LogoSubmitResponse['status'] | 'UNKNOWN'> {
    return 'UNKNOWN';
  }

  async cancel(_uuid: string, _reason: string): Promise<void> {
    throw new Error('Logo CancelInvoice is a stub');
  }
}
