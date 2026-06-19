// Smart-ID (EE/LV/LT) eID provider — sandboxed. Ported from the built-in
// esign_smart_id adapter. Talks to the SK ID Solutions RP API v2:
//   1. initiateLogin: SHA-512 of (challenge + 32 random bytes) is POSTed to
//      /authentication/etsi/PNO{COUNTRY}-{code}; returns a sessionID + a 4-digit
//      verification code (SHA-256 of the hash, mod 10000).
//   2. pollLoginResult: GET /session/{id}; on COMPLETE+OK returns the user's
//      signature + auth certificate (base64) for HOST-SIDE verification.
// The isolate has no Node crypto, so hashing/nonce go through host.crypto.*; the
// certificate is never parsed here (the host crypto service does that).

const ERR = { notConfigured: 'provider_not_configured', invalid: 'identifier_invalid', failed: 'aggregator_request_failed' };

// Validate + normalise the personal code exactly like the built-in adapter.
function normalizeIdentifier(identifier, country) {
  const trimmed = String(identifier || '').trim().toUpperCase();
  const etsi = trimmed.match(/^PNO(EE|LV|LT)-(\d{6,11})$/);
  if (etsi) {
    if (country && country !== etsi[1]) throw new Error('Personal code country does not match selected country');
    return trimmed;
  }
  if (/^\d{6,11}$/.test(trimmed)) {
    if (!country) throw new Error('Country is required for Smart-ID');
    return `PNO${country}-${trimmed}`;
  }
  throw new Error(ERR.invalid);
}

async function cfg(host) {
  const [baseUrl, uuid, name] = await Promise.all([
    host.settings.get('smartIdBaseUrl'),
    host.settings.get('smartIdRelyingPartyUuid'),
    host.settings.get('smartIdRelyingPartyName'),
  ]);
  return { baseUrl, uuid, name };
}

function mapEndResult(end) {
  switch (end) {
    case 'USER_REFUSED':
    case 'USER_REFUSED_DISPLAYTEXTANDPIN':
    case 'USER_REFUSED_VC_CHOICE':
    case 'USER_REFUSED_CONFIRMATIONMESSAGE':
    case 'USER_REFUSED_CERT_CHOICE':
      return 'user_cancelled';
    case 'TIMEOUT': return 'user_timeout';
    case 'DOCUMENT_UNUSABLE': return 'sim_unsupported';
    case 'WRONG_VC': return 'wrong_pin';
    default: return 'provider_error';
  }
}

globalThis.__plugin = {
  providers: {
    'esign:provider': {
      initiateLogin: async ({ identifier, challenge, country }, host) => {
        const { baseUrl, uuid, name } = await cfg(host);
        if (!baseUrl || !uuid || !name) throw new Error(ERR.notConfigured);
        const normalized = normalizeIdentifier(identifier, country);

        // nonce = challenge bytes + 32 random bytes; the signed hash is SHA-512(nonce).
        const rand = await host.crypto.randomBytes(32, 'base64');
        const hashB64 = await host.crypto.hash(
          [{ value: String(challenge || ''), encoding: 'utf8' }, { value: rand, encoding: 'base64' }],
          { algorithm: 'sha512', outputEncoding: 'base64' },
        );
        // Verification code: leftmost 2 bytes of SHA-256(hash), big-endian, mod 10000.
        const shaHex = await host.crypto.hash([{ value: hashB64, encoding: 'base64' }], { algorithm: 'sha256', outputEncoding: 'hex' });
        const displayCode = String((parseInt(shaHex.slice(0, 4), 16) & 0xffff) % 10000).padStart(4, '0');

        const res = await host.http.fetch(`${baseUrl}/authentication/etsi/${encodeURIComponent(normalized)}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({
            relyingPartyUUID: uuid,
            relyingPartyName: name,
            certificateLevel: 'QUALIFIED',
            hash: hashB64,
            hashType: 'SHA512',
            allowedInteractionsOrder: [{ type: 'displayTextAndPIN', displayText60: String(challenge || '').slice(0, 60) }],
          }),
        });
        if (res.status >= 400) throw new Error(ERR.failed);
        const data = JSON.parse(res.body);
        if (!data.sessionID) throw new Error(ERR.failed);
        return { providerTxnId: data.sessionID, displayCode };
      },

      pollLoginResult: async ({ providerTxnId }, host) => {
        const { baseUrl } = await cfg(host);
        if (!baseUrl) return { status: 'failed', failureReason: 'provider_error' };
        try {
          const res = await host.http.fetch(`${baseUrl}/session/${encodeURIComponent(providerTxnId)}?timeoutMs=1000`, {
            method: 'GET', headers: { accept: 'application/json' },
          });
          if (res.status >= 400) return { status: 'failed', failureReason: 'provider_error' };
          const data = JSON.parse(res.body);
          if (data.state === 'RUNNING') return { status: 'pending' };
          const end = data.result && data.result.endResult;
          if (end !== 'OK' || !data.signature || !data.cert) {
            return { status: 'failed', failureReason: mapEndResult(end) };
          }
          // Hand the base64 signature + certificate to the host for verification.
          return { status: 'signed', signature: data.signature.value, certificate: data.cert.value };
        } catch (e) {
          return { status: 'failed', failureReason: 'provider_error' };
        }
      },
    },
  },
};
