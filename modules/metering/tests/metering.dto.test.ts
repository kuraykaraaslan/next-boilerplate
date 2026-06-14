import { describe, it, expect } from 'vitest';
import {
  CreateMeterDTO,
  RecordUsageDTO,
  RunBillingDTO,
  GetUsageQuery,
} from '../metering.dto';

const SUBJECT = '660e8400-e29b-41d4-a716-446655440001';

describe('CreateMeterDTO', () => {
  it('accepts a meter with defaults and uppercases currency', () => {
    const r = CreateMeterDTO.parse({ key: 'api_calls', name: 'API Calls', unit: 'request', currency: 'usd' });
    expect(r.aggregation).toBe('SUM');
    expect(r.unitPriceMinor).toBe('0');
    expect(r.includedQuantity).toBe('0');
    expect(r.active).toBe(true);
    expect(r.currency).toBe('USD');
  });

  it('rejects an invalid key (uppercase / spaces)', () => {
    expect(CreateMeterDTO.safeParse({ key: 'API Calls', name: 'x', unit: 'r' }).success).toBe(false);
  });

  it('rejects a non-integer unit price', () => {
    expect(CreateMeterDTO.safeParse({ key: 'k', name: 'x', unit: 'r', unitPriceMinor: '1.5' }).success).toBe(false);
  });

  it('accepts a big integer allowance string', () => {
    const r = CreateMeterDTO.parse({ key: 'k', name: 'x', unit: 'r', includedQuantity: '1000000000000000000000' });
    expect(r.includedQuantity).toBe('1000000000000000000000');
  });
});

describe('RecordUsageDTO', () => {
  it('accepts a positive quantity and defaults subjectType to TENANT', () => {
    const r = RecordUsageDTO.parse({ meterKey: 'api_calls', quantity: '5' });
    expect(r.subjectType).toBe('TENANT');
    expect(r.quantity).toBe('5');
  });

  it('rejects a zero quantity', () => {
    expect(RecordUsageDTO.safeParse({ meterKey: 'api_calls', quantity: '0' }).success).toBe(false);
  });

  it('rejects a non-integer quantity', () => {
    expect(RecordUsageDTO.safeParse({ meterKey: 'api_calls', quantity: '1.5' }).success).toBe(false);
  });

  it('rejects a bad ISO occurredAt', () => {
    expect(RecordUsageDTO.safeParse({ meterKey: 'api_calls', quantity: '1', occurredAt: 'yesterday' }).success).toBe(false);
  });
});

describe('RunBillingDTO', () => {
  it('accepts a valid period key', () => {
    const r = RunBillingDTO.parse({ subjectType: 'USER', subjectId: SUBJECT, periodKey: '2026-06' });
    expect(r.periodKey).toBe('2026-06');
    expect(r.subjectType).toBe('USER');
  });

  it('rejects a malformed period key', () => {
    expect(RunBillingDTO.safeParse({ periodKey: '2026-13' }).success).toBe(false);
    expect(RunBillingDTO.safeParse({ periodKey: '2026/06' }).success).toBe(false);
  });

  it('rejects an invalid customer email when supplied', () => {
    expect(
      RunBillingDTO.safeParse({ periodKey: '2026-06', customerEmail: 'not-an-email' }).success,
    ).toBe(false);
  });
});

describe('GetUsageQuery', () => {
  it('is valid empty (current period, all meters)', () => {
    expect(GetUsageQuery.safeParse({}).success).toBe(true);
  });

  it('rejects a bad subjectType', () => {
    expect(GetUsageQuery.safeParse({ subjectType: 'ROBOT' }).success).toBe(false);
  });
});
