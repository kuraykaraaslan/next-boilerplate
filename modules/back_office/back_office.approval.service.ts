import 'reflect-metadata';
import { In, type EntityManager } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import Logger from '@/modules/logger';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import WebhookService from '@/modules/webhook/webhook.service';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import NotificationInAppService from '@/modules/notification_inapp/notification_inapp.service';
import { ApprovalQueueItem as ApprovalQueueItemEntity } from './entities/approval_queue_item.entity';
import {
  ApprovalQueueItemSchema,
  type ApprovalChainVerificationResult,
  type ApprovalDecisionHandler,
  type ApprovalQueueItem,
} from './back_office.types';
import type { DecideApprovalDTO, ListApprovalsQuery, SubmitApprovalDTO } from './back_office.dto';
import { BACK_OFFICE_MESSAGES as MSG } from './back_office.messages';
import { approvalSlaDueAt, computeRowHash } from './back_office.constants';
import { DECISION_TO_STATUS, OPEN_APPROVAL_STATUSES } from './back_office.enums';

const UNIQUE_VIOLATION = '23505';

/**
 * In-memory hook map: an owning module calls `registerHandler('store_product',
 * fn)` so it is invoked when an item of that `entityType` reaches a terminal
 * decision (e.g. publish the approved product, hard-delete the rejected one).
 *
 * Module-scope on purpose — handlers are wiring registered at boot in the same
 * process and are not persisted. Invocation is fire-and-forget: a thrown /
 * rejected handler is logged and swallowed so it can never break the decision
 * write.
 */
const DECISION_HANDLERS = new Map<string, ApprovalDecisionHandler>();

export default class ApprovalQueueService {
  // ──────────────────────────────────────────────
  // Decision-handler hook
  // ──────────────────────────────────────────────

  /** Register (or replace) the decision handler for an `entityType`. */
  static registerHandler(entityType: string, handler: ApprovalDecisionHandler): void {
    DECISION_HANDLERS.set(entityType, handler);
  }

  /** Remove a previously registered handler (mainly for tests / teardown). */
  static unregisterHandler(entityType: string): void {
    DECISION_HANDLERS.delete(entityType);
  }

