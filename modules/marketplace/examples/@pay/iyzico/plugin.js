// iyzico gateway (sandboxed). The IYZWSv2 request signature is HMAC-SHA256 over
// (randomKey + uriPath + body) keyed by the secret key — computed HOST-SIDE via
// host.crypto.hmac so the secret never enters the isolate; the bundle only base64s the
// non-secret auth string (btoa). Mirrors the built-in IyzicoProvider incl. direct-card
// + 3DS (raw card data crosses into the isolate — accepted PCI tradeoff) + BIN lookup.
async function call(host, uriPath, bodyObj) {
  const sandbox = (await host.settings.get('iyzicoSandboxMode')) === 'true';
  const baseUrl = sandbox ? 'https://sandbox-api.iyzipay.com' : 'https://api.iyzipay.com';
  const apiKey = await host.settings.get('iyzicoApiKey');
  const payload = bodyObj ? JSON.stringify(bodyObj) : '';
  const randomKey = String(Date.now()) + '123456789';
  const signature = await host.crypto.hmac(randomKey + uriPath + payload, { secretName: 'iyzicoSecretKey', algorithm: 'sha256', encoding: 'hex' });
  const authorization = 'IYZWSv2 ' + btoa('apiKey:' + apiKey + '&randomKey:' + randomKey + '&signature:' + signature);
  const res = await host.http.fetch(baseUrl + uriPath, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', authorization: authorization, 'x-iyzi-rnd': randomKey },
    body: payload,
  });
  if (res.status >= 400) throw new Error('iyzico ' + res.status + ': ' + String(res.body).slice(0, 150));
  return JSON.parse(res.body);
}

function chargeBody(params, conversationId) {
  const c = params.card;
  const expireYear = String(c.expireYear).length === 2 ? '20' + c.expireYear : c.expireYear;
  const name = (params.buyer && params.buyer.name) || 'Tenant';
  const surname = (params.buyer && params.buyer.surname) || 'Admin';
  const contactName = (name + ' ' + surname).trim();
  const items = (params.basketItems && params.basketItems.length ? params.basketItems : [{ id: 'ITEM', name: params.description, price: params.amount }])
    .map((b) => ({ id: b.id, name: b.name, category1: 'Subscription', itemType: 'VIRTUAL', price: Number(b.price).toFixed(2) }));
  return {
    locale: 'tr', conversationId: conversationId,
    price: Number(params.amount).toFixed(2), paidPrice: Number(params.amount).toFixed(2),
    currency: String(params.currency).toUpperCase(), installment: 1, basketId: conversationId,
    paymentChannel: 'WEB', paymentGroup: 'SUBSCRIPTION',
    paymentCard: { cardHolderName: c.cardHolderName, cardNumber: c.cardNumber, expireMonth: c.expireMonth, expireYear: expireYear, cvc: c.cvc, registerCard: 0 },
    buyer: { id: (params.buyer && params.buyer.id) || 'buyer', name: name, surname: surname, email: (params.buyer && params.buyer.email) || 'buyer@example.com', identityNumber: (params.buyer && params.buyer.identityNumber) || '11111111111', registrationAddress: 'N/A', city: 'Istanbul', country: 'Turkey', ip: (params.buyer && params.buyer.ip) || '127.0.0.1' },
    shippingAddress: { contactName: contactName, city: 'Istanbul', country: 'Turkey', address: 'N/A' },
    billingAddress: { contactName: contactName, city: 'Istanbul', country: 'Turkey', address: 'N/A' },
    basketItems: items,
  };
}

function decline(data, fallback) {
  return { status: 'failure', errorCode: data && data.errorCode, errorMessage: (data && data.errorMessage) || fallback, raw: data };
}

