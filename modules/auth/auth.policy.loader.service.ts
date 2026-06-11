import SettingService from '@/modules/setting/setting.service';
import { ROOT_TENANT_ID } from '@/modules/tenant/tenant.constants';
import Logger from '@/modules/logger';

export const PASSWORD_POLICY_KEYS = [
  'passwordMinLength', 'passwordRequireUppercase', 'passwordRequireLowercase',
  'passwordRequireDigit', 'passwordRequireSpecial', 'passwordHistoryCount', 'passwordMaxAgeDays',
] as const;

export const LOCKOUT_POLICY_KEYS = ['lockoutMaxAttempts', 'lockoutDurationMinutes'] as const;
export const SESSION_POLICY_KEYS = ['sessionAbsoluteMaxHours', 'sessionIdleTimeoutMinutes'] as const;
export const DORMANT_POLICY_KEYS = ['dormantAccountDays', 'dormantAccountAutoDisable'] as const;
export const ADMIN_POLICY_KEYS   = ['adminPanelIpAllowlist', 'adminRequireMfa'] as const;
export const ACCESS_POLICY_KEYS  = [
  'externalRequireMfa', 'disableSocialLogin', 'captchaTriggerAttempts', 'singleSessionOnly',
] as const;

export interface PasswordPolicy {
  minLength: number; requireUppercase: boolean; requireLowercase: boolean;
  requireDigit: boolean; requireSpecial: boolean; historyCount: number; maxAgeDays: number;
}

export interface LockoutPolicy { maxAttempts: number; lockDurationMinutes: number; }
export interface SessionPolicy { absoluteMaxHours: number; idleTimeoutMinutes: number; }
export interface DormantPolicy { days: number; autoDisable: boolean; }

export interface AdminPolicy {
  ipAllowlist: string[];
  requireMfa: boolean;
}

export interface AccessPolicy {
  externalRequireMfa: boolean;
  disableSocialLogin: boolean;
  captchaTriggerAttempts: number;
  singleSessionOnly: boolean;
}

const PASSWORD_DEFAULTS: PasswordPolicy = {
  minLength: 8, requireUppercase: true, requireLowercase: true,
  requireDigit: true, requireSpecial: true, historyCount: 3, maxAgeDays: 42,
};

const LOCKOUT_DEFAULTS: LockoutPolicy = { maxAttempts: 5, lockDurationMinutes: 15 };
const SESSION_DEFAULTS: SessionPolicy = { absoluteMaxHours: 8, idleTimeoutMinutes: 30 };
const DORMANT_DEFAULTS: DormantPolicy = { days: 90, autoDisable: true };
const ADMIN_DEFAULTS: AdminPolicy = { ipAllowlist: [], requireMfa: true };
const ACCESS_DEFAULTS: AccessPolicy = {
  externalRequireMfa: false, disableSocialLogin: false,
  captchaTriggerAttempts: 3, singleSessionOnly: false,
};

function parseBool(raw: string | undefined): boolean | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  return raw === 'true' || raw === '1';
}

