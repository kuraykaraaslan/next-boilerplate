import 'reflect-metadata';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import Logger from '@kuraykaraaslan/logger';
import WebhookService from '@kuraykaraaslan/webhook/server/webhook.service';
import WalletService from '@kuraykaraaslan/wallet/server/wallet.service';
import PaymentService from '@kuraykaraaslan/payment/server/payment.service';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { GiftCard as GiftCardEntity } from './entities/gift_card.entity';
import { GiftCardTransaction as GiftCardTxEntity } from './entities/gift_card_transaction.entity';
import { GiftCardSchema, GiftCardBalanceSchema, RedeemResultSchema } from './gift_card.types';
import type { GiftCardBalance, RedeemResult, GiftCard } from './gift_card.types';
import { GIFT_CARD_MESSAGES } from './gift_card.messages';
import { hashGiftCardCode } from './gift_card.crypto';
import { clearCache } from './gift_card.cache';
import GiftCardCrudService from './gift_card.crud.service';
import type { RedeemGiftCardDTO } from './gift_card.dto';

const REDEEMABLE = new Set(['ACTIVE', 'PARTIALLY_REDEEMED']);

export default class GiftCardRedemptionService {
  /** Look up the spendable balance for a raw code (read-only). */
  static async checkBalance(tenantId: string, rawCode: string): Promise<GiftCardBalance> {
    const card = await GiftCardCrudService.getByCode(tenantId, rawCode);
    if (!card) throw new AppError(GIFT_CARD_MESSAGES.INVALID_CODE, 404, ErrorCode.NOT_FOUND);
    return GiftCardBalanceSchema.parse({
      status: card.status,
      remainingAmount: card.remainingAmount,
      currency: card.currency,
      expiresAt: card.expiresAt ?? null,
    });
  }

  /**
   * Redeem (partially or fully) a gift card into the user's wallet. Posts a
   * wallet credit in the card's currency and records a REDEEM ledger row linked
   * to the resulting wallet transaction.
   */
  static async redeem(tenantId: string, data: RedeemGiftCardDTO): Promise<RedeemResult> {
    const codeHash = hashGiftCardCode(data.code);
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(GiftCardEntity);
    const txRepo = ds.getRepository(GiftCardTxEntity);

    const card = await repo.findOne({ where: { tenantId, codeHash } });
    if (!card) throw new AppError(GIFT_CARD_MESSAGES.INVALID_CODE, 404, ErrorCode.NOT_FOUND);
    if (card.status === 'VOID') throw new AppError(GIFT_CARD_MESSAGES.VOIDED, 409, ErrorCode.CONFLICT);
    if (card.expiresAt && card.expiresAt.getTime() < Date.now()) {
      throw new AppError(GIFT_CARD_MESSAGES.EXPIRED, 409, ErrorCode.CONFLICT);
    }
    if (!REDEEMABLE.has(card.status) || card.remainingAmount <= 0) {
      throw new AppError(GIFT_CARD_MESSAGES.ALREADY_REDEEMED, 409, ErrorCode.CONFLICT);
    }
    if (data.currency && data.currency !== card.currency) {
      throw new AppError(GIFT_CARD_MESSAGES.CURRENCY_MISMATCH, 422, ErrorCode.CURRENCY_MISMATCH);
    }

    const amount = data.amount ?? card.remainingAmount;
    if (amount > card.remainingAmount) {
      throw new AppError(GIFT_CARD_MESSAGES.INSUFFICIENT_BALANCE, 422, ErrorCode.VALIDATION_ERROR);
    }

    try {
      // Credit the user's wallet first; if it fails we never touch the card.
      const walletTx = await WalletService.issue(tenantId, {
        userId: data.userId,
        amount: String(amount),
        currency: card.currency,
        description: 'Gift card redemption',
        referenceType: 'gift_card',
        referenceId: card.giftCardId,
      });

      const remaining = card.remainingAmount - amount;
      card.remainingAmount = remaining;
      card.status = remaining <= 0 ? 'REDEEMED' : 'PARTIALLY_REDEEMED';
      card.lastRedeemedAt = new Date();
      await repo.save(card);

      await txRepo.save(txRepo.create({
        tenantId,
        giftCardId: card.giftCardId,
        type: 'REDEEM',
        amount: -amount,
        balanceAfter: remaining,
        walletTransactionId: walletTx.walletTransactionId,
        userId: data.userId,
      }));

      await clearCache(tenantId, { giftCardId: card.giftCardId, codeHash: card.codeHash });
      await WebhookService.dispatchEvent(tenantId, 'gift_card.redeemed', {
        giftCardId: card.giftCardId,
        userId: data.userId,
        amount,
        currency: card.currency,
        remainingAmount: remaining,
      }).catch(() => {});

      return RedeemResultSchema.parse({
        creditedAmount: amount,
        remainingAmount: remaining,
        currency: card.currency,
        walletTransactionId: walletTx.walletTransactionId,
        status: card.status,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      Logger.error(`${GIFT_CARD_MESSAGES.REDEEM_FAILED}: ${error}`);
      throw new AppError(GIFT_CARD_MESSAGES.REDEEM_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Issue a gift card backed by a completed payment. Called from the payment
   * success path (no generic post-payment bus yet — see module README). The
   * card amount/currency are taken from the payment; recipient details are
   * supplied by the caller.
   */
  static async issueForCompletedPayment(
    tenantId: string,
    paymentId: string,
    recipient: { recipientEmail?: string; recipientUserId?: string; message?: string } = {},
  ): Promise<GiftCard> {
    const payment = await PaymentService.getById(paymentId);
    if (!payment || payment.tenantId !== tenantId) {
      throw new AppError(GIFT_CARD_MESSAGES.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    }
    if (payment.status !== 'COMPLETED') {
      throw new AppError(GIFT_CARD_MESSAGES.PAYMENT_NOT_COMPLETED, 409, ErrorCode.CONFLICT);
    }
    const { giftCards } = await GiftCardCrudService.issue(tenantId, {
      amount: Math.round(Number(payment.amount)),
      currency: payment.currency,
      purchaserPaymentId: paymentId,
      purchaserUserId: payment.userId ?? undefined,
      recipientEmail: recipient.recipientEmail,
      recipientUserId: recipient.recipientUserId,
      message: recipient.message,
      quantity: 1,
    });
    return GiftCardSchema.parse(giftCards[0]);
  }
}
