import 'reflect-metadata';
import { tenantDataSourceFor } from '@nb/db';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import AuditLogService from '@nb/audit_log/server/audit_log.service';
import SettingService from '@nb/setting/server/setting.service';
import { Agreement as AgreementEntity } from './entities/agreement.entity';
import { AgreementVersion as AgreementVersionEntity } from './entities/agreement_version.entity';
import { AgreementAcceptance as AgreementAcceptanceEntity } from './entities/agreement_acceptance.entity';
import {
  AgreementSchema,
  AgreementVersionSchema,
  AgreementAcceptanceSchema,
  type Agreement,
  type AgreementVersion,
  type AgreementAcceptance,
  type RenderedAgreement,
  type OrderContext,
} from './terms_consent.agreements.types';
import {
  AgreementTypeEnum,
  isOrderSpecificAgreement,
  type AgreementType,
} from './terms_consent.enums';
import { SELLER_LEGAL_KEYS } from './terms_consent.setting.keys';
import { sha256Hex, renderOrderTemplate, type SellerLegal } from './terms_consent.render';
import { TERMS_CONSENT_MESSAGES as MSG } from './terms_consent.messages';
import type { ConsentSubject } from './terms_consent.service';
import type {
  CreateAgreementInput,
  UpdateAgreementInput,
  ListAgreementsQueryInput,
  CreateVersionInput,
  ListAcceptancesQueryInput,
} from './terms_consent.agreements.dto';

// Request-derived metadata captured on each acceptance row. Distinct from the
// cookie-consent `ConsentMeta` because agreement acceptances add a `checkout`
// source.
export interface AgreementMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
  source?: 'checkout' | 'api' | 'admin' | 'import';
}

export default class AgreementService {
  // ── Agreements (definitions) ────────────────────────────────────────────────

  static async create(tenantId: string, input: CreateAgreementInput, actorId?: string): Promise<Agreement> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(AgreementEntity);
    const existing = await repo.findOne({ where: { tenantId, key: input.key } });
    if (existing) throw new AppError(MSG.AGREEMENT_KEY_TAKEN, 409, ErrorCode.CONFLICT);

