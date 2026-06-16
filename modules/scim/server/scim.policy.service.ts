import SettingService from '@nb/setting/server/setting.service'

export interface ScimProvisioningPolicy {
  /** Default member role for SCIM-provisioned users with no group mapping. */
  defaultRole: string
  /** Whether to sync name fields (givenName/familyName/displayName) to profile. */
  syncNames: boolean
  /** Whether Group endpoints are enabled for this tenant. */
  groupsEnabled: boolean
  /** Max page size for SCIM list responses. */
  maxPageSize: number
  /** displayName → internal member role mapping (group-based provisioning). */
  groupRoleMap: Record<string, string>
}

const VALID_ROLES = ['OWNER', 'ADMIN', 'USER']

/**
 * Per-tenant SCIM provisioning policy, sourced from tenant settings so the
 * behaviour previously hardcoded (default role 'USER', name drops, fixed
 * pagination, Groups disabled) is configurable per enterprise customer.
 */
export default class ScimPolicyService {

  static async get(tenantId: string): Promise<ScimProvisioningPolicy> {
    const s = await SettingService.getByKeys(tenantId, [
      'scimDefaultRole', 'scimSyncNames', 'scimGroupsEnabled', 'scimMaxPageSize', 'scimGroupRoleMap',
    ]).catch(() => ({} as Record<string, string | null>))

    let groupRoleMap: Record<string, string> = {}
    if (s.scimGroupRoleMap) {
      try {
        const parsed = JSON.parse(s.scimGroupRoleMap) as Record<string, string>
        for (const [k, v] of Object.entries(parsed)) {
          if (VALID_ROLES.includes(String(v).toUpperCase())) groupRoleMap[k] = String(v).toUpperCase()
        }
      } catch { groupRoleMap = {} }
    }

    const defaultRole = s.scimDefaultRole && VALID_ROLES.includes(s.scimDefaultRole.toUpperCase())
      ? s.scimDefaultRole.toUpperCase() : 'USER'
    const maxPage = Number(s.scimMaxPageSize)

    return {
      defaultRole,
      syncNames: s.scimSyncNames !== 'false',
      groupsEnabled: s.scimGroupsEnabled === 'true',
      maxPageSize: Number.isFinite(maxPage) && maxPage > 0 ? Math.min(maxPage, 500) : 100,
      groupRoleMap,
    }
  }

  /** Resolve the member role for a group displayName (null = no mapping). */
  static roleForGroup(policy: ScimProvisioningPolicy, displayName: string): string | null {
    return policy.groupRoleMap[displayName] ?? null
  }

  /**
   * Given the set of group display names a member belongs to, resolve the
   * highest-privilege mapped role (OWNER > ADMIN > USER). Returns null when no
   * group maps to a role (caller keeps the existing / default role).
   */
  static highestRoleForGroups(policy: ScimProvisioningPolicy, displayNames: string[]): string | null {
    const ranks = displayNames
      .map((d) => this.roleForGroup(policy, d))
      .filter((r): r is string => r !== null)
      .map((r) => VALID_ROLES.indexOf(r))
      .filter((i) => i >= 0)
    if (ranks.length === 0) return null
    return VALID_ROLES[Math.min(...ranks)]
  }
}
