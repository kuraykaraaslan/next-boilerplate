import 'reflect-metadata';
import { In } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import { ROOT_TENANT_ID, isRootTenant } from '@/modules/tenant/tenant.constants';
import { Setting as SettingEntity } from './entities/setting.entity';
import { SettingHistory } from './entities/setting_history.entity';
import { Setting, SettingSchema } from './setting.types';
import redis from '@/modules/redis';
import SettingMessages from './setting.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { encryptFieldOpt, decryptFieldOpt, isEncryptedField } from '@/modules/common/field-encryption';

// ── Sensitive keys — encrypted at rest, masked in API responses ──────────────
const SENSITIVE_KEYS = new Set([
  's3SecretKey', 's3AccessKey', 'mailApiKey', 'smtpPass', 'smtpPassword',
  'mailgunApiKey', 'sendgridApiKey', 'resendApiKey', 'postmarkApiKey',
  'twilioAuthToken', 'nexmoApiSecret', 'stripeSecretKey', 'stripeWebhookSecret',
  'paypalClientSecret', 'paymentSecretKey', 'openaiApiKey', 'anthropicApiKey',
  'googleAiApiKey', 'webhookSecret', 'accessTokenSecret', 'refreshTokenSecret',
  'settingsEncryptionKey', 'vapidPrivateKey', 'samlPrivateKey',
  // Invoice e-signature seal (private key + cert) and e-invoice gateway creds
  'invoiceSigningKeyPem', 'invoiceSigningCertPem',
  'fatturapaGatewayToken', 'chorusProToken', 'cfdiPacToken', 'gstIrpToken',
  'peppolAccessPointToken',
  // Payment provider secret credentials (encrypt at rest).
  'iyzicoApiKey', 'iyzicoSecretKey',
  'alipayPrivateKey', 'wechatPayPrivateKey', 'wechatPayApiV3Key',
  'yookassaSecretKey', 'cloudpaymentsApiSecret',
]);

// ── IANA timezone validation ─────────────────────────────────────────────────
function isValidIANATimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// ISO 4217 currency codes (common subset; extend as needed)
const ISO4217_CODES = new Set([
  'USD','EUR','GBP','TRY','JPY','CNY','INR','KRW','BRL','CAD','AUD','CHF',
  'SEK','NOK','DKK','PLN','CZK','HUF','RON','BGN','HRK','RSD','RUB','UAH',
  'AED','SAR','QAR','KWD','BHD','OMR','EGP','MAD','NGN','GHS','KES','ZAR',
  'MXN','COP','ARS','CLP','PEN','UYU','VEF','SGD','HKD','TWD','THB','IDR',
  'MYR','PHP','PKR','BDT','LKR','NPR','MMK','VND','KHR',
]);

function isValidISO4217(code: string): boolean {
  return ISO4217_CODES.has(code.toUpperCase());
}

// Per-key schema validation
function validateSettingValue(key: string, value: string): void {
  if (key === 'defaultTimezone' && !isValidIANATimezone(value)) {
    throw new AppError(
      `Invalid IANA timezone: "${value}". Use a valid IANA timezone identifier (e.g. "Europe/Istanbul").`,
      400,
      ErrorCode.VALIDATION_ERROR,
    );
  }
  if ((key === 'currencyCode' || key === 'defaultCurrency') && !isValidISO4217(value)) {
    throw new AppError(
      `Invalid ISO 4217 currency code: "${value}".`,
      400,
      ErrorCode.VALIDATION_ERROR,
    );
  }
}

// ── Cache helpers ────────────────────────────────────────────────────────────
const REDIS_KEY_PREFIX = 'settings:';
const REDIS_TTL = 600;

function getCacheKey(tenantId: string, key?: string): string {
  return key
    ? `${REDIS_KEY_PREFIX}${tenantId}:${key}`
    : `${REDIS_KEY_PREFIX}${tenantId}:all`;
}

async function getFromCache(cacheKey: string): Promise<string | null> {
  try { return await redis.get(cacheKey); } catch { return null; }
}

async function setCache(cacheKey: string, value: string): Promise<void> {
  try { await redis.set(cacheKey, value, 'EX', REDIS_TTL); } catch {}
}

async function deleteCache(cacheKey: string): Promise<void> {
  try { await redis.del(cacheKey); } catch {}
}

