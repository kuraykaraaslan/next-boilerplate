import 'reflect-metadata';
import type { Repository } from 'typeorm';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import Logger from '@kuraykaraaslan/logger';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { WalletService } from '@kuraykaraaslan/wallet';
import InvoiceService from '@kuraykaraaslan/invoice/server/invoice.service';
import type { CreateInvoiceInput } from '@kuraykaraaslan/invoice/server/invoice.types';
import { MeteredBillingRun as MeteredBillingRunEntity } from './entities/metered_billing_run.entity';
import { MeteredBillingRunSchema, type MeteredBillingRun } from './metering.types';
import type { BillRunDTO, CreateRunDTO } from './metering.dto';
import { METERING_MESSAGES as MESSAGES } from './metering.messages';
import { METERING_BILLING_REFERENCE_TYPE, DEFAULT_CURRENCY } from './metering.constants';
import { computeOverage } from './metering.billing.compute';
import { minorToMajor, persist, scaleLines, fireCompleted } from './metering.billing.helpers';

/**
 * The billing-run *document* workflow: DRAFT → CALCULATED → BILLED. Unlike the
 * one-shot `runBilling`, this lets an operator open a run, derive (calculate)
 * the per-meter lines, review them, then settle (bill) on demand — mirroring a
 * sales order's draft → confirm → fulfill lifecycle. Usage-event lines are
 * read-only (re-derived by `calculate`, never hand-edited).
 */
