// Alipay gateway (sandboxed). RSA2 signs the sorted parameter string host-side via
// host.crypto.signData (private key never enters the isolate). page.pay returns a
// signed redirect URL; trade.query reads status. Mirrors the built-in AlipayProvider.
// No URLSearchParams in the isolate, so query strings are built by hand.
function signContent(params) {
  return Object.keys(params).filter((k) => k !== 'sign' && params[k] !== undefined && params[k] !== '').sort().map((k) => k + '=' + params[k]).join('&');
}
function query(params) {
  return Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
}
async function gateway(host) {
  return (await host.settings.get('alipaySandboxMode')) === 'true' ? 'https://openapi.alipaydev.com/gateway.do' : 'https://openapi.alipay.com/gateway.do';
}
async function common(host, method, bizContent) {
  const appId = await host.settings.get('alipayAppId');
  return {
    app_id: appId, method: method, format: 'JSON', charset: 'utf-8', sign_type: 'RSA2',
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19), version: '1.0',
    biz_content: JSON.stringify(bizContent),
  };
}
async function sign(host, params) {
  return host.crypto.signData(signContent(params), { secretName: 'alipayPrivateKey', algorithm: 'RSA-SHA256' });
}

globalThis.__plugin = {
  providers: {
    'payment:gateway': {
      getPaymentStatus: async ({ token }, host) => {
        const params = await common(host, 'alipay.trade.query', { out_trade_no: token });
        const signed = Object.assign({}, params, { sign: await sign(host, params) });
        const res = await host.http.fetch(await gateway(host), {
          method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, body: query(signed),
        });
        if (res.status >= 400) throw new Error('alipay status ' + res.status);
        const r = JSON.parse(res.body).alipay_trade_query_response || {};
        return r.trade_status || r.code;
      },

      createCheckoutSession: async (params, host) => {
        const m = params.metadata || {};
        const outTradeNo = m.paymentId || String(Date.now());
        const biz = {
          out_trade_no: outTradeNo, product_code: 'FAST_INSTANT_TRADE_PAY',
          total_amount: Number(params.amount).toFixed(2), subject: params.description, body: params.description,
        };
        const all = Object.assign(await common(host, 'alipay.trade.page.pay', biz), {
          return_url: params.successUrl, notify_url: m.notifyUrl || params.successUrl,
        });
        const signed = Object.assign({}, all, { sign: await sign(host, all) });
        return { sessionId: outTradeNo, checkoutUrl: (await gateway(host)) + '?' + query(signed), providerData: { outTradeNo: outTradeNo } };
      },
    },
  },
};
