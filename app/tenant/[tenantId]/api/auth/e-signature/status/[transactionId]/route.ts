import { NextRequest, NextResponse } from 'next/server';
import Logger from '@/modules/logger';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import ESignatureService from '@/modules/e_signature/e_signature.service';
import UserService from '@/modules/user/user.service';
import UserSecurityService from '@/modules/user_security/user_security.service';
import UserSessionNextService from '@/modules_next/user_session/user_session.service.next';
import { SafeUserSecuritySchema } from '@/modules/user_security/user_security.types';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import TenantService from '@/modules/tenant/tenant.service';
import TenantMemberService from '@/modules/tenant_member/tenant_member.service';
import { E_SIGNATURE_MESSAGES } from '@/modules/e_signature/e_signature.messages';

interface RouteContext {
  params: Promise<{ tenantId: string; transactionId: string }>;
}

export async function GET(request: NextRequest, ctx: RouteContext) {
  try {
    const { tenantId, transactionId } = await ctx.params;
    const tenant = await TenantService.getById(tenantId);
    if (!tenant || tenant.tenantStatus !== 'ACTIVE') {
      return NextResponse.json({ success: false, error: { message: 'Tenant not found or inactive' } }, { status: 404 });
    }

    const rl = await Limiter.checkRateLimit(request, 'auth');
    if (rl) return rl;

    const ip = Limiter.getIpFromRequest(request);
    const ua = request.headers.get('user-agent') || null;

    const result = await ESignatureService.pollStatus({ transactionId, ip, ua });

    if (result.status !== 'signed') {
      return NextResponse.json({ success: true, data: result });
    }

    if (!result.matchedUserId) {
      await AuditLogService.log({
        action: 'auth.e_signature.signed_needs_binding',
        actorType: 'SYSTEM',
        tenantId,
        resourceType: 'e_signature_transaction',
        resourceId: transactionId,
        ipAddress: ip ?? undefined,
        userAgent: ua ?? undefined,
        metadata: {
          provider: result.transactionRecord.providerName,
          country: result.transactionRecord.country,
          cert_fingerprint: result.identity.evidence.fingerprint_sha256,
        },
      });
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NEEDS_BINDING', message: E_SIGNATURE_MESSAGES.NEEDS_BINDING },
          data: { status: 'signed_needs_binding', identity: result.identity },
        },
        { status: 403 },
      );
    }

    // Tenant-scope login requires the matched user to be an active member.
    const member = await TenantMemberService
      .getByTenantAndUser({ tenantMemberId: null, tenantId, userId: result.matchedUserId })
      .catch(() => null);
    if (!member) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_A_MEMBER', message: 'User is not a member of this tenant' } },
        { status: 403 },
      );
    }

    const user = await UserService.getById(result.matchedUserId);
    const userSecurity = await UserSecurityService.getSafeByUserId(result.matchedUserId);

    const { rawAccessToken, rawRefreshToken } = await UserSessionNextService.createSession({
      user,
      request,
      userSecurity,
      otpIgnore: true,
    });

    const origin = request.headers.get('origin') || '';
    const protocol = request.headers.get('x-forwarded-proto') || request.headers.get('x-scheme') || 'http';
    const isSecure = origin.startsWith('https://') || protocol === 'https';
    const cookieOptions = isSecure
      ? { httpOnly: true, secure: true, sameSite: 'none' as const, path: '/', maxAge: 60 * 60 * 24 * 7 }
      : { httpOnly: true, sameSite: 'lax' as const, path: '/', maxAge: 60 * 60 * 24 * 7 };

    const response = NextResponse.json(
      {
        success: true,
        data: {
          status: 'signed',
          identity: result.identity,
          user,
          userSecurity: SafeUserSecuritySchema.parse(userSecurity),
        },
      },
      { status: 200 },
    );
    response.cookies.set('accessToken', rawAccessToken, cookieOptions);
    response.cookies.set('refreshToken', rawRefreshToken, cookieOptions);

    await AuditLogService.log({
      action: 'auth.login.e_signature',
      actorType: 'USER',
      actorId: result.matchedUserId,
      tenantId,
      resourceType: 'user_session',
      ipAddress: ip ?? undefined,
      userAgent: ua ?? undefined,
      metadata: {
        provider: result.transactionRecord.providerName,
        country: result.transactionRecord.country,
        loa: result.identity.loa,
        cert_serial: result.identity.evidence.serial,
        cert_issuer: result.identity.evidence.issuer_dn,
      },
    });

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'e_signature.status failed';
    Logger.warn(`tenant e_signature status failed: ${message}`);
    return NextResponse.json({ success: false, error: { message } }, { status: 400 });
  }
}