export default class MeteredBillingWorkflowService {
  /** Open a new run in DRAFT — nothing computed, nothing charged. */
  static async createRun(tenantId: string, dto: CreateRunDTO): Promise<MeteredBillingRun> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(MeteredBillingRunEntity);
    const saved = await repo.save(
      repo.create({
        tenantId,
        subjectType: dto.subjectType,
        subjectId: dto.subjectId ?? null,
        periodKey: dto.periodKey,
        status: 'DRAFT',
        lines: null,
        currency: DEFAULT_CURRENCY,
        totalMinor: BigInt(0),
        walletDebitedMinor: BigInt(0),
        invoicedMinor: BigInt(0),
        walletTransactionId: null,
        invoiceId: null,
        idempotencyKey: null,
        error: null,
      }),
    );
    return MeteredBillingRunSchema.parse(saved);
  }

  /** Load a run row (raises 404 when absent) for a workflow transition. */
  private static async loadRun(
    tenantId: string,
    billingRunId: string,
  ): Promise<{ repo: Repository<MeteredBillingRunEntity>; run: MeteredBillingRunEntity }> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(MeteredBillingRunEntity);
    const run = await repo.findOne({ where: { tenantId, billingRunId } });
    if (!run) throw new AppError(MESSAGES.BILLING_RUN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    return { repo, run };
  }

  /**
   * DRAFT → CALCULATED. Re-derives the per-meter overage snapshot for the run's
   * subject/period and stamps `lines`, `currency` and `totalMinor`. Idempotent
   * by design — recalculating a CALCULATED run is allowed (refreshes the lines).
   */
  static async calculateRun(tenantId: string, billingRunId: string): Promise<MeteredBillingRun> {
    const { repo, run } = await MeteredBillingWorkflowService.loadRun(tenantId, billingRunId);
    if (run.status !== 'DRAFT' && run.status !== 'CALCULATED') {
      throw new AppError(MESSAGES.RUN_NOT_DRAFT, 409, ErrorCode.CONFLICT);
    }
    const overage = await computeOverage(tenantId, {
      subjectType: run.subjectType,
      subjectId: run.subjectId,
      periodKey: run.periodKey,
    });
    run.lines = overage.lines;
    run.currency = overage.currency;
    run.totalMinor = BigInt(overage.totalMinor);
    run.status = 'CALCULATED';
    run.error = null;
    const saved = await persist(repo, run);
    return MeteredBillingRunSchema.parse(saved);
  }

  /**
   * CALCULATED → BILLED. Settles the calculated total on the two-rail model:
   * prepaid wallet credits first, the remainder invoiced as a draft. Marks the
   * run FAILED + rethrows on any settlement error.
   */
  static async billRun(
    tenantId: string,
    billingRunId: string,
    dto: BillRunDTO,
  ): Promise<MeteredBillingRun> {
    const { repo, run } = await MeteredBillingWorkflowService.loadRun(tenantId, billingRunId);
    if (run.status !== 'CALCULATED') {
      throw new AppError(MESSAGES.RUN_NOT_CALCULATED, 409, ErrorCode.CONFLICT);
    }

    const total = run.totalMinor;
    if (total === BigInt(0)) {
      run.status = 'BILLED';
      const saved = await persist(repo, run);
      void fireCompleted(tenantId, saved);
      return MeteredBillingRunSchema.parse(saved);
    }

    try {
      let remaining = total;

      // ── RAIL 1: prepaid wallet credits ─────────────────────────────────────
      const walletUserId = dto.walletUserId ?? (run.subjectType === 'USER' ? run.subjectId : null);
      if (walletUserId) {
        const wallet = await WalletService.getOrCreateUserWallet(tenantId, walletUserId, run.currency);
        const balance = BigInt(wallet.cachedBalance);
        const debit = balance < remaining ? balance : remaining;
        if (debit > BigInt(0)) {
          const txn = await WalletService.spend(tenantId, {
            userId: walletUserId,
            amount: debit.toString(),
            currency: run.currency,
            referenceType: METERING_BILLING_REFERENCE_TYPE,
            referenceId: run.billingRunId,
            description: `Metered usage overage ${run.periodKey}`,
            idempotencyKey: `metering:${run.billingRunId}:wallet`,
          });
          run.walletDebitedMinor = debit;
          run.walletTransactionId = txn.walletTransactionId;
          remaining -= debit;
        }
      }

      // ── RAIL 2: invoice the remainder ──────────────────────────────────────
      if (remaining > BigInt(0)) {
        if (!dto.customerEmail || !dto.customerName || !dto.customerCountryCode) {
          throw new AppError(MESSAGES.INVOICE_CUSTOMER_REQUIRED, 422, ErrorCode.VALIDATION_ERROR);
        }
        const lines = scaleLines(run.lines ?? [], total, remaining);
        const invoiceInput = {
          customerEmail: dto.customerEmail,
          customerName: dto.customerName,
          customerCountryCode: dto.customerCountryCode.toUpperCase(),
          currency: run.currency,
          subscriptionId:
            run.subjectType === 'SUBSCRIPTION' && run.subjectId ? run.subjectId : undefined,
          lines: lines.map((l) => ({
            description: l.description,
            quantity: 1,
            unitPrice: minorToMajor(BigInt(l.amountMinor)),
            sourceType: 'usage' as const,
            sourceId: run.billingRunId,
            metadata: { meterKey: l.meterKey, billableQuantity: l.billableQuantity, periodKey: run.periodKey },
          })),
          metadata: {
            meteringBillingRunId: run.billingRunId,
            periodKey: run.periodKey,
            subjectType: run.subjectType,
            subjectId: run.subjectId,
          },
        } as unknown as CreateInvoiceInput;
        const invoice = await InvoiceService.create(tenantId, invoiceInput);
        run.invoicedMinor = remaining;
        run.invoiceId = invoice.invoiceId;
        remaining = BigInt(0);
      }

      run.status = 'BILLED';
      const saved = await persist(repo, run);
      void fireCompleted(tenantId, saved);
      return MeteredBillingRunSchema.parse(saved);
    } catch (error) {
      run.status = 'FAILED';
      run.error = error instanceof Error ? error.message : String(error);
      await persist(repo, run).catch(() => {});
      if (!(error instanceof AppError)) {
        Logger.error(`${MESSAGES.BILLING_FAILED}: ${error}`);
        throw new AppError(MESSAGES.BILLING_FAILED, 500, ErrorCode.INTERNAL_ERROR);
      }
      throw error;
    }
  }
}
