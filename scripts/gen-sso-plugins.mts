// Generates sandboxed community-plugin bundles + manifests for ALL social-login
// (auth_sso) providers under modules/marketplace/examples/@sso/<key>. One universal
// flag-driven bundle handles the standard + medium cases (PKCE, Basic auth, query
// auth, second email call, OAuth header, nested picture, id_token verify, signed-JWT
// client secret, openid passthrough); Alipay (RSA2-signed request) has its own bundle.
//
// Endpoints/scopes are resolved host-side by the facade (from auth_sso config) and
// passed in `config`; only the egress allowlist hosts + flags live in the manifest.
// Run: `npm run gen:sso-plugins`. Idempotent.

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const EXAMPLES = path.join(here, '../modules/marketplace/examples');

const UNIVERSAL_BUNDLE = `// AUTO-GENERATED — universal OAuth2/OIDC social-login provider (sandboxed). Behaviour
// is driven by manifest metadata flags; the authorize URL is built host-side. Secrets
// (client secret / signing key) never enter the isolate.
function pick(d, path) { return !path ? undefined : String(path).split('.').reduce((o, k) => (o == null ? undefined : o[k]), d); }
function mapProfile(d, m, provider) {
  const pm = m.profileMap || {};
  const str = (v) => (v == null ? undefined : String(v));
  let email = null;
  if (Array.isArray(pm.email)) { for (const k of pm.email) { const v = pick(d, k); if (v) { email = String(v); break; } } }
  else email = str(pick(d, pm.email)) || null;
  let picture = str(pick(d, pm.picture));
  if (m.avatarTemplate && pick(d, m.avatarField)) picture = m.avatarTemplate.replace('{id}', String(pick(d, m.avatarField)));
  return {
    sub: str(pick(d, pm.sub) != null ? pick(d, pm.sub) : (d.sub != null ? d.sub : d.id)),
    email: email,
    emailVerified: pm.emailVerified ? Boolean(pick(d, pm.emailVerified)) : undefined,
    name: str(pick(d, pm.name)), firstName: str(pick(d, pm.firstName)), lastName: str(pick(d, pm.lastName)),
    username: str(pick(d, pm.username)), picture: picture, locale: str(pick(d, pm.locale)), provider: provider,
  };
}
function enc(o) { return Object.entries(o).filter(([, v]) => v != null).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&'); }

globalThis.__plugin = {
  providers: {
    'auth_sso:provider': {
      getTokens: async ({ config, code, codeVerifier }, host) => {
        const m = config.meta || {};
        const params = { grant_type: 'authorization_code', code: code, redirect_uri: config.callbackUrl, client_id: config.clientId, client_secret: '{{secret:clientSecret}}' };
        if (codeVerifier) params.code_verifier = codeVerifier;
        if (m.tokenExtra) Object.assign(params, m.tokenExtra);
        if (m.clientSecretJwt) {
          const j = m.clientSecretJwt;
          const teamId = j.teamId || (await host.settings.get('teamId'));
          const keyId = j.keyId || (await host.settings.get('keyId'));
          const now = Math.floor(Date.now() / 1000);
          params.client_secret = await host.crypto.signJwt(
            { iss: teamId, iat: now, exp: now + 300, aud: j.aud, sub: config.clientId },
            { algorithm: 'ES256', keyid: keyId, secretName: 'signingKey' },
          );
        }
        const method = m.tokenMethod || 'POST';
        const init = { method: method, headers: { accept: 'application/json' } };
        if (m.tokenAuthBasic) { init.basic = { username: config.clientId, secretName: 'clientSecret' }; delete params.client_secret; delete params.client_id; }
        let res;
        if (method === 'GET') res = await host.http.fetch(config.tokenUrl + '?' + enc(params), init);
        else { init.headers['content-type'] = 'application/x-www-form-urlencoded'; init.body = enc(params); res = await host.http.fetch(config.tokenUrl, init); }
        if (res.status >= 400) throw new Error('token ' + res.status + ': ' + String(res.body).slice(0, 200));
        const d = JSON.parse(res.body);
        const tokens = { accessToken: d.access_token, refreshToken: d.refresh_token || null, idToken: d.id_token || null, tokenType: d.token_type || null, expiresIn: typeof d.expires_in === 'number' ? d.expires_in : null, scope: d.scope || null };
        if (m.openidFrom) tokens.openid = d[m.openidFrom] != null ? String(d[m.openidFrom]) : null;
        return tokens;
      },
      getUserInfo: async ({ config, accessToken, tokens }, host) => {
        const m = config.meta || {};
        if (m.idTokenVerify) {
          const v = m.idTokenVerify;
          const claims = await host.crypto.verifyJwks(tokens && tokens.idToken, v.jwksUri, { issuer: v.issuer, audience: config.clientId });
          return mapProfile(claims, m, config.provider);
        }
        const headers = { accept: 'application/json' };
        const q = {};
        if (m.userinfoAuth === 'oauth') headers.authorization = 'OAuth ' + accessToken;
        else if (m.userinfoAuth === 'query') q.access_token = accessToken;
        else headers.authorization = 'Bearer ' + accessToken;
        if (m.userinfoFields) q.fields = m.userinfoFields;
        if (m.meCall) {
          const meRes = await host.http.fetch(m.meCall.url + '?access_token=' + encodeURIComponent(accessToken) + '&fmt=json', { method: 'GET', headers: headers });
          let me = {}; try { me = JSON.parse(String(meRes.body).replace(/^[^{]*/, '').replace(/[^}]*$/, '')); } catch (e) { me = {}; }
          q.openid = me[m.meCall.openidField || 'openid'];
          if (m.meCall.consumerKeyParam) q[m.meCall.consumerKeyParam] = config.clientId;
        }
        if (m.userinfoQuery) for (const [k, val] of Object.entries(m.userinfoQuery)) q[k] = val === '@openid' ? (tokens && tokens.openid) : val === '@clientId' ? config.clientId : val;
        const qs = Object.keys(q).length ? ('?' + enc(q)) : '';
        const res = await host.http.fetch(config.userInfoUrl + qs, { method: 'GET', headers: headers });
        if (res.status >= 400) throw new Error('userinfo ' + res.status + ': ' + String(res.body).slice(0, 200));
        let d = JSON.parse(res.body);
        if (m.unwrapData && d.data) d = d.data;
        const profile = mapProfile(d, m, config.provider);
        if (m.secondEmailCall && !profile.email) {
          const er = await host.http.fetch(m.secondEmailCall, { method: 'GET', headers: { authorization: 'Bearer ' + accessToken, accept: 'application/json' } });
          if (er.status < 400) { const emails = JSON.parse(er.body); const primary = Array.isArray(emails) ? emails.find((e) => e.primary && e.verified) : null; if (primary) { profile.email = primary.email; profile.emailVerified = true; } }
        }
        return profile;
      },
    },
  },
};
`;

