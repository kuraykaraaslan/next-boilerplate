import { describe, it, expect, vi } from 'vitest';

vi.mock('@nb/env', () => ({ env: { NODE_ENV: 'test', PAYMENT_DEFAULT_PROVIDER: 'STRIPE' } }));
vi.mock('@nb/db', () => ({ getDataSource: vi.fn(), tenantDataSourceFor: vi.fn() }));
vi.mock('@nb/redis', () => ({
  default: { get: vi.fn(async () => null), set: vi.fn(async () => 'OK'), setex: vi.fn(async () => 'OK'), del: vi.fn(async () => 1) },
  singleFlight: async (_k: string, f: () => Promise<unknown>) => f(),
  jitter: (n: number) => n,
}));
vi.mock('@nb/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('@nb/setting/server/setting.service', () => ({ default: { getValue: vi.fn(async () => null) } }));

import IyzicoProvider from '../providers/iyzico.provider';
import StripeProvider from '../providers/stripe.provider';
import PaypalProvider from '../providers/paypal.provider';
import PaymentService from '../payment.service';
import { WalletDescriptorSchema } from '../payment.enums';

describe('provider supportedWallets', () => {
  it('iyzico surfaces MasterPass + BKM Express via hosted redirect', () => {
    const wallets = new IyzicoProvider().supportedWallets;
    const methods = wallets.map((d) => d.method);
    expect(methods).toEqual(expect.arrayContaining(['MASTERPASS', 'BKM_EXPRESS', 'SAVED_CARD', 'INSTALLMENT']));
    expect(wallets.find((d) => d.method === 'MASTERPASS')?.delivery).toBe('HOSTED_REDIRECT');
    wallets.forEach((d) => expect(WalletDescriptorSchema.safeParse(d).success).toBe(true));
  });

  it('stripe surfaces Apple/Google Pay + Click to Pay via client element', () => {
    const wallets = new StripeProvider().supportedWallets;
    const methods = wallets.map((d) => d.method);
    expect(methods).toEqual(expect.arrayContaining(['APPLE_PAY', 'GOOGLE_PAY', 'CLICK_TO_PAY', 'LINK']));
    expect(wallets.find((d) => d.method === 'APPLE_PAY')?.delivery).toBe('CLIENT_ELEMENT');
  });

  it('paypal surfaces the PayPal wallet', () => {
    expect(new PaypalProvider().supportedWallets.map((d) => d.method)).toContain('PAYPAL');
  });
});

describe('PaymentService wallet capability', () => {
  it('getSupportedWallets routes to the provider', () => {
    expect(PaymentService.getSupportedWallets('IYZICO').map((d) => d.method)).toContain('MASTERPASS');
    expect(PaymentService.getSupportedWallets('STRIPE').map((d) => d.method)).toContain('CLICK_TO_PAY');
  });

  it('getWalletMatrix covers every registered provider', () => {
    const matrix = PaymentService.getWalletMatrix();
    const providers = matrix.map((row) => row.provider);
    expect(providers).toEqual(expect.arrayContaining(['STRIPE', 'PAYPAL', 'IYZICO']));
    const iyzico = matrix.find((row) => row.provider === 'IYZICO');
    expect(iyzico?.wallets.map((w) => w.method)).toContain('BKM_EXPRESS');
  });
});
