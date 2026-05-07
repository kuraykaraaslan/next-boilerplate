import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import ImpersonationService from "@/modules/auth_impersonation/impersonation.service";
import ImpersonationMessages from "@/modules/auth_impersonation/impersonation.messages";
import { StartSystemImpersonationDTO } from "@/modules/auth_impersonation/impersonation.dto";
import Limiter from "@/libs/limiter";

function getCookieOptions(request: NextRequest, maxAge: number) {
  const origin = request.headers.get("origin") || "";
  const protocol = request.headers.get("x-forwarded-proto") || request.headers.get("x-scheme") || "http";
  const isSecure = origin.startsWith("https://") || protocol === "https";
  return isSecure
    ? { httpOnly: true, secure: true, sameSite: "none" as const, path: "/", maxAge }
    : { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge };
}

// POST /system/api/auth/impersonate
// Flow 1: System ADMIN starts impersonating a user in a tenant
export async function POST(request: NextRequest) {
  try {
    const _rl = await Limiter.useRateLimit(request, 'auth');
    if (_rl) return _rl;
    const { user, userSession } = await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredUserRole: "ADMIN",
    });

    const body = await request.json();
    const parsed = StartSystemImpersonationDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { targetUserId, tenantId, targetTenantRole } = parsed.data;

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const { userSession: impersonationSession, rawAccessToken, rawRefreshToken } =
      await ImpersonationService.startSystemImpersonation({
        impersonatorUser: user,
        impersonatorSession: userSession,
        targetUserId,
        tenantId,
        targetTenantRole,
        ipAddress,
        userAgent,
      });

    const response = NextResponse.json(
      { message: ImpersonationMessages.IMPERSONATION_STARTED, impersonationSession },
      { status: 200 }
    );

    const originalAccessToken = request.cookies.get("accessToken")?.value ?? "";
    const originalRefreshToken = request.cookies.get("refreshToken")?.value ?? "";

    const shortOpts = getCookieOptions(request, 60 * 60);       // 1h
    const longOpts  = getCookieOptions(request, 60 * 60 * 24 * 7); // 7d

    response.cookies.set("accessToken",             rawAccessToken,        shortOpts);
    response.cookies.set("refreshToken",            rawRefreshToken,       shortOpts);
    response.cookies.set("impersonatorAccessToken", originalAccessToken,   shortOpts);
    response.cookies.set("impersonatorRefreshToken", originalRefreshToken, longOpts);

    return response;
  } catch (error: any) {
    const clientErrors = [
      ImpersonationMessages.CANNOT_IMPERSONATE_SELF,
      ImpersonationMessages.CANNOT_IMPERSONATE_EQUAL_OR_HIGHER_GLOBAL_ROLE,
      ImpersonationMessages.TARGET_USER_NOT_FOUND,
      ImpersonationMessages.INSUFFICIENT_PRIVILEGES,
    ];
    const status = clientErrors.includes(error.message) ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

// DELETE /system/api/auth/impersonate
// Exit impersonation and restore original admin session
export async function DELETE(request: NextRequest) {
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
        actorId:      meta?.impersonatorUserId,
        targetUserId: impersonationSession.userId,
        tenantId:     meta?.tenantId,
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

// GET /system/api/auth/impersonate
// Return current impersonation status (for UI banner)
export async function GET(request: NextRequest) {
  try {
    const accessToken    = request.cookies.get("accessToken")?.value;
    const hasBackupToken = !!request.cookies.get("impersonatorAccessToken")?.value;

    if (!accessToken || !hasBackupToken) {
      return NextResponse.json({ isImpersonating: false }, { status: 200 });
    }

    const impersonationSession =
      await ImpersonationService.getActiveImpersonationSession(accessToken);

    if (!impersonationSession) {
      return NextResponse.json({ isImpersonating: false }, { status: 200 });
    }

    const meta = (impersonationSession.metadata as any)?.impersonation;

    return NextResponse.json({
      isImpersonating: true,
      impersonationSession,
      impersonatorUserId: meta?.impersonatorUserId ?? null,
      tenantId:           meta?.tenantId ?? null,
      targetTenantRole:   meta?.targetTenantRole ?? null,
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
