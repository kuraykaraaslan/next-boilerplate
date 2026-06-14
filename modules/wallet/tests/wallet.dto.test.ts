import { describe, it, expect } from 'vitest';
import {
  IssueCreditsDTO,
  TransferCreditsDTO,
  PostTransactionDTO,
  PostingEntryDTO,
} from '../wallet.dto';

const A = '660e8400-e29b-41d4-a716-446655440001';
const B = '660e8400-e29b-41d4-a716-446655440002';
const ACC = '770e8400-e29b-41d4-a716-446655440003';
const ACC2 = '770e8400-e29b-41d4-a716-446655440004';

describe('IssueCreditsDTO', () => {
  it('accepts a big amount string and leaves currency unset (service defaults to CREDIT)', () => {
    const r = IssueCreditsDTO.parse({ userId: A, amount: '1000000000000000000000' });
    expect(r.currency).toBeUndefined();
    expect(r.amount).toBe('1000000000000000000000');
  });

  it('rejects a zero amount', () => {
    expect(IssueCreditsDTO.safeParse({ userId: A, amount: '0' }).success).toBe(false);
  });

  it('rejects a non-integer amount', () => {
    expect(IssueCreditsDTO.safeParse({ userId: A, amount: '10.5' }).success).toBe(false);
  });

  it('uppercases a fiat currency', () => {
    const r = IssueCreditsDTO.parse({ userId: A, amount: '500', currency: 'usd' });
    expect(r.currency).toBe('USD');
  });
});

describe('TransferCreditsDTO', () => {
  it('accepts a transfer between two users', () => {
    expect(TransferCreditsDTO.safeParse({ fromUserId: A, toUserId: B, amount: '100' }).success).toBe(true);
  });

  it('rejects a self-transfer', () => {
    expect(TransferCreditsDTO.safeParse({ fromUserId: A, toUserId: A, amount: '100' }).success).toBe(false);
  });
});

describe('PostingEntryDTO / PostTransactionDTO', () => {
  it('allows a signed (negative) entry amount', () => {
    expect(PostingEntryDTO.safeParse({ accountId: ACC, amount: '-100' }).success).toBe(true);
  });

  it('rejects a zero entry amount', () => {
    expect(PostingEntryDTO.safeParse({ accountId: ACC, amount: '0' }).success).toBe(false);
  });

  it('requires at least two entries', () => {
    const r = PostTransactionDTO.safeParse({
      type: 'ADJUSTMENT',
      currency: 'CREDIT',
      entries: [{ accountId: ACC, amount: '100' }],
    });
    expect(r.success).toBe(false);
  });

  it('accepts two balanced-looking entries (sum checked at post time)', () => {
    const r = PostTransactionDTO.safeParse({
      type: 'ADJUSTMENT',
      currency: 'CREDIT',
      entries: [
        { accountId: ACC, amount: '-100' },
        { accountId: ACC2, amount: '100' },
      ],
    });
    expect(r.success).toBe(true);
  });
});
