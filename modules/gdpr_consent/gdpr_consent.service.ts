import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import SettingService from '@/modules/setting/setting.service';
import { ConsentRecord as ConsentRecordEntity } from './entities/consent_record.entity';
import { ConsentPurposeEnum } from './gdpr_consent.enums';
import {
  ConsentRecordSchema,
  BannerConfigSchema,
  type ConsentRecord,
  type BannerConfig,
  type BannerPurpose,
} from './gdpr_consent.types';
import { GDPR_CONSENT_KEYS } from './gdpr_consent.setting.keys';
import { deriveConsentState } from './gdpr_consent.state';
import { GDPR_CONSENT_MESSAGES as MSG } from './gdpr_consent.messages';
import type {
  RecordConsentInput,
  ListConsentQueryInput,
  UpdateBannerConfigInput,
} from './gdpr_consent.dto';

// Identifies the consenting subject — exactly one of the two is set.
export interface ConsentSubject {
  userId?: string | null;
  anonymousId?: string | null;
}

// Request-derived metadata captured on the ledger row for audit purposes.
export interface ConsentMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
  source?: 'banner' | 'api' | 'import' | 'admin';
}

const DEFAULT_POLICY_VERSION = '1';

// Sensible default purposes used when a tenant has not configured the banner yet.
const DEFAULT_PURPOSES: BannerPurpose[] = [
  {
    key: 'necessary',
    label: 'Strictly necessary',
    description: 'Required for the site to function. Always on.',
    required: true,
  },
  {
    key: 'functional',
    label: 'Functional',
    description: 'Remember your preferences and improve usability.',
    required: false,
  },
  {
    key: 'analytics',
    label: 'Analytics',
    description: 'Help us understand how the site is used.',
    required: false,
  },
  {
    key: 'marketing',
    label: 'Marketing',
    description: 'Personalised content and advertising.',
    required: false,
  },
];

export default class GdprConsentService {
  // ── Ledger writes ────────────────────────────────────────────────────────────

