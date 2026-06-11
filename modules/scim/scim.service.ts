import ScimUserService from './scim.user.service';
import { SCIM_SCHEMAS, type ScimGroup, type ScimListResponse } from './scim.types';

export { ScimUserService };

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
  // Groups (stub — intentionally empty)
  // ──────────────────────────────────────────────

  static async listGroups(
    _tenantId: string,
    query: { startIndex?: number; count?: number },
  ): Promise<ScimListResponse<ScimGroup>> {
    return {
      schemas: [SCIM_SCHEMAS.LIST_RESPONSE],
      totalResults: 0,
      startIndex: query.startIndex ?? 1,
      itemsPerPage: 0,
      Resources: [],
    };
  }
}