    const saved = await repo.save(
      repo.create({
        tenantId,
        type: input.type,
        key: input.key,
        title: input.title,
        description: input.description ?? null,
        requiresAcceptance: input.requiresAcceptance,
        isActive: true,
      }),
    );
    this.audit(tenantId, actorId, 'agreement.created', saved.agreementId, { type: input.type, key: input.key });
    return AgreementSchema.parse(saved);
  }

  static async list(tenantId: string, query: ListAgreementsQueryInput): Promise<Agreement[]> {
    const ds = await tenantDataSourceFor(tenantId);
    const where: Record<string, unknown> = { tenantId };
    if (query.type !== undefined) where.type = query.type;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    const rows = await ds.getRepository(AgreementEntity).find({ where, order: { createdAt: 'DESC' } });
    return rows.map((r) => AgreementSchema.parse(r));
  }

  static async get(tenantId: string, agreementId: string): Promise<Agreement> {
    const ds = await tenantDataSourceFor(tenantId);
    const row = await ds.getRepository(AgreementEntity).findOne({ where: { tenantId, agreementId } });
    if (!row) throw new AppError(MSG.AGREEMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    return AgreementSchema.parse(row);
  }

  /** First active agreement of a type (used by checkout + by-type acceptance). */
  static async getByType(tenantId: string, type: AgreementType): Promise<Agreement | null> {
    const ds = await tenantDataSourceFor(tenantId);
    const row = await ds
      .getRepository(AgreementEntity)
      .findOne({ where: { tenantId, type, isActive: true }, order: { createdAt: 'ASC' } });
    return row ? AgreementSchema.parse(row) : null;
  }

  static async update(
    tenantId: string,
    agreementId: string,
    input: UpdateAgreementInput,
    actorId?: string,
  ): Promise<Agreement> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(AgreementEntity);
    const row = await repo.findOne({ where: { tenantId, agreementId } });
    if (!row) throw new AppError(MSG.AGREEMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (input.title !== undefined) row.title = input.title;
    if (input.description !== undefined) row.description = input.description;
    if (input.requiresAcceptance !== undefined) row.requiresAcceptance = input.requiresAcceptance;
    if (input.isActive !== undefined) row.isActive = input.isActive;
    const saved = await repo.save(row);
    this.audit(tenantId, actorId, 'agreement.updated', agreementId, { changedKeys: Object.keys(input) });
    return AgreementSchema.parse(saved);
  }

  // ── Versions (immutable once published) ───────────────────────────────────────

  /** Create a new DRAFT version (next version number). Hash is computed now. */
  static async createVersion(
    tenantId: string,
    agreementId: string,
    input: CreateVersionInput,
    actorId?: string,
  ): Promise<AgreementVersion> {
    const ds = await tenantDataSourceFor(tenantId);
    await this.get(tenantId, agreementId); // 404 if missing
    const repo = ds.getRepository(AgreementVersionEntity);

    const latest = await repo.findOne({ where: { tenantId, agreementId }, order: { version: 'DESC' } });
    const nextVersion = (latest?.version ?? 0) + 1;

    const saved = await repo.save(
      repo.create({
        tenantId,
        agreementId,
        version: nextVersion,
        content: input.content,
        contentHash: sha256Hex(input.content),
        language: input.language,
        status: 'draft',
        effectiveFrom: input.effectiveFrom ?? null,
        publishedAt: null,
        isCurrent: false,
      }),
    );
    this.audit(tenantId, actorId, 'agreement.version_created', agreementId, { version: nextVersion });
    return AgreementVersionSchema.parse(saved);
  }

  static async listVersions(tenantId: string, agreementId: string): Promise<AgreementVersion[]> {
    const ds = await tenantDataSourceFor(tenantId);
    const rows = await ds
      .getRepository(AgreementVersionEntity)
      .find({ where: { tenantId, agreementId }, order: { version: 'DESC' } });
    return rows.map((r) => AgreementVersionSchema.parse(r));
  }

  static async getCurrentVersion(tenantId: string, agreementId: string): Promise<AgreementVersion | null> {
    const ds = await tenantDataSourceFor(tenantId);
    const row = await ds
      .getRepository(AgreementVersionEntity)
      .findOne({ where: { tenantId, agreementId, isCurrent: true, status: 'published' } });
    return row ? AgreementVersionSchema.parse(row) : null;
  }

  /** Publish a draft version: freeze it, stamp the hash, make it the current one. */
  static async publishVersion(
    tenantId: string,
    agreementId: string,
    versionId: string,
    actorId?: string,
  ): Promise<AgreementVersion> {
    const ds = await tenantDataSourceFor(tenantId);
    const result = await ds.transaction(async (mgr) => {
      const repo = mgr.getRepository(AgreementVersionEntity);
      const row = await repo.findOne({ where: { tenantId, agreementId, versionId } });
      if (!row) throw new AppError(MSG.VERSION_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
      if (row.status === 'published') return row; // idempotent
      if (row.status !== 'draft') throw new AppError(MSG.VERSION_NOT_DRAFT, 409, ErrorCode.CONFLICT);

      // Demote any existing current version.
      await repo.update({ tenantId, agreementId, isCurrent: true }, { isCurrent: false });

      row.status = 'published';
      row.publishedAt = new Date();
      row.isCurrent = true;
      row.contentHash = sha256Hex(row.content); // freeze the fingerprint
      return repo.save(row);
    });
    this.audit(tenantId, actorId, 'agreement.version_published', agreementId, {
      versionId,
      version: result.version,
    });
    return AgreementVersionSchema.parse(result);
  }

  // ── Acceptance (reusable agreements) ──────────────────────────────────────────

  /**
   * Accept the current published version of a reusable agreement. Records the
   * versionId + contentHash (the text lives in the immutable version, not copied).
   */
  static async accept(
    tenantId: string,
    opts: { agreementId?: string; type?: AgreementType; accepted?: boolean; subject: ConsentSubject },
    meta: AgreementMeta = {},
  ): Promise<AgreementAcceptance> {
    const agreement = opts.agreementId
      ? await this.get(tenantId, opts.agreementId)
      : opts.type
        ? await this.getByType(tenantId, opts.type)
        : null;
    if (!agreement) throw new AppError(MSG.AGREEMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const current = await this.getCurrentVersion(tenantId, agreement.agreementId);
    if (!current) throw new AppError(MSG.NO_PUBLISHED_VERSION, 409, ErrorCode.CONFLICT);

    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(AgreementAcceptanceEntity);
    const saved = await repo.save(
      repo.create({
        tenantId,
        agreementId: agreement.agreementId,
        agreementType: agreement.type,
        versionId: current.versionId,
        subjectUserId: opts.subject.userId ?? null,
        subjectAnonymousId: opts.subject.anonymousId ?? null,
        accepted: opts.accepted ?? true,
        contentHash: current.contentHash,
        contentSnapshot: null,
        versionLabel: String(current.version),
        orderRef: null,
        context: meta.source ? { source: meta.source } : null,
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      }),
    );
    this.auditAcceptance(tenantId, opts.subject, agreement.type, saved.acceptanceId, {
      versionId: current.versionId,
      accepted: saved.accepted,
    });
    return AgreementAcceptanceSchema.parse(saved);
  }

  static async listAcceptances(
    tenantId: string,
    query: ListAcceptancesQueryInput,
  ): Promise<{ data: AgreementAcceptance[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId);
    const where: Record<string, unknown> = { tenantId };
    if (query.agreementType !== undefined) where.agreementType = query.agreementType;
    if (query.subjectUserId !== undefined) where.subjectUserId = query.subjectUserId;
    if (query.orderRef !== undefined) where.orderRef = query.orderRef;
    const [rows, total] = await ds.getRepository(AgreementAcceptanceEntity).findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    });
    return { data: rows.map((r) => AgreementAcceptanceSchema.parse(r)), total };
  }

  // ── Checkout (order-specific, verbatim) ───────────────────────────────────────

  /** Which agreement types the checkout flow must collect (tenant-configured). */
  static async getCheckoutRequiredTypes(tenantId: string): Promise<AgreementType[]> {
    const raw = await SettingService.getValue(tenantId, 'checkoutRequiredAgreements').catch(() => null);
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.filter((t): t is AgreementType => AgreementTypeEnum.safeParse(t).success);
    } catch {
      return [];
    }
  }

  private static async getSellerLegal(tenantId: string): Promise<SellerLegal> {
    const s = await SettingService.getByKeys(tenantId, [...SELLER_LEGAL_KEYS]).catch(
      () => ({}) as Record<string, string>,
    );
    return {
      name: s.legalSellerName,
      address: s.legalSellerAddress,
      taxOffice: s.legalSellerTaxOffice,
      taxId: s.legalSellerTaxId,
      mersis: s.legalSellerMersis,
      email: s.legalSellerEmail,
      phone: s.legalSellerPhone,
    };
  }

  /**
   * Render the order-specific agreements (distance-selling, pre-information, …)
   * for an order, ready to present before payment. Order-specific types render
   * their current version's TEMPLATE against order+seller data; reusable types
   * return the current version's content as-is.
   */
  static async renderCheckoutAgreements(
    tenantId: string,
    order: OrderContext,
    typesOverride?: AgreementType[],
  ): Promise<RenderedAgreement[]> {
    const types = typesOverride?.length ? typesOverride : await this.getCheckoutRequiredTypes(tenantId);
    if (types.length === 0) return [];
    const seller = await this.getSellerLegal(tenantId);

    const out: RenderedAgreement[] = [];
    for (const type of types) {
      const agreement = await this.getByType(tenantId, type);
      if (!agreement) throw new AppError(`${MSG.TEMPLATE_REQUIRED} (${type})`, 422, ErrorCode.VALIDATION_ERROR);
      const current = await this.getCurrentVersion(tenantId, agreement.agreementId);
      if (!current) throw new AppError(`${MSG.NO_PUBLISHED_VERSION} (${type})`, 409, ErrorCode.CONFLICT);

      if (isOrderSpecificAgreement(type)) {
        const { content, contentHash } = renderOrderTemplate(current.content, order, seller);
        out.push({
          type,
          agreementId: agreement.agreementId,
          versionId: current.versionId,
          versionLabel: String(current.version),
          title: agreement.title,
          content,
          contentHash,
          language: current.language,
        });
      } else {
        out.push({
          type,
          agreementId: agreement.agreementId,
          versionId: current.versionId,
          versionLabel: String(current.version),
          title: agreement.title,
          content: current.content,
          contentHash: current.contentHash,
          language: current.language,
        });
      }
    }
    return out;
  }

  /**
   * Record acceptance of the order agreements. The server RE-renders authoritative
   * text (never trusting client-supplied content), stores order-specific docs
   * verbatim in `contentSnapshot` bound to `orderRef`, and references the version
   * for reusable docs.
   */
  static async acceptCheckoutAgreements(
    tenantId: string,
    args: { order: OrderContext; types?: AgreementType[]; subject: ConsentSubject },
    meta: AgreementMeta = {},
  ): Promise<AgreementAcceptance[]> {
    const rendered = await this.renderCheckoutAgreements(tenantId, args.order, args.types);
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(AgreementAcceptanceEntity);

    const rows = rendered.map((r) =>
      repo.create({
        tenantId,
        agreementId: r.agreementId,
        agreementType: r.type,
        versionId: r.versionId,
        subjectUserId: args.subject.userId ?? null,
        subjectAnonymousId: args.subject.anonymousId ?? null,
        accepted: true,
        contentHash: r.contentHash,
        // Store verbatim only for order-specific docs (reusable text lives in the version).
        contentSnapshot: isOrderSpecificAgreement(r.type) ? r.content : null,
        versionLabel: r.versionLabel,
        orderRef: args.order.orderRef,
        context: { source: meta.source ?? 'checkout', orderRef: args.order.orderRef },
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      }),
    );
    const saved = await repo.save(rows);
    this.auditAcceptance(tenantId, args.subject, 'checkout', saved[0]?.acceptanceId ?? null, {
      orderRef: args.order.orderRef,
      types: rendered.map((r) => r.type),
    });
    return saved.map((s) => AgreementAcceptanceSchema.parse(s));
  }

  /**
   * Guard the payment flow: throws CHECKOUT_AGREEMENTS_REQUIRED unless every
   * tenant-required agreement type has an accepted acceptance for this order +
   * subject. No-op when the tenant configured no required types.
   */
  static async assertCheckoutAgreementsAccepted(
    tenantId: string,
    orderRef: string,
    subject: ConsentSubject,
  ): Promise<void> {
    const required = await this.getCheckoutRequiredTypes(tenantId);
    if (required.length === 0) return;

    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(AgreementAcceptanceEntity);
    const subjectWhere = subject.userId
      ? { subjectUserId: subject.userId }
      : { subjectAnonymousId: subject.anonymousId ?? '' };

    for (const type of required) {
      const found = await repo.findOne({
        where: { tenantId, orderRef, agreementType: type, accepted: true, ...subjectWhere },
      });
      if (!found) {
        throw new AppError(`${MSG.CHECKOUT_AGREEMENTS_REQUIRED} (${type})`, 412, ErrorCode.VALIDATION_ERROR);
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private static audit(
    tenantId: string,
    actorId: string | undefined,
    action: string,
    resourceId: string | null,
    metadata: Record<string, unknown>,
  ): void {
    AuditLogService.log({
      tenantId,
      actorType: actorId ? 'USER' : 'SYSTEM',
      actorId: actorId ?? null,
      action,
      resourceType: 'agreement',
      resourceId,
      metadata: { tenantId, ...metadata },
    });
  }

  private static auditAcceptance(
    tenantId: string,
    subject: ConsentSubject,
    agreementType: string,
    resourceId: string | null,
    metadata: Record<string, unknown>,
  ): void {
    AuditLogService.log({
      tenantId,
      actorType: subject.userId ? 'USER' : 'SYSTEM',
      actorId: subject.userId ?? null,
      action: 'agreement.accepted',
      resourceType: 'agreement_acceptance',
      resourceId,
      metadata: {
        tenantId,
        agreementType,
        subjectUserId: subject.userId ?? null,
        subjectAnonymousId: subject.anonymousId ?? null,
        ...metadata,
      },
    });
  }
}
