import SettingService from '@/modules/setting/setting.service';
import TenantSettingService from '@/modules/tenant_setting/tenant_setting.service';
import Logger from '@/modules/logger';

export const PASSWORD_POLICY_KEYS = [
  'passwordMinLength',
  'passwordRequireUppercase',
  'passwordRequireLowercase',
  'passwordRequireDigit',
  'passwordRequireSpecial',
  'passwordHistoryCount',
  'passwordMaxAgeDays',
] as const;

export const LOCKOUT_POLICY_KEYS = [
  'lockoutMaxAttempts',
  'lockoutDurationMinutes',
] as const;

export const SESSION_POLICY_KEYS = [
  'sessionAbsoluteMaxHours',
  'sessionIdleTimeoutMinutes',
] as const;

export const DORMANT_POLICY_KEYS = [
  'dormantAccountDays',
  'dormantAccountAutoDisable',
] as const;

export const ADMIN_POLICY_KEYS = [
  'adminPanelIpAllowlist',
  'adminRequireMfa',
] as const;

export const ACCESS_POLICY_KEYS = [
  'externalRequireMfa',
  'disableSocialLogin',
  'captchaTriggerAttempts',
  'singleSessionOnly',
] as const;

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigit: boolean;
  requireSpecial: boolean;
  historyCount: number;
  maxAgeDays: number;
}

export interface LockoutPolicy {
  maxAttempts: number;
  lockDurationMinutes: number;
}

export interface SessionPolicy {
  absoluteMaxHours: number;
  idleTimeoutMinutes: number;
}

export interface DormantPolicy {
  days: number;
  autoDisable: boolean;
}

export interface AdminPolicy {
  /** Comma-separated list of CIDR / exact-IP entries. Empty = no restriction. */
  ipAllowlist: string[];
  requireMfa: boolean;
}

export interface AccessPolicy {
  /** KD-16: force MFA for any login originating outside the LAN. */
  externalRequireMfa: boolean;
  /** KD-18: completely disable social/OAuth login for the tenant. */
  disableSocialLogin: boolean;
  /**
   * KD-19: number of consecutive failed login attempts (per identity)
   * that triggers CAPTCHA requirement on the next attempt. 0 disables.
   */
  captchaTriggerAttempts: number;
  /**
   * KD-21: when true, creating a new session for a user invalidates all
   * other active sessions for the same user.
   */
  singleSessionOnly: boolean;
}

const PASSWORD_DEFAULTS: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecial: true,
  historyCount: 3,
  maxAgeDays: 42,
};

const LOCKOUT_DEFAULTS: LockoutPolicy = {
  maxAttempts: 5,
  lockDurationMinutes: 15,
};

const SESSION_DEFAULTS: SessionPolicy = {
  absoluteMaxHours: 8,
  idleTimeoutMinutes: 30,
};

const DORMANT_DEFAULTS: DormantPolicy = {
  days: 90,
  autoDisable: true,
};

const ADMIN_DEFAULTS: AdminPolicy = {
  ipAllowlist: [],
  requireMfa: true,
};

