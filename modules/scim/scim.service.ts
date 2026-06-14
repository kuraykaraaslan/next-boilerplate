import ScimUserService from './scim.user.service';
import ScimGroupService from './scim.group.service';
import ScimPolicyService from './scim.policy.service';
import { tenantDataSourceFor } from '@/modules/db';

export { ScimUserService, ScimGroupService, ScimPolicyService };

export default class ScimService {

  // ──────────────────────────────────────────────
  // Users
  // ──────────────────────────────────────────────

  static listUsers   = ScimUserService.listUsers.bind(ScimUserService);
  static getUser     = ScimUserService.getUser.bind(ScimUserService);
  static createUser  = ScimUserService.createUser.bind(ScimUserService);
  static updateUser  = ScimUserService.updateUser.bind(ScimUserService);
  static patchUser   = ScimUserService.patchUser.bind(ScimUserService);
  static deleteUser  = ScimUserService.deleteUser.bind(ScimUserService);

  // ──────────────────────────────────────────────
  // Groups (RFC 7644 §3.5) — full CRUD + role mapping
  // ──────────────────────────────────────────────

  static listGroups   = ScimGroupService.listGroups.bind(ScimGroupService);
  static getGroup     = ScimGroupService.getGroup.bind(ScimGroupService);
  static createGroup  = ScimGroupService.createGroup.bind(ScimGroupService);
  static replaceGroup = ScimGroupService.replaceGroup.bind(ScimGroupService);
  static patchGroup   = ScimGroupService.patchGroup.bind(ScimGroupService);
  static deleteGroup  = ScimGroupService.deleteGroup.bind(ScimGroupService);

  // ──────────────────────────────────────────────
  // Provisioning policy + health
  // ──────────────────────────────────────────────

  static getPolicy = ScimPolicyService.get.bind(ScimPolicyService);

  /**
   * SCIM provider health check: verifies the tenant datasource is reachable
   * and reports whether Groups are enabled. IdPs / monitors poll this to detect
   * provisioning outages early.
   */
  static async health(tenantId: string): Promise<{ status: 'ok' | 'degraded'; database: boolean; groupsEnabled: boolean; checkedAt: string }> {
    let database = false;
    try {
      const ds = await tenantDataSourceFor(tenantId);
      await ds.query('SELECT 1');
      database = true;
    } catch { database = false; }
    const policy = await ScimPolicyService.get(tenantId).catch(() => null);
    return {
      status: database ? 'ok' : 'degraded',
      database,
      groupsEnabled: policy?.groupsEnabled ?? false,
      checkedAt: new Date().toISOString(),
    };
  }
}
