// Generates a sandboxed community-plugin bundle + manifest for every national
// identity (ACS) provider in the catalog, under modules/marketplace/examples/@acs/<key>.
//   - OIDC: capabilities http+secrets+crypto; egress allowlist = known IdP host;
//           secret = clientSecret; verification via host.crypto.verifyJwks.
//   - SAML: capability saml only (no isolate egress); secrets = spPrivateKey +
//           spDecryptionKey (read broker-side); sign+verify via host.saml.*.
// Run once: `npm run gen:acs-plugins`. Idempotent (overwrites).

import 'reflect-metadata';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ACS_CATALOG } from '@kuraykaraaslan/auth_acs/server/auth_acs.config';

const here = path.dirname(fileURLToPath(import.meta.url));
const EXAMPLES = path.join(here, '../modules/marketplace/examples');

const OIDC_BUNDLE = `// AUTO-GENERATED — generic OIDC national-identity provider (sandboxed).
// Egress + token exchange in the isolate; id_token verification is host-side
// (host.crypto.verifyJwks). The client secret is injected host-side ({{secret:apiKey}}
// style) — never seen here. Endpoints/clientId/attrs come from \`config\`.
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
`;

const SAML_BUNDLE = `// AUTO-GENERATED — generic SAML national-identity provider (sandboxed).
// Thin: both ops delegate to the host-side broker (host.saml.*), which signs the
// AuthnRequest and verifies the XML-DSig assertion in vetted code. The SP private/
// decryption keys live as plugin secrets and never enter the isolate.
globalThis.__plugin = {
  providers: {
    'auth_acs:provider': {
      generateAuthUrl: async ({ config, relayState }, host) => host.saml.generateAuthUrl(relayState, config),
      validateCallback: async ({ config, body }, host) => {
        const a = await host.saml.validateResponse(body, config);
        const attrs = (a && a.attributes) || {};
        const pick = (k) => (k && attrs[k] != null ? String(attrs[k]) : null);
        // Normalize the SPID/eIDAS 'TINIT-' fiscal-number prefix (no-op for others).
        const nationalId = (pick(config.attrNationalId) || (a && a.nameId) || '').replace(/^TINIT-/, '');
        return {
          nationalId,
          firstName: pick(config.attrFirstName),
          lastName: pick(config.attrLastName),
          country: config.country,
          nameId: a && a.nameId,
          assertionId: a && a.assertionId,
          sessionIndex: a && a.sessionIndex,
        };
      },
    },
  },
};
`;

function hostOf(url?: string): string | null {
  if (!url) return null;
  try { return new URL(url).host; } catch { return null; }
}

let count = 0;
for (const key of Object.keys(ACS_CATALOG)) {
  const d = (ACS_CATALOG as Record<string, any>)[key];
  const isOidc = d.protocol === 'oidc';
  const dir = path.join(EXAMPLES, '@acs', key);
  mkdirSync(dir, { recursive: true });

  const allowHosts = isOidc
    ? [...new Set([hostOf(d.defaults?.authUrl), hostOf(d.defaults?.tokenUrl), hostOf(d.defaults?.userInfoUrl)].filter(Boolean))]
    : [];

  const manifest = {
    id: key,
    name: d.label,
    version: '1.0.0',
    description: `${d.label} — national identity (${d.protocol.toUpperCase()}), contributed into auth_acs:provider, sandboxed.`,
    icon: 'fas fa-id-card',
    sandbox: {
      runtime: 'isolated',
      capabilities: isOidc ? ['http', 'secrets', 'crypto'] : ['saml'],
      httpAllowlist: allowHosts,
      limits: { memoryMb: 64, timeoutMs: 30000, httpTimeoutMs: 28000, httpMaxBytes: 2000000 },
    },
    config: {
      secrets: isOidc
        ? [{ key: 'clientSecret', label: 'OIDC Client Secret', help: 'Stored encrypted; injected host-side for the token exchange.' }]
        : [
            { key: 'spPrivateKey', label: 'SP Private Key (PEM)', help: 'Signs the AuthnRequest; read broker-side, never enters the sandbox.' },
            { key: 'spDecryptionKey', label: 'SP Decryption Key (PEM)', help: 'Decrypts EncryptedAssertion (optional; defaults to the signing key).' },
          ],
    },
    extensions: [
      { point: 'auth_acs:provider', key, metadata: { label: d.label, protocol: d.protocol, country: d.country } },
    ],
  };

  writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(path.join(dir, 'plugin.js'), isOidc ? OIDC_BUNDLE : SAML_BUNDLE);
  count++;
  console.log(`@acs/${key} (${d.protocol})${allowHosts.length ? ' allow=' + allowHosts.join(',') : ''}`);
}

// The standalone @idme pilot is superseded by @acs/us_id_me — remove it.
const idme = path.join(EXAMPLES, '@idme');
if (existsSync(idme)) { rmSync(idme, { recursive: true, force: true }); console.log('removed superseded @idme pilot'); }

console.log(`\ngenerated ${count} ACS provider plugins under examples/@acs/`);