const STD = { sub: 'sub', email: 'email', emailVerified: 'email_verified', name: 'name', firstName: 'given_name', lastName: 'family_name', picture: 'picture', locale: 'locale' };

interface Desc {
  icon: string; pkce?: boolean; hosts: string[]; caps?: string[];
  secrets?: Array<{ key: string; label: string }>; settings?: Array<{ key: string; label: string }>;
  meta: Record<string, unknown>;
}

const PROVIDERS: Record<string, Desc> = {
  google: { icon: 'fab fa-google', pkce: true, hosts: ['oauth2.googleapis.com', 'openidconnect.googleapis.com'], meta: { usesPkce: true, profileMap: STD } },
  microsoft: { icon: 'fab fa-microsoft', pkce: true, hosts: ['login.microsoftonline.com', 'graph.microsoft.com'], meta: { usesPkce: true, profileMap: { sub: 'id', email: ['mail', 'userPrincipalName'], name: 'displayName', firstName: 'givenName', lastName: 'surname', locale: 'preferredLanguage' } } },
  linkedin: { icon: 'fab fa-linkedin', pkce: true, hosts: ['www.linkedin.com', 'api.linkedin.com'], meta: { usesPkce: true, profileMap: STD } },
  autodesk: { icon: 'fas fa-cube', hosts: ['developer.api.autodesk.com'], meta: { profileMap: STD } },
  slack: { icon: 'fab fa-slack', hosts: ['slack.com'], meta: { profileMap: STD } },
  facebook: { icon: 'fab fa-facebook', hosts: ['graph.facebook.com'], meta: { userinfoFields: 'id,name,email,first_name,last_name,picture', profileMap: { sub: 'id', email: 'email', name: 'name', firstName: 'first_name', lastName: 'last_name', picture: 'picture.data.url' } } },
  github: { icon: 'fab fa-github', hosts: ['github.com', 'api.github.com'], meta: { secondEmailCall: 'https://api.github.com/user/emails', profileMap: { sub: 'id', email: 'email', name: 'name', username: 'login', picture: 'avatar_url' } } },
  yandex: { icon: 'fab fa-yandex', pkce: true, hosts: ['oauth.yandex.com', 'login.yandex.ru'], meta: { usesPkce: true, userinfoAuth: 'oauth', avatarTemplate: 'https://avatars.yandex.net/get-yapic/{id}/islands-200', avatarField: 'default_avatar_id', profileMap: { sub: 'id', email: 'default_email', name: 'real_name', firstName: 'first_name', lastName: 'last_name' } } },
  twitter: { icon: 'fab fa-x-twitter', pkce: true, hosts: ['api.twitter.com'], meta: { usesPkce: true, tokenAuthBasic: true, unwrapData: true, profileMap: { sub: 'id', name: 'name', username: 'username', picture: 'profile_image_url' } } },
  apple: { icon: 'fab fa-apple', hosts: ['appleid.apple.com'], caps: ['http', 'secrets', 'crypto', 'settings'], settings: [{ key: 'teamId', label: 'Apple Team ID' }, { key: 'keyId', label: 'Apple Key ID' }], secrets: [{ key: 'signingKey', label: 'Apple Signing Key (.p8)' }], meta: { clientSecretJwt: { aud: 'https://appleid.apple.com' }, idTokenVerify: { issuer: 'https://appleid.apple.com', jwksUri: 'https://appleid.apple.com/auth/keys' }, profileMap: { sub: 'sub', email: 'email' } } },
  vk: { icon: 'fab fa-vk', hosts: ['oauth.vk.com', 'api.vk.com'], meta: { userinfoAuth: 'query', userinfoQuery: { v: '5.131', fields: 'photo_200,first_name,last_name' }, profileMap: { sub: 'id', firstName: 'first_name', lastName: 'last_name', picture: 'photo_200' } } },
  wechat: { icon: 'fab fa-weixin', hosts: ['api.weixin.qq.com'], meta: { tokenMethod: 'GET', openidFrom: 'openid', userinfoAuth: 'query', userinfoQuery: { openid: '@openid' }, profileMap: { sub: 'unionid', name: 'nickname', picture: 'headimgurl' } } },
  qq: { icon: 'fab fa-qq', hosts: ['graph.qq.com'], meta: { tokenMethod: 'GET', userinfoAuth: 'query', meCall: { url: 'https://graph.qq.com/oauth2.0/me', openidField: 'openid', consumerKeyParam: 'oauth_consumer_key' }, profileMap: { sub: 'openid', name: 'nickname', picture: 'figureurl_qq_2' } } },
  weibo: { icon: 'fab fa-weibo', hosts: ['api.weibo.com'], meta: { openidFrom: 'uid', userinfoAuth: 'query', userinfoQuery: { uid: '@openid' }, profileMap: { sub: 'id', name: 'screen_name', picture: 'avatar_large' } } },
  tiktok: { icon: 'fab fa-tiktok', pkce: true, hosts: ['open.tiktokapis.com'], meta: { usesPkce: true, openidFrom: 'open_id', profileMap: { sub: 'union_id', name: 'display_name', picture: 'avatar_url' } } },
};

