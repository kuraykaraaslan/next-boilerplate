import 'reflect-metadata';
import type { MeteredBillingRunLine } from './entities/metered_billing_run.entity';
import MeterCrudService from './metering.meter.service';
import MeteringRecordService from './metering.record.service';
import type { OverageComputation } from './metering.types';
import { DEFAULT_CURRENCY } from './metering.constants';

/**
 * Compute the overage for a subject in a period: per active meter, `used` is
 * the authoritative aggregate, `billable = max(0, used - included)`, and
 * `amount = billable * unitPriceMinor`. Only meters priced in the run's
 * currency contribute (a run settles a single currency — the currency of the
 * first billable meter, then matching meters).
 */
export async function computeOverage(
  tenantId: string,
  args: { subjectType: string; subjectId: string | null; periodKey: string },
): Promise<OverageComputation> {
  const meters = await MeterCrudService.listActiveMeters(tenantId);

  // Group billable lines by currency, then pick the currency with the largest
  // total so a mixed-currency tenant still settles its dominant currency.
  const byCurrency = new Map<string, { lines: MeteredBillingRunLine[]; total: bigint }>();

  for (const meter of meters) {
    const used = await MeteringRecordService.aggregate(
      tenantId,
      meter.key,
      args.periodKey,
      args.subjectId,
    );
    const included = BigInt(meter.includedQuantity);
    const billable = used > included ? used - included : BigInt(0);
    if (billable === BigInt(0)) continue;
    const unitPrice = BigInt(meter.unitPriceMinor);
    const amount = billable * unitPrice;
    if (amount === BigInt(0)) continue; // free meter — metered but not charged

    const bucket = byCurrency.get(meter.currency) ?? { lines: [], total: BigInt(0) };
    bucket.lines.push({
      meterKey: meter.key,
      usedQuantity: used.toString(),
      includedQuantity: included.toString(),
      billableQuantity: billable.toString(),
      unitPriceMinor: unitPrice.toString(),
      amountMinor: amount.toString(),
    });
    bucket.total += amount;
    byCurrency.set(meter.currency, bucket);
  }

  if (byCurrency.size === 0) {
    return { currency: DEFAULT_CURRENCY, lines: [], totalMinor: '0' };
  }

  let chosenCurrency = DEFAULT_CURRENCY;
  let chosen = { lines: [] as MeteredBillingRunLine[], total: BigInt(0) };
  for (const [cur, bucket] of byCurrency) {
    if (bucket.total > chosen.total) {
      chosen = bucket;
      chosenCurrency = cur;
    }
  }

  return { currency: chosenCurrency, lines: chosen.lines, totalMinor: chosen.total.toString() };
}
