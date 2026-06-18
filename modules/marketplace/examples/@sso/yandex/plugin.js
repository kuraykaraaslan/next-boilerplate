// AUTO-GENERATED — universal OAuth2/OIDC social-login provider (sandboxed). Behaviour
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
