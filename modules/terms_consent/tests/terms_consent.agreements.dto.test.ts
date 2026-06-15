import { describe, it, expect } from 'vitest';
import {
  CreateAgreementDTO,
  CreateVersionDTO,
  AcceptAgreementDTO,
  ListAcceptancesQuery,
  OrderContextDTO,
  AcceptCheckoutDTO,
  AgreementKeySchema,
} from '../terms_consent.agreements.dto';

describe('AgreementKeySchema', () => {
  it('accepts kebab keys, rejects bad ones', () => {
    expect(AgreementKeySchema.safeParse('distance-selling').success).toBe(true);
    expect(AgreementKeySchema.safeParse('Terms Of Use').success).toBe(false);
    expect(AgreementKeySchema.safeParse('-x').success).toBe(false);
  });
});

describe('CreateAgreementDTO', () => {
  it('requires a valid type + key + title, defaults requiresAcceptance', () => {
    const r = CreateAgreementDTO.parse({ type: 'terms_of_use', key: 'terms', title: 'Terms' });
    expect(r.requiresAcceptance).toBe(true);
  });
  it('rejects an unknown type', () => {
    expect(CreateAgreementDTO.safeParse({ type: 'bogus', key: 'x', title: 'X' }).success).toBe(false);
  });
});

describe('CreateVersionDTO', () => {
  it('requires content, defaults language', () => {
    const r = CreateVersionDTO.parse({ content: 'Hello' });
    expect(r.language).toBe('en');
  });
  it('rejects empty content', () => {
    expect(CreateVersionDTO.safeParse({ content: '' }).success).toBe(false);
  });
});

describe('AcceptAgreementDTO', () => {
  it('requires agreementId or type', () => {
    expect(AcceptAgreementDTO.safeParse({ userId: '00000000-0000-4000-8000-000000000001' }).success).toBe(false);
    expect(
      AcceptAgreementDTO.safeParse({ type: 'terms_of_use', userId: '00000000-0000-4000-8000-000000000001' }).success,
    ).toBe(true);
  });
  it('requires a subject', () => {
    expect(AcceptAgreementDTO.safeParse({ type: 'terms_of_use' }).success).toBe(false);
    expect(AcceptAgreementDTO.safeParse({ type: 'terms_of_use', anonymousId: 'anon-1' }).success).toBe(true);
  });
});

describe('ListAcceptancesQuery', () => {
  it('coerces paging + optional filters', () => {
    const r = ListAcceptancesQuery.parse({ page: '1', pageSize: '10', orderRef: 'ORD-1' });
    expect(r).toMatchObject({ page: 1, pageSize: 10, orderRef: 'ORD-1' });
  });
});

describe('OrderContextDTO / AcceptCheckoutDTO', () => {
  const order = {
    orderRef: 'ORD-1',
    currency: 'TRY',
    total: 100,
    items: [{ name: 'Widget', quantity: 1, unitPrice: 100 }],
    buyer: { name: 'Ada', email: 'ada@example.com' },
  };
  it('accepts a well-formed order', () => {
    expect(OrderContextDTO.safeParse(order).success).toBe(true);
  });
  it('rejects a bad buyer email', () => {
    expect(OrderContextDTO.safeParse({ ...order, buyer: { email: 'not-an-email' } }).success).toBe(false);
  });
  it('AcceptCheckoutDTO needs an order', () => {
    expect(AcceptCheckoutDTO.safeParse({ order, anonymousId: 'anon-1' }).success).toBe(true);
    expect(AcceptCheckoutDTO.safeParse({ anonymousId: 'anon-1' }).success).toBe(false);
  });
});
