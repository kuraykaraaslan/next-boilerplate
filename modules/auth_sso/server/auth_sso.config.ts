import { env } from '@nb/env';
import type { SSOProvider } from './auth_sso.enums';
import type { SSOProviderConfig } from './auth_sso.types';

const APP_HOST = env.APPLICATION_HOST || 'http://localhost:3000';

/**
 * Provider configuration. URLs and scopes are kept aligned with each vendor's
 * current (2025-2026) production API. When updating a value, also update the
 * matching provider class under providers/<name>.provider.ts.
 */
export const SSO_CONFIGS: Record<SSOProvider, SSOProviderConfig> = {
  google: {
    clientId: env.GOOGLE_CLIENT_ID || '',
    clientSecret: env.GOOGLE_CLIENT_SECRET || '',
    callbackPath: '/api/auth/callback/google',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scopes: ['openid', 'profile', 'email'],
  },
  apple: {
    clientId: env.APPLE_CLIENT_ID || '',
    clientSecret: '', // Generated dynamically — ES256-signed JWT
    callbackPath: '/api/auth/callback/apple',
    authUrl: 'https://appleid.apple.com/auth/authorize',
    tokenUrl: 'https://appleid.apple.com/auth/token',
    scopes: ['name', 'email'],
  },
  facebook: {
    clientId: env.META_CLIENT_ID || '',
    clientSecret: env.META_CLIENT_SECRET || '',
    callbackPath: '/api/auth/callback/facebook',
    authUrl: 'https://www.facebook.com/v22.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v22.0/oauth/access_token',
    userInfoUrl: 'https://graph.facebook.com/v22.0/me',
    scopes: ['email', 'public_profile'],
  },
  github: {
    clientId: env.GITHUB_CLIENT_ID || '',
    clientSecret: env.GITHUB_CLIENT_SECRET || '',
    callbackPath: '/api/auth/callback/github',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scopes: ['read:user', 'user:email'],
  },
  linkedin: {
    clientId: env.LINKEDIN_CLIENT_ID || '',
    clientSecret: env.LINKEDIN_CLIENT_SECRET || '',
    callbackPath: '/api/auth/callback/linkedin',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    userInfoUrl: 'https://api.linkedin.com/v2/userinfo',
    scopes: ['openid', 'profile', 'email'],
  },
  microsoft: {
    clientId: env.MICROSOFT_CLIENT_ID || '',
    clientSecret: env.MICROSOFT_CLIENT_SECRET || '',
    callbackPath: '/api/auth/callback/microsoft',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scopes: ['openid', 'profile', 'email', 'offline_access', 'User.Read'],
  },
  twitter: {
    clientId: env.TWITTER_CLIENT_ID || '',
    clientSecret: env.TWITTER_CLIENT_SECRET || '',
    callbackPath: '/api/auth/callback/twitter',
    authUrl: 'https://x.com/i/oauth2/authorize',
    tokenUrl: 'https://api.x.com/2/oauth2/token',
    userInfoUrl: 'https://api.x.com/2/users/me',
    scopes: ['tweet.read', 'users.read', 'offline.access'],
  },
  slack: {
    clientId: env.SLACK_CLIENT_ID || '',
    clientSecret: env.SLACK_CLIENT_SECRET || '',
    callbackPath: '/api/auth/callback/slack',
    authUrl: 'https://slack.com/openid/connect/authorize',
    tokenUrl: 'https://slack.com/api/openid.connect.token',
    userInfoUrl: 'https://slack.com/api/openid.connect.userInfo',
    scopes: ['openid', 'profile', 'email'],
  },
  tiktok: {
    clientId: env.TIKTOK_CLIENT_KEY || '',
    clientSecret: env.TIKTOK_CLIENT_SECRET || '',
    callbackPath: '/api/auth/callback/tiktok',
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    userInfoUrl: 'https://open.tiktokapis.com/v2/user/info/',
    scopes: ['user.info.basic'],
  },
  wechat: {
    clientId: env.WECHAT_APP_ID || '',
    clientSecret: env.WECHAT_APP_SECRET || '',
    callbackPath: '/api/auth/callback/wechat',
    authUrl: 'https://open.weixin.qq.com/connect/qrconnect',
    tokenUrl: 'https://api.weixin.qq.com/sns/oauth2/access_token',
    userInfoUrl: 'https://api.weixin.qq.com/sns/userinfo',
    scopes: ['snsapi_login'],
  },
  autodesk: {
    clientId: env.AUTODESK_CLIENT_ID || '',
    clientSecret: env.AUTODESK_CLIENT_SECRET || '',
    callbackPath: '/api/auth/callback/autodesk',
    authUrl: 'https://developer.api.autodesk.com/authentication/v2/authorize',
    tokenUrl: 'https://developer.api.autodesk.com/authentication/v2/token',
    userInfoUrl: 'https://api.userprofile.autodesk.com/userinfo',
    scopes: ['openid', 'profile', 'email'],
  },
  // ── Russia ──────────────────────────────────────────────────────────────────
  yandex: {
    clientId: env.YANDEX_CLIENT_ID || '',
    clientSecret: env.YANDEX_CLIENT_SECRET || '',
    callbackPath: '/api/auth/callback/yandex',
    authUrl: 'https://oauth.yandex.ru/authorize',
    tokenUrl: 'https://oauth.yandex.ru/token',
    userInfoUrl: 'https://login.yandex.ru/info?format=json',
    scopes: ['login:email', 'login:info', 'login:avatar'],
  },
  vk: {
    // Classic VK OAuth (oauth.vk.com). NOTE: VK is migrating to "VK ID" (id.vk.com),
    // whose token exchange additionally requires a `device_id` returned on the
    // callback — not plumbed through the generic SSO callback yet.
    clientId: env.VK_CLIENT_ID || '',
    clientSecret: env.VK_CLIENT_SECRET || '',
    callbackPath: '/api/auth/callback/vk',
    authUrl: 'https://oauth.vk.com/authorize',
    tokenUrl: 'https://oauth.vk.com/access_token',
    userInfoUrl: 'https://api.vk.com/method/users.get',
    scopes: ['email'],
  },
  // ── China ───────────────────────────────────────────────────────────────────
  qq: {
    clientId: env.QQ_CLIENT_ID || '',
    clientSecret: env.QQ_CLIENT_SECRET || '',
    callbackPath: '/api/auth/callback/qq',
    authUrl: 'https://graph.qq.com/oauth2.0/authorize',
    tokenUrl: 'https://graph.qq.com/oauth2.0/token',
    userInfoUrl: 'https://graph.qq.com/user/get_user_info',
    scopes: ['get_user_info'],
  },
  weibo: {
    clientId: env.WEIBO_CLIENT_ID || '',
    clientSecret: env.WEIBO_CLIENT_SECRET || '',
    callbackPath: '/api/auth/callback/weibo',
    authUrl: 'https://api.weibo.com/oauth2/authorize',
    tokenUrl: 'https://api.weibo.com/oauth2/access_token',
    userInfoUrl: 'https://api.weibo.com/2/users/show.json',
    scopes: ['email'],
  },
  alipay: {
    // Alipay open platform. Confidential client uses RSA2 request signing (not a
    // static client_secret); the private key is supplied via env (see provider).
    clientId: env.ALIPAY_APP_ID || '',
    clientSecret: '',
    callbackPath: '/api/auth/callback/alipay',
    authUrl: 'https://openauth.alipay.com/oauth2/publicAppAuthorize.htm',
    tokenUrl: 'https://openapi.alipay.com/gateway.do',
    userInfoUrl: 'https://openapi.alipay.com/gateway.do',
    scopes: ['auth_user'],
  },
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
