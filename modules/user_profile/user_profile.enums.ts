import { z } from 'zod';

// Overall and per-field visibility for public-facing profile exposure (GDPR
// data-minimization). TENANT = visible only to members of the same tenant.
export const ProfileVisibilityEnum = z.enum(['PUBLIC', 'TENANT', 'PRIVATE']);
export type ProfileVisibility = z.infer<typeof ProfileVisibilityEnum>;

// Identity-verification status (KYC / verified-badge gate).
export const VerificationStatusEnum = z.enum(['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED']);
export type VerificationStatus = z.infer<typeof VerificationStatusEnum>;

// Name ordering — GIVEN_FIRST (Western) vs FAMILY_FIRST (East Asian, Hungarian).
export const NameOrderEnum = z.enum(['GIVEN_FIRST', 'FAMILY_FIRST']);
export type NameOrder = z.infer<typeof NameOrderEnum>;

export const SocialLinkPlatformEnum = z.enum([
  // Core Developer Platforms
  'GITHUB',
  'GITLAB',
  'BITBUCKET',
  'STACKOVERFLOW',
  'NPM',
  'PYPI',

  // Blogging & Writing
  'DEVTO',
  'MEDIUM',
  'HASHNODE',
  'SUBSTACK',

  // Professional & Career
  'LINKEDIN',
  'WEBSITE',
  'EMAIL',
  'CALENDLY',

  // Social Media
  'TWITTER',
  'FACEBOOK',
  'INSTAGRAM',
  'YOUTUBE',
  'TIKTOK',
  'SNAPCHAT',
  'REDDIT',
  'PINTEREST',

  // Community & Messaging
  'DISCORD',
  'SLACK',
  'TELEGRAM',
  'KEYBASE',
  'DISCOURSE',

  // Freelance / Consulting
  'UPWORK',
  'FREELANCER',
  'FIVERR',
  'TOPTAL',

  // Frontend / Playground
  'CODEPEN',
  'JSFIDDLE',

  // Competitive / Learning
  'LEETCODE',
  'HACKERRANK',
  'KAGGLE',
]);

export type SocialLinkPlatform = z.infer<typeof SocialLinkPlatformEnum>;
