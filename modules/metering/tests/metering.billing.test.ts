import { describe, it, expect, beforeEach } from 'vitest';
import {
  TENANT, USER, walletState, spendMock, createInvoiceMock,
  resetMeteringMocks, seedMeter,
} from './metering.test-setup';
import MeteringService from '../metering.service';

let fake: ReturnType<typeof resetMeteringMocks>;

beforeEach(() => {
  fake = resetMeteringMocks();
});

describe('runBilling — two-rail settlement', () => {
  it('(a) usage below included allowance bills nothing', async () => {
    await seedMeter({ included: '100', price: '2' });
    await MeteringService.recordEvent(TENANT, { meterKey: 'api_calls', quantity: '50', subjectType: 'TENANT' });

    const period = (await MeteringService.getUsage(TENANT, {})).periodKey;
    const run = await MeteringService.runBilling(TENANT, { subjectType: 'TENANT', periodKey: period });

    expect(run.status).toBe('COMPLETED');
    expect(run.totalMinor).toBe('0');
    expect(run.walletDebitedMinor).toBe('0');
    expect(run.invoicedMinor).toBe('0');
    expect(spendMock).not.toHaveBeenCalled();
    expect(createInvoiceMock).not.toHaveBeenCalled();
  });

  it('(b) wallet fully covers the overage — no invoice', async () => {
    await seedMeter({ included: '100', price: '2' });
    // used 200 → billable 100 → amount 200
    await MeteringService.recordEvent(TENANT, { meterKey: 'api_calls', quantity: '200', subjectType: 'USER', subjectId: USER });
    walletState.balance = BigInt(1000); // plenty

    const period = (await MeteringService.getUsage(TENANT, {})).periodKey;
    const run = await MeteringService.runBilling(TENANT, {
      subjectType: 'USER',
      subjectId: USER,
      periodKey: period,
    });

    expect(run.status).toBe('COMPLETED');
    expect(run.totalMinor).toBe('200');
    expect(run.walletDebitedMinor).toBe('200');
    expect(run.invoicedMinor).toBe('0');
    expect(run.invoiceId).toBeNull();
    expect(spendMock).toHaveBeenCalledTimes(1);
    expect(createInvoiceMock).not.toHaveBeenCalled();
  });

  it('(c) wallet partially covers — wallet debited + invoice for remainder', async () => {
    await seedMeter({ included: '100', price: '2' });
    await MeteringService.recordEvent(TENANT, { meterKey: 'api_calls', quantity: '200', subjectType: 'USER', subjectId: USER });
    walletState.balance = BigInt(50); // covers 50 of 200

    const period = (await MeteringService.getUsage(TENANT, {})).periodKey;
    const run = await MeteringService.runBilling(TENANT, {
      subjectType: 'USER',
      subjectId: USER,
      periodKey: period,
      customerEmail: 'cust@example.com',
      customerName: 'Acme',
      customerCountryCode: 'US',
    });

    expect(run.status).toBe('COMPLETED');
    expect(run.totalMinor).toBe('200');
    expect(run.walletDebitedMinor).toBe('50');
    expect(run.invoicedMinor).toBe('150');
    expect(run.invoiceId).not.toBeNull();
    expect(spendMock).toHaveBeenCalledTimes(1);
    expect(createInvoiceMock).toHaveBeenCalledTimes(1);
    // The invoice line(s) must sum to the remainder in major units (150 minor = 1.5).
    const invoiced = createInvoiceMock.mock.results[0].value as Promise<{ __lines: { unitPrice: number }[] }>;
    const lines = (await invoiced).__lines;
    const sum = lines.reduce((acc, l) => acc + l.unitPrice, 0);
    expect(Math.round(sum * 100)).toBe(150);
  });

  it('(d) idempotent replay returns the same run and does not double-charge', async () => {
    await seedMeter({ included: '100', price: '2' });
    await MeteringService.recordEvent(TENANT, { meterKey: 'api_calls', quantity: '200', subjectType: 'USER', subjectId: USER });
    walletState.balance = BigInt(1000);
    const period = (await MeteringService.getUsage(TENANT, {})).periodKey;

    const run1 = await MeteringService.runBilling(TENANT, {
      subjectType: 'USER', subjectId: USER, periodKey: period, idempotencyKey: 'run-once',
    });
    const run2 = await MeteringService.runBilling(TENANT, {
      subjectType: 'USER', subjectId: USER, periodKey: period, idempotencyKey: 'run-once',
    });

    expect(run2.billingRunId).toBe(run1.billingRunId);
    expect(spendMock).toHaveBeenCalledTimes(1);
    expect(fake.store.MeteredBillingRun.length).toBe(1);
  });

  it('invoices the full overage when no wallet owner is resolvable (TENANT subject)', async () => {
    await seedMeter({ included: '0', price: '5' });
    await MeteringService.recordEvent(TENANT, { meterKey: 'api_calls', quantity: '10', subjectType: 'TENANT' });
    const period = (await MeteringService.getUsage(TENANT, {})).periodKey;

    const run = await MeteringService.runBilling(TENANT, {
      subjectType: 'TENANT',
      periodKey: period,
      customerEmail: 'cust@example.com',
      customerName: 'Acme',
      customerCountryCode: 'US',
    });

    expect(run.totalMinor).toBe('50');
    expect(run.walletDebitedMinor).toBe('0');
    expect(run.invoicedMinor).toBe('50');
    expect(spendMock).not.toHaveBeenCalled();
    expect(createInvoiceMock).toHaveBeenCalledTimes(1);
  });
});
