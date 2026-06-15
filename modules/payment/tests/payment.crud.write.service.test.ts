import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockDS, makePaymentRepo, validUuid, mockPayment } from './payment.crud.test-setup';
import PaymentCrudService from '../payment.crud.service';
import { PAYMENT_MESSAGES } from '../payment.messages';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PaymentCrudService.create', () => {
  it('creates a payment and returns a SafePayment', async () => {
    mockDS();
    const result = await PaymentCrudService.create({
      provider: 'STRIPE',
      amount: 99.99,
      currency: 'USD',
    });
    expect(result.paymentId).toBe(validUuid);
    expect(result).not.toHaveProperty('deletedAt');
  });

  it('throws PAYMENT_CREATE_FAILED when repo save fails', async () => {
    mockDS(makePaymentRepo({
      save: vi.fn(async () => { throw new Error('DB error'); }),
    }));

    await expect(
      PaymentCrudService.create({ provider: 'STRIPE', amount: 50, currency: 'USD' })
    ).rejects.toThrow(PAYMENT_MESSAGES.PAYMENT_CREATE_FAILED);
  });
});

describe('PaymentCrudService.update', () => {
  it('updates payment status and returns updated SafePayment', async () => {
    const updatedPayment = { ...mockPayment, status: 'COMPLETED', paidAt: new Date() };
    mockDS(makePaymentRepo({
      findOne: vi.fn()
        .mockResolvedValueOnce(mockPayment)
        .mockResolvedValueOnce(updatedPayment),
    }));

    const result = await PaymentCrudService.update(validUuid, { status: 'COMPLETED' });
    expect(result.status).toBe('COMPLETED');
  });

  it('throws PAYMENT_NOT_FOUND when updating non-existent payment', async () => {
    mockDS(makePaymentRepo({ findOne: vi.fn(async () => null) }));
    await expect(
      PaymentCrudService.update('nonexistent', { status: 'COMPLETED' })
    ).rejects.toThrow(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND);
  });
});

describe('PaymentCrudService.delete', () => {
  it('soft-deletes payment without throwing', async () => {
    const { pRepo } = mockDS();
    await expect(PaymentCrudService.delete(validUuid)).resolves.not.toThrow();
    expect(pRepo.update).toHaveBeenCalledWith(
      { paymentId: validUuid },
      expect.objectContaining({ deletedAt: expect.any(Date) })
    );
  });

  it('throws PAYMENT_NOT_FOUND when payment does not exist', async () => {
    mockDS(makePaymentRepo({ findOne: vi.fn(async () => null) }));
    await expect(PaymentCrudService.delete(validUuid)).rejects.toThrow(
      PAYMENT_MESSAGES.PAYMENT_NOT_FOUND
    );
  });
});
