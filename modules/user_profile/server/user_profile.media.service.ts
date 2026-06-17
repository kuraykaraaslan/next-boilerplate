import StorageService from '@kuraykaraaslan/storage/server/storage.service';
import UserProfileModerationService from './user_profile.moderation.service';
import { UserProfile } from './user_profile.types';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import UserProfileMessages from './user_profile.messages';
import { update } from './user_profile.write.service';

/**
 * Moderate a freshly-uploaded image; if it fails content moderation, delete
 * the stored object and throw. No-op when moderation isn't configured.
 */
async function assertImageClean(tenantId: string, url: string, key: string): Promise<void> {
  const verdict = await UserProfileModerationService.moderateImageUrl(tenantId, url);
  if (verdict?.flagged) {
    await StorageService.deleteFile(tenantId, { key }).catch(() => {});
    throw new AppError(UserProfileMessages.IMAGE_REJECTED_MODERATION, 422, ErrorCode.VALIDATION_ERROR);
  }
}

/**
 * Upload an avatar through the tenant's configured storage (S3) and set it as
 * the profile picture. Replaces hot-linking to arbitrary external URLs with a
 * managed object the platform controls (residency, lifecycle, validation).
 */
export async function uploadAvatar(tenantId: string, userId: string, file: File): Promise<UserProfile> {
  const result = await StorageService.uploadFile(tenantId, { file, folder: `avatars/${userId}` });
  await assertImageClean(tenantId, result.url, result.key);
  return update(userId, { profilePicture: result.url }, tenantId);
}

export async function uploadHeaderImage(tenantId: string, userId: string, file: File): Promise<UserProfile> {
  const result = await StorageService.uploadFile(tenantId, { file, folder: `headers/${userId}` });
  await assertImageClean(tenantId, result.url, result.key);
  return update(userId, { headerImage: result.url }, tenantId);
}

/**
 * Pull an external image URL into the tenant's own bucket and set it as the
 * avatar — protects against third-party hosts going offline / serving
 * malicious content and enforces data residency. The stored object is run
 * through content moderation before it is set.
 */
export async function setAvatarFromUrl(tenantId: string, userId: string, url: string): Promise<UserProfile> {
  const result = await StorageService.uploadFromUrl(tenantId, { url, folder: `avatars/${userId}` });
  await assertImageClean(tenantId, result.url, result.key);
  return update(userId, { profilePicture: result.url }, tenantId);
}