// ── Value helpers ────────────────────────────────────────────────────────────
function encryptValue(key: string, value: string): string {
  return SENSITIVE_KEYS.has(key) ? encryptFieldOpt(value) : value;
}

function decryptValue(key: string, value: string): string {
  if (!SENSITIVE_KEYS.has(key)) return value;
  return (decryptFieldOpt(value) ?? value) as string;
}

const MASK = '***SET***';

function maskValue(key: string, value: string): string {
  if (!SENSITIVE_KEYS.has(key)) return value;
  return isEncryptedField(value) || value ? MASK : value;
}

function parseRow(row: SettingEntity, masked = false): Setting {
  const decrypted = decryptValue(row.key, row.value);
  return SettingSchema.parse({ ...row, value: masked ? maskValue(row.key, decrypted) : decrypted });
}

export default class SettingService {

  // ── Bulk cache invalidation via Redis pattern match ──────────────────────
  static async clearCache(tenantId: string): Promise<void> {
    const pattern = `${REDIS_KEY_PREFIX}${tenantId}:*`;
    let cursor = '0';
    do {
      try {
        const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = next;
        if (keys.length > 0) await redis.unlink(...keys).catch(() => {});
      } catch { break; }
    } while (cursor !== '0');
  }

  // ── Platform default → tenant override inheritance ───────────────────────
  // When a tenant doesn't have a key, fall back to the ROOT_TENANT_ID default.
  private static async resolveValue(tenantId: string, key: string): Promise<SettingEntity | null> {
    const ds = await tenantDataSourceFor(tenantId);
    const row = await ds.getRepository(SettingEntity).findOne({ where: { tenantId, key } });
    if (row) return row;
    if (isRootTenant(tenantId)) return null;
    // Fallback to platform default
    const rootDs = await tenantDataSourceFor(ROOT_TENANT_ID);
    return rootDs.getRepository(SettingEntity).findOne({ where: { tenantId: ROOT_TENANT_ID, key } });
  }

  static async getAll(tenantId: string, masked = false): Promise<Setting[]> {
    const cacheKey = getCacheKey(tenantId);
    const cached = await getFromCache(cacheKey);
    if (cached && !masked) {
      try { return JSON.parse(cached); } catch { await deleteCache(cacheKey); }
    }
    const ds = await tenantDataSourceFor(tenantId);
    const settings = await ds.getRepository(SettingEntity).find({ where: { tenantId } });
    const parsed = settings.map((s) => parseRow(s, masked));
    if (!masked) await setCache(cacheKey, JSON.stringify(parsed));
    return parsed;
  }

  static async getByKey(tenantId: string, key: string, masked = false): Promise<Setting | null> {
    const cacheKey = getCacheKey(tenantId, key);
    const cached = await getFromCache(cacheKey);
    if (cached && !masked) {
      try { return JSON.parse(cached); } catch { await deleteCache(cacheKey); }
    }
    const row = await this.resolveValue(tenantId, key);
    if (!row) return null;
    const parsed = parseRow(row, masked);
    if (!masked) await setCache(cacheKey, JSON.stringify(parsed));
    return parsed;
  }

  static async getByKeys(tenantId: string, keys: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    if (!keys.length) return result;

    const cacheKeys = keys.map((k) => getCacheKey(tenantId, k));
    let cachedArr: (string | null)[] = [];
    try { cachedArr = await redis.mget(...cacheKeys); } catch { cachedArr = new Array(keys.length).fill(null); }

    const missingKeys: string[] = [];
    for (let i = 0; i < keys.length; i++) {
      const cached = cachedArr[i];
      if (cached) {
        try { result[keys[i]] = JSON.parse(cached).value; continue; } catch {}
      }
      missingKeys.push(keys[i]);
    }

    if (missingKeys.length > 0) {
      const ds = await tenantDataSourceFor(tenantId);
      const rows = await ds.getRepository(SettingEntity).find({ where: { tenantId, key: In(missingKeys) } });
      for (const r of rows) {
        const decrypted = decryptValue(r.key, r.value);
        result[r.key] = decrypted;
        const parsed = parseRow(r);
        await setCache(getCacheKey(tenantId, r.key), JSON.stringify(parsed));
      }
      // Fall back to root defaults for keys still missing
      const foundKeys = new Set(rows.map((r) => r.key));
      const stillMissing = missingKeys.filter((k) => !foundKeys.has(k));
      if (stillMissing.length > 0 && !isRootTenant(tenantId)) {
        const rootDs = await tenantDataSourceFor(ROOT_TENANT_ID);
        const rootRows = await rootDs.getRepository(SettingEntity).find({
          where: { tenantId: ROOT_TENANT_ID, key: In(stillMissing) },
        });
        for (const r of rootRows) {
          result[r.key] = decryptValue(r.key, r.value);
        }
      }
    }
    return result;
  }

