import crypto from "crypto";
import { systemPrisma, tenantPrisma } from "@/libs/prisma";
import type { Prisma } from "@/prisma/tenant/client";
import { SafeTenantInvitation, SafeTenantInvitationSchema } from "./tenant_invitation.types";
import { SendInvitationInput, GetInvitationsInput } from "./tenant_invitation.dto";
import TenantInvitationMessages from "./tenant_invitation.messages";
import TenantMemberService from "../tenant_member/tenant_member.service";
import type { TenantMemberRole } from "../tenant_member/tenant_member.enums";

const INVITATION_TTL_SECONDS = parseInt(
  process.env.INVITATION_TTL_SECONDS || `${60 * 60 * 24 * 7}` // 7 days default
);

export default class TenantInvitationService {

  static hashToken(rawToken: string): string {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
  }

  static generateRawToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  static async getByTenantId({
    tenantId,
    page,
    pageSize,
    status,
  }: GetInvitationsInput): Promise<{ invitations: SafeTenantInvitation[]; total: number }> {
    const where: Prisma.TenantInvitationWhereInput = { tenantId };

    if (status) {
      where.status = status;
    }

    const safePage = Math.max(1, page);

    const [rows, total] = await Promise.all([
      tenantPrisma.tenantInvitation.findMany({
        where,
        skip: (safePage - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      tenantPrisma.tenantInvitation.count({ where }),
    ]);

    return {
      invitations: rows.map((r) => SafeTenantInvitationSchema.parse(r)),
      total,
    };
  }

  static async getById(invitationId: string): Promise<SafeTenantInvitation> {
    const invitation = await tenantPrisma.tenantInvitation.findFirst({
      where: { invitationId },
    });

    if (!invitation) {
      throw new Error(TenantInvitationMessages.INVITATION_NOT_FOUND);
    }

    return SafeTenantInvitationSchema.parse(invitation);
  }

  static async getByToken(rawToken: string): Promise<SafeTenantInvitation> {
    const hashed = TenantInvitationService.hashToken(rawToken);

    const invitation = await tenantPrisma.tenantInvitation.findFirst({
      where: { token: hashed },
    });

    if (!invitation) {
      throw new Error(TenantInvitationMessages.INVITATION_INVALID_TOKEN);
    }

    return SafeTenantInvitationSchema.parse(invitation);
  }

  /**
   * Send an invitation. Auto-revokes any existing PENDING invite for the same tenant+email.
   */
  static async send(
    tenantId: string,
    invitedByUserId: string,
    { email, memberRole }: SendInvitationInput
  ): Promise<{ invitation: SafeTenantInvitation; rawToken: string }> {
    const normalizedEmail = email.toLowerCase();

    // Check that the email isn't already an active member
    const existingUser = await systemPrisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      const alreadyMember = await TenantMemberService.getByTenantAndUser({
        tenantId,
        userId: existingUser.userId,
        tenantMemberId: null,
      });

      if (alreadyMember) {
        throw new Error(TenantInvitationMessages.INVITATION_ALREADY_MEMBER);
      }
    }

    // Auto-revoke any existing PENDING invite for same tenant+email
    await tenantPrisma.tenantInvitation.updateMany({
      where: { tenantId, email: normalizedEmail, status: "PENDING" },
      data: { status: "REVOKED" },
    });

    const rawToken = TenantInvitationService.generateRawToken();
    const hashedToken = TenantInvitationService.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITATION_TTL_SECONDS * 1000);

    const invitation = await tenantPrisma.tenantInvitation.create({
      data: {
        tenantId,
        email: normalizedEmail,
        invitedByUserId,
        memberRole,
        token: hashedToken,
        status: "PENDING",
        expiresAt,
      },
    });

    return { invitation: SafeTenantInvitationSchema.parse(invitation), rawToken };
  }

  /**
   * Preview invitation info by raw token (public, no auth required).
   */
  static async preview(
    tenantId: string,
    rawToken: string
  ): Promise<{ invitation: SafeTenantInvitation; tenant: { tenantId: string; name: string } }> {
    const hashed = TenantInvitationService.hashToken(rawToken);

    const invitation = await tenantPrisma.tenantInvitation.findFirst({
      where: { token: hashed, tenantId },
      include: { tenant: true },
    });

    if (!invitation) {
      throw new Error(TenantInvitationMessages.INVITATION_INVALID_TOKEN);
    }

    TenantInvitationService.assertUsable(invitation);

    return {
      invitation: SafeTenantInvitationSchema.parse(invitation),
      tenant: { tenantId: invitation.tenant.tenantId, name: invitation.tenant.name },
    };
  }

  /**
   * Accept an invitation. The calling user must own the email address on the invite.
   */
  static async accept(tenantId: string, userId: string, userEmail: string, rawToken: string): Promise<void> {
    const hashed = TenantInvitationService.hashToken(rawToken);

    const invitation = await tenantPrisma.tenantInvitation.findFirst({
      where: { token: hashed, tenantId },
    });

    if (!invitation) {
      throw new Error(TenantInvitationMessages.INVITATION_INVALID_TOKEN);
    }

    if (invitation.email !== userEmail.toLowerCase()) {
      throw new Error(TenantInvitationMessages.INVITATION_EMAIL_MISMATCH);
    }

    TenantInvitationService.assertUsable(invitation);

    // Add user as tenant member
    await TenantMemberService.create({
      tenantId,
      userId,
      memberRole: invitation.memberRole as TenantMemberRole,
      memberStatus: "ACTIVE",
    });

    await tenantPrisma.tenantInvitation.update({
      where: { invitationId: invitation.invitationId },
      data: { status: "ACCEPTED" },
    });
  }

  /**
   * Decline an invitation. The calling user must own the email address on the invite.
   */
  static async decline(tenantId: string, userEmail: string, rawToken: string): Promise<void> {
    const hashed = TenantInvitationService.hashToken(rawToken);

    const invitation = await tenantPrisma.tenantInvitation.findFirst({
      where: { token: hashed, tenantId },
    });

    if (!invitation) {
      throw new Error(TenantInvitationMessages.INVITATION_INVALID_TOKEN);
    }

    if (invitation.email !== userEmail.toLowerCase()) {
      throw new Error(TenantInvitationMessages.INVITATION_EMAIL_MISMATCH);
    }

    TenantInvitationService.assertUsable(invitation);

    await tenantPrisma.tenantInvitation.update({
      where: { invitationId: invitation.invitationId },
      data: { status: "DECLINED" },
    });
  }

  /**
   * Revoke an invitation (admin action).
   */
  static async revoke(invitationId: string, tenantId: string): Promise<void> {
    const invitation = await tenantPrisma.tenantInvitation.findFirst({
      where: { invitationId, tenantId },
    });

    if (!invitation) {
      throw new Error(TenantInvitationMessages.INVITATION_NOT_FOUND);
    }

    if (invitation.status !== "PENDING") {
      throw new Error(TenantInvitationMessages.INVITATION_NOT_FOUND);
    }

    await tenantPrisma.tenantInvitation.update({
      where: { invitationId },
      data: { status: "REVOKED" },
    });
  }

  /**
   * Auto-accept all PENDING invitations for a given email (called on register).
   */
  static async autoAcceptForEmail(userId: string, email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    const now = new Date();

    const pending = await tenantPrisma.tenantInvitation.findMany({
      where: {
        email: normalizedEmail,
        status: "PENDING",
        expiresAt: { gt: now },
      },
    });

    for (const invitation of pending) {
      try {
        const alreadyMember = await TenantMemberService.getByTenantAndUser({
          tenantId: invitation.tenantId,
          userId,
          tenantMemberId: null,
        });

        if (!alreadyMember) {
          await TenantMemberService.create({
            tenantId: invitation.tenantId,
            userId,
            memberRole: invitation.memberRole as TenantMemberRole,
            memberStatus: "ACTIVE",
          });
        }

        await tenantPrisma.tenantInvitation.update({
          where: { invitationId: invitation.invitationId },
          data: { status: "ACCEPTED" },
        });
      } catch {
        // Continue with remaining invitations even if one fails
      }
    }
  }

  private static assertUsable(invitation: { status: string; expiresAt: Date }): void {
    if (invitation.status === "ACCEPTED") {
      throw new Error(TenantInvitationMessages.INVITATION_ALREADY_ACCEPTED);
    }
    if (invitation.status === "DECLINED") {
      throw new Error(TenantInvitationMessages.INVITATION_ALREADY_DECLINED);
    }
    if (invitation.status === "REVOKED") {
      throw new Error(TenantInvitationMessages.INVITATION_REVOKED);
    }
    if (invitation.status === "EXPIRED" || invitation.expiresAt < new Date()) {
      throw new Error(TenantInvitationMessages.INVITATION_EXPIRED);
    }
  }
}