globalThis.__plugin = {
  providers: {
    'payment:gateway': {
      getPaymentStatus: async ({ token }, host) => {
        const d = await call(host, '/payment/iyzipos/checkoutform/auth/ecom/detail', { locale: 'tr', conversationId: token, token: token });
        return d.status;
      },

      createCheckoutSession: async (params, host) => {
        const conversationId = (params.metadata && params.metadata.paymentId) || String(Date.now());
        const installmentsRaw = (await host.settings.get('iyzicoEnabledInstallments')) || '';
        const enabledInstallments = installmentsRaw.split(',').map((n) => parseInt(String(n).trim(), 10)).filter((n) => Number.isInteger(n) && n > 0);
        const body = {
          locale: 'tr', conversationId: conversationId,
          price: Number(params.amount).toFixed(2), paidPrice: Number(params.amount).toFixed(2),
          currency: String(params.currency).toUpperCase() === 'TRY' ? 'TRY' : 'USD',
          basketId: conversationId, paymentGroup: 'SUBSCRIPTION',
          callbackUrl: params.successUrl,
          buyer: { id: (params.metadata && params.metadata.tenantId) || 'tenant', name: 'Tenant', surname: 'Admin', email: (params.metadata && params.metadata.email) || 'buyer@example.com', identityNumber: '00000000000', registrationAddress: 'N/A', city: 'Istanbul', country: 'Turkey', ip: '127.0.0.1' },
          shippingAddress: { contactName: 'Tenant Admin', city: 'Istanbul', country: 'Turkey', address: 'N/A' },
          billingAddress: { contactName: 'Tenant Admin', city: 'Istanbul', country: 'Turkey', address: 'N/A' },
          basketItems: [{ id: (params.metadata && params.metadata.planId) || 'PLAN', name: params.description, category1: 'Subscription', itemType: 'VIRTUAL', price: Number(params.amount).toFixed(2) }],
        };
        if (enabledInstallments.length) body.enabledInstallments = enabledInstallments;
        const d = await call(host, '/payment/iyzipos/checkoutform/initialize/auth/ecom', body);
        return { sessionId: d.token || conversationId, checkoutUrl: d.paymentPageUrl || d.checkoutFormContent || '', providerData: { token: d.token } };
      },

      createPayment: async (params, host) => {
        const conversationId = (params.metadata && params.metadata.paymentId) || String(Date.now());
        try {
          const d = await call(host, '/payment/auth', chargeBody(params, conversationId));
          if (d.status === 'success') return { status: 'success', providerPaymentId: d.paymentId, raw: d };
          return decline(d, 'Payment declined');
        } catch (e) { return { status: 'failure', errorMessage: 'iyzico direct payment failed' }; }
      },

      create3dsPayment: async (params, host) => {
        const conversationId = (params.metadata && params.metadata.paymentId) || String(Date.now());
        try {
          const body = chargeBody(params, conversationId);
          body.callbackUrl = params.callbackUrl;
          const d = await call(host, '/payment/3dsecure/initialize', body);
          if (d.status === 'success' && d.threeDSHtmlContent) return { status: 'success', htmlContent: d.threeDSHtmlContent, conversationId: conversationId, raw: d };
          return decline(d, 'Payment declined');
        } catch (e) { return { status: 'failure', errorMessage: 'iyzico 3DS init failed' }; }
      },

      complete3dsPayment: async (params, host) => {
        try {
          const d = await call(host, '/payment/3dsecure/auth', { locale: 'tr', conversationId: params.conversationId, paymentId: params.paymentId });
          if (d.status === 'success') return { status: 'success', providerPaymentId: d.paymentId, raw: d };
          return decline(d, 'Payment declined');
        } catch (e) { return { status: 'failure', errorMessage: 'iyzico 3DS complete failed' }; }
      },

      checkBin: async ({ binNumber }, host) => {
        try {
          const d = await call(host, '/payment/bin/check', { locale: 'tr', conversationId: 'bin-' + Date.now(), binNumber: String(binNumber).replace(/\D/g, '').slice(0, 8) });
          if (d.status !== 'success') return { supported: false };
          return { supported: true, bankName: d.bankName || null, cardType: d.cardType || null, cardAssociation: d.cardAssociation || null, cardFamily: d.cardFamily || null, commercial: d.commercial === 1 || d.commercial === true };
        } catch (e) { return { supported: false }; }
      },
    },

    // payment:coupon — pure: express the local discount as a negative-priced VIRTUAL
    // basket item (no API, no secret). Appended to the basket by the host.
    'payment:coupon': {
      buildCheckoutParams: async ({ discount }) => {
        if (!discount || !discount.discountAmount) return {};
        const item = {
          id: 'coupon_' + discount.code, name: 'İndirim: ' + discount.code,
          category1: 'Indirim', itemType: 'VIRTUAL', price: (-discount.discountAmount).toFixed(2),
        };
        return { iyzico_discount_item: JSON.stringify(item) };
      },
    },
  },
};