  static async getValue(tenantId: string, key: string): Promise<string | null> {
    return (await this.getByKey(tenantId, key))?.value ?? null;
  }

  private static async recordHistory(
    tenantId: string,
    key: string,
    previousValue: string,
    newValue: string,
    changedByUserId?: string,
  ): Promise<void> {
    try {
      const ds = await tenantDataSourceFor(tenantId);
      await ds.getRepository(SettingHistory).insert({
        tenantId,
        key,
        previousValue,
        newValue,
        changedByUserId,
      });
    } catch { /* best-effort */ }
  }

  private static async emitAuditLog(
    tenantId: string,
    action: string,
    key: string,
    actorId?: string,
  ): Promise<void> {
    try {
      const AuditLogService = (await import('@/modules/audit_log/audit_log.service')).default;
      await AuditLogService.log({
        tenantId,
        actorId,
        actorType: actorId ? 'USER' : 'SYSTEM',
        action,
        resourceType: 'setting',
        resourceId: key,
      });
    } catch { /* best-effort */ }
  }

  static async create(
    tenantId: string,
    key: string,
    value: string,
    group?: string,
    type?: string,
    options?: { actorId?: string; isLocked?: boolean },
  ): Promise<Setting> {
    validateSettingValue(key, value);
    const encrypted = encryptValue(key, value);
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(SettingEntity);
    const now = new Date();
    const existing = await repo.findOne({ where: { tenantId, key } });

    if (existing) {
      if (existing.isLocked) {
        throw new AppError(SettingMessages.SETTING_NOT_FOUND, 403, ErrorCode.FORBIDDEN);
      }
      await this.recordHistory(tenantId, key, existing.value, encrypted, options?.actorId);
      await repo.update({ tenantId, key }, { value: encrypted, group: group ?? existing.group, type: type ?? existing.type, updatedAt: now });
    } else {
      await repo.insert({
        tenantId, key, value: encrypted,
        group: group ?? 'general',
        type: type ?? 'string',
        isLocked: options?.isLocked ?? false,
        createdAt: now, updatedAt: now,
      });
    }
    const saved = await repo.findOne({ where: { tenantId, key } });
    const parsed = parseRow(saved!);
    await setCache(getCacheKey(tenantId, key), JSON.stringify(parsed));
    await deleteCache(getCacheKey(tenantId));
    await this.emitAuditLog(tenantId, 'setting.created', key, options?.actorId);
    return parsed;
  }

