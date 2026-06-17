import Logger from '@kuraykaraaslan/logger';
import WebhookService from '@kuraykaraaslan/webhook/server/webhook.service';
import { MeteredBillingRun as MeteredBillingRunEntity } from './entities/metered_billing_run.entity';
import type { MeteredBillingRunLine } from './entities/metered_billing_run.entity';

/**
 * Convert integer minor units to a major-unit decimal number for the invoice
 * module (whose line `unitPrice` is a `number` / decimal). Minor units are
 * hundredths of the major unit (cents). BigInt math first, divide last, so we
 * never lose precision before the final, single float conversion.
 */
export function minorToMajor(minor: bigint): number {
  const whole = minor / BigInt(100);
  const frac = minor % BigInt(100);
  return Number(whole) + Number(frac) / 100;
}

/** Persist a run row (insert or update) and return the saved entity. */
export async function persist(
  repo: { save: (e: MeteredBillingRunEntity) => Promise<MeteredBillingRunEntity> },
  run: MeteredBillingRunEntity,
): Promise<MeteredBillingRunEntity> {
  return repo.save(run);
}

/**
 * Scale billable lines so their `amountMinor` sums to `remaining` instead of
 * `total` (used when a partial wallet debit already covered some of the
 * overage). Proportional allocation; the last line absorbs rounding drift so
 * the invoice total is exact to the minor unit.
 */
export function scaleLines(
  lines: MeteredBillingRunLine[],
  total: bigint,
  remaining: bigint,
): { description: string; amountMinor: string; meterKey: string; billableQuantity: string }[] {
  const out: { description: string; amountMinor: string; meterKey: string; billableQuantity: string }[] = [];
  if (remaining === total) {
    for (const l of lines) {
      out.push({
        description: `${l.meterKey} overage: ${l.billableQuantity} @ ${l.unitPriceMinor}`,
        amountMinor: l.amountMinor,
        meterKey: l.meterKey,
        billableQuantity: l.billableQuantity,
      });
    }
    return out;
  }
  let allocated = BigInt(0);
  for (let i = 0; i < lines.length; i += 1) {
    const l = lines[i];
    const isLast = i === lines.length - 1;
    const share = isLast
      ? remaining - allocated
      : (BigInt(l.amountMinor) * remaining) / total;
    allocated += share;
    out.push({
      description: `${l.meterKey} overage: ${l.billableQuantity} @ ${l.unitPriceMinor}`,
      amountMinor: share.toString(),
      meterKey: l.meterKey,
      billableQuantity: l.billableQuantity,
    });
  }
  return out;
}

/** Fire-and-forget the billing-completed webhook after a successful run. */
export function fireCompleted(tenantId: string, run: MeteredBillingRunEntity): void {
  void WebhookService.dispatchEvent(tenantId, 'metering.billing.completed', {
    billingRunId: run.billingRunId,
    subjectType: run.subjectType,
    subjectId: run.subjectId,
    periodKey: run.periodKey,
    currency: run.currency,
    totalMinor: run.totalMinor.toString(),
    walletDebitedMinor: run.walletDebitedMinor.toString(),
    invoicedMinor: run.invoicedMinor.toString(),
    invoiceId: run.invoiceId,
  }).catch((err) => Logger.error(`[metering] webhook dispatch failed: ${err}`));
}
