import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import TenantSessionNextService from "@nb/tenant_session/server/tenant_session.service.next";
import ImpersonationService from "@nb/auth_impersonation/server/impersonation.service";
import ImpersonationMessages from "@nb/auth_impersonation/server/impersonation.messages";
import { StartTenantImpersonationDTO } from "@nb/auth_impersonation/server/impersonation.dto";
import Limiter from "@nb/limiter/server/limiter.service.next";

function getCookieOptions(request: NextRequest, maxAge: number) {
  const origin = request.headers.get("origin") || "";
  const protocol = request.headers.get("x-forwarded-proto") || request.headers.get("x-scheme") || "http";
  const isSecure = origin.startsWith("https://") || protocol === "https";
  return isSecure
    ? { httpOnly: true, secure: true, sameSite: "none" as const, path: "/", maxAge }
    : { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge };
}

// POST /tenant/[tenantId]/api/auth/impersonate
// Flow 2: Tenant ADMIN or OWNER starts impersonating a tenant USER
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const _rl = await Limiter.useRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    const { user, userSession, tenantMember } =
      await TenantSessionNextService.authenticateTenantByRequest({
        request,
        requiredTenantRole: "ADMIN",
        tenantIdSource: "param",
        tenantId,
      });

    const body = await request.json();
    const parsed = StartTenantImpersonationDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { targetUserId, reason, stepUp } = parsed.data;

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const { userSession: impersonationSession, rawAccessToken, rawRefreshToken } =
      await ImpersonationService.startTenantImpersonation({
        impersonatorUser: user,
        impersonatorMember: tenantMember,
        impersonatorSession: userSession,
        targetUserId,
        tenantId,
        reason,
        stepUp,
        ipAddress,
        userAgent,
      });

    const response = NextResponse.json(
      { message: ImpersonationMessages.IMPERSONATION_STARTED, impersonationSession },
      { status: 200 }
    );

    const originalAccessToken  = request.cookies.get("accessToken")?.value ?? "";
    const originalRefreshToken = request.cookies.get("refreshToken")?.value ?? "";

    const shortOpts = getCookieOptions(request, 60 * 60);
    const longOpts  = getCookieOptions(request, 60 * 60 * 24 * 7);

    response.cookies.set("accessToken",              rawAccessToken,        shortOpts);
    response.cookies.set("refreshToken",             rawRefreshToken,       shortOpts);
    response.cookies.set("impersonatorAccessToken",  originalAccessToken,   shortOpts);
    response.cookies.set("impersonatorRefreshToken", originalRefreshToken,  longOpts);

    return response;
  } catch (error: any) {
    const msg = error?.message;
    const forbidden = [
      ImpersonationMessages.CANNOT_IMPERSONATE_SELF,
      ImpersonationMessages.TARGET_MUST_BE_TENANT_USER,
      ImpersonationMessages.IMPERSONATION_DISABLED_FOR_TENANT,
    ];
    const unauthorized = [
      ImpersonationMessages.STEP_UP_REQUIRED,
      ImpersonationMessages.STEP_UP_INVALID_PASSWORD,
      ImpersonationMessages.STEP_UP_INVALID_TOTP,
    ];
    const badRequest = [
      ImpersonationMessages.TARGET_USER_NOT_FOUND,
      ImpersonationMessages.TARGET_NOT_FOUND,
      ImpersonationMessages.TARGET_NOT_MEMBER_OF_TENANT,
      ImpersonationMessages.REASON_REQUIRED,
      ImpersonationMessages.STEP_UP_METHOD_UNAVAILABLE,
    ];
    let status = 500;
    if (msg === ImpersonationMessages.IMPERSONATION_CONCURRENCY_LIMIT_REACHED) status = 429;
    else if (forbidden.includes(msg)) status = 403;
    else if (unauthorized.includes(msg)) status = 401;
    else if (badRequest.includes(msg)) status = 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}

// DELETE /tenant/[tenantId]/api/auth/impersonate
// Exit impersonation and restore original session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const impersonationAccessToken = request.cookies.get("accessToken")?.value;
    const originalAccessToken      = request.cookies.get("impersonatorAccessToken")?.value;
    const originalRefreshToken     = request.cookies.get("impersonatorRefreshToken")?.value;

    if (!impersonationAccessToken || !originalAccessToken || !originalRefreshToken) {
      return NextResponse.json({ error: ImpersonationMessages.NOT_IMPERSONATING }, { status: 400 });
    }

    const impersonationSession =
      await ImpersonationService.getActiveImpersonationSession(impersonationAccessToken);

    if (impersonationSession) {
      const meta = (impersonationSession.metadata as any)?.impersonation;
      await ImpersonationService.endImpersonationSession(impersonationSession.userSessionId, {
        actorId:                meta?.impersonatorUserId,
        targetUserId:           impersonationSession.userId,
        tenantId:               meta?.tenantId,
        impersonationSessionId: meta?.impersonationSessionId,
        startedAtMs:            impersonationSession.createdAt
          ? new Date(impersonationSession.createdAt).getTime()
          : undefined,
      });
    }

    const response = NextResponse.json(
      { message: ImpersonationMessages.IMPERSONATION_ENDED },
      { status: 200 }
    );

    const shortOpts  = getCookieOptions(request, 60 * 60);
    const longOpts   = getCookieOptions(request, 60 * 60 * 24 * 7);
    const deleteOpts = getCookieOptions(request, 0);

    response.cookies.set("accessToken",              originalAccessToken,  shortOpts);
    response.cookies.set("refreshToken",             originalRefreshToken, longOpts);
    response.cookies.set("impersonatorAccessToken",  "", deleteOpts);
    response.cookies.set("impersonatorRefreshToken", "", deleteOpts);

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /tenant/[tenantId]/api/auth/impersonate
// Impersonation status for this tenant
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const accessToken    = request.cookies.get("accessToken")?.value;
    const hasBackupToken = !!request.cookies.get("impersonatorAccessToken")?.value;

    if (!accessToken || !hasBackupToken) {
      return NextResponse.json({ isImpersonating: false }, { status: 200 });
    }

    // GOODTOHAVE #5 / #7 — banner context + auto-expiry (expiresAt / remainingMs).
    const ctx = await ImpersonationService.getImpersonationContext(accessToken);

    if (!ctx) {
      return NextResponse.json({ isImpersonating: false }, { status: 200 });
    }

    return NextResponse.json({
      isImpersonating:        true,
      impersonatorUserId:     ctx.impersonatorUserId,
      targetUserId:           ctx.targetUserId,
      tenantId:               ctx.tenantId,
      targetTenantRole:       ctx.targetTenantRole,
      impersonationSessionId: ctx.impersonationSessionId,
      expiresAt:              ctx.expiresAt,
      remainingMs:            ctx.remainingMs,
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
