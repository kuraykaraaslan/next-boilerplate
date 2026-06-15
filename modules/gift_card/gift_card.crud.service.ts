import 'reflect-metadata';
import { ILike } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import redis, { jitter, singleFlight } from '@/modules/redis';
import Logger from '@/modules/logger';
import WebhookService from '@/modules/webhook/webhook.service';
import TenantFeatureGateService from '@/modules/tenant_subscription/tenant_subscription.feature.service';
import { FEATURE_KEYS } from '@/modules/tenant_subscription/tenant_subscription.feature-keys';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { GiftCard as GiftCardEntity } from './entities/gift_card.entity';
import { GiftCardTransaction as GiftCardTxEntity } from './entities/gift_card_transaction.entity';
import { GiftCardSchema, GiftCardTransactionSchema } from './gift_card.types';
import type { GiftCard, GiftCardTransaction } from './gift_card.types';
import { GIFT_CARD_MESSAGES } from './gift_card.messages';
import { generateGiftCardCode, hashGiftCardCode } from './gift_card.crypto';
import {
  GIFT_CARD_CACHE_TTL, NEGATIVE_CACHE_TTL, NEG, idKey, hashKey, clearCache,
} from './gift_card.cache';
import type { IssueGiftCardDTO, GetGiftCardsQuery, AdjustGiftCardDTO } from './gift_card.dto';

/**
 * Gift-card lifecycle CRUD: issue (single + bulk), reads, void, adjust. The
 * redemption flow (which posts a wallet credit) lives in
 * `gift_card.redemption.service.ts`.
 */
