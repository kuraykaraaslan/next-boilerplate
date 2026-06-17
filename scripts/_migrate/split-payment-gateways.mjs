// Extract the remaining in-tree payment gateways into satellite modules
// (payment_<key>) contributing to the payment:gateway extension point, then
// rewrite payment.checkout.registry to resolve purely via the extension registry.
import fs from 'node:fs';

const HOST = 'modules/payment/server/providers';
const G = {
  paypal: { cls: 'PaypalProvider', label: 'PayPal', icon: 'fab fa-paypal' },
  iyzico: { cls: 'IyzicoProvider', label: 'Iyzico', icon: 'fas fa-credit-card', extra: ['iyzico.client.ts', 'iyzico.body.ts'] },
  alipay: { cls: 'AlipayProvider', label: 'Alipay', icon: 'fab fa-alipay' },
  cloudpayments: { cls: 'CloudPaymentsProvider', label: 'CloudPayments', icon: 'fas fa-credit-card' },
  wechatpay: { cls: 'WeChatPayProvider', label: 'WeChat Pay', icon: 'fab fa-weixin' },
  yookassa: { cls: 'YooKassaProvider', label: 'YooKassa', icon: 'fas fa-credit-card' },
};
const ENUM = { paypal: 'PAYPAL', iyzico: 'IYZICO', alipay: 'ALIPAY', cloudpayments: 'CLOUDPAYMENTS', wechatpay: 'WECHATPAY', yookassa: 'YOOKASSA' };

const fixImports = (s) =>
  s.replace(/from '\.\/base\.provider'/g, "from '@kuraykaraaslan/payment/server/providers/base.provider'")
    .replace(/from '\.\.\//g, "from '@kuraykaraaslan/payment/server/"); // ../payment.X -> @kuraykaraaslan/payment/server/payment.X

for (const [key, meta] of Object.entries(G)) {
  const mod = `modules/payment_${key}`;
  const sdir = `${mod}/server/providers`;
  fs.mkdirSync(sdir, { recursive: true });
  for (const file of [`${key}.provider.ts`, ...(meta.extra ?? [])]) {
    const from = `${HOST}/${file}`;
    fs.writeFileSync(`${sdir}/${file}`, fixImports(fs.readFileSync(from, 'utf8')));
    fs.rmSync(from);
  }
  fs.writeFileSync(
    `${mod}/server/${key}.extension.ts`,
    `import type { PaymentGatewayContribution } from '@kuraykaraaslan/payment/server/payment.gateway.types';\n` +
      `import ${meta.cls} from './providers/${key}.provider';\n\n` +
      `const contribution: PaymentGatewayContribution = {\n  key: '${key}',\n  create: () => new ${meta.cls}(),\n};\n\nexport default contribution;\n`,
  );
  fs.writeFileSync(
    `${mod}/module.json`,
    JSON.stringify(
      {
        $schema: '../module.schema.json',
        id: `payment_${key}`,
        name: `${meta.label} Gateway`,
        description: `${meta.label} payment gateway, contributed into the payment:gateway extension point.`,
        version: '1.0.0',
        icon: meta.icon,
        tags: ['billing', 'payment', 'gateway'],
        priority: 26,
        dependencies: { requires: ['payment', 'env', 'setting', 'common'] },
        author: 'Kuray Karaaslan',
        homepage: `https://github.com/kuraykaraaslan/next-boilerplate/tree/main/modules/payment_${key}`,
        license: 'CC-BY-NC-ND-4.0',
        extensions: [{ point: 'payment:gateway', key, export: `payment_${key}/server/${key}.extension`, metadata: { label: meta.label } }],
      },
      null,
      2,
    ) + '\n',
  );
  fs.writeFileSync(
    `${mod}/package.json`,
    JSON.stringify({ name: `@kuraykaraaslan/payment_${key}`, version: '0.0.0', private: true, type: 'module', exports: {} }, null, 2) + '\n',
  );
  console.log(`extracted ${key} -> ${mod}`);
}

// rewrite host registry: extension-only resolution (no in-tree fallback gateways)
const REG = 'modules/payment/server/payment.checkout.registry.ts';
let reg = fs.readFileSync(REG, 'utf8');
// drop the fallback provider imports
reg = reg.replace(/import \w+Provider from '\.\/providers\/\w+\.provider';\n/g, '');
// empty the FALLBACK map
reg = reg.replace(
  /const FALLBACK = new Map<PaymentProvider, \(\) => BasePaymentProvider>\(\[[\s\S]*?\]\);/,
  'const FALLBACK = new Map<PaymentProvider, () => BasePaymentProvider>();',
);
fs.writeFileSync(REG, reg);
console.log('rewrote payment.checkout.registry (extension-only)');
