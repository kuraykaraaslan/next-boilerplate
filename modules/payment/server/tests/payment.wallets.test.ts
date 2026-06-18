import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { WalletDescriptorSchema } from '../payment.enums';

// After the full migration to sandboxed plugins, wallet capability lives in each
// @pay/<key> manifest's payment:gateway metadata (read by IsolatedPaymentProvider
// .supportedWallets), not in a built-in provider class. This validates that source.
const EXAMPLES = path.join(__dirname, '../../../marketplace/examples/@pay');

function wallets(key: string): Array<{ method: string; delivery: string }> {
  const manifest = JSON.parse(readFileSync(path.join(EXAMPLES, key, 'manifest.json'), 'utf8'));
  const gateway = (manifest.extensions ?? []).find((e: { point: string }) => e.point === 'payment:gateway');
  return (gateway?.metadata?.wallets ?? []) as Array<{ method: string; delivery: string }>;
}

describe('@pay gateway supportedWallets metadata', () => {
  it('iyzico surfaces MasterPass + BKM Express via hosted redirect', () => {
    const w = wallets('iyzico');
    const methods = w.map((d) => d.method);
    expect(methods).toEqual(expect.arrayContaining(['MASTERPASS', 'BKM_EXPRESS', 'SAVED_CARD', 'INSTALLMENT']));
    expect(w.find((d) => d.method === 'MASTERPASS')?.delivery).toBe('HOSTED_REDIRECT');
  });

  it('stripe surfaces Apple/Google Pay + Click to Pay via client element', () => {
    const w = wallets('stripe');
    const methods = w.map((d) => d.method);
    expect(methods).toEqual(expect.arrayContaining(['APPLE_PAY', 'GOOGLE_PAY', 'CLICK_TO_PAY', 'LINK']));
    expect(w.find((d) => d.method === 'APPLE_PAY')?.delivery).toBe('CLIENT_ELEMENT');
  });

  it('paypal surfaces the PayPal wallet', () => {
    expect(wallets('paypal').map((d) => d.method)).toContain('PAYPAL');
  });

  it('every declared wallet descriptor is schema-valid across all gateways', () => {
    for (const key of ['stripe', 'paypal', 'iyzico', 'alipay', 'wechatpay', 'yookassa', 'cloudpayments', 'manual']) {
      for (const d of wallets(key)) {
        expect(WalletDescriptorSchema.safeParse(d).success).toBe(true);
      }
    }
  });
});
