import 'reflect-metadata';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import Logger from '@kuraykaraaslan/logger';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { WalletService } from '@kuraykaraaslan/wallet';
import InvoiceService from '@kuraykaraaslan/invoice/server/invoice.service';
import type { CreateInvoiceInput } from '@kuraykaraaslan/invoice/server/invoice.types';
import { MeteredBillingRun as MeteredBillingRunEntity } from './entities/metered_billing_run.entity';
import { MeteredBillingRunSchema, type MeteredBillingRun } from './metering.types';
import type { RunBillingDTO } from './metering.dto';
import { METERING_MESSAGES as MESSAGES } from './metering.messages';
import { METERING_BILLING_REFERENCE_TYPE } from './metering.constants';
import { computeOverage } from './metering.billing.compute';
import { minorToMajor, persist, scaleLines, fireCompleted } from './metering.billing.helpers';

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
export async function runBilling(tenantId: string, dto: RunBillingDTO): Promise<MeteredBillingRun> {
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

  const overage = await computeOverage(tenantId, {
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
    const saved = await persist(repo, run);
    void fireCompleted(tenantId, saved);
    return MeteredBillingRunSchema.parse(saved);
  }

  // Persist as PENDING first so a mid-flight crash leaves an auditable row.
  let persisted: MeteredBillingRunEntity;
  try {
    persisted = await persist(repo, run);
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
      const lines = scaleLines(overage.lines, total, remaining);

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
    const saved = await persist(repo, persisted);
    void fireCompleted(tenantId, saved);
    return MeteredBillingRunSchema.parse(saved);
  } catch (error) {
    persisted.status = 'FAILED';
    persisted.error = error instanceof Error ? error.message : String(error);
    await persist(repo, persisted).catch(() => {});
    if (!(error instanceof AppError)) {
      Logger.error(`${MESSAGES.BILLING_FAILED}: ${error}`);
      throw new AppError(MESSAGES.BILLING_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
    throw error;
  }
}
