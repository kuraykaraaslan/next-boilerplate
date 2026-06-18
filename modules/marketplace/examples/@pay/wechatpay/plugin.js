// WeChat Pay v3 gateway (sandboxed). The WECHATPAY2-SHA256-RSA2048 auth signature over
// (method\npath\ntimestamp\nnonce\nbody\n) is computed host-side via host.crypto.signData
// (merchant private key never enters the isolate). Native (QR code_url) checkout.
// Callback AES-GCM decryption is host-side webhook territory, not here.
function nonce() {
  let s = '';
  for (let i = 0; i < 32; i++) s += '0123456789ABCDEF'[Math.floor(Math.random() * 16)];
  return s;
}

async function authReq(host, method, urlPath, bodyObj) {
  const mchId = await host.settings.get('wechatPayMchId');
  const serialNo = await host.settings.get('wechatPaySerialNo');
  const bodyStr = bodyObj ? JSON.stringify(bodyObj) : '';
  const ts = String(Math.floor(Date.now() / 1000));
  const n = nonce();
  const message = method + '\n' + urlPath + '\n' + ts + '\n' + n + '\n' + bodyStr + '\n';
  const signature = await host.crypto.signData(message, { secretName: 'wechatPayPrivateKey', algorithm: 'RSA-SHA256' });
  const token = 'mchid="' + mchId + '",nonce_str="' + n + '",timestamp="' + ts + '",serial_no="' + serialNo + '",signature="' + signature + '"';
  const res = await host.http.fetch('https://api.mch.weixin.qq.com' + urlPath, {
    method: method,
    headers: {
      authorization: 'WECHATPAY2-SHA256-RSA2048 ' + token,
      'content-type': 'application/json', accept: 'application/json', 'user-agent': 'next-boilerplate-wechatpay/1.0',
    },
    body: bodyStr || undefined,
  });
  if (res.status >= 400) throw new Error('wechatpay ' + res.status + ': ' + String(res.body).slice(0, 150));
  return JSON.parse(res.body);
}

globalThis.__plugin = {
  providers: {
    'payment:gateway': {
      getPaymentStatus: async ({ token }, host) => {
        const mchId = await host.settings.get('wechatPayMchId');
        const urlPath = '/v3/pay/transactions/out-trade-no/' + encodeURIComponent(token) + '?mchid=' + encodeURIComponent(mchId);
        const d = await authReq(host, 'GET', urlPath, null);
        return d.trade_state || d;
      },

      createCheckoutSession: async (params, host) => {
        const m = params.metadata || {};
        const appId = await host.settings.get('wechatPayAppId');
        const mchId = await host.settings.get('wechatPayMchId');
        const notifyUrl = m.notifyUrl || (await host.settings.get('wechatPayNotifyUrl')) || params.successUrl;
        const outTradeNo = m.paymentId || String(Date.now());
        const body = {
          appid: appId, mchid: mchId, description: params.description, out_trade_no: outTradeNo,
          notify_url: notifyUrl, amount: { total: Math.round(params.amount * 100), currency: 'CNY' },
        };
        const d = await authReq(host, 'POST', '/v3/pay/transactions/native', body);
        return { sessionId: outTradeNo, checkoutUrl: d.code_url, providerData: { outTradeNo: outTradeNo, codeUrl: d.code_url } };
      },
    },
  },
};
