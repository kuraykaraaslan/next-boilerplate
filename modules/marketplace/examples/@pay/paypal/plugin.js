// PayPal gateway (sandboxed). OAuth2 client-credentials (Basic auth built host-side
// from clientId + {{secret}} paypalClientSecret) yields a Bearer token used for the
// Orders v2 hosted-redirect checkout. The client secret never enters the isolate.
// Mirrors the built-in PaypalProvider (sandbox-aware base URL).
async function authorize(host) {
  const sandbox = (await host.settings.get('paypalSandboxMode')) === 'true';
  const base = sandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
  const clientId = await host.settings.get('paypalClientId');
  const res = await host.http.fetch(base + '/v1/oauth2/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: 'grant_type=client_credentials',
    basic: { username: clientId, secretName: 'paypalClientSecret' },
  });
  if (res.status >= 400) throw new Error('paypal token ' + res.status);
  return { base: base, access: JSON.parse(res.body).access_token };
}

globalThis.__plugin = {
  providers: {
    'payment:gateway': {
      getPaymentStatus: async ({ token }, host) => {
        const { base, access } = await authorize(host);
        const res = await host.http.fetch(base + '/v2/checkout/orders/' + encodeURIComponent(token), {
          method: 'GET', headers: { authorization: 'Bearer ' + access, accept: 'application/json' },
        });
        if (res.status >= 400) throw new Error('paypal status ' + res.status);
        return JSON.parse(res.body);
      },

      createCheckoutSession: async (params, host) => {
        const { base, access } = await authorize(host);
        const body = {
          intent: 'CAPTURE',
          purchase_units: [{
            amount: { currency_code: String(params.currency).toUpperCase(), value: Number(params.amount).toFixed(2) },
            description: params.description,
            custom_id: params.metadata && params.metadata.paymentId,
          }],
          application_context: { return_url: params.successUrl, cancel_url: params.cancelUrl, brand_name: params.description, user_action: 'PAY_NOW' },
        };
        const res = await host.http.fetch(base + '/v2/checkout/orders', {
          method: 'POST',
          headers: { authorization: 'Bearer ' + access, 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.status >= 400) throw new Error('paypal order ' + res.status + ': ' + String(res.body).slice(0, 150));
        const d = JSON.parse(res.body);
        const approve = (d.links || []).find((l) => l.rel === 'approve');
        return { sessionId: d.id, checkoutUrl: approve ? approve.href : '', providerData: { orderId: d.id } };
      },
    },

    // payment:coupon — pure: express the local discount as a PayPal Orders v2
    // discount line item (no API, no secret). Merged into the order body by the host.
    'payment:coupon': {
      buildCheckoutParams: async ({ discount }) => {
        if (!discount || !discount.discountAmount) return {};
        const item = {
          name: 'Discount: ' + discount.code, quantity: '1',
          unit_amount: { currency_code: discount.currency || 'USD', value: Number(discount.discountAmount).toFixed(2) },
          category: 'DIGITAL_GOODS',
        };
        return { paypal_discount_item: JSON.stringify(item) };
      },
    },
  },
};
