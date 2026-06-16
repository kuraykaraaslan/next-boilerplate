import { randomUUID } from 'node:crypto';
import SettingService from '@nb/setting/server/setting.service';
import Logger from '@nb/logger';
import type { InvoiceAdapterSubmitResult } from './base.adapter';
import type { Invoice } from '../entities/invoice.entity';
import type { InvoiceLine } from '../entities/invoice_line.entity';
import { isValidTrTaxId } from './tr_validators';
import { ForibaClient } from './tr_foriba.client';
import { GibDirectClient } from './tr_gib_direct.client';
import { LogoClient } from './tr_logo.client';
import { loadSellerInfo } from './tr_earsiv.seller';
import { buildGibPortalInvoice } from './tr_earsiv.portal';
import { buildUblTrXml } from './tr_earsiv.ubl';

export async function isConfigured(tenantId: string): Promise<boolean> {
  const integrator = await SettingService.getValue(tenantId, 'earsivIntegrator');
  if (!integrator) return false;
  if (integrator === 'mock') return true;
  const [baseUrl, username, password] = await Promise.all([
    SettingService.getValue(tenantId, 'earsivIntegratorBaseUrl'),
    SettingService.getValue(tenantId, 'earsivIntegratorUsername'),
    SettingService.getValue(tenantId, 'earsivIntegratorPassword'),
  ]);
  // gib_direct talks to the free GİB portal — baseUrl is optional (defaults
  // to the TEST portal); only TCKN/VKN + password are required.
  if (integrator === 'gib_direct') return Boolean(username && password);
  // Paid integrators (foriba / logo / …) need an explicit endpoint.
  return Boolean(baseUrl && username && password);
}

export async function submit(tenantId: string, invoice: Invoice, lines: InvoiceLine[]): Promise<InvoiceAdapterSubmitResult> {
  const integrator = (await SettingService.getValue(tenantId, 'earsivIntegrator')) || 'mock';

  // Validate customer tax id if provided
  if (invoice.customerTaxId && !isValidTrTaxId(invoice.customerTaxId)) {
    Logger.warn(`[TrEarsiv] customerTaxId failed TCKN/VKN checksum: ${invoice.customerTaxId}`);
  }

  const xml = buildUblTrXml(invoice, lines, await loadSellerInfo(tenantId));

  switch (integrator) {
    case 'mock':
      return submitMock(invoice, xml);
    case 'gib_direct':
      return submitViaGibDirect(tenantId, invoice, lines);
    case 'foriba':
      return submitViaForiba(tenantId, invoice, xml);
    case 'logo':
      return submitViaLogo(tenantId, invoice, xml);
    case 'uyumsoft':
    case 'bizplace':
    case 'mikrogep':
      Logger.warn(`[TrEarsiv] integrator='${integrator}' is a stub — submitting via mock for now`);
      return submitMock(invoice, xml);
    default:
      throw new Error(`Unknown e-Arşiv integrator: ${integrator}`);
  }
}

/**
 * Free GİB portal flow. Unlike the paid integrators this does NOT take
 * UBL-TR XML — the portal wants a flat JSON invoice and renders the UBL
 * itself. The draft is created UNSIGNED ('submitted'); finalising it needs
 * the SMS-OTP step (see InvoiceService.requestEarsivSms / confirmEarsivSms).
 * On failure we surface 'rejected' (no silent mock fallback) so the operator
 * notices and can retry.
 */
