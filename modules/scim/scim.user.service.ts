import 'reflect-metadata';
import { TenantMember as TenantMemberEntity } from '@/modules/tenant_member/entities/tenant_member.entity';
import { User as UserEntity } from '@/modules/user/entities/user.entity';
import { type ScimUser, type ScimListResponse, type ScimPatchOperation } from './scim.types';
import type { CreateScimUserInput, UpdateScimUserInput, ListScimUsersInput } from './scim.dto';
import { toScimUser, parseFilter } from './scim.user.serialize';
import { listUsers, getUser } from './scim.user.read.service';
import { createUser, updateUser, deleteUser } from './scim.user.write.service';
import { patchUser } from './scim.user.patch.service';

/**
 * SCIM 2.0 user provisioning service facade. The implementation is split across
 * focused modules (`scim.user.serialize`, `scim.user.profile`,
 * `scim.user.read.service`, `scim.user.write.service`, `scim.user.patch.service`);
 * this class preserves the single `ScimUserService.*` entry point.
 */
export default class ScimUserService {
  static toScimUser(
    member: TenantMemberEntity,
    user: UserEntity,
    names?: { givenName?: string; familyName?: string; displayName?: string },
  ): ScimUser {
    return toScimUser(member, user, names);
  }

  static parseFilter(filter: string): { attr: 'userName' | 'externalId'; value: string } {
    return parseFilter(filter);
  }

  static listUsers(tenantId: string, query: ListScimUsersInput): Promise<ScimListResponse<ScimUser>> {
    return listUsers(tenantId, query);
  }

  static getUser(tenantId: string, tenantMemberId: string): Promise<ScimUser> {
    return getUser(tenantId, tenantMemberId);
  }

  static createUser(tenantId: string, input: CreateScimUserInput): Promise<ScimUser> {
    return createUser(tenantId, input);
  }

  static updateUser(tenantId: string, tenantMemberId: string, input: UpdateScimUserInput): Promise<ScimUser> {
    return updateUser(tenantId, tenantMemberId, input);
  }

  static patchUser(tenantId: string, tenantMemberId: string, ops: ScimPatchOperation[]): Promise<ScimUser> {
    return patchUser(tenantId, tenantMemberId, ops);
  }

  static deleteUser(tenantId: string, tenantMemberId: string): Promise<void> {
    return deleteUser(tenantId, tenantMemberId);
  }
}
