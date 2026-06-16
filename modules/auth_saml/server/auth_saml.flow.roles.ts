import { SamlConfig } from './entities/saml_config.entity';
import {
  type SamlProfile,
  type SamlRoleMappingRule,
  SamlRoleMappingRulesSchema,
} from './auth_saml.types';
import type { TenantMemberRole } from '@nb/tenant_member/server/tenant_member.enums';

function parseRules(raw: unknown): SamlRoleMappingRule[] {
  if (!raw) return [];
  const parsed = SamlRoleMappingRulesSchema.safeParse(raw);
  return parsed.success ? parsed.data : [];
}

function attrValues(profile: SamlProfile, attrName: string): string[] {
  const raw = profile.attributes[attrName];
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return values.map((v) => String(v));
}

function ruleMatches(rule: SamlRoleMappingRule, value: string): boolean {
  const v = value.trim();
  switch (rule.match) {
    case 'equals':
      return v.toLowerCase() === rule.value.toLowerCase();
    case 'contains':
      return v.toLowerCase().includes(rule.value.toLowerCase());
    case 'dnEquals':
      // Match a single RDN (e.g. "CN=App-Admins") anywhere in a DN string.
      return v.split(',').some((rdn) => rdn.trim().toLowerCase() === rule.value.toLowerCase());
    case 'regex':
      try { return new RegExp(rule.value, 'i').test(v); } catch { return false; }
    default:
      return false;
  }
}

/**
 * ABAC role mapping. Evaluates the tenant's configured `roleMappingRules` in
 * order (first match wins), supporting multi-value attributes and DN matching
 * for `memberOf`. Falls back to the legacy owner/admin substring scan, then to
 * `defaultMemberRole`, then to USER.
 */
export function mapSamlRoleToMemberRole(
  profile: SamlProfile,
  config: Pick<SamlConfig, 'roleAttribute' | 'defaultMemberRole' | 'roleMappingRules'>,
): TenantMemberRole {
  // 1. Configurable ABAC rules.
  const rules = parseRules(config.roleMappingRules);
  for (const rule of rules) {
    const attrName = (rule.attribute ?? config.roleAttribute ?? '').trim();
    if (!attrName) continue;
    const values = attrValues(profile, attrName);
    if (values.some((v) => ruleMatches(rule, v))) return rule.role;
  }

  // 2. Legacy substring scan on the single roleAttribute.
  const attrName = config.roleAttribute?.trim();
  if (attrName) {
    for (const v of attrValues(profile, attrName)) {
      const lower = v.toLowerCase();
      if (lower.includes('owner')) return 'OWNER';
      if (lower.includes('admin')) return 'ADMIN';
    }
  }

  // 3. Default.
  const fallback = (config.defaultMemberRole ?? '').toUpperCase();
  if (fallback === 'OWNER' || fallback === 'ADMIN' || fallback === 'USER') return fallback;
  return 'USER';
}