const ACCESS_DEFAULTS: AccessPolicy = {
  externalRequireMfa: false,
  disableSocialLogin: false,
  captchaTriggerAttempts: 3,
  singleSessionOnly: false,
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

/**
 * Resolve a setting value with sysadmin > tenant priority.
 * - If system has a non-empty value → use it.
 * - Else if tenant has a non-empty value → use it.
 * - Else → undefined (caller substitutes default).
 */
function resolve(
  key: string,
  systemMap: Record<string, string>,
  tenantMap: Record<string, string>,
): string | undefined {
  const sys = systemMap[key];
  if (sys !== undefined && sys !== '') return sys;
  const ten = tenantMap[key];
  if (ten !== undefined && ten !== '') return ten;
  return undefined;
}

async function loadSettings(
  keys: readonly string[],
  tenantId?: string,
): Promise<{ system: Record<string, string>; tenant: Record<string, string> }> {
  const system = await SettingService.getByKeys([...keys]).catch((err: unknown) => {
    Logger.warn(`AuthPolicy: failed to load system settings: ${err instanceof Error ? err.message : String(err)}`);
    return {};
  });
  let tenant: Record<string, string> = {};
  if (tenantId) {
    tenant = await TenantSettingService.getByKeys(tenantId, [...keys]).catch((err: unknown) => {
      Logger.warn(`AuthPolicy: failed to load tenant settings (${tenantId}): ${err instanceof Error ? err.message : String(err)}`);
      return {};
    });
  }
  return { system, tenant };
}

export default class AuthPolicyService {
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
    const ipAllowlist = raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return {
      ipAllowlist,
      requireMfa: parseBool(resolve('adminRequireMfa', system, tenant)) ?? ADMIN_DEFAULTS.requireMfa,
    };
  }

  static async getAccessPolicy(tenantId?: string): Promise<AccessPolicy> {
    const { system, tenant } = await loadSettings(ACCESS_POLICY_KEYS, tenantId);
    return {
      externalRequireMfa: parseBool(resolve('externalRequireMfa', system, tenant)) ?? ACCESS_DEFAULTS.externalRequireMfa,
      disableSocialLogin: parseBool(resolve('disableSocialLogin', system, tenant)) ?? ACCESS_DEFAULTS.disableSocialLogin,
      captchaTriggerAttempts:
        parseInt32(resolve('captchaTriggerAttempts', system, tenant)) ?? ACCESS_DEFAULTS.captchaTriggerAttempts,
      singleSessionOnly: parseBool(resolve('singleSessionOnly', system, tenant)) ?? ACCESS_DEFAULTS.singleSessionOnly,
    };
  }

  /**
   * KD-13: check whether the request IP is allowed to reach admin surfaces.
   * Returns true if no allowlist is configured (open access).
   * Supports exact IPs and IPv4 CIDR ranges (e.g., "10.0.0.0/8").
   */
  static isAdminIpAllowed(requestIp: string | undefined, policy: AdminPolicy): boolean {
    if (policy.ipAllowlist.length === 0) return true;
    if (!requestIp) return false;
    const ip = requestIp.split(',')[0]!.trim();
    for (const entry of policy.ipAllowlist) {
      if (entry === ip) return true;
      if (entry.includes('/') && ipv4InCidr(ip, entry)) return true;
    }
    return false;
  }

  /**
   * Validate a candidate password against the policy.
   * Returns null when valid, or an error message key when not.
   */
  static validatePassword(
    password: string,
    policy: PasswordPolicy,
    identity?: { email?: string; name?: string },
  ): string | null {
    if (password.length < policy.minLength) return 'PASSWORD_TOO_SHORT';
    if (policy.requireUppercase && !/[A-Z]/.test(password)) return 'PASSWORD_MISSING_UPPERCASE';
    if (policy.requireLowercase && !/[a-z]/.test(password)) return 'PASSWORD_MISSING_LOWERCASE';
    if (policy.requireDigit && !/[0-9]/.test(password)) return 'PASSWORD_MISSING_DIGIT';
    if (policy.requireSpecial && !/[^A-Za-z0-9]/.test(password)) return 'PASSWORD_MISSING_SPECIAL';

    const lower = password.toLowerCase();
    if (identity?.email) {
      const local = identity.email.split('@')[0]?.toLowerCase();
      if (local && local.length >= 3 && lower.includes(local)) return 'PASSWORD_CONTAINS_IDENTITY';
    }
    if (identity?.name) {
      const trimmed = identity.name.trim().toLowerCase();
      if (trimmed.length >= 3 && lower.includes(trimmed)) return 'PASSWORD_CONTAINS_IDENTITY';
    }

    if (hasRepeatedRun(password, 3) || hasSequentialRun(password, 3)) {
      return 'PASSWORD_HAS_SEQUENTIAL_OR_REPEATED';
    }

    return null;
  }
}

function ipv4InCidr(ip: string, cidr: string): boolean {
  const [base, bitsRaw] = cidr.split('/');
  const bits = parseInt(bitsRaw ?? '32', 10);
  if (!Number.isFinite(bits) || bits < 0 || bits > 32) return false;
  const toLong = (s: string): number | null => {
    const parts = s.split('.');
    if (parts.length !== 4) return null;
    let n = 0;
    for (const p of parts) {
      const o = parseInt(p, 10);
      if (!Number.isFinite(o) || o < 0 || o > 255) return null;
      n = (n << 8) + o;
    }
    return n >>> 0;
  };
  const a = toLong(ip);
  const b = toLong(base!);
  if (a === null || b === null) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (a & mask) === (b & mask);
}

function hasRepeatedRun(s: string, runLen: number): boolean {
  let count = 1;
  for (let i = 1; i < s.length; i++) {
    if (s[i] === s[i - 1]) {
      count++;
      if (count >= runLen) return true;
    } else {
      count = 1;
    }
  }
  return false;
}

function hasSequentialRun(s: string, runLen: number): boolean {
  let inc = 1;
  let dec = 1;
  for (let i = 1; i < s.length; i++) {
    const diff = s.charCodeAt(i) - s.charCodeAt(i - 1);
    inc = diff === 1 ? inc + 1 : 1;
    dec = diff === -1 ? dec + 1 : 1;
    if (inc >= runLen || dec >= runLen) return true;
  }
  return false;
}