// Alipay's RSA2-signed system-parameter flow is too bespoke for the universal bundle.
const ALIPAY_BUNDLE = `// AUTO-GENERATED — Alipay (RSA2-signed OpenAPI). Builds the system params, signs the
// sorted param string host-side (host.crypto.signData, key never in isolate), and
// posts to the gateway. Identity is the user_id (openid). BEST-EFFORT — verify against
// a real Alipay app before production.
function sortedSign(params) { return Object.keys(params).filter((k) => params[k] != null && params[k] !== '' && k !== 'sign').sort().map((k) => k + '=' + params[k]).join('&'); }
async function call(host, config, method, bizExtra) {
  const sys = { app_id: config.clientId, method: method, charset: 'utf-8', sign_type: 'RSA2', timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '), version: '1.0', ...bizExtra };
  sys.sign = await host.crypto.signData(sortedSign(sys), { algorithm: 'RSA-SHA256', secretName: 'appPrivateKey' });
  const body = Object.entries(sys).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
  const res = await host.http.fetch(config.tokenUrl, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, body: body });
  if (res.status >= 400) throw new Error('alipay ' + res.status);
  return JSON.parse(res.body);
}
globalThis.__plugin = {
  providers: {
    'auth_sso:provider': {
      getTokens: async ({ config, code }, host) => {
        const d = await call(host, config, 'alipay.system.oauth.token', { grant_type: 'authorization_code', code: code });
        const r = d.alipay_system_oauth_token_response || {};
        return { accessToken: r.access_token, refreshToken: r.refresh_token || null, idToken: null, tokenType: null, expiresIn: r.expires_in ? Number(r.expires_in) : null, scope: null, openid: r.user_id || null };
      },
      getUserInfo: async ({ config, accessToken, tokens }, host) => {
        const d = await call(host, config, 'alipay.user.info.share', { auth_token: accessToken });
        const r = d.alipay_user_info_share_response || {};
        return { sub: String(r.user_id || (tokens && tokens.openid)), email: null, name: r.nick_name || null, picture: r.avatar || null, provider: 'alipay' };
      },
    },
  },
};
`;

