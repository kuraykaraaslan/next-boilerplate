import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@kuraykaraaslan/env', () => ({
  env: {
    PAYMENT_DEFAULT_PROVIDER: 'STRIPE',
  },
}));

vi.mock('@kuraykaraaslan/redis', () => ({
  default: {
    get: vi.fn(async () => null),
    setex: vi.fn(async () => 'OK'),
    del: vi.fn(async () => 1),
  },
  jitter: (n: number) => n,
}));

vi.mock('@kuraykaraaslan/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    customers: { create: vi.fn(), retrieve: vi.fn() },
    paymentIntents: { create: vi.fn(), retrieve: vi.fn() },
  })),
}));

vi.mock('../providers/stripe.provider', () => ({
  default: class MockStripeProvider {
    name = 'STRIPE';
    supportedWallets = [];
    supportsDirectCardPayment = false;
    supports3dsCardPayment = false;
    async getPaymentStatus() { return { status: 'succeeded' }; }
    async createCheckoutSession() {
      return { sessionId: 'cs_test_123', checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_123' };
    }
    async checkBin() { return { supported: false }; }
    async createCustomerPortalSession() { return { url: null }; }
    async createPaymentIntent() { return { clientSecret: 'pi_test_secret' }; }
  },
}));

vi.mock('../providers/paypal.provider', () => ({
  default: class MockPaypalProvider {
    name = 'PAYPAL';
    supportedWallets = [];
    supportsDirectCardPayment = false;
    supports3dsCardPayment = false;
    async getPaymentStatus() { return { status: 'COMPLETED' }; }
    async createCheckoutSession() {
      return { sessionId: 'pp_order_123', checkoutUrl: 'https://paypal.com/pay/pp_order_123' };
    }
    async checkBin() { return { supported: false }; }
    async createCustomerPortalSession() { return { url: null }; }
    async createPaymentIntent() { return { clientSecret: null }; }
  },
}));

vi.mock('../providers/iyzico.provider', () => ({
  default: class MockIyzicoProvider {
    name = 'IYZICO';
    supportedWallets = [];
    supportsDirectCardPayment = false;
    supports3dsCardPayment = false;
    async getPaymentStatus() { return { status: 'SUCCESS' }; }
    async createCheckoutSession() {
      return { sessionId: 'iyzico_123', checkoutUrl: 'https://sandbox-api.iyzipay.com/pay' };
    }
    async checkBin() { return { supported: false }; }
    async createCustomerPortalSession() { return { url: null }; }
    async createPaymentIntent() { return { clientSecret: null }; }
  },
}));

vi.mock('../providers/alipay.provider', () => ({
  default: class { name = 'ALIPAY'; supportedWallets = []; supportsDirectCardPayment = false; supports3dsCardPayment = false; async checkBin() { return { supported: false }; } async createCustomerPortalSession() { return { url: null }; } async createPaymentIntent() { return { clientSecret: null }; } },
}));
vi.mock('../providers/wechatpay.provider', () => ({
  default: class { name = 'WECHATPAY'; supportedWallets = []; supportsDirectCardPayment = false; supports3dsCardPayment = false; async checkBin() { return { supported: false }; } async createCustomerPortalSession() { return { url: null }; } async createPaymentIntent() { return { clientSecret: null }; } },
}));
vi.mock('../providers/yookassa.provider', () => ({
  default: class { name = 'YOOKASSA'; supportedWallets = []; supportsDirectCardPayment = false; supports3dsCardPayment = false; async checkBin() { return { supported: false }; } async createCustomerPortalSession() { return { url: null }; } async createPaymentIntent() { return { clientSecret: null }; } },
}));
vi.mock('../providers/cloudpayments.provider', () => ({
  default: class { name = 'CLOUDPAYMENTS'; supportedWallets = []; supportsDirectCardPayment = false; supports3dsCardPayment = false; async checkBin() { return { supported: false }; } async createCustomerPortalSession() { return { url: null }; } async createPaymentIntent() { return { clientSecret: null }; } },
}));

import PaymentCheckoutService from '../payment.checkout.service';
import { PAYMENT_MESSAGES } from '../payment.messages';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PaymentCheckoutService.getAvailableProviders', () => {
  it('returns STRIPE, PAYPAL, IYZICO', () => {
    const providers = PaymentCheckoutService.getAvailableProviders();
    expect(providers).toContain('STRIPE');
    expect(providers).toContain('PAYPAL');
    expect(providers).toContain('IYZICO');
  });
});

describe('PaymentCheckoutService.getDefaultProvider', () => {
  it('returns STRIPE as default', () => {
    expect(PaymentCheckoutService.getDefaultProvider()).toBe('STRIPE');
  });
});

describe('PaymentCheckoutService.createCheckoutSession', () => {
  it('delegates to the Stripe provider by default', async () => {
    const result = await PaymentCheckoutService.createCheckoutSession(TENANT_ID, {
      amount: 100,
      currency: 'USD',
      description: 'Test payment',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    });
    expect(result.sessionId).toBe('cs_test_123');
    expect(result.checkoutUrl).toContain('stripe.com');
  });

  it('delegates to PayPal provider when specified', async () => {
    const result = await PaymentCheckoutService.createCheckoutSession(
      TENANT_ID,
      {
        amount: 100,
        currency: 'USD',
        description: 'Test payment',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      },
      'PAYPAL',
    );
    expect(result.sessionId).toBe('pp_order_123');
  });

  it('throws when provider name is invalid', async () => {
    await expect(
      PaymentCheckoutService.createCheckoutSession(
        TENANT_ID,
        { amount: 100, currency: 'USD', description: 'Test', successUrl: '', cancelUrl: '' },
        'UNKNOWN' as any,
      )
    ).rejects.toThrow(PAYMENT_MESSAGES.PROVIDER_NOT_FOUND);
  });
});

describe('PaymentCheckoutService.getProvider', () => {
  it('throws PROVIDER_NOT_FOUND for unknown provider', () => {
    expect(() => PaymentCheckoutService.getProvider('UNKNOWN' as any)).toThrow(
      PAYMENT_MESSAGES.PROVIDER_NOT_FOUND,
    );
  });
});
