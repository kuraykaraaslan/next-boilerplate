// YooKassa gateway (sandboxed). Basic auth (shopId + {{secret}} yookassaSecretKey) is
// built host-side; the secret never enters the isolate. Hosted-redirect checkout with
// an idempotence key. Mirrors the built-in YooKassaProvider.
const API = 'https://api.yookassa.ru/v3';

async function basic(host) {
  const shopId = await host.settings.get('yookassaShopId');
  return { username: shopId, secretName: 'yookassaSecretKey' };
}

globalThis.__plugin = {
  providers: {
    'payment:gateway': {
      getPaymentStatus: async ({ token }, host) => {
        const res = await host.http.fetch(API + '/payments/' + encodeURIComponent(token), {
          method: 'GET', headers: { accept: 'application/json' }, basic: await basic(host),
        });
        if (res.status >= 400) throw new Error('yookassa status ' + res.status);
        return JSON.parse(res.body).status;
      },

      createCheckoutSession: async (params, host) => {
        const idempotenceKey = (params.metadata && params.metadata.paymentId) || ('idem_' + Date.now());
        const body = {
          amount: { value: Number(params.amount).toFixed(2), currency: String(params.currency).toUpperCase() },
          capture: true,
          confirmation: { type: 'redirect', return_url: params.successUrl },
          description: params.description,
          metadata: params.metadata,
        };
        const res = await host.http.fetch(API + '/payments', {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json', 'Idempotence-Key': idempotenceKey },
          body: JSON.stringify(body),
          basic: await basic(host),
        });
        if (res.status >= 400) throw new Error('yookassa payment ' + res.status + ': ' + String(res.body).slice(0, 150));
        const d = JSON.parse(res.body);
        return {
          sessionId: d.id,
          checkoutUrl: (d.confirmation && d.confirmation.confirmation_url) || '',
          providerData: { paymentId: d.id, status: d.status },
        };
      },
    },
  },
};
