import { describe, it, expect, beforeEach } from 'vitest';
import { TENANT, resetMeteringMocks, seedMeter } from './metering.test-setup';
import MeteringService from '../metering.service';

let fake: ReturnType<typeof resetMeteringMocks>;

beforeEach(() => {
  fake = resetMeteringMocks();
});

describe('recordEvent — idempotency + aggregation', () => {
  it('(e) replays the same event instead of double-counting', async () => {
    await seedMeter({ included: '0', price: '1' });
    await MeteringService.recordEvent(TENANT, { meterKey: 'api_calls', quantity: '5', subjectType: 'TENANT', idempotencyKey: 'evt-1' });
    await MeteringService.recordEvent(TENANT, { meterKey: 'api_calls', quantity: '5', subjectType: 'TENANT', idempotencyKey: 'evt-1' });
    expect(fake.store.MeteredUsageEvent.length).toBe(1);
  });

  it('MAX aggregation returns the highest single reading', async () => {
    await MeteringService.createMeter(TENANT, {
      key: 'peak_seats', name: 'Peak Seats', unit: 'seat', aggregation: 'MAX',
      unitPriceMinor: '0', currency: 'USD', includedQuantity: '0', active: true,
    });
    await MeteringService.recordEvent(TENANT, { meterKey: 'peak_seats', quantity: '5', subjectType: 'TENANT' });
    await MeteringService.recordEvent(TENANT, { meterKey: 'peak_seats', quantity: '12', subjectType: 'TENANT' });
    await MeteringService.recordEvent(TENANT, { meterKey: 'peak_seats', quantity: '8', subjectType: 'TENANT' });
    const period = (await MeteringService.getUsage(TENANT, {})).periodKey;
    const used = await MeteringService.aggregate(TENANT, 'peak_seats', period);
    expect(used).toBe(BigInt(12));
  });

  it('LAST aggregation returns the most recent reading', async () => {
    await MeteringService.createMeter(TENANT, {
      key: 'gauge', name: 'Gauge', unit: 'gb', aggregation: 'LAST',
      unitPriceMinor: '0', currency: 'USD', includedQuantity: '0', active: true,
    });
    await MeteringService.recordEvent(TENANT, { meterKey: 'gauge', quantity: '3', subjectType: 'TENANT', occurredAt: '2026-06-01T00:00:00.000Z' });
    await MeteringService.recordEvent(TENANT, { meterKey: 'gauge', quantity: '9', subjectType: 'TENANT', occurredAt: '2026-06-10T00:00:00.000Z' });
    const used = await MeteringService.aggregate(TENANT, 'gauge', '2026-06');
    expect(used).toBe(BigInt(9));
  });
});
