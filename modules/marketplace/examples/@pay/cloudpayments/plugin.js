// CloudPayments gateway (sandboxed). Basic auth (publicId + {{secret}}
// cloudpaymentsApiSecret) built host-side; the secret never enters the isolate.
// Hosted-redirect orders. Mirrors the built-in CloudPaymentsProvider.
const API = 'https://api.cloudpayments.ru';

async function basic(host) {
  const publicId = await host.settings.get('cloudpaymentsPublicId');
  return { username: publicId, secretName: 'cloudpaymentsApiSecret' };
}

globalThis.__plugin = {
  providers: {
    'payment:gateway': {
      getPaymentStatus: async ({ token }, host) => {
        const res = await host.http.fetch(API + '/payments/find', {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ InvoiceId: token }),
          basic: await basic(host),
        });
        if (res.status >= 400) throw new Error('cloudpayments status ' + res.status);
        const d = JSON.parse(res.body);
        return (d.Model && d.Model.Status) || d.Success;
      },

      createCheckoutSession: async (params, host) => {
        const m = params.metadata || {};
        const invoiceId = m.paymentId || String(Date.now());
        const body = {
          Amount: Number(Number(params.amount).toFixed(2)),
          Currency: String(params.currency).toUpperCase(),
          Description: params.description,
          InvoiceId: invoiceId,
          AccountId: m.userId || m.tenantId || invoiceId,
          Email: m.email,
          SuccessRedirectUrl: params.successUrl,
          FailRedirectUrl: params.cancelUrl,
          JsonData: params.metadata,
        };
        const res = await host.http.fetch(API + '/orders/create', {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify(body),
          basic: await basic(host),
        });
        if (res.status >= 400) throw new Error('cloudpayments order ' + res.status + ': ' + String(res.body).slice(0, 150));
        const d = JSON.parse(res.body);
        if (!d.Success || !d.Model) throw new Error(d.Message || 'CloudPayments order creation failed');
        return { sessionId: d.Model.Id || invoiceId, checkoutUrl: d.Model.Url || '', providerData: { orderId: d.Model.Id, invoiceId: invoiceId } };
      },
    },
  },
};