  static async update(
    tenantId: string,
    key: string,
    value: string,
    options?: { actorId?: string },
  ): Promise<Setting> {
    validateSettingValue(key, value);
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(SettingEntity);
    const existing = await repo.findOne({ where: { tenantId, key } });
    if (!existing) throw new AppError(SettingMessages.SETTING_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (existing.isLocked) throw new AppError('Setting is locked and cannot be modified', 403, ErrorCode.FORBIDDEN);

    const encrypted = encryptValue(key, value);
    await this.recordHistory(tenantId, key, existing.value, encrypted, options?.actorId);
    await repo.update({ tenantId, key }, { value: encrypted, updatedAt: new Date() });
    const updated = await repo.findOne({ where: { tenantId, key } });
    const parsed = parseRow(updated!);
    await setCache(getCacheKey(tenantId, key), JSON.stringify(parsed));
    await deleteCache(getCacheKey(tenantId));
    await this.emitAuditLog(tenantId, 'setting.updated', key, options?.actorId);
    return parsed;
  }

  static async updateMany(
    tenantId: string,
    settings: Record<string, string>,
    options?: { actorId?: string },
  ): Promise<Setting[]> {
    for (const [key, value] of Object.entries(settings)) validateSettingValue(key, value);

    const ds = await tenantDataSourceFor(tenantId);
    const now = new Date();

    const updatedSettings = await ds.transaction(async (mgr) => {
      const repo = mgr.getRepository(SettingEntity);
      const result: Setting[] = [];
      for (const key in settings) {
        const value = settings[key];
        const encrypted = encryptValue(key, value);
        const existing = await repo.findOne({ where: { tenantId, key } });
        if (existing) {
          if (existing.isLocked) continue; // silently skip locked keys
          await this.recordHistory(tenantId, key, existing.value, encrypted, options?.actorId);
          await repo.update({ tenantId, key }, { value: encrypted, updatedAt: now });
        } else {
          await repo.insert({ tenantId, key, value: encrypted, group: 'general', type: 'string', createdAt: now, updatedAt: now });
        }
        const saved = await repo.findOne({ where: { tenantId, key } });
        result.push(parseRow(saved!));
      }
      return result;
    });

    for (const parsed of updatedSettings) {
      await setCache(getCacheKey(tenantId, parsed.key), JSON.stringify(parsed));
    }
    await deleteCache(getCacheKey(tenantId));
    await this.emitAuditLog(tenantId, 'setting.bulk_updated', Object.keys(settings).join(','), options?.actorId);
    return updatedSettings;
  }

  static async delete(
    tenantId: string,
    key: string,
    options?: { actorId?: string },
  ): Promise<Setting | null> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(SettingEntity);
    const setting = await repo.findOne({ where: { tenantId, key } });
    if (!setting) return null;
    if (setting.isLocked) throw new AppError('Setting is locked and cannot be deleted', 403, ErrorCode.FORBIDDEN);
    const parsed = parseRow(setting);
    await repo.delete({ tenantId, key });
    await deleteCache(getCacheKey(tenantId, key));
    await deleteCache(getCacheKey(tenantId));
    await this.emitAuditLog(tenantId, 'setting.deleted', key, options?.actorId);
    return parsed;
  }

  static async getAllAsRecord(tenantId: string): Promise<Record<string, string>> {
    const settings = await this.getAll(tenantId);
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  static async getByGroup(tenantId: string, group: string): Promise<Setting[]> {
    const ds = await tenantDataSourceFor(tenantId);
    const settings = await ds.getRepository(SettingEntity).find({ where: { tenantId, group } });
    return settings.map((s) => parseRow(s));
  }

  // ── Rollback: restore a previous value from history ──────────────────────
  static async rollback(
    tenantId: string,
    key: string,
    historyId: string,
    options?: { actorId?: string },
  ): Promise<Setting> {
    const ds = await tenantDataSourceFor(tenantId);
    const history = await ds.getRepository(SettingHistory).findOne({ where: { historyId, tenantId, key } });
    if (!history) throw new AppError('History record not found', 404, ErrorCode.NOT_FOUND);
    return this.update(tenantId, key, decryptFieldOpt(history.previousValue) ?? history.previousValue, options);
  }

  static async getHistory(tenantId: string, key: string): Promise<SettingHistory[]> {
    const ds = await tenantDataSourceFor(tenantId);
    return ds.getRepository(SettingHistory).find({
      where: { tenantId, key },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  // ── Lock / unlock a setting (platform operators only) ─────────────────────
  static async setLocked(tenantId: string, key: string, isLocked: boolean): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    await ds.getRepository(SettingEntity).update({ tenantId, key }, { isLocked });
    await deleteCache(getCacheKey(tenantId, key));
    await deleteCache(getCacheKey(tenantId));
  }

  // ── Per-plan setting templates ───────────────────────────────────────────
  // Apply a named template bundle to a tenant. Templates are defined in
  // setting.templates.ts and keyed by plan slug (e.g. 'starter', 'pro', 'enterprise').
  static async applyTemplate(
    tenantId: string,
    templateName: string,
    options?: { actorId?: string },
  ): Promise<Setting[]> {
    const { SETTING_TEMPLATES } = await import('./setting.templates');
    const template = SETTING_TEMPLATES[templateName];
    if (!template) throw new AppError(`Unknown setting template: ${templateName}`, 400, ErrorCode.VALIDATION_ERROR);
    return this.updateMany(tenantId, template, options);
  }
}