  /** Invoke the registered handler for an item's entityType, fire-and-forget. */
  private static onDecision(tenantId: string, item: ApprovalQueueItem): void {
    const handler = DECISION_HANDLERS.get(item.entityType);
    if (!handler) return;
    void Promise.resolve()
      .then(() => handler({ tenantId, item }))
      .catch((err: unknown) =>
        Logger.error(
          `[back_office] decision handler for ${item.entityType} failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        ),
      );
  }

  // ──────────────────────────────────────────────
  // Hash chain (mirrors audit_log / wallet computeRowHash)
  // ──────────────────────────────────────────────

  /**
   * Append-only chain link, computed once when an item is first inserted. Links
   * the new row to the previous head for the tenant (the row with the latest
   * `createdAt`, excluding the row itself). Only immutable insert-time content
   * is hashed, so later claim / decide mutations never invalidate the chain.
   * Runs inside the caller's transaction so the head read + write are atomic.
   */
  private static async chainOnInsert(
    manager: EntityManager,
    tenantId: string,
    row: ApprovalQueueItemEntity,
  ): Promise<ApprovalQueueItemEntity> {
    const repo = manager.getRepository(ApprovalQueueItemEntity);
    const prev = await repo.findOne({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
    const prevHash = prev && prev.approvalItemId !== row.approvalItemId ? prev.rowHash : null;
    row.prevHash = prevHash;
    row.rowHash = computeRowHash(prevHash, {
      approvalItemId: row.approvalItemId,
      tenantId: row.tenantId,
      entityType: row.entityType,
      entityId: row.entityId,
      submittedByUserId: row.submittedByUserId,
      priority: row.priority,
      reason: row.reason,
      createdAt: row.createdAt,
    });
    return repo.save(row);
  }

  // ──────────────────────────────────────────────
  // Submit (idempotent)
  // ──────────────────────────────────────────────

  /**
   * Submit an entity for review. Idempotent: if an OPEN item already exists for
   * `(entityType, entityId)` it is returned unchanged; otherwise a PENDING item
   * is created, hash-chained, and a `back_office.approval.submitted` webhook is
   * fired (fire-and-forget).
   */
  static async submit(tenantId: string, dto: SubmitApprovalDTO): Promise<ApprovalQueueItem> {
    const ds = await tenantDataSourceFor(tenantId);
    try {
      const saved = await ds.transaction(async (manager) => {
        const repo = manager.getRepository(ApprovalQueueItemEntity);

        const existing = await repo.findOne({
          where: {
            tenantId,
            entityType: dto.entityType,
            entityId: dto.entityId,
            status: In([...OPEN_APPROVAL_STATUSES]),
          },
          order: { createdAt: 'DESC' },
        });
        if (existing) return { row: existing, created: false };

        const createdAt = new Date();
        const built = repo.create({
          tenantId,
          entityType: dto.entityType,
          entityId: dto.entityId,
          submittedByUserId: dto.submittedByUserId ?? null,
          status: 'PENDING',
          priority: dto.priority,
          reason: dto.reason ?? null,
          decisionNote: null,
          reviewedByUserId: null,
          reviewedAt: null,
          slaDueAt: approvalSlaDueAt(dto.priority, createdAt),
          metadata: dto.metadata ?? null,
          createdAt,
        });
        const persisted = await repo.save(built);
        const chained = await ApprovalQueueService.chainOnInsert(manager, tenantId, persisted);
        return { row: chained, created: true };
      });

      const item = ApprovalQueueItemSchema.parse(saved.row);
      if (saved.created) {
        void WebhookService.dispatchEvent(tenantId, 'back_office.approval.submitted', {
          approvalItemId: item.approvalItemId,
          entityType: item.entityType,
          entityId: item.entityId,
          priority: item.priority,
        }).catch((err) => Logger.error(`[back_office] webhook dispatch failed: ${err}`));
      }
      return item;
    } catch (error) {
      // Lost the create race against the partial unique index — re-read the open item.
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        const row = await ds.getRepository(ApprovalQueueItemEntity).findOne({
          where: {
            tenantId,
            entityType: dto.entityType,
            entityId: dto.entityId,
            status: In([...OPEN_APPROVAL_STATUSES]),
          },
          order: { createdAt: 'DESC' },
        });
        if (row) return ApprovalQueueItemSchema.parse(row);
      }
      if (!(error instanceof AppError)) Logger.error(`${MSG.SUBMIT_FAILED}: ${error}`);
      throw error;
    }
  }

  // ──────────────────────────────────────────────
  // Reads
  // ──────────────────────────────────────────────

  static async list(
    tenantId: string,
    query: ListApprovalsQuery,
  ): Promise<{ data: ApprovalQueueItem[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId);
    const where: Record<string, unknown> = { tenantId };
    if (query.status) where['status'] = query.status;
    if (query.entityType) where['entityType'] = query.entityType;
    if (query.entityId) where['entityId'] = query.entityId;
    if (query.reviewedByUserId) where['reviewedByUserId'] = query.reviewedByUserId;
    if (query.priority !== undefined) where['priority'] = query.priority;
    const [rows, total] = await ds.getRepository(ApprovalQueueItemEntity).findAndCount({
      where,
      // Most urgent first, then oldest — a sensible work queue order.
      order: { priority: 'DESC', createdAt: 'ASC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    });
    return { data: rows.map((r) => ApprovalQueueItemSchema.parse(r)), total };
  }

  static async get(tenantId: string, approvalItemId: string): Promise<ApprovalQueueItem> {
    const ds = await tenantDataSourceFor(tenantId);
    const row = await ds.getRepository(ApprovalQueueItemEntity).findOne({
      where: { tenantId, approvalItemId },
    });
    if (!row) throw new AppError(MSG.APPROVAL_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    return ApprovalQueueItemSchema.parse(row);
  }

  // ──────────────────────────────────────────────
  // Claim
  // ──────────────────────────────────────────────

  /** Claim a PENDING item for review (PENDING → IN_REVIEW). */
  static async claim(
    tenantId: string,
    reviewerUserId: string,
    approvalItemId: string,
  ): Promise<ApprovalQueueItem> {
    const ds = await tenantDataSourceFor(tenantId);
    const row = await ds.transaction(async (manager) => {
      const repo = manager.getRepository(ApprovalQueueItemEntity);
      const item = await repo.findOne({
        where: { tenantId, approvalItemId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!item) throw new AppError(MSG.APPROVAL_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
      if (item.status !== 'PENDING') {
        throw new AppError(MSG.CLAIM_FAILED, 409, ErrorCode.CONFLICT);
      }
      item.status = 'IN_REVIEW';
      item.reviewedByUserId = reviewerUserId;
      // Decision/claim mutations do not re-chain (the chain is insert-only over
      // immutable content); the append-only audit_log records who acted.
      return repo.save(item);
    });
    return ApprovalQueueItemSchema.parse(row);
  }

  // ──────────────────────────────────────────────
  // Decide
  // ──────────────────────────────────────────────

  /**
   * Record a reviewer decision. Allowed transitions:
   *  - APPROVE / REJECT (terminal) from PENDING | IN_REVIEW | ESCALATED
   *  - ESCALATE (stays open) from PENDING | IN_REVIEW
   * Already-terminal items are rejected with CONFLICT.
   *
   * On a terminal decision the per-tenant audit log is written, the registered
   * decision handler is invoked, the submitter is notified (fire-and-forget),
   * and a `back_office.approval.<approved|rejected|escalated>` webhook fires.
   */
  static async decide(
    tenantId: string,
    reviewerUserId: string,
    approvalItemId: string,
    dto: DecideApprovalDTO,
  ): Promise<ApprovalQueueItem> {
    const newStatus = DECISION_TO_STATUS[dto.decision];
    const ds = await tenantDataSourceFor(tenantId);
    try {
      const row = await ds.transaction(async (manager) => {
        const repo = manager.getRepository(ApprovalQueueItemEntity);
        const item = await repo.findOne({
          where: { tenantId, approvalItemId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!item) throw new AppError(MSG.APPROVAL_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

        // Guard the transition: terminal items are immutable; ESCALATE only
        // from a still-actionable (not already escalated) open state.
        if (item.status === 'APPROVED' || item.status === 'REJECTED') {
          throw new AppError(MSG.ALREADY_DECIDED, 409, ErrorCode.CONFLICT);
        }
        if (dto.decision === 'ESCALATE' && item.status === 'ESCALATED') {
          throw new AppError(MSG.INVALID_TRANSITION, 409, ErrorCode.CONFLICT);
        }

        item.status = newStatus;
        item.reviewedByUserId = reviewerUserId;
        item.decisionNote = dto.note ?? item.decisionNote ?? null;
        // reviewedAt marks when the decision was taken (terminal or escalation).
        item.reviewedAt = new Date();
        return repo.save(item);
      });

      const item = ApprovalQueueItemSchema.parse(row);
      const isTerminal = newStatus === 'APPROVED' || newStatus === 'REJECTED';

      // Audit every decision (approve / reject / escalate). Never throws.
      void AuditLogService.log({
        tenantId,
        actorId: reviewerUserId,
        actorType: 'USER',
        action: `back_office.approval.${dto.decision.toLowerCase()}`,
        resourceType: item.entityType,
        resourceId: item.entityId,
        metadata: {
          approvalItemId: item.approvalItemId,
          decision: dto.decision,
          note: dto.note ?? null,
          rowHash: item.rowHash,
        },
      });

      // Let the owning module react to terminal decisions.
      if (isTerminal) ApprovalQueueService.onDecision(tenantId, item);

      // Notify the submitter (fire-and-forget) if known.
      if (item.submittedByUserId) {
        void NotificationInAppService.push(tenantId, item.submittedByUserId, {
          title: `Your submission was ${newStatus.toLowerCase()}`,
          message:
            dto.note ??
            `Your ${item.entityType} submission has been ${newStatus.toLowerCase()}.`,
          type: 'back_office',
        }).catch((err) =>
          Logger.error(`[back_office] notify submitter failed: ${err}`),
        );
      }

      const event =
        dto.decision === 'APPROVE'
          ? 'back_office.approval.approved'
          : dto.decision === 'REJECT'
            ? 'back_office.approval.rejected'
            : 'back_office.approval.escalated';
      void WebhookService.dispatchEvent(tenantId, event, {
        approvalItemId: item.approvalItemId,
        entityType: item.entityType,
        entityId: item.entityId,
        status: item.status,
        reviewedByUserId: reviewerUserId,
      }).catch((err) => Logger.error(`[back_office] webhook dispatch failed: ${err}`));

      return item;
    } catch (error) {
      if (!(error instanceof AppError)) Logger.error(`${MSG.DECIDE_FAILED}: ${error}`);
      throw error;
    }
  }

  // ──────────────────────────────────────────────
  // Integrity
  // ──────────────────────────────────────────────

  /**
   * Re-derive the per-tenant decision hash chain and confirm every `rowHash`
   * matches. Any after-the-fact edit to a decision breaks the chain at that row.
   */
  static async verifyChain(tenantId: string): Promise<ApprovalChainVerificationResult> {
    const ds = await tenantDataSourceFor(tenantId);
    const rows = await ds.getRepository(ApprovalQueueItemEntity).find({
      where: { tenantId },
      order: { createdAt: 'ASC' },
    });

    let expectedPrev: string | null = null;
    let checked = 0;
    for (const row of rows) {
      checked += 1;
      if ((row.prevHash ?? null) !== expectedPrev) {
        return { ok: false, checked, brokenAt: row.approvalItemId };
      }
      const recomputed = computeRowHash(expectedPrev, {
        approvalItemId: row.approvalItemId,
        tenantId: row.tenantId,
        entityType: row.entityType,
        entityId: row.entityId,
        submittedByUserId: row.submittedByUserId,
        priority: row.priority,
        reason: row.reason,
        createdAt: row.createdAt,
      });
      if (recomputed !== (row.rowHash ?? null)) {
        return { ok: false, checked, brokenAt: row.approvalItemId };
      }
      expectedPrev = row.rowHash ?? null;
    }
    return { ok: true, checked, brokenAt: null };
  }
}