  /**
   * Append ONE consent decision row. Requires a subject (userId OR anonymousId)
   * and a valid purpose. Returns the parsed, persisted record. Audit-logged.
   */
  static async record(
    tenantId: string,
    input: RecordConsentInput,
    meta: ConsentMeta = {},
  ): Promise<ConsentRecord> {
    const subject: ConsentSubject = { userId: input.userId, anonymousId: input.anonymousId };
    this.assertSubject(subject);
    if (!ConsentPurposeEnum.safeParse(input.purpose).success) {
      throw new AppError(MSG.INVALID_PURPOSE, 422, ErrorCode.VALIDATION_ERROR);
    }

    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ConsentRecordEntity);
    const row = repo.create({
      tenantId,
      subjectUserId: subject.userId ?? null,
      subjectAnonymousId: subject.anonymousId ?? null,
      purpose: input.purpose,
      granted: input.granted,
      policyVersion: input.policyVersion ?? DEFAULT_POLICY_VERSION,
      source: input.source ?? meta.source ?? 'api',
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
    });
    const saved = await repo.save(row);
    const parsed = ConsentRecordSchema.parse(saved);
    this.audit(tenantId, subject, 'consent.recorded', parsed.consentId, {
      purpose: parsed.purpose,
      granted: parsed.granted,
      source: parsed.source,
    });
    return parsed;
  }

  /**
   * Append one row per decision (a banner submission). Returns every persisted
   * record. The subject is shared across all decisions.
   */
  static async recordMany(
    tenantId: string,
    decisions: { purpose: RecordConsentInput['purpose']; granted: boolean }[],
    subject: ConsentSubject,
    meta: ConsentMeta = {},
    policyVersion?: string,
  ): Promise<ConsentRecord[]> {
    this.assertSubject(subject);
    if (decisions.length === 0) {
      throw new AppError(MSG.NO_DECISIONS, 422, ErrorCode.VALIDATION_ERROR);
    }

    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ConsentRecordEntity);
    const rows = decisions.map((d) =>
      repo.create({
        tenantId,
        subjectUserId: subject.userId ?? null,
        subjectAnonymousId: subject.anonymousId ?? null,
        purpose: d.purpose,
        granted: d.granted,
        policyVersion: policyVersion ?? DEFAULT_POLICY_VERSION,
        source: meta.source ?? 'banner',
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      }),
    );
    const saved = await repo.save(rows);
    const parsed = saved.map((s) => ConsentRecordSchema.parse(s));
    this.audit(tenantId, subject, 'consent.recorded', parsed[0]?.consentId ?? null, {
      decisions: parsed.map((p) => ({ purpose: p.purpose, granted: p.granted })),
      source: meta.source ?? 'banner',
    });
    return parsed;
  }

  /** Convenience: record a withdrawal (granted:false) for a single purpose. */
  static async withdraw(
    tenantId: string,
    purpose: RecordConsentInput['purpose'],
    subject: ConsentSubject,
    meta: ConsentMeta = {},
  ): Promise<ConsentRecord> {
    return this.record(
      tenantId,
      { purpose, granted: false, userId: subject.userId ?? undefined, anonymousId: subject.anonymousId ?? undefined },
      meta,
    );
  }

  // ── Reads ─────────────────────────────────────────────────────────────────────

  /** Current consent state (latest decision per purpose) for one subject. */
  static async getState(tenantId: string, subject: ConsentSubject): Promise<Record<string, boolean>> {
    this.assertSubject(subject);
    const ds = await tenantDataSourceFor(tenantId);
    const where = subject.userId
      ? { tenantId, subjectUserId: subject.userId }
      : { tenantId, subjectAnonymousId: subject.anonymousId ?? '' };
    const rows = await ds
      .getRepository(ConsentRecordEntity)
      .find({ where, order: { createdAt: 'ASC' } });
    const records = rows.map((r) => ConsentRecordSchema.parse(r));
    return deriveConsentState(records);
  }

  /** Paginated ledger with optional filters. */
  static async list(
    tenantId: string,
    query: ListConsentQueryInput,
  ): Promise<{ data: ConsentRecord[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId);
    const where: Record<string, unknown> = { tenantId };
    if (query.purpose !== undefined) where.purpose = query.purpose;
    if (query.granted !== undefined) where.granted = query.granted;
    if (query.subjectUserId !== undefined) where.subjectUserId = query.subjectUserId;

    const [rows, total] = await ds.getRepository(ConsentRecordEntity).findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    });
    return { data: rows.map((r) => ConsentRecordSchema.parse(r)), total };
  }

  // ── Banner config (settings) ───────────────────────────────────────────────────

  /** Read and parse the per-tenant banner config, falling back to defaults. */
  static async getBannerConfig(tenantId: string): Promise<BannerConfig> {
    const raw = await SettingService.getByKeys(tenantId, [...GDPR_CONSENT_KEYS]);

    let purposes: BannerPurpose[] = DEFAULT_PURPOSES;
    const rawPurposes = raw.consentPurposes;
    if (rawPurposes) {
      try {
        const arr = BannerConfigSchema.shape.purposes.safeParse(JSON.parse(rawPurposes));
        if (arr.success && arr.data.length > 0) purposes = arr.data;
      } catch {
        // Malformed JSON — fall back to defaults.
      }
    }

    return BannerConfigSchema.parse({
      enabled: raw.consentBannerEnabled === 'true',
      policyVersion: raw.consentPolicyVersion || DEFAULT_POLICY_VERSION,
      bannerTitle: raw.consentBannerTitle || 'We value your privacy',
      bannerMessage:
        raw.consentBannerMessage ||
        'We use cookies to enhance your experience. You can choose which categories to allow.',
      purposes,
    });
  }

  /** Update the banner config via SettingService. Audit-logged. */
  static async updateBannerConfig(
    tenantId: string,
    partial: UpdateBannerConfigInput,
    actorId?: string,
  ): Promise<BannerConfig> {
    const updates: Record<string, string> = {};
    if (partial.enabled !== undefined) updates.consentBannerEnabled = String(partial.enabled);
    if (partial.policyVersion !== undefined) updates.consentPolicyVersion = partial.policyVersion;
    if (partial.bannerTitle !== undefined) updates.consentBannerTitle = partial.bannerTitle;
    if (partial.bannerMessage !== undefined) updates.consentBannerMessage = partial.bannerMessage;
    if (partial.purposes !== undefined) updates.consentPurposes = JSON.stringify(partial.purposes);

    if (Object.keys(updates).length > 0) {
      await SettingService.updateMany(tenantId, updates, { actorId });
    }

    AuditLogService.log({
      tenantId,
      actorType: actorId ? 'USER' : 'SYSTEM',
      actorId: actorId ?? null,
      action: 'consent.banner_config_updated',
      resourceType: 'consent_banner_config',
      resourceId: tenantId,
      metadata: { tenantId, changedKeys: Object.keys(updates) },
    });

    return this.getBannerConfig(tenantId);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────────

  private static assertSubject(subject: ConsentSubject): void {
    if (!subject.userId && !subject.anonymousId) {
      throw new AppError(MSG.SUBJECT_REQUIRED, 422, ErrorCode.VALIDATION_ERROR);
    }
  }

  private static audit(
    tenantId: string,
    subject: ConsentSubject,
    action: string,
    resourceId: string | null,
    metadata: Record<string, unknown>,
  ): void {
    AuditLogService.log({
      tenantId,
      actorType: subject.userId ? 'USER' : 'SYSTEM',
      actorId: subject.userId ?? null,
      action,
      resourceType: 'consent_record',
      resourceId,
      metadata: {
        tenantId,
        subjectUserId: subject.userId ?? null,
        subjectAnonymousId: subject.anonymousId ?? null,
        ...metadata,
      },
    });
  }
}
