import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import Logger from '@/modules/logger';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import WebhookService from '@/modules/webhook/webhook.service';
import { WalletService } from '@/modules/wallet';
import InvoiceService from '@/modules/invoice/invoice.service';
import type { CreateInvoiceInput } from '@/modules/invoice/invoice.types';
import { MeteredBillingRun as MeteredBillingRunEntity } from './entities/metered_billing_run.entity';
import type { MeteredBillingRunLine } from './entities/metered_billing_run.entity';
import MeterCrudService from './metering.meter.service';
import MeteringRecordService from './metering.record.service';
import {
  MeteredBillingRunSchema,
  type MeteredBillingRun,
  type OverageComputation,
} from './metering.types';
import type { ListRunsQuery, RunBillingDTO } from './metering.dto';
import { METERING_MESSAGES as MESSAGES } from './metering.messages';
import { DEFAULT_CURRENCY, METERING_BILLING_REFERENCE_TYPE } from './metering.constants';

/**
 * Convert integer minor units to a major-unit decimal number for the invoice
 * module (whose line `unitPrice` is a `number` / decimal). Minor units are
 * hundredths of the major unit (cents). BigInt math first, divide last, so we
 * never lose precision before the final, single float conversion.
 */
function minorToMajor(minor: bigint): number {
  const whole = minor / BigInt(100);
  const frac = minor % BigInt(100);
  return Number(whole) + Number(frac) / 100;
}

