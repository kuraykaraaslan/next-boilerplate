import type { PasswordPolicy, AdminPolicy, AccessPolicy, MfaMethod } from './auth.policy.loader.service';

export default class AuthPolicyValidatorService {

  /**
   * GTH-2: is a specific SSO provider allowed for this tenant? When the
   * allow-list is empty, all providers are allowed (back-compat). When
   * `disableSocialLogin` is set, no provider is allowed.
   */
  static isSsoProviderAllowed(provider: string, policy: AccessPolicy): boolean {
    if (policy.disableSocialLogin) return false;
    if (policy.ssoAllowedProviders.length === 0) return true;
    return policy.ssoAllowedProviders.map((p) => p.toLowerCase()).includes(provider.toLowerCase());
  }

  /** GTH-2: narrow a provider list to those the tenant permits. */
  static filterAllowedProviders(providers: string[], policy: AccessPolicy): string[] {
    return providers.filter((p) => AuthPolicyValidatorService.isSsoProviderAllowed(p, policy));
  }

  /**
   * GTH-13: is an MFA method allowed for this tenant? Empty allow-list = all
   * methods allowed.
   */
  static isMfaMethodAllowed(method: MfaMethod, policy: AccessPolicy): boolean {
    if (policy.mfaAllowedMethods.length === 0) return true;
    return policy.mfaAllowedMethods.includes(method);
  }

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
    if (s[i] === s[i - 1]) { count++; if (count >= runLen) return true; }
    else count = 1;
  }
  return false;
}

function hasSequentialRun(s: string, runLen: number): boolean {
  let inc = 1, dec = 1;
  for (let i = 1; i < s.length; i++) {
    const diff = s.charCodeAt(i) - s.charCodeAt(i - 1);
    inc = diff === 1 ? inc + 1 : 1;
    dec = diff === -1 ? dec + 1 : 1;
    if (inc >= runLen || dec >= runLen) return true;
  }
  return false;
}
