import { SCIM_SCHEMAS } from './scim.types';
import type { CreateScimUserInput, UpdateScimUserInput } from './scim.dto';

/**
 * Persist SCIM name fields, locale, and enterprise-extension attributes onto
 * the user_profile (names + customFields). No-op when the tenant disables
 * name sync.
 */
export async function persistProfile(
  tenantId: string, userId: string, input: CreateScimUserInput | UpdateScimUserInput, policy: { syncNames: boolean },
): Promise<void> {
  if (!policy.syncNames) return;
  try {
    const ent = (input as Record<string, unknown>)[SCIM_SCHEMAS.ENTERPRISE_USER] as Record<string, unknown> | undefined;
    const customFields: Record<string, unknown> = {};
    if (input.locale) customFields.locale = input.locale;
    if (ent) {
      for (const k of ['employeeNumber', 'department', 'organization', 'costCenter', 'division'] as const) {
        if (ent[k] != null) customFields[k] = ent[k];
      }
      if (ent.manager) customFields.manager = typeof ent.manager === 'string' ? ent.manager : (ent.manager as Record<string, unknown>).value;
    }
    const patch: Record<string, unknown> = {};
    if (input.name?.givenName !== undefined) patch.firstName = input.name.givenName;
    if (input.name?.familyName !== undefined) patch.lastName = input.name.familyName;
    if (input.displayName !== undefined) patch.displayName = input.displayName;
    if (Object.keys(customFields).length > 0) patch.customFields = customFields;
    if (Object.keys(patch).length === 0) return;

    const { default: UserProfileService } = await import('@kuraykaraaslan/user_profile/server/user_profile.service');
    await UserProfileService.upsert(userId, patch as never, tenantId);
  } catch { /* profile sync is best-effort, never blocks provisioning */ }
}

/** Load names from user_profile for SCIM responses (best-effort). */
export async function loadNames(tenantId: string, userId: string, policy: { syncNames: boolean }): Promise<{ givenName?: string; familyName?: string; displayName?: string } | undefined> {
  void tenantId;
  if (!policy.syncNames) return undefined;
  try {
    const { default: UserProfileService } = await import('@kuraykaraaslan/user_profile/server/user_profile.service');
    const p = await UserProfileService.getByUserId(userId);
    if (!p) return undefined;
    return { givenName: p.firstName ?? undefined, familyName: p.lastName ?? undefined, displayName: p.displayName ?? undefined };
  } catch { return undefined; }
}