export default class MeteredBillingService {
  /**
   * Compute the overage for a subject in a period: per active meter, `used` is
   * the authoritative aggregate, `billable = max(0, used - included)`, and
   * `amount = billable * unitPriceMinor`. Only meters priced in the run's
   * currency contribute (a run settles a single currency — the currency of the
   * first billable meter, then matching meters).
   */
  static async computeOverage(
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

  /**
   * THE TWO-RAIL SETTLEMENT. Idempotent on `idempotencyKey` (replay returns the
   * existing run, never double-charges).
   *
   *  1. computeOverage. If total is 0 → persist a COMPLETED zero run, return.
   *  2. WALLET FIRST: debit `min(walletBalance, total)` of prepaid credits via
   *     `WalletService.spend` (referenceType METERING_BILLING, referenceId =
   *     billingRunId, derived idempotencyKey). Records walletDebitedMinor +
   *     walletTransactionId. Only attempted when a wallet owner is resolvable.
   *  3. REMAINDER → INVOICE: if anything is left, create a *draft* invoice with
   *     one usage line per billable meter; record invoicedMinor + invoiceId.
   *  4. Persist the run COMPLETED. Any failure marks it FAILED + rethrows.
   *
   * Fires `metering.billing.completed` (fire-and-forget) on success.
   */
  static async runBilling(tenantId: string, dto: RunBillingDTO): Promise<MeteredBillingRun> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(MeteredBillingRunEntity);
    const subjectId = dto.subjectId ?? null;

    // ── Idempotent replay ────────────────────────────────────────────────────
    if (dto.idempotencyKey) {
      const existing = await repo.findOne({
        where: { tenantId, idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return MeteredBillingRunSchema.parse(existing);
    }

    const overage = await MeteredBillingService.computeOverage(tenantId, {
      subjectType: dto.subjectType,
      subjectId,
      periodKey: dto.periodKey,
    });
    const total = BigInt(overage.totalMinor);

    // Pre-allocate the run id so wallet/invoice references point at this run.
    const run = repo.create({
      tenantId,
      subjectType: dto.subjectType,
      subjectId,
      periodKey: dto.periodKey,
      status: 'PENDING',
      lines: overage.lines,
      currency: overage.currency,
      totalMinor: total,
      walletDebitedMinor: BigInt(0),
      invoicedMinor: BigInt(0),
      walletTransactionId: null,
      invoiceId: null,
      idempotencyKey: dto.idempotencyKey ?? null,
      error: null,
    });

    // ── Nothing to bill ──────────────────────────────────────────────────────
    if (total === BigInt(0)) {
      run.status = 'COMPLETED';
      const saved = await MeteredBillingService.persist(repo, run);
      void MeteredBillingService.fireCompleted(tenantId, saved);
      return MeteredBillingRunSchema.parse(saved);
    }

    // Persist as PENDING first so a mid-flight crash leaves an auditable row.
    let persisted: MeteredBillingRunEntity;
    try {
      persisted = await MeteredBillingService.persist(repo, run);
    } catch (error) {
      // Lost an idempotency race on the unique index — replay the winner.
      if ((error as { code?: string }).code === '23505' && dto.idempotencyKey) {
        const row = await repo.findOne({ where: { tenantId, idempotencyKey: dto.idempotencyKey } });
        if (row) return MeteredBillingRunSchema.parse(row);
      }
      throw error;
    }

    try {
      let remaining = total;

      // ── RAIL 1: prepaid wallet credits ─────────────────────────────────────
      const walletUserId =
        dto.walletUserId ?? (dto.subjectType === 'USER' ? subjectId : null);
      if (walletUserId) {
        const wallet = await WalletService.getOrCreateUserWallet(
          tenantId,
          walletUserId,
          overage.currency,
        );
        const balance = BigInt(wallet.cachedBalance);
        const debit = balance < remaining ? balance : remaining;
        if (debit > BigInt(0)) {
          const txn = await WalletService.spend(tenantId, {
            userId: walletUserId,
            amount: debit.toString(),
            currency: overage.currency,
            referenceType: METERING_BILLING_REFERENCE_TYPE,
            referenceId: persisted.billingRunId,
            description: `Metered usage overage ${dto.periodKey}`,
            idempotencyKey: `metering:${persisted.billingRunId}:wallet`,
          });
          persisted.walletDebitedMinor = debit;
          persisted.walletTransactionId = txn.walletTransactionId;
          remaining -= debit;
        }
      }

      // ── RAIL 2: invoice the remainder ──────────────────────────────────────
      if (remaining > BigInt(0)) {
        if (!dto.customerEmail || !dto.customerName || !dto.customerCountryCode) {
          throw new AppError(
            MESSAGES.INVOICE_CUSTOMER_REQUIRED,
            422,
            ErrorCode.VALIDATION_ERROR,
          );
        }

        // When the wallet covered part of the total, scale each line down so
        // the invoice's lines sum to exactly `remaining`. We allocate the
        // remainder proportionally and assign the rounding drift to the last
        // billable line so the invoice total is exact.
        const lines = MeteredBillingService.scaleLines(overage.lines, total, remaining);

        // Lines omit `taxRate` on purpose so the invoice module's tax engine
        // resolves the destination tax itself (supplying any rate would flip it
        // into manual mode). `CreateInvoiceInputSchema.parse` defaults the rate
        // inside `create`; the cast bridges z.infer's output-type view of the
        // line array (which lists `taxRate` as required).
        const invoiceInput = {
          customerEmail: dto.customerEmail,
          customerName: dto.customerName,
          customerCountryCode: dto.customerCountryCode.toUpperCase(),
          currency: overage.currency,
          subscriptionId: dto.subjectType === 'SUBSCRIPTION' && subjectId ? subjectId : undefined,
          lines: lines.map((l) => ({
            description: l.description,
            quantity: 1,
            unitPrice: minorToMajor(BigInt(l.amountMinor)),
            sourceType: 'usage' as const,
            sourceId: persisted.billingRunId,
            metadata: { meterKey: l.meterKey, billableQuantity: l.billableQuantity, periodKey: dto.periodKey },
          })),
          metadata: {
            meteringBillingRunId: persisted.billingRunId,
            periodKey: dto.periodKey,
            subjectType: dto.subjectType,
            subjectId,
          },
        } as unknown as CreateInvoiceInput;
        const invoice = await InvoiceService.create(tenantId, invoiceInput);
        persisted.invoicedMinor = remaining;
        persisted.invoiceId = invoice.invoiceId;
        remaining = BigInt(0);
      }

      persisted.status = 'COMPLETED';
      const saved = await MeteredBillingService.persist(repo, persisted);
      void MeteredBillingService.fireCompleted(tenantId, saved);
      return MeteredBillingRunSchema.parse(saved);
    } catch (error) {
      persisted.status = 'FAILED';
      persisted.error = error instanceof Error ? error.message : String(error);
      await MeteredBillingService.persist(repo, persisted).catch(() => {});
      if (!(error instanceof AppError)) {
        Logger.error(`${MESSAGES.BILLING_FAILED}: ${error}`);
        throw new AppError(MESSAGES.BILLING_FAILED, 500, ErrorCode.INTERNAL_ERROR);
      }
      throw error;
    }
  }

  static async listRuns(
    tenantId: string,
    query: ListRunsQuery,
  ): Promise<{ data: MeteredBillingRun[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId);
    const where: Record<string, unknown> = { tenantId };
    if (query.subjectId) where.subjectId = query.subjectId;
    if (query.periodKey) where.periodKey = query.periodKey;
    if (query.status) where.status = query.status;
    const [rows, total] = await ds.getRepository(MeteredBillingRunEntity).findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    });
    return { data: rows.map((r) => MeteredBillingRunSchema.parse(r)), total };
  }

  static async getRun(tenantId: string, billingRunId: string): Promise<MeteredBillingRun> {
    const ds = await tenantDataSourceFor(tenantId);
    const row = await ds
      .getRepository(MeteredBillingRunEntity)
      .findOne({ where: { tenantId, billingRunId } });
    if (!row) throw new AppError(MESSAGES.BILLING_RUN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    return MeteredBillingRunSchema.parse(row);
  }

  // ──────────────────────────────────────────────
  // Internals
  // ──────────────────────────────────────────────

  /** Persist a run row (insert or update) and return the saved entity. */
  private static async persist(
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
  private static scaleLines(
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
  private static fireCompleted(tenantId: string, run: MeteredBillingRunEntity): void {
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
}
