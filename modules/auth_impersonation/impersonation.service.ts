import 'reflect-metadata';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import { IsNull, MoreThan } from 'typeorm';
import { getDataSource, tenantDataSourceFor } from '@/modules/db';
import redis from '@/modules/redis';
import Logger from '@/modules/logger';
import { User as UserEntity } from '../user/entities/user.entity';
import { UserSession as UserSessionEntity } from '../user_session/entities/user_session.entity';
import { TenantMember as TenantMemberEntity } from '../tenant_member/entities/tenant_member.entity';
import { SafeUserSchema } from '@/modules/user/user.types';
import { SafeUserSession, SafeUserSessionSchema } from '@/modules/user_session/user_session.types';
import UserSessionService from '@/modules/user_session/user_session.service';
import TOTPService from '@/modules/auth/auth.totp.service';
import WebhookService from '@/modules/webhook/webhook.service';
import type { SafeTenantMember } from '@/modules/tenant_member/tenant_member.types';
import type { TenantMemberRole } from '@/modules/tenant_member/tenant_member.enums';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import { AuditActions } from '@/modules/audit_log/audit_log.enums';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { UserRoleEnum } from '../user/user.enums';
import SettingService from '@/modules/setting/setting.service';
import ImpersonationMessages from './impersonation.messages';
import {
  IMPERSONATION_SETTING_KEYS,
  IMPERSONATION_DEFAULTS,
} from './impersonation.setting.keys';
import type { StepUpCredentialInput } from './impersonation.dto';

const GLOBAL_ROLE_ORDER = Object.fromEntries(
  UserRoleEnum.options.map((role, i) => [role, i])
) as Record<string, number>;

