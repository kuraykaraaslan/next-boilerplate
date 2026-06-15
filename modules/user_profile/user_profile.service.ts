import 'reflect-metadata';
import type { UserProfile, SocialLinkItem } from './user_profile.types';
import type { VerificationStatus } from './user_profile.enums';
import {
  assertNameAllowed, validateSocialLinks, filterCustomFields,
} from './user_profile.helpers';
import {
  getByUserId, toPublicView, completenessScore, getCompleteness,
} from './user_profile.read.service';
import {
  create, update, upsert, setVerification, anonymize, remove,
} from './user_profile.write.service';
import {
  uploadAvatar, uploadHeaderImage, setAvatarFromUrl,
} from './user_profile.media.service';
import {
  addSocialLink, removeSocialLink, updateSocialLink,
} from './user_profile.social.service';

/**
 * User-profile service facade. The implementation is split across focused
 * modules (`user_profile.read.service`, `.write.service`, `.media.service`,
 * `.social.service`, plus the `user_profile.helpers`); this class preserves the
 * single `UserProfileService.*` entry point its callers depend on.
 */
export default class UserProfileService {
  static assertNameAllowed(name: string | null | undefined, tenantId?: string): Promise<void> {
    return assertNameAllowed(name, tenantId);
  }

  static validateSocialLinks(links: unknown): SocialLinkItem[] | undefined {
    return validateSocialLinks(links);
  }

  static filterCustomFields(tenantId: string | undefined, customFields: Record<string, unknown> | undefined): Promise<Record<string, unknown> | undefined> {
    return filterCustomFields(tenantId, customFields);
  }

  static getByUserId(userId: string): Promise<UserProfile | null> {
    return getByUserId(userId);
  }

  static toPublicView(profile: UserProfile, opts?: { sameTenant?: boolean }): Partial<UserProfile> {
    return toPublicView(profile, opts);
  }

  static completenessScore(profile: UserProfile, requiredFields?: (keyof UserProfile)[]): number {
    return completenessScore(profile, requiredFields);
  }

  static getCompleteness(userId: string, requiredFields?: (keyof UserProfile)[]): Promise<number> {
    return getCompleteness(userId, requiredFields);
  }

  static create(userId: string, data?: Partial<UserProfile>, tenantId?: string): Promise<UserProfile> {
    return create(userId, data, tenantId);
  }

  static update(userId: string, data: Partial<UserProfile>, tenantId?: string): Promise<UserProfile> {
    return update(userId, data, tenantId);
  }

  static upsert(userId: string, data: Partial<UserProfile>, tenantId?: string): Promise<UserProfile> {
    return upsert(userId, data, tenantId);
  }

  static uploadAvatar(tenantId: string, userId: string, file: File): Promise<UserProfile> {
    return uploadAvatar(tenantId, userId, file);
  }

  static uploadHeaderImage(tenantId: string, userId: string, file: File): Promise<UserProfile> {
    return uploadHeaderImage(tenantId, userId, file);
  }

  static setAvatarFromUrl(tenantId: string, userId: string, url: string): Promise<UserProfile> {
    return setAvatarFromUrl(tenantId, userId, url);
  }

  static setVerification(userId: string, status: VerificationStatus): Promise<UserProfile> {
    return setVerification(userId, status);
  }

  static anonymize(userId: string): Promise<void> {
    return anonymize(userId);
  }

  static delete(userId: string): Promise<void> {
    return remove(userId);
  }

  static addSocialLink(userId: string, link: SocialLinkItem): Promise<UserProfile> {
    return addSocialLink(userId, link);
  }

  static removeSocialLink(userId: string, linkId: string): Promise<UserProfile> {
    return removeSocialLink(userId, linkId);
  }

  static updateSocialLink(userId: string, linkId: string, data: Partial<SocialLinkItem>): Promise<UserProfile> {
    return updateSocialLink(userId, linkId, data);
  }
}
