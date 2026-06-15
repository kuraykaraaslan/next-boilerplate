import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockDS, makePaymentRepo, validUuid } from './payment.crud.test-setup';
import PaymentCrudService from '../payment.crud.service';
import { PAYMENT_MESSAGES } from '../payment.messages';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PaymentCrudService.getById', () => {
  it('returns a SafePayment when payment exists', async () => {
    mockDS();
    const result = await PaymentCrudService.getById(validUuid);
    expect(result.paymentId).toBe(validUuid);
  });

  it('throws PAYMENT_NOT_FOUND when payment does not exist', async () => {
    mockDS(makePaymentRepo({ findOne: vi.fn(async () => null) }));
    await expect(PaymentCrudService.getById('nonexistent-id')).rejects.toThrow(
      PAYMENT_MESSAGES.PAYMENT_NOT_FOUND
    );
  });
});

describe('PaymentCrudService.getByIdWithTransactions', () => {
  it('returns payment with transactions array', async () => {
    mockDS();
    const result = await PaymentCrudService.getByIdWithTransactions(validUuid);
    expect(result.paymentId).toBe(validUuid);
    expect(Array.isArray(result.transactions)).toBe(true);
  });

  it('throws PAYMENT_NOT_FOUND when payment is missing', async () => {
    mockDS(makePaymentRepo({ findOne: vi.fn(async () => null) }));
    await expect(PaymentCrudService.getByIdWithTransactions(validUuid)).rejects.toThrow(
      PAYMENT_MESSAGES.PAYMENT_NOT_FOUND
    );
  });
});
