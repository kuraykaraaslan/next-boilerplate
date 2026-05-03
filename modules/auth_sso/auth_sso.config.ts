import { env } from '@/libs/env';
import type { SSOProvider } from './auth_sso.enums';
import type { SSOProviderConfig } from './auth_sso.types';

const APP_HOST = env.APPLICATION_HOST || 'http://localhost:3000';

export const SSO_CONFIGS: Record<SSOProvider, SSOProviderConfig> = {
  google: {
    clientId: env.GOOGLE_CLIENT_ID || '',
    clientSecret: env.GOOGLE_CLIENT_SECRET || '',
    callbackPath: '/api/auth/callback/google',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    scopes: ['profile', 'email']
  },
  apple: {
    clientId: env.APPLE_CLIENT_ID || '',
    clientSecret: '', // Generated dynamically
    callbackPath: '/api/auth/callback/apple',
    authUrl: 'https://appleid.apple.com/auth/authorize',
    tokenUrl: 'https://appleid.apple.com/auth/token',
    scopes: ['name', 'email']
  },
  facebook: {
    clientId: env.META_CLIENT_ID || '',
    clientSecret: env.META_CLIENT_SECRET || '',
    callbackPath: '/api/auth/callback/facebook',
    authUrl: 'https://www.facebook.com/v17.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v17.0/oauth/access_token',
    userInfoUrl: 'https://graph.facebook.com/v17.0/me',
    scopes: ['email', 'public_profile']
  },
  github: {
    clientId: env.GITHUB_CLIENT_ID || '',
    clientSecret: env.GITHUB_CLIENT_SECRET || '',
    callbackPath: '/api/auth/callback/github',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scopes: ['user']
  },
  linkedin: {
    clientId: env.LINKEDIN_CLIENT_ID || '',
    clientSecret: env.LINKEDIN_CLIENT_SECRET || '',
    callbackPath: '/api/auth/callback/linkedin',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    userInfoUrl: 'https://api.linkedin.com/v2/userinfo',
    scopes: ['openid', 'profile', 'email']
  },
  microsoft: {
    clientId: env.MICROSOFT_CLIENT_ID || '',
    clientSecret: env.MICROSOFT_CLIENT_SECRET || '',
    callbackPath: '/api/auth/callback/microsoft',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scopes: ['openid', 'profile', 'email']
  },
  twitter: {
    clientId: env.TWITTER_CLIENT_ID || '',
    clientSecret: env.TWITTER_CLIENT_SECRET || '',
    callbackPath: '/api/auth/callback/twitter',
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    userInfoUrl: 'https://api.twitter.com/2/users/me',
    scopes: ['tweet.read', 'users.read']
  },
  slack: {
    clientId: env.SLACK_CLIENT_ID || '',
    clientSecret: env.SLACK_CLIENT_SECRET || '',
    callbackPath: '/api/auth/callback/slack',
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    userInfoUrl: 'https://slack.com/api/users.identity',
    scopes: ['identity.basic', 'identity.email']
  },
  tiktok: {
    clientId: env.TIKTOK_CLIENT_KEY || '',
    clientSecret: env.TIKTOK_CLIENT_SECRET || '',
    callbackPath: '/api/auth/callback/tiktok',
    authUrl: 'https://www.tiktok.com/auth/authorize',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    userInfoUrl: 'https://open.tiktokapis.com/v2/user/info/',
    scopes: ['user.info.basic']
  },
  wechat: {
    clientId: env.WECHAT_APP_ID || '',
    clientSecret: env.WECHAT_APP_SECRET || '',
    callbackPath: '/api/auth/callback/wechat',
    authUrl: 'https://open.weixin.qq.com/connect/qrconnect',
    tokenUrl: 'https://api.weixin.qq.com/sns/oauth2/access_token',
    userInfoUrl: 'https://api.weixin.qq.com/sns/userinfo',
    scopes: ['snsapi_login']
  },
  autodesk: {
    clientId: env.AUTODESK_CLIENT_ID || '',
    clientSecret: env.AUTODESK_CLIENT_SECRET || '',
    callbackPath: '/api/auth/callback/autodesk',
    authUrl: 'https://developer.api.autodesk.com/authentication/v2/authorize',
    tokenUrl: 'https://developer.api.autodesk.com/authentication/v2/token',
    userInfoUrl: 'https://developer.api.autodesk.com/userprofile/v1/users/@me',
    scopes: ['data:read', 'account:read', 'user-profile:read']
  }
};

export function getCallbackUrl(provider: SSOProvider): string {
  return `${APP_HOST}${SSO_CONFIGS[provider].callbackPath}`;
}

export function isProviderConfigured(provider: SSOProvider): boolean {
  const config = SSO_CONFIGS[provider];
  return Boolean(config.clientId);
}

export function getAllowedProviders(): SSOProvider[] {
  const envProviders = env.SSO_ALLOWED_PROVIDERS?.split(',') || [];
  return envProviders.filter(p => isProviderConfigured(p as SSOProvider)) as SSOProvider[];
}
