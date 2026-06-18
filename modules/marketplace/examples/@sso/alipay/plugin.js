// AUTO-GENERATED — Alipay (RSA2-signed OpenAPI). Builds the system params, signs the
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
