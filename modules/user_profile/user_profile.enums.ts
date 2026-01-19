import { z } from 'zod';

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
