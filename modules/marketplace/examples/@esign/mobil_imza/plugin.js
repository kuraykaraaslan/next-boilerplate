// Turkish Mobile Signature aggregator (TR) eID provider — sandboxed. Ported from
// the built-in esign_mobil_imza adapter. The aggregator routes the signing request
// to the user's GSM operator; we POST /signatures to start and poll /signatures/{id}.
// The API key is injected host-side via {{secret:mobilImzaAggregatorApiKey}} and never
// enters the isolate; the returned certificate is verified/parsed host-side.

const ERR = { notConfigured: 'provider_not_configured', invalid: 'identifier_invalid', failed: 'aggregator_request_failed' };

// E.164 for Türkiye: +90 followed by 10 digits, mobile prefix 5XX.
function normalizeMsisdn(identifier) {
  const trimmed = String(identifier || '').trim().replace(/\s|-/g, '');
  if (!/^\+905\d{9}$/.test(trimmed)) throw new Error(ERR.invalid);
  return trimmed;
}

async function authHeaders(host) {
  const customerCode = await host.settings.get('mobilImzaAggregatorCustomerCode');
  const h = {
    'content-type': 'application/json',
    accept: 'application/json',
    authorization: 'Bearer {{secret:mobilImzaAggregatorApiKey}}',
  };
  if (customerCode) h['X-Customer-Code'] = customerCode;
  return h;
}

function mapFailureCode(code) {
  switch (code) {
    case 'WRONG_PIN': return 'wrong_pin';
    case 'SIM_NOT_PROVISIONED': return 'sim_inactive';
    case 'SIM_NOT_SUPPORTED': return 'sim_unsupported';
    default: return 'provider_error';
  }
}

globalThis.__plugin = {
  providers: {
    'esign:provider': {
      initiateLogin: async ({ identifier, challenge }, host) => {
        const baseUrl = await host.settings.get('mobilImzaAggregatorBaseUrl');
        if (!baseUrl) throw new Error(ERR.notConfigured);
        const msisdn = normalizeMsisdn(identifier);
        const res = await host.http.fetch(`${baseUrl}/signatures`, {
          method: 'POST',
          headers: await authHeaders(host),
          body: JSON.stringify({ msisdn, message: String(challenge || ''), signatureProfile: 'AUTHENTICATION', async: true }),
        });
        if (res.status >= 400) throw new Error(ERR.failed);
        const data = JSON.parse(res.body);
        if (!data.transactionId) throw new Error(ERR.failed);
        return { providerTxnId: data.transactionId, displayCode: data.verificationCode };
      },

      pollLoginResult: async ({ providerTxnId }, host) => {
        const baseUrl = await host.settings.get('mobilImzaAggregatorBaseUrl');
        if (!baseUrl) return { status: 'failed', failureReason: 'provider_error' };
        try {
          const res = await host.http.fetch(`${baseUrl}/signatures/${encodeURIComponent(providerTxnId)}`, {
            method: 'GET', headers: await authHeaders(host),
          });
          if (res.status >= 400) return { status: 'failed', failureReason: 'provider_error' };
          const data = JSON.parse(res.body);
          switch (data.status) {
            case 'SIGNED':
              if (!data.signature || !data.certificate) return { status: 'failed', failureReason: 'provider_error' };
              return { status: 'signed', signature: data.signature, certificate: data.certificate };
            case 'PENDING': return { status: 'pending' };
            case 'EXPIRED': return { status: 'expired', failureReason: 'user_timeout' };
            case 'CANCELLED': return { status: 'failed', failureReason: 'user_cancelled' };
            case 'FAILED':
            default: return { status: 'failed', failureReason: mapFailureCode(data.failureCode) };
          }
        } catch (e) {
          return { status: 'failed', failureReason: 'provider_error' };
        }
      },
    },
  },
};