function parseInt32(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

function resolve(key: string, systemMap: Record<string, string>, tenantMap: Record<string, string>): string | undefined {
  const sys = systemMap[key];
  if (sys !== undefined && sys !== '') return sys;
  const ten = tenantMap[key];
  if (ten !== undefined && ten !== '') return ten;
  return undefined;
}

async function loadSettings(
  keys: readonly string[], tenantId?: string,
): Promise<{ system: Record<string, string>; tenant: Record<string, string> }> {
  const system = await SettingService.getByKeys(ROOT_TENANT_ID, [...keys]).catch((err: unknown) => {
    Logger.warn(`AuthPolicy: failed to load platform settings: ${err instanceof Error ? err.message : String(err)}`);
    return {};
  });
  let tenant: Record<string, string> = {};
  if (tenantId) {
    tenant = await SettingService.getByKeys(tenantId, [...keys]).catch((err: unknown) => {
      Logger.warn(`AuthPolicy: failed to load tenant settings (${tenantId}): ${err instanceof Error ? err.message : String(err)}`);
      return {};
    });
  }
  return { system, tenant };
}

export default class AuthPolicyLoaderService {

  static async getPasswordPolicy(tenantId?: string): Promise<PasswordPolicy> {
    const { system, tenant } = await loadSettings(PASSWORD_POLICY_KEYS, tenantId);
    return {
      minLength: parseInt32(resolve('passwordMinLength', system, tenant)) ?? PASSWORD_DEFAULTS.minLength,
      requireUppercase: parseBool(resolve('passwordRequireUppercase', system, tenant)) ?? PASSWORD_DEFAULTS.requireUppercase,
      requireLowercase: parseBool(resolve('passwordRequireLowercase', system, tenant)) ?? PASSWORD_DEFAULTS.requireLowercase,
      requireDigit: parseBool(resolve('passwordRequireDigit', system, tenant)) ?? PASSWORD_DEFAULTS.requireDigit,
      requireSpecial: parseBool(resolve('passwordRequireSpecial', system, tenant)) ?? PASSWORD_DEFAULTS.requireSpecial,
      historyCount: parseInt32(resolve('passwordHistoryCount', system, tenant)) ?? PASSWORD_DEFAULTS.historyCount,
      maxAgeDays: parseInt32(resolve('passwordMaxAgeDays', system, tenant)) ?? PASSWORD_DEFAULTS.maxAgeDays,
    };
  }

  static async getLockoutPolicy(tenantId?: string): Promise<LockoutPolicy> {
    const { system, tenant } = await loadSettings(LOCKOUT_POLICY_KEYS, tenantId);
    return {
      maxAttempts: parseInt32(resolve('lockoutMaxAttempts', system, tenant)) ?? LOCKOUT_DEFAULTS.maxAttempts,
      lockDurationMinutes: parseInt32(resolve('lockoutDurationMinutes', system, tenant)) ?? LOCKOUT_DEFAULTS.lockDurationMinutes,
    };
  }

  static async getSessionPolicy(tenantId?: string): Promise<SessionPolicy> {
    const { system, tenant } = await loadSettings(SESSION_POLICY_KEYS, tenantId);
    return {
      absoluteMaxHours: parseInt32(resolve('sessionAbsoluteMaxHours', system, tenant)) ?? SESSION_DEFAULTS.absoluteMaxHours,
      idleTimeoutMinutes: parseInt32(resolve('sessionIdleTimeoutMinutes', system, tenant)) ?? SESSION_DEFAULTS.idleTimeoutMinutes,
    };
  }

  static async getDormantPolicy(tenantId?: string): Promise<DormantPolicy> {
    const { system, tenant } = await loadSettings(DORMANT_POLICY_KEYS, tenantId);
    return {
      days: parseInt32(resolve('dormantAccountDays', system, tenant)) ?? DORMANT_DEFAULTS.days,
      autoDisable: parseBool(resolve('dormantAccountAutoDisable', system, tenant)) ?? DORMANT_DEFAULTS.autoDisable,
    };
  }

  static async getAdminPolicy(tenantId?: string): Promise<AdminPolicy> {
    const { system, tenant } = await loadSettings(ADMIN_POLICY_KEYS, tenantId);
    const raw = resolve('adminPanelIpAllowlist', system, tenant) ?? '';
    const ipAllowlist = raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    return { ipAllowlist, requireMfa: parseBool(resolve('adminRequireMfa', system, tenant)) ?? ADMIN_DEFAULTS.requireMfa };
  }

  static async getAccessPolicy(tenantId?: string): Promise<AccessPolicy> {
    const { system, tenant } = await loadSettings(ACCESS_POLICY_KEYS, tenantId);
    return {
      externalRequireMfa: parseBool(resolve('externalRequireMfa', system, tenant)) ?? ACCESS_DEFAULTS.externalRequireMfa,
      disableSocialLogin: parseBool(resolve('disableSocialLogin', system, tenant)) ?? ACCESS_DEFAULTS.disableSocialLogin,
      captchaTriggerAttempts: parseInt32(resolve('captchaTriggerAttempts', system, tenant)) ?? ACCESS_DEFAULTS.captchaTriggerAttempts,
      singleSessionOnly: parseBool(resolve('singleSessionOnly', system, tenant)) ?? ACCESS_DEFAULTS.singleSessionOnly,
    };
  }
}
