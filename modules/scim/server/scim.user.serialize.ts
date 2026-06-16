import crypto from 'crypto';
import { User as UserEntity } from '@nb/user/server/entities/user.entity';
import { TenantMember as TenantMemberEntity } from '@nb/tenant_member/server/entities/tenant_member.entity';
import { ErrorCode } from '@nb/common/server/app-error';
import { ScimError } from './scim.errors';
import { SCIM_SCHEMAS, ScimUserSchema, type ScimUser } from './scim.types';
import ScimMessages from './scim.messages';

function buildMeta(tenantId: string, tenantMemberId: string, updatedAt?: Date | null, createdAt?: Date | null): ScimUser['meta'] {
  const stamp = updatedAt ?? createdAt ?? new Date();
  return {
    resourceType: 'User',
    created: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
    lastModified: updatedAt ? new Date(updatedAt).toISOString() : new Date().toISOString(),
    location: `/tenant/${tenantId}/api/scim/v2/Users/${tenantMemberId}`,
    version: `W/"${crypto.createHash('sha1').update(String(stamp)).digest('hex').slice(0, 16)}"`,
  };
}

export function toScimUser(
  member: TenantMemberEntity,
  user: UserEntity,
  names?: { givenName?: string; familyName?: string; displayName?: string },
): ScimUser {
  return ScimUserSchema.parse({
    schemas: [SCIM_SCHEMAS.USER],
    id: member.tenantMemberId,
    externalId: member.externalId ?? undefined,
    userName: user.email,
    name: { givenName: names?.givenName, familyName: names?.familyName },
    displayName: names?.displayName ?? user.email,
    emails: [{ value: user.email, primary: true, type: 'work' }],
    ...(user.phone ? { phoneNumbers: [{ value: user.phone, primary: true, type: 'work' }] } : {}),
    active: member.memberStatus === 'ACTIVE',
    meta: buildMeta(member.tenantId, member.tenantMemberId, member.updatedAt, member.createdAt),
  });
}

export function parseFilter(filter: string): { attr: 'userName' | 'externalId'; value: string } {
  const match = /^\s*(userName|externalId)\s+eq\s+"([^"]*)"\s*$/i.exec(filter);
  if (!match) {
    throw new ScimError(ScimMessages.INVALID_FILTER, 400, ErrorCode.VALIDATION_ERROR, 'invalidFilter');
  }
  return { attr: match[1] as 'userName' | 'externalId', value: match[2] };
}
