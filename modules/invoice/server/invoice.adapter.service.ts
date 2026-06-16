import 'reflect-metadata';
import { In } from 'typeorm';
import { tenantDataSourceFor } from '@nb/db';
import { Invoice as InvoiceEntity } from './entities/invoice.entity';
import { GibDirectClient } from './adapters/tr_gib_direct.client';
import SettingService from '@nb/setting/server/setting.service';
import AuditLogService from '@nb/audit_log/server/audit_log.service';
import Logger from '@nb/logger';
import InvoiceMessages from './invoice.messages';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import redis from '@nb/redis';

const EARSIV_SMS_SEND_LIMIT = 5;
const EARSIV_SMS_SEND_WINDOW = 600;
const EARSIV_SMS_VERIFY_LIMIT = 5;

export default class InvoiceAdapterService {

  // ──────────────────────────────────────────────
  // TR e-Arşiv SMS Finalisation (gib_direct only)
  // ──────────────────────────────────────────────

  private static async buildGibClient(tenantId: string): Promise<GibDirectClient> {
    const integrator = await SettingService.getValue(tenantId, 'earsivIntegrator');
    if (integrator !== 'gib_direct') throw new AppError(InvoiceMessages.EARSIV_NOT_GIB_DIRECT, 422, ErrorCode.VALIDATION_ERROR);
    const [username, password, baseUrl, sandboxFlag] = await Promise.all([
      SettingService.getValue(tenantId, 'earsivIntegratorUsername'),
      SettingService.getValue(tenantId, 'earsivIntegratorPassword'),
      SettingService.getValue(tenantId, 'earsivIntegratorBaseUrl'),
      SettingService.getValue(tenantId, 'earsivIntegratorSandbox'),
    ]);
    if (!username || !password) throw new AppError(InvoiceMessages.EARSIV_NOT_CONFIGURED, 422, ErrorCode.VALIDATION_ERROR);
    return new GibDirectClient({
      username, password,
      baseUrl: baseUrl || undefined,
      sandbox: sandboxFlag === 'false' ? false : true,
    });
  }

  static async requestEarsivSms(tenantId: string): Promise<{ oid: string }> {
    const sendRateKey = `earsiv:sms:send:${tenantId}`;
    try {
      const count = await redis.incr(sendRateKey);
      if (count === 1) await redis.expire(sendRateKey, EARSIV_SMS_SEND_WINDOW);
      if (count > EARSIV_SMS_SEND_LIMIT) {
        throw new AppError(InvoiceMessages.EARSIV_SMS_SEND_FAILED, 429, ErrorCode.RATE_LIMIT_EXCEEDED);
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      Logger.warn(`[Invoice.requestEarsivSms] rate-limit Redis error (fail-open): ${err instanceof Error ? err.message : err}`);
    }

    const client = await InvoiceAdapterService.buildGibClient(tenantId);
    try {
      await client.login();
      const oid = await client.sendSmsCode();
      return { oid };
    } catch (err) {
      Logger.warn(`[Invoice.requestEarsivSms] ${err instanceof Error ? err.message : err}`);
      throw new AppError(InvoiceMessages.EARSIV_SMS_SEND_FAILED, 502, ErrorCode.INTERNAL_ERROR);
    }
  }

  static async confirmEarsivSms(
    tenantId: string,
    oid: string,
    code: string,
    invoiceIds?: string[],
  ): Promise<{ signed: number }> {
    const verifyAttemptKey = `earsiv:sms:verify:${tenantId}:${oid}`;
    try {
      const attempts = await redis.incr(verifyAttemptKey);
      if (attempts === 1) await redis.expire(verifyAttemptKey, EARSIV_SMS_SEND_WINDOW);
      if (attempts > EARSIV_SMS_VERIFY_LIMIT) {
        throw new AppError(InvoiceMessages.EARSIV_SMS_VERIFY_FAILED, 429, ErrorCode.RATE_LIMIT_EXCEEDED);
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      Logger.warn(`[Invoice.confirmEarsivSms] rate-limit Redis error (fail-open): ${err instanceof Error ? err.message : err}`);
    }

    const client = await InvoiceAdapterService.buildGibClient(tenantId);
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(InvoiceEntity);

    const rows = invoiceIds?.length
      ? await repo.find({ where: { tenantId, invoiceId: In(invoiceIds) } })
      : await repo.find({ where: { tenantId, region: 'TR', earsivStatus: 'submitted' } });
    const invoices = rows.filter((i) => i.earsivUuid && i.earsivStatus !== 'accepted');
    if (invoices.length === 0) return { signed: 0 };

    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) => `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
    const earliest = new Date(Math.min(...invoices.map((i) => i.issueDate.getTime())));

    try {
      await client.login();
      const drafts = await client.listDrafts(fmt(earliest), fmt(new Date()));
      const uuids = new Set(invoices.map((i) => i.earsivUuid));
      const toSign = drafts.filter((r) => uuids.has(String(r.ettn ?? r.belgeId ?? r.faturaUuid ?? '')));
      if (toSign.length === 0) throw new AppError(InvoiceMessages.EARSIV_NO_DRAFTS, 404, ErrorCode.NOT_FOUND);
      await client.verifySmsCode(oid, code, toSign);
    } catch (err) {
      if (err instanceof AppError) throw err;
      Logger.warn(`[Invoice.confirmEarsivSms] ${err instanceof Error ? err.message : err}`);
      throw new AppError(InvoiceMessages.EARSIV_SMS_VERIFY_FAILED, 502, ErrorCode.INTERNAL_ERROR);
    }

    for (const inv of invoices) {
      inv.earsivStatus = 'accepted';
      await repo.save(inv);
    }
    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'invoice.earsiv.signed',
      resourceType: 'invoice', resourceId: invoices.map((i) => i.invoiceId).join(','),
      metadata: { count: invoices.length },
    }).catch(() => {});

    return { signed: invoices.length };
  }
}
