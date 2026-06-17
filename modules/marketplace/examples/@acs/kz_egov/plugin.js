// AUTO-GENERATED — generic OIDC national-identity provider (sandboxed).
// Egress + token exchange in the isolate; id_token verification is host-side
// (host.crypto.verifyJwks). The client secret is injected host-side ({{secret:apiKey}}
// style) — never seen here. Endpoints/clientId/attrs come from `config`.
globalThis.__plugin = {
  providers: {
    'auth_acs:provider': {
      generateAuthUrl: async ({ config, relayState, nonce }) => {
        const u = new URL(config.authUrl);
        u.searchParams.set('response_type', 'code');
        u.searchParams.set('client_id', config.clientId);
        u.searchParams.set('redirect_uri', config.callbackUrl);
        u.searchParams.set('scope', (config.scopes && config.scopes.length ? config.scopes : ['openid']).join(' '));
        u.searchParams.set('state', relayState);
        if (nonce) u.searchParams.set('nonce', nonce);
        return u.toString();
      },
      validateCallback: async ({ config, body, nonce }, host) => {
        const code = body && body.code;
        if (!code) throw new Error('missing authorization code');
        const form = [
          'grant_type=authorization_code',
          'code=' + encodeURIComponent(code),
          'redirect_uri=' + encodeURIComponent(config.callbackUrl),
          'client_id=' + encodeURIComponent(config.clientId),
          'client_secret={{secret:clientSecret}}',
        ].join('&');
        const res = await host.http.fetch(config.tokenUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
          body: form,
        });
        if (res.status >= 400) throw new Error('token ' + res.status + ': ' + String(res.body).slice(0, 200));
        const tok = JSON.parse(res.body);
        if (!tok.id_token) throw new Error('no id_token in token response');
        const claims = await host.crypto.verifyJwks(tok.id_token, config.jwksUri, {
          issuer: config.issuer, audience: config.clientId, nonce,
        });
        const pick = (k) => (k && claims[k] != null ? String(claims[k]) : null);
        const nationalId = pick(config.attrNationalId) || pick('sub') || '';
        return { nationalId, firstName: pick(config.attrFirstName), lastName: pick(config.attrLastName), country: config.country };
      },
    },
  },
};