export default class GiftCardCrudService {
  /** Issue one or more gift cards. Returns each card's raw code exactly once. */
  static async issue(
    tenantId: string,
    data: IssueGiftCardDTO,
  ): Promise<{ giftCards: GiftCard[]; rawCodes: { giftCardId: string; code: string }[] }> {
    await TenantFeatureGateService.assertFeatureAccess(tenantId, FEATURE_KEYS.FEATURE_GIFT_CARDS);
    try {
      const ds = await tenantDataSourceFor(tenantId);
      const repo = ds.getRepository(GiftCardEntity);
      const txRepo = ds.getRepository(GiftCardTxEntity);

      const created: GiftCardEntity[] = [];
      const rawCodes: { giftCardId: string; code: string }[] = [];
      const quantity = data.quantity ?? 1;

      for (let i = 0; i < quantity; i++) {
        const rawCode = generateGiftCardCode();
        const card = repo.create({
          tenantId,
          code: rawCode,
          codeHash: hashGiftCardCode(rawCode),
          status: 'ACTIVE',
          initialAmount: data.amount,
          remainingAmount: data.amount,
          currency: data.currency,
          purchaserUserId: data.purchaserUserId,
          purchaserPaymentId: data.purchaserPaymentId,
          recipientEmail: data.recipientEmail,
          recipientUserId: data.recipientUserId,
          message: data.message,
          expiresAt: data.expiresAt,
          metadata: data.metadata,
        });
        const saved = await repo.save(card);

        await txRepo.save(txRepo.create({
          tenantId,
          giftCardId: saved.giftCardId,
          type: 'ISSUE',
          amount: data.amount,
          balanceAfter: data.amount,
          userId: data.purchaserUserId,
        }));

        created.push(saved);
        rawCodes.push({ giftCardId: saved.giftCardId, code: rawCode });

        await WebhookService.dispatchEvent(tenantId, 'gift_card.issued', {
          giftCardId: saved.giftCardId,
          amount: saved.initialAmount,
          currency: saved.currency,
          recipientEmail: saved.recipientEmail ?? null,
        }).catch(() => {});
      }

      return {
        giftCards: created.map((c) => GiftCardSchema.parse(c)),
        rawCodes,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      Logger.error(`${GIFT_CARD_MESSAGES.CREATE_FAILED}: ${error}`);
      throw new AppError(GIFT_CARD_MESSAGES.CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  static async getAll(
    tenantId: string,
    query: GetGiftCardsQuery,
  ): Promise<{ giftCards: GiftCard[]; total: number }> {
    try {
      const ds = await tenantDataSourceFor(tenantId);
      const repo = ds.getRepository(GiftCardEntity);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = { tenantId };
      if (query.status) where.status = query.status;
      if (query.purchaserUserId) where.purchaserUserId = query.purchaserUserId;
      if (query.search) where.code = ILike(`%${query.search}%`);
      const [rows, total] = await repo.findAndCount({
        where,
        skip: query.page * query.pageSize,
        take: query.pageSize,
        order: { createdAt: 'DESC' },
      });
      return { giftCards: rows.map((r) => GiftCardSchema.parse(r)), total };
    } catch (error) {
      if (error instanceof AppError) throw error;
      Logger.error(`${GIFT_CARD_MESSAGES.FETCH_FAILED}: ${error}`);
      throw new AppError(GIFT_CARD_MESSAGES.FETCH_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  static async getById(tenantId: string, giftCardId: string): Promise<GiftCard> {
    const key = idKey(tenantId, giftCardId);
    const cached = await redis.get(key).catch(() => null);
    if (cached) {
      try { return GiftCardSchema.parse(JSON.parse(cached)); } catch { await redis.del(key).catch(() => {}); }
    }
    return singleFlight(key, async () => {
      const ds = await tenantDataSourceFor(tenantId);
      const card = await ds.getRepository(GiftCardEntity).findOne({ where: { tenantId, giftCardId } });
      if (!card) throw new AppError(GIFT_CARD_MESSAGES.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
      const parsed = GiftCardSchema.parse(card);
      await redis.setex(key, jitter(GIFT_CARD_CACHE_TTL), JSON.stringify(parsed)).catch(() => {});
      return parsed;
    });
  }

  /** Resolve a gift card by raw code (via hash). Returns null when unknown. */
  static async getByCode(tenantId: string, rawCode: string): Promise<GiftCard | null> {
    const codeHash = hashGiftCardCode(rawCode);
    const key = hashKey(tenantId, codeHash);
    const cached = await redis.get(key).catch(() => null);
    if (cached === NEG) return null;
    if (cached) {
      try { return GiftCardSchema.parse(JSON.parse(cached)); } catch { await redis.del(key).catch(() => {}); }
    }
    return singleFlight(key, async () => {
      const ds = await tenantDataSourceFor(tenantId);
      const card = await ds.getRepository(GiftCardEntity).findOne({ where: { tenantId, codeHash } });
      if (!card) {
        await redis.setex(key, jitter(NEGATIVE_CACHE_TTL), NEG).catch(() => {});
        return null;
      }
      const parsed = GiftCardSchema.parse(card);
      await redis.setex(key, jitter(GIFT_CARD_CACHE_TTL), JSON.stringify(parsed)).catch(() => {});
      return parsed;
    });
  }

  static async listTransactions(tenantId: string, giftCardId: string): Promise<GiftCardTransaction[]> {
    const ds = await tenantDataSourceFor(tenantId);
    const rows = await ds.getRepository(GiftCardTxEntity).find({
      where: { tenantId, giftCardId },
      order: { createdAt: 'ASC' },
    });
    return rows.map((r) => GiftCardTransactionSchema.parse(r));
  }

  /** Void a gift card, forfeiting any remaining balance. */
  static async void(tenantId: string, giftCardId: string, reason?: string): Promise<GiftCard> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(GiftCardEntity);
    const txRepo = ds.getRepository(GiftCardTxEntity);
    const card = await repo.findOne({ where: { tenantId, giftCardId } });
    if (!card) throw new AppError(GIFT_CARD_MESSAGES.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (card.status === 'VOID') throw new AppError(GIFT_CARD_MESSAGES.ALREADY_VOID, 409, ErrorCode.CONFLICT);
    try {
      const forfeited = card.remainingAmount;
      card.status = 'VOID';
      card.remainingAmount = 0;
      const saved = await repo.save(card);
      await txRepo.save(txRepo.create({
        tenantId, giftCardId, type: 'VOID', amount: -forfeited, balanceAfter: 0, note: reason,
      }));
      await clearCache(tenantId, { giftCardId, codeHash: card.codeHash });
      await WebhookService.dispatchEvent(tenantId, 'gift_card.voided', {
        giftCardId, forfeitedAmount: forfeited, currency: card.currency,
      }).catch(() => {});
      return GiftCardSchema.parse(saved);
    } catch (error) {
      if (error instanceof AppError) throw error;
      Logger.error(`${GIFT_CARD_MESSAGES.VOID_FAILED}: ${error}`);
      throw new AppError(GIFT_CARD_MESSAGES.VOID_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /** Apply a signed admin adjustment to the remaining balance. */
  static async adjust(tenantId: string, giftCardId: string, data: AdjustGiftCardDTO): Promise<GiftCard> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(GiftCardEntity);
    const txRepo = ds.getRepository(GiftCardTxEntity);
    const card = await repo.findOne({ where: { tenantId, giftCardId } });
    if (!card) throw new AppError(GIFT_CARD_MESSAGES.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (card.status === 'VOID') throw new AppError(GIFT_CARD_MESSAGES.VOIDED, 409, ErrorCode.CONFLICT);
    try {
      const next = card.remainingAmount + data.delta;
      if (next < 0) throw new AppError(GIFT_CARD_MESSAGES.INSUFFICIENT_BALANCE, 422, ErrorCode.VALIDATION_ERROR);
      card.remainingAmount = next;
      if (next === 0 && card.status !== 'EXPIRED') card.status = 'REDEEMED';
      else if (next > 0 && (card.status === 'REDEEMED')) card.status = 'PARTIALLY_REDEEMED';
      const saved = await repo.save(card);
      await txRepo.save(txRepo.create({
        tenantId, giftCardId, type: 'ADJUST', amount: data.delta, balanceAfter: next, note: data.note,
      }));
      await clearCache(tenantId, { giftCardId, codeHash: card.codeHash });
      return GiftCardSchema.parse(saved);
    } catch (error) {
      if (error instanceof AppError) throw error;
      Logger.error(`${GIFT_CARD_MESSAGES.ADJUST_FAILED}: ${error}`);
      throw new AppError(GIFT_CARD_MESSAGES.ADJUST_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }
}
