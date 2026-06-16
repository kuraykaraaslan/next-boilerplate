import Logger from '@nb/logger';
import SettingService from '@nb/setting/server/setting.service';
import {
  IMPERSONATION_SETTING_KEYS,
  IMPERSONATION_DEFAULTS,
} from './impersonation.setting.keys';

// ── Settings resolvers ───────────────────────────────────────────────────

/**
 * GOODTOHAVE #1 — resolve the per-tenant impersonation session TTL in ms.
 * Reads `impersonationSessionTtlMinutes` from the TARGET tenant, clamps it to
 * [MIN, MAX], and falls back to 60 minutes when unset/invalid. The
 * user_session orchestrator consumes this when minting the impersonation
 * session so the TTL stays consistent with the tenant's security posture.
 */
export async function getImpersonationTtlMs(tenantId: string): Promise<number> {
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
export async function isImpersonationDisabled(tenantId: string): Promise<boolean> {
  try {
    const raw = await SettingService.getValue(tenantId, IMPERSONATION_SETTING_KEYS.DISABLED);
    return raw === 'true';
  } catch {
    return false;
  }
}

export async function getStepUpRequired(tenantId: string): Promise<boolean> {
  try {
    const raw = await SettingService.getValue(tenantId, IMPERSONATION_SETTING_KEYS.REQUIRE_STEP_UP);
    return raw === 'true';
  } catch {
    return false;
  }
}

export async function getMaxConcurrent(tenantId: string): Promise<number> {
  try {
    const raw = await SettingService.getValue(tenantId, IMPERSONATION_SETTING_KEYS.MAX_CONCURRENT_PER_IMPERSONATOR);
    const n = raw == null ? 0 : Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export async function getAlertStartsPerHour(tenantId: string): Promise<number> {
  try {
    const raw = await SettingService.getValue(tenantId, IMPERSONATION_SETTING_KEYS.ALERT_STARTS_PER_HOUR);
    const n = raw == null ? 0 : Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}
