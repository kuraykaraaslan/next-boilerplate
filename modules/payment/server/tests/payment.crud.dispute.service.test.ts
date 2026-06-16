import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockDS, makePaymentRepo, validUuid, mockPayment } from './payment.crud.test-setup';
import PaymentCrudService from '../payment.crud.service';
import { PAYMENT_MESSAGES } from '../payment.messages';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PaymentCrudService.createTransaction', () => {
  it('creates a transaction when payment exists', async () => {
    mockDS();
    const result = await PaymentCrudService.createTransaction({
      paymentId: validUuid,
      provider: 'STRIPE',
      type: 'PAYMENT',
      amount: 99.99,
      currency: 'USD',
    });
    expect(result.paymentId).toBe(validUuid);
    expect(result.type).toBe('PAYMENT');
  });

  it('throws PAYMENT_NOT_FOUND when payment does not exist', async () => {
    mockDS(makePaymentRepo({ findOne: vi.fn(async () => null) }));
    await expect(
      PaymentCrudService.createTransaction({
        paymentId: validUuid,
        provider: 'STRIPE',
        type: 'PAYMENT',
        amount: 50,
        currency: 'USD',
      })
    ).rejects.toThrow(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND);
  });
});

describe('PaymentCrudService.refund', () => {
  it('throws PAYMENT_NOT_FOUND when payment does not exist', async () => {
    mockDS(makePaymentRepo({ findOne: vi.fn(async () => null) }));
    await expect(
      PaymentCrudService.refund({ paymentId: validUuid })
    ).rejects.toThrow(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND);
  });

  it('throws REFUND_NOT_ALLOWED when payment status is not COMPLETED', async () => {
    mockDS(makePaymentRepo({ findOne: vi.fn(async () => ({ ...mockPayment, status: 'PENDING' })) }));
    await expect(
      PaymentCrudService.refund({ paymentId: validUuid })
    ).rejects.toThrow(PAYMENT_MESSAGES.REFUND_NOT_ALLOWED);
  });

  it('throws REFUND_AMOUNT_EXCEEDS_PAYMENT when refund exceeds payment amount', async () => {
    const completedPayment = { ...mockPayment, status: 'COMPLETED', amount: 50, refundedAmount: 0 };
    mockDS(makePaymentRepo({ findOne: vi.fn(async () => completedPayment) }));
    await expect(
      PaymentCrudService.refund({ paymentId: validUuid, amount: 200 })
    ).rejects.toThrow(PAYMENT_MESSAGES.REFUND_AMOUNT_EXCEEDS_PAYMENT);
  });
});
