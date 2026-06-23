import 'reflect-metadata';
import { randomBytes } from 'crypto';
import { IsNull } from 'typeorm';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { DriveFile } from './entities/drive_file.entity';
import { DriveShare } from './entities/drive_share.entity';
import { DrivePublicLink } from './entities/drive_public_link.entity';
import {
  DriveShareView,
  DriveShareViewSchema,
  DrivePublicLinkView,
  DrivePublicLinkViewSchema,
} from './drive.types';
import { DriveRole, DrivePublicRole } from './drive.enums';
import DriveMessages from './drive.messages';

/** Internal (user-to-user) and public-link sharing for Drive nodes. */
export default class DriveShareService {
  // ── Internal shares ────────────────────────────────────────────────────────

  static async listShares(tenantId: string, driveFileId: string): Promise<DriveShareView[]> {
    const ds = await tenantDataSourceFor(tenantId);
    const rows = await ds.getRepository(DriveShare).find({
      where: { tenantId, driveFileId, deletedAt: IsNull() },
      order: { createdAt: 'ASC' },
    });
    return rows.map((r) => DriveShareViewSchema.parse(r));
  }

  static async addShare(
    tenantId: string,
    driveFileId: string,
    createdByUserId: string,
    sharedWithUserId: string,
    role: DriveRole,
  ): Promise<DriveShareView> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(DriveShare);
    const existing = await repo.findOne({
      where: { tenantId, driveFileId, sharedWithUserId, deletedAt: IsNull() },
    });
    if (existing) {
      // Idempotent role update rather than a duplicate-key error.
      existing.role = role;
      return DriveShareViewSchema.parse(await repo.save(existing));
    }
    const saved = await repo.save(
      repo.create({ tenantId, driveFileId, sharedWithUserId, role, createdByUserId }),
    );
    return DriveShareViewSchema.parse(saved);
  }

  static async removeShare(tenantId: string, driveFileId: string, sharedWithUserId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(DriveShare);
    const row = await repo.findOne({ where: { tenantId, driveFileId, sharedWithUserId, deletedAt: IsNull() } });
    if (!row) throw new AppError(DriveMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    await repo.softRemove(row);
  }

  /** Nodes shared directly with a user (does not include ancestor inheritance). */
  static async listSharedWithMe(tenantId: string, userId: string): Promise<DriveFile[]> {
    const ds = await tenantDataSourceFor(tenantId);
    const shares = await ds.getRepository(DriveShare).find({
      where: { tenantId, sharedWithUserId: userId, deletedAt: IsNull() },
    });
    if (!shares.length) return [];
    const ids = shares.map((s) => s.driveFileId);
    return ds.getRepository(DriveFile).find({ where: ids.map((id) => ({ tenantId, driveFileId: id })) });
  }

  // ── Public links ────────────────────────────────────────────────────────────

  static async listPublicLinks(tenantId: string, driveFileId: string): Promise<DrivePublicLinkView[]> {
    const ds = await tenantDataSourceFor(tenantId);
    const rows = await ds.getRepository(DrivePublicLink).find({
      where: { tenantId, driveFileId, deletedAt: IsNull() },
      order: { createdAt: 'ASC' },
    });
    return rows.map((r) => DrivePublicLinkViewSchema.parse(r));
  }

  static async createPublicLink(
    tenantId: string,
    driveFileId: string,
    createdByUserId: string,
    role: DrivePublicRole,
    expiresAt: Date | null,
  ): Promise<DrivePublicLinkView> {
    const ds = await tenantDataSourceFor(tenantId);
    // Public links are only meaningful for files (a folder has no single object).
    const node = await ds.getRepository(DriveFile).findOne({ where: { tenantId, driveFileId } });
    if (!node) throw new AppError(DriveMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (node.type !== 'file') throw new AppError(DriveMessages.CANNOT_SHARE_FOLDER_PUBLIC, 400, ErrorCode.VALIDATION_ERROR);

    const repo = ds.getRepository(DrivePublicLink);
    const token = randomBytes(24).toString('base64url');
    const saved = await repo.save(repo.create({ tenantId, driveFileId, token, role, expiresAt, createdByUserId }));
    return DrivePublicLinkViewSchema.parse(saved);
  }

  static async revokePublicLink(tenantId: string, drivePublicLinkId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(DrivePublicLink);
    const row = await repo.findOne({ where: { tenantId, drivePublicLinkId, deletedAt: IsNull() } });
    if (!row) throw new AppError(DriveMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    await repo.softRemove(row);
  }

  /**
   * Resolve a public token to its file + granted role. Throws 404 for an
   * unknown / revoked / expired token. Used by the unauthenticated public route.
   */
  static async resolvePublicToken(tenantId: string, token: string): Promise<{ node: DriveFile; role: DrivePublicRole }> {
    const ds = await tenantDataSourceFor(tenantId);
    const link = await ds.getRepository(DrivePublicLink).findOne({ where: { tenantId, token, deletedAt: IsNull() } });
    if (!link) throw new AppError(DriveMessages.PUBLIC_LINK_INVALID, 404, ErrorCode.NOT_FOUND);
    if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
      throw new AppError(DriveMessages.PUBLIC_LINK_INVALID, 404, ErrorCode.NOT_FOUND);
    }
    const node = await ds.getRepository(DriveFile).findOne({ where: { tenantId, driveFileId: link.driveFileId } });
    if (!node) throw new AppError(DriveMessages.PUBLIC_LINK_INVALID, 404, ErrorCode.NOT_FOUND);
    return { node, role: link.role as DrivePublicRole };
  }
}