let count = 0;
function emit(key: string, manifest: object, bundle: string) {
  const dir = path.join(EXAMPLES, '@sso', key);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(path.join(dir, 'plugin.js'), bundle);
  count++;
}

for (const [key, d] of Object.entries(PROVIDERS)) {
  emit(key, {
    id: key, name: key.charAt(0).toUpperCase() + key.slice(1), version: '1.0.0',
    description: `${key} social login (OAuth2/OIDC), contributed into auth_sso:provider — sandboxed.`,
    icon: d.icon,
    sandbox: { runtime: 'isolated', capabilities: d.caps ?? ['http', 'secrets'], httpAllowlist: d.hosts, limits: { memoryMb: 64, timeoutMs: 30000, httpTimeoutMs: 28000, httpMaxBytes: 2000000 } },
    config: { secrets: d.secrets ?? [{ key: 'clientSecret', label: 'OAuth Client Secret' }], ...(d.settings ? { settings: d.settings } : {}) },
    extensions: [{ point: 'auth_sso:provider', key, metadata: { label: key.charAt(0).toUpperCase() + key.slice(1), usesPkce: !!d.pkce, ...d.meta } }],
  }, UNIVERSAL_BUNDLE);
  console.log(`@sso/${key}`);
}

// Alipay (dedicated bundle).
emit('alipay', {
  id: 'alipay', name: 'Alipay', version: '1.0.0',
  description: 'Alipay social login (RSA2-signed OpenAPI), contributed into auth_sso:provider — sandboxed.',
  icon: 'fab fa-alipay',
  sandbox: { runtime: 'isolated', capabilities: ['http', 'secrets', 'crypto'], httpAllowlist: ['openapi.alipay.com'], limits: { memoryMb: 64, timeoutMs: 30000, httpTimeoutMs: 28000, httpMaxBytes: 2000000 } },
  config: { secrets: [{ key: 'appPrivateKey', label: 'Alipay App Private Key (RSA2 PEM)' }] },
  extensions: [{ point: 'auth_sso:provider', key: 'alipay', metadata: { label: 'Alipay' } }],
}, ALIPAY_BUNDLE);
console.log('@sso/alipay');

console.log(`\ngenerated ${count} SSO provider plugins under examples/@sso/`);