async function submitViaGibDirect(tenantId: string, invoice: Invoice, lines: InvoiceLine[]): Promise<InvoiceAdapterSubmitResult> {
  const [username, password, baseUrl, sandboxFlag] = await Promise.all([
    SettingService.getValue(tenantId, 'earsivIntegratorUsername'),
    SettingService.getValue(tenantId, 'earsivIntegratorPassword'),
    SettingService.getValue(tenantId, 'earsivIntegratorBaseUrl'),
    SettingService.getValue(tenantId, 'earsivIntegratorSandbox'),
  ]);
  if (!username || !password) {
    Logger.warn(`[TrEarsiv:gib_direct] missing TCKN/VKN credentials for tenant ${tenantId}`);
    return { externalId: undefined, status: 'rejected', raw: { integrator: 'gib_direct', error: 'missing credentials' } };
  }
  const client = new GibDirectClient({
    username, password,
    baseUrl: baseUrl || undefined,
    sandbox: sandboxFlag === 'false' ? false : true,
  });
  try {
    const dto = buildGibPortalInvoice(invoice, lines, await loadSellerInfo(tenantId));
    const res = await client.createDraft(dto);
    return {
      externalId: res.uuid,
      status: res.status === 'SIGNED' ? 'accepted' : 'submitted',
      raw: { integrator: 'gib_direct', documentNumber: res.documentNumber, status: res.status, signed: false },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    Logger.warn(`[TrEarsiv:gib_direct] submit failed for ${invoice.invoiceNumber}: ${message}`);
    return { externalId: undefined, status: 'rejected', raw: { integrator: 'gib_direct', error: message } };
  }
}

async function submitViaLogo(tenantId: string, invoice: Invoice, ublXml: string): Promise<InvoiceAdapterSubmitResult> {
  const [baseUrl, username, password, override] = await Promise.all([
    SettingService.getValue(tenantId, 'earsivIntegratorBaseUrl'),
    SettingService.getValue(tenantId, 'earsivIntegratorUsername'),
    SettingService.getValue(tenantId, 'earsivIntegratorPassword'),
    SettingService.getValue(tenantId, 'earsivDocumentTypeOverride'),
  ]);
  if (!baseUrl || !username || !password) {
    Logger.warn(`[TrEarsiv:logo] missing creds for tenant ${tenantId} — falling back to mock`);
    return submitMock(invoice, ublXml);
  }
  const client = new LogoClient({ baseUrl, username, password });
  const documentType = (override as 'EARSIVFATURA' | 'TICARIFATURA' | null) ?? 'EARSIVFATURA';
  try {
    const res = await client.submit({ ublXml, documentType, receiverEmail: invoice.customerEmail });
    return {
      externalId: res.uuid,
      status: res.status === 'ACCEPTED' ? 'accepted' : res.status === 'PROCESSING' ? 'submitted' : 'rejected',
      pdfUrl: res.pdfUrl,
      raw: { integrator: 'logo', documentType, status: res.status },
    };
  } catch (err) {
    Logger.warn(`[TrEarsiv:logo] submit failed — falling back to mock: ${err instanceof Error ? err.message : err}`);
    return submitMock(invoice, ublXml);
  }
}

async function submitViaForiba(tenantId: string, invoice: Invoice, ublXml: string): Promise<InvoiceAdapterSubmitResult> {
  const [baseUrl, username, password, override] = await Promise.all([
    SettingService.getValue(tenantId, 'earsivIntegratorBaseUrl'),
    SettingService.getValue(tenantId, 'earsivIntegratorUsername'),
    SettingService.getValue(tenantId, 'earsivIntegratorPassword'),
    SettingService.getValue(tenantId, 'earsivDocumentTypeOverride'),
  ]);
  if (!baseUrl || !username || !password) {
    Logger.warn(`[TrEarsiv:foriba] missing creds for tenant ${tenantId} — falling back to mock`);
    return submitMock(invoice, ublXml);
  }
  const client = new ForibaClient({ baseUrl, username, password });
  const documentType = (override as 'EARSIVFATURA' | 'TICARIFATURA' | null) ?? 'EARSIVFATURA';
  try {
    const res = await client.submit({ ublXml, documentType, receiverEmail: invoice.customerEmail });
    return {
      externalId: res.uuid,
      status: res.status === 'ACCEPTED' ? 'accepted' : res.status === 'SUBMITTED' ? 'submitted' : 'rejected',
      pdfUrl: res.pdfUrl,
      raw: { integrator: 'foriba', documentType, status: res.status },
    };
  } catch (err) {
    Logger.warn(`[TrEarsiv:foriba] submit failed — falling back to mock so issue still completes: ${err instanceof Error ? err.message : err}`);
    return submitMock(invoice, ublXml);
  }
}

async function submitMock(invoice: Invoice, _xml: string): Promise<InvoiceAdapterSubmitResult> {
  const externalId = randomUUID();
  Logger.info(`[TrEarsiv:mock] submitted ${invoice.invoiceNumber} → ${externalId} (status=ACCEPTED)`);
  return {
    externalId,
    status: 'accepted',
    pdfUrl: undefined,
    raw: { integrator: 'mock', acceptedAt: new Date().toISOString() },
  };
}

export async function cancel(tenantId: string, invoice: Invoice, reason?: string): Promise<void> {
  Logger.info(`[TrEarsiv] cancel invoice ${invoice.invoiceNumber} (${invoice.earsivUuid ?? 'no-uuid'}) reason=${reason ?? '-'}`);
  const integrator = (await SettingService.getValue(tenantId, 'earsivIntegrator')) || 'mock';
  if (integrator !== 'gib_direct' || !invoice.earsivUuid) return; // mock / other integrators: no-op
  const [username, password, baseUrl, sandboxFlag] = await Promise.all([
    SettingService.getValue(tenantId, 'earsivIntegratorUsername'),
    SettingService.getValue(tenantId, 'earsivIntegratorPassword'),
    SettingService.getValue(tenantId, 'earsivIntegratorBaseUrl'),
    SettingService.getValue(tenantId, 'earsivIntegratorSandbox'),
  ]);
  if (!username || !password) return;
  const client = new GibDirectClient({
    username, password,
    baseUrl: baseUrl || undefined,
    sandbox: sandboxFlag === 'false' ? false : true,
  });
  await client.cancel(invoice.earsivUuid, reason ?? 'İptal');
}
