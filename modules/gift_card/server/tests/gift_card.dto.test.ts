import { describe, it, expect } from 'vitest';
import {
  IssueGiftCardRequestSchema,
  RedeemGiftCardRequestSchema,
  AdjustGiftCardRequestSchema,
  GetGiftCardsQuerySchema,
} from '../gift_card.dto';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('IssueGiftCardRequestSchema', () => {
  const valid = { amount: 5000, currency: 'usd' };

  it('accepts a valid issue request and uppercases currency', () => {
    const result = IssueGiftCardRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe('USD');
      expect(result.data.quantity).toBe(1); // default
    }
  });

  it('rejects non-positive amount', () => {
    expect(IssueGiftCardRequestSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
    expect(IssueGiftCardRequestSchema.safeParse({ ...valid, amount: -100 }).success).toBe(false);
  });

  it('rejects non-integer amount (minor units only)', () => {
    expect(IssueGiftCardRequestSchema.safeParse({ ...valid, amount: 12.5 }).success).toBe(false);
  });

  it('caps bulk quantity at 500', () => {
    expect(IssueGiftCardRequestSchema.safeParse({ ...valid, quantity: 501 }).success).toBe(false);
  });
});

describe('RedeemGiftCardRequestSchema', () => {
  it('uppercases and trims the code', () => {
    const result = RedeemGiftCardRequestSchema.safeParse({ code: '  gc-abc1-def2-ghj3 ', userId: USER_ID });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.code).toBe('GC-ABC1-DEF2-GHJ3');
  });

  it('requires a valid userId', () => {
    expect(RedeemGiftCardRequestSchema.safeParse({ code: 'GC-1', userId: 'nope' }).success).toBe(false);
  });

  it('allows optional partial amount', () => {
    const result = RedeemGiftCardRequestSchema.safeParse({ code: 'GC-1', userId: USER_ID, amount: 250 });
    expect(result.success).toBe(true);
  });
});

describe('AdjustGiftCardRequestSchema', () => {
  it('accepts a non-zero signed delta', () => {
    expect(AdjustGiftCardRequestSchema.safeParse({ delta: -500 }).success).toBe(true);
    expect(AdjustGiftCardRequestSchema.safeParse({ delta: 500 }).success).toBe(true);
  });

  it('rejects a zero delta', () => {
    expect(AdjustGiftCardRequestSchema.safeParse({ delta: 0 }).success).toBe(false);
  });
});

describe('GetGiftCardsQuerySchema', () => {
  it('applies pagination defaults', () => {
    const result = GetGiftCardsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(0);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it('rejects an unknown status', () => {
    expect(GetGiftCardsQuerySchema.safeParse({ status: 'BOGUS' }).success).toBe(false);
  });
});