const ImpersonationSessionMetaSchema = z.object({
  impersonation: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

// Redis key helpers for per-impersonator anomaly counting (GOODTOHAVE #12).
const anomalyKey = (impersonatorUserId: string) =>
  `impersonation:starts:${impersonatorUserId}`;

export default class ImpersonationService {

  // ── Settings resolvers ───────────────────────────────────────────────────

  /**
   * GOODTOHAVE #1 — resolve the per-tenant impersonation session TTL in ms.
   * Reads `impersonationSessionTtlMinutes` from the TARGET tenant, clamps it to
   * [MIN, MAX], and falls back to 60 minutes when unset/invalid. The
   * user_session orchestrator consumes this when minting the impersonation
   * session so the TTL stays consistent with the tenant's security posture.
   */
  static async getImpersonationTtlMs(tenantId: string): Promise<number> {
    let minutes = IMPERSONATION_DEFAULTS.SESSION_TTL_MINUTES;
    try {
      const raw = await SettingService.getValue(tenantId, IMPERSONATION_SETTING_KEYS.SESSION_TTL_MINUTES);
      const parsed = raw == null ? NaN : Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) {
        minutes = Math.min(
          IMPERSONATION_DEFAULTS.MAX_SESSION_TTL_MINUTES,
          Math.max(IMPERSONATION_DEFAULTS.MIN_SESSION_TTL_MINUTES, Math.floor(parsed)),
        );
      }
    } catch (err) {
      Logger.warn(`[Impersonation] getImpersonationTtlMs fell back to default for tenant=${tenantId}: ${err}`);
    }
    return minutes * 60 * 1000;
  }

  /** GOODTOHAVE #10 — whether impersonation of this tenant's users is disabled. */
  static async isImpersonationDisabled(tenantId: string): Promise<boolean> {
    try {
      const raw = await SettingService.getValue(tenantId, IMPERSONATION_SETTING_KEYS.DISABLED);
      return raw === 'true';
    } catch {
      return false;
    }
  }

  private static async getStepUpRequired(tenantId: string): Promise<boolean> {
    try {
      const raw = await SettingService.getValue(tenantId, IMPERSONATION_SETTING_KEYS.REQUIRE_STEP_UP);
      return raw === 'true';
    } catch {
      return false;
    }
  }

  private static async getMaxConcurrent(tenantId: string): Promise<number> {
    try {
      const raw = await SettingService.getValue(tenantId, IMPERSONATION_SETTING_KEYS.MAX_CONCURRENT_PER_IMPERSONATOR);
      const n = raw == null ? 0 : Number(raw);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    } catch {
      return 0;
    }
  }

  private static async getAlertStartsPerHour(tenantId: string): Promise<number> {
    try {
      const raw = await SettingService.getValue(tenantId, IMPERSONATION_SETTING_KEYS.ALERT_STARTS_PER_HOUR);
      const n = raw == null ? 0 : Number(raw);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    } catch {
      return 0;
    }
  }

  // ── Public flows ─────────────────────────────────────────────────────────

  static async startSystemImpersonation({
    impersonatorUser,
    impersonatorSession,
    targetUserId,
    tenantId,
    targetTenantRole,
    reason,
    stepUp,
    userAgent,
    ipAddress,
  }: {
    impersonatorUser: ReturnType<typeof SafeUserSchema.parse>;
    impersonatorSession: SafeUserSession;
    targetUserId: string;
    tenantId: string;
    targetTenantRole?: TenantMemberRole;
    reason: string;
    stepUp?: StepUpCredentialInput;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<{
    userSession: SafeUserSession;
    rawAccessToken: string;
    rawRefreshToken: string;
  }> {
    this.assertReason(reason);
    this.assertNotSelf(impersonatorUser.userId, targetUserId);

    // GOODTOHAVE #10 — tenant opt-out blocks every flow, including system.
    await this.assertTenantAllowsImpersonation(tenantId);

    const sysDs = await getDataSource();
    const targetUser = await sysDs.getRepository(UserEntity).findOne({ where: { userId: targetUserId } });
    if (!targetUser) throw new AppError(ImpersonationMessages.TARGET_USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    this.assertGlobalRoleDominance(impersonatorUser.userRole, targetUser.userRole);

    // GOODTOHAVE #3 — step-up re-auth before a privileged action.
    await this.enforceStepUp({ impersonatorUser, tenantId, stepUp });

    // GOODTOHAVE #4 — per-impersonator concurrency cap.
    await this.assertConcurrencyBudget(impersonatorUser.userId, tenantId);

    let resolvedRole = targetTenantRole;
    if (!resolvedRole) {
      const ds = await tenantDataSourceFor(tenantId);
      const membership = await ds.getRepository(TenantMemberEntity).findOne({
        where: { tenantId, userId: targetUserId, deletedAt: IsNull() },
      });
      resolvedRole = (membership?.memberRole as TenantMemberRole | undefined) ?? 'USER';
    }

    const safeTargetUser = SafeUserSchema.parse(targetUser);

    return this.mintAndAudit({
      impersonatorUser,
      impersonatorSession,
      safeTargetUser,
      targetUserId,
      tenantId,
      resolvedRole,
      flow: 'system',
      reason,
      userAgent,
      ipAddress,
    });
  }

  static async startTenantImpersonation({
    impersonatorUser,
    impersonatorMember,
    impersonatorSession,
    targetUserId,
    tenantId,
    reason,
    stepUp,
    userAgent,
    ipAddress,
  }: {
    impersonatorUser: ReturnType<typeof SafeUserSchema.parse>;
    impersonatorMember: SafeTenantMember;
    impersonatorSession: SafeUserSession;
    targetUserId: string;
    tenantId: string;
    reason: string;
    stepUp?: StepUpCredentialInput;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<{
    userSession: SafeUserSession;
    rawAccessToken: string;
    rawRefreshToken: string;
  }> {
    this.assertReason(reason);
    this.assertNotSelf(impersonatorUser.userId, targetUserId);

    // GOODTOHAVE #10 — tenant opt-out.
    await this.assertTenantAllowsImpersonation(tenantId);

    const sysDs = await getDataSource();
    const targetUser = await sysDs.getRepository(UserEntity).findOne({ where: { userId: targetUserId } });
    // GOODTOHAVE #8 — generic not-found: do NOT distinguish "user does not exist"
    // from "user exists but is not a member of this tenant", to close
    // cross-tenant user enumeration via the tenant flow.
    if (!targetUser) throw new AppError(ImpersonationMessages.TARGET_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const ds = await tenantDataSourceFor(tenantId);
    const targetMembership = await ds.getRepository(TenantMemberEntity).findOne({
      where: { tenantId, userId: targetUserId, deletedAt: IsNull() },
    });
    if (!targetMembership) throw new AppError(ImpersonationMessages.TARGET_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    if (targetMembership.memberRole !== 'USER') {
      throw new AppError(ImpersonationMessages.TARGET_MUST_BE_TENANT_USER, 403, ErrorCode.FORBIDDEN);
    }

    // GOODTOHAVE #3 — step-up re-auth.
    await this.enforceStepUp({ impersonatorUser, tenantId, stepUp });

    // GOODTOHAVE #4 — per-impersonator concurrency cap.
    await this.assertConcurrencyBudget(impersonatorUser.userId, tenantId);

    const safeTargetUser = SafeUserSchema.parse(targetUser);

    return this.mintAndAudit({
      impersonatorUser,
      impersonatorSession,
      safeTargetUser,
      targetUserId,
      tenantId,
      resolvedRole: 'USER',
      flow: 'tenant',
      reason,
      userAgent,
      ipAddress,
    });
  }

  static async endImpersonationSession(
    userSessionId: string,
    context?: {
      actorId?: string;
      targetUserId?: string;
      tenantId?: string;
      /** Shared id linking START → END for duration tracking (GOODTOHAVE #11). */
      impersonationSessionId?: string;
      /** Unix ms when the impersonation started, to compute duration. */
      startedAtMs?: number;
    }
  ): Promise<void> {
    await UserSessionService.deleteSession(userSessionId);

    if (context?.actorId) {
      const durationMs =
        typeof context.startedAtMs === 'number' && Number.isFinite(context.startedAtMs)
          ? Math.max(0, Date.now() - context.startedAtMs)
          : undefined;

      AuditLogService.log({
        actorType: 'USER',
        actorId: context.actorId,
        // Dual-actor: actor is the impersonator, the target is recorded as the
        // on-behalf-of subject (GOODTOHAVE #11). impersonatorId also lives in
        // metadata for forward-compat with the audit DTO extension.
        onBehalfOfActorId: context.targetUserId,
        action: AuditActions.IMPERSONATION_ENDED,
        resourceType: 'user',
        resourceId: context.targetUserId,
        metadata: {
          tenantId: context.tenantId,
          impersonatorId: context.actorId,
          targetUserId: context.targetUserId,
          impersonationSessionId: context.impersonationSessionId,
          durationMs,
        },
      });

      // GOODTOHAVE #12 — emit impersonation.ended webhook.
      if (context.tenantId) {
        void WebhookService.dispatchEvent(context.tenantId, 'impersonation.ended', {
          impersonatorUserId: context.actorId,
          targetUserId: context.targetUserId,
          impersonationSessionId: context.impersonationSessionId,
          durationMs,
        }).catch(() => undefined);
      }
    }
  }

  static async getActiveImpersonationSession(rawAccessToken: string): Promise<SafeUserSession | null> {
    const hashedToken = UserSessionService.hashToken(rawAccessToken);
    const ds = await getDataSource();
    const session = await ds.getRepository(UserSessionEntity).findOne({
      where: { accessToken: hashedToken },
    });

    if (!session) return null;
    const meta = ImpersonationSessionMetaSchema.safeParse(session.metadata);
    if (!meta.success || !meta.data.impersonation) return null;
    if (session.sessionExpiry < new Date()) return null;

    return SafeUserSessionSchema.parse(session);
  }

  /**
   * GOODTOHAVE #5 / #7 — disclosure-banner + auto-expiry context for the UI.
   * Returns the impersonation flag, impersonator id and expiry so the client
   * can render a persistent banner and a countdown. Returns null when the token
   * is not an active impersonation session.
   */
  static async getImpersonationContext(rawAccessToken: string): Promise<{
    isImpersonating: true;
    impersonatorUserId: string | null;
    targetUserId: string;
    tenantId: string | null;
    targetTenantRole: string | null;
    impersonationSessionId: string | null;
    expiresAt: string;
    remainingMs: number;
  } | null> {
    const session = await this.getActiveImpersonationSession(rawAccessToken);
    if (!session) return null;
    const meta = (session.metadata as any)?.impersonation ?? {};
    const expiry = new Date(session.sessionExpiry);
    return {
      isImpersonating: true,
      impersonatorUserId: meta.impersonatorUserId ?? null,
      targetUserId: session.userId,
      tenantId: meta.tenantId ?? null,
      targetTenantRole: meta.targetTenantRole ?? null,
      impersonationSessionId: meta.impersonationSessionId ?? null,
      expiresAt: expiry.toISOString(),
      remainingMs: Math.max(0, expiry.getTime() - Date.now()),
    };
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  private static async mintAndAudit({
    impersonatorUser,
    impersonatorSession,
    safeTargetUser,
    targetUserId,
    tenantId,
    resolvedRole,
    flow,
    reason,
    userAgent,
    ipAddress,
  }: {
    impersonatorUser: ReturnType<typeof SafeUserSchema.parse>;
    impersonatorSession: SafeUserSession;
    safeTargetUser: ReturnType<typeof SafeUserSchema.parse>;
    targetUserId: string;
    tenantId: string;
    resolvedRole: TenantMemberRole;
    flow: 'system' | 'tenant';
    reason: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<{ userSession: SafeUserSession; rawAccessToken: string; rawRefreshToken: string }> {
    // Shared id links START → END for duration tracking (GOODTOHAVE #11).
    const impersonationSessionId = randomUUID();

    // Per-tenant impersonation session TTL (GOODTOHAVE #1). Single source of
    // truth — user_session consumes the resolved value (no reverse import).
    const ttlMs = await ImpersonationService.getImpersonationTtlMs(tenantId);

    const result = await UserSessionService.createImpersonationSession({
      targetUser: safeTargetUser,
      ttlMs,
      // `impersonationSessionId` + `reason` are extra fields the user_session
      // orchestrator persists verbatim; the typed slice only declares the core
      // fields, so cast to satisfy the strict nested schema type.
      impersonationMeta: {
        impersonatorUserId: impersonatorUser.userId,
        impersonatorSessionId: impersonatorSession.userSessionId,
        tenantId,
        targetTenantRole: resolvedRole,
        impersonationSessionId,
        reason,
      } as unknown as Parameters<typeof UserSessionService.createImpersonationSession>[0]['impersonationMeta'],
      userAgent,
      ipAddress,
    });

    AuditLogService.log({
      actorType: 'USER',
      actorId: impersonatorUser.userId,
      onBehalfOfActorId: targetUserId,
      action: AuditActions.IMPERSONATION_STARTED,
      resourceType: 'user',
      resourceId: targetUserId,
      metadata: {
        tenantId,
        impersonatorId: impersonatorUser.userId,
        targetTenantRole: resolvedRole,
        flow,
        reason,
        impersonationSessionId,
        startedAtMs: Date.now(),
        ipAddress,
        userAgent,
      },
    });

    // GOODTOHAVE #12 — anomaly counter + webhook.
    await this.recordStartAndMaybeAlert({ impersonatorUser, targetUserId, tenantId, reason });

    return result;
  }

  private static assertReason(reason: string): void {
    if (!reason || reason.trim().length < 3) {
      throw new AppError(ImpersonationMessages.REASON_REQUIRED, 400, ErrorCode.VALIDATION_ERROR);
    }
  }

  private static assertNotSelf(impersonatorUserId: string, targetUserId: string): void {
    if (impersonatorUserId === targetUserId) {
      throw new AppError(ImpersonationMessages.CANNOT_IMPERSONATE_SELF, 403, ErrorCode.FORBIDDEN);
    }
  }

  private static assertGlobalRoleDominance(impersonatorRole: string, targetRole: string): void {
    const impersonatorIndex = GLOBAL_ROLE_ORDER[impersonatorRole] ?? 0;
    const targetIndex = GLOBAL_ROLE_ORDER[targetRole] ?? 0;
    if (impersonatorIndex <= targetIndex) {
      throw new AppError(ImpersonationMessages.CANNOT_IMPERSONATE_EQUAL_OR_HIGHER_GLOBAL_ROLE, 403, ErrorCode.FORBIDDEN);
    }
  }

  private static async assertTenantAllowsImpersonation(tenantId: string): Promise<void> {
    if (await this.isImpersonationDisabled(tenantId)) {
      throw new AppError(ImpersonationMessages.IMPERSONATION_DISABLED_FOR_TENANT, 403, ErrorCode.FORBIDDEN);
    }
  }

  /**
   * GOODTOHAVE #3 — verify a step-up credential when the target tenant requires
   * it. Password is verified locally against the stored bcrypt hash; TOTP is
   * delegated to the auth module's TOTP verifier. Throws when required but
   * missing/invalid.
   */
  private static async enforceStepUp({
    impersonatorUser,
    tenantId,
    stepUp,
  }: {
    impersonatorUser: ReturnType<typeof SafeUserSchema.parse>;
    tenantId: string;
    stepUp?: StepUpCredentialInput;
  }): Promise<void> {
    if (!(await this.getStepUpRequired(tenantId))) return;

    if (!stepUp || (!stepUp.password && !stepUp.totp)) {
      throw new AppError(ImpersonationMessages.STEP_UP_REQUIRED, 401, ErrorCode.UNAUTHORIZED);
    }

    if (stepUp.password) {
      const sysDs = await getDataSource();
      const userRow = await sysDs.getRepository(UserEntity).findOne({ where: { userId: impersonatorUser.userId } });
      if (!userRow?.password) {
        throw new AppError(ImpersonationMessages.STEP_UP_METHOD_UNAVAILABLE, 400, ErrorCode.VALIDATION_ERROR);
      }
      const ok = await bcrypt.compare(stepUp.password, userRow.password);
      if (!ok) {
        throw new AppError(ImpersonationMessages.STEP_UP_INVALID_PASSWORD, 401, ErrorCode.INVALID_CREDENTIALS);
      }
      return;
    }

    // TOTP path — delegate to the auth module (read-only call; throws on invalid).
    try {
      await TOTPService.verifyAuthenticate({ user: impersonatorUser as any, otpToken: stepUp.totp! });
    } catch {
      throw new AppError(ImpersonationMessages.STEP_UP_INVALID_TOTP, 401, ErrorCode.INVALID_CREDENTIALS);
    }
  }

  /**
   * GOODTOHAVE #4 — cap concurrent active impersonation sessions per
   * impersonator for this tenant. Counts non-expired UserSession rows whose
   * metadata.impersonation.impersonatorUserId / tenantId match. 0 = unlimited.
   */
  private static async assertConcurrencyBudget(impersonatorUserId: string, tenantId: string): Promise<void> {
    const max = await this.getMaxConcurrent(tenantId);
    if (max <= 0) return;

    const ds = await getDataSource();
    const repo = ds.getRepository(UserSessionEntity);
    // metadata is jsonb; filter in SQL on the nested impersonation fields.
    const active = await repo
      .createQueryBuilder('s')
      .where('s.sessionExpiry > :now', { now: new Date() })
      .andWhere(`s.metadata -> 'impersonation' ->> 'impersonatorUserId' = :uid`, { uid: impersonatorUserId })
      .andWhere(`s.metadata -> 'impersonation' ->> 'tenantId' = :tid`, { tid: tenantId })
      .getCount();

    if (active >= max) {
      throw new AppError(ImpersonationMessages.IMPERSONATION_CONCURRENCY_LIMIT_REACHED, 429, ErrorCode.RATE_LIMIT_EXCEEDED);
    }
  }

  /**
   * GOODTOHAVE #12 — increment a per-impersonator hourly counter, emit the
   * impersonation.started webhook, and fire an anomaly signal when the count
   * exceeds the tenant's configured threshold. Best-effort; never blocks the
   * start flow.
   */
  private static async recordStartAndMaybeAlert({
    impersonatorUser,
    targetUserId,
    tenantId,
    reason,
  }: {
    impersonatorUser: ReturnType<typeof SafeUserSchema.parse>;
    targetUserId: string;
    tenantId: string;
    reason: string;
  }): Promise<void> {
    let countThisHour = 0;
    try {
      const key = anomalyKey(impersonatorUser.userId);
      countThisHour = await redis.incr(key);
      if (countThisHour === 1) {
        await redis.expire(key, 3600);
      }
    } catch (err) {
      Logger.warn(`[Impersonation] anomaly counter unavailable: ${err}`);
    }

    void WebhookService.dispatchEvent(tenantId, 'impersonation.started', {
      impersonatorUserId: impersonatorUser.userId,
      targetUserId,
      reason,
      startsThisHour: countThisHour,
    }).catch(() => undefined);

    const threshold = await this.getAlertStartsPerHour(tenantId);
    if (threshold > 0 && countThisHour > threshold) {
      Logger.warn(
        `[Impersonation][ANOMALY] impersonator=${impersonatorUser.userId} tenant=${tenantId} ` +
        `starts=${countThisHour} exceeds threshold=${threshold}`,
      );
      // Surface the anomaly through the audit log so it lands in the
      // high-risk audit webhook / monitoring pipeline as well.
      AuditLogService.log({
        actorType: 'USER',
        actorId: impersonatorUser.userId,
        onBehalfOfActorId: targetUserId,
        action: AuditActions.IMPERSONATION_STARTED,
        resourceType: 'user',
        resourceId: targetUserId,
        metadata: { tenantId, impersonatorId: impersonatorUser.userId, anomaly: true, startsThisHour: countThisHour, threshold },
      });
    }
  }
}
