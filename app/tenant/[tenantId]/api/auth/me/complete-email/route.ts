// path: app/tenant/[tenantId]/api/auth/me/complete-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import UserSessionNextService from '@nb/user_session/server/user_session.service.next';
import AuthVerificationService from '@nb/auth/server/auth.verification.service';
import SSOService from '@nb/auth_sso/server/auth_sso.service';
import UserService from '@nb/user/server/user.service';
import Limiter from '@nb/limiter/server/limiter.service.next';
import { AppError, ErrorCode } from '@nb/common/server/app-error';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /tenant/[tenantId]/api/auth/me/complete-email
 *
 * Replace the synthetic placeholder email of a national-identity (or other
 * no-email provider) account with a real one, then send a verification mail.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const rl = await Limiter.checkRateLimit(req, 'auth');
  if (rl) return rl;

  const { tenantId } = await params;
  try {
    const { user } = await UserSessionNextService.authenticateUserByRequest({ request: req });
    if (!SSOService.isPlaceholderEmail(user.email)) {
      throw new AppError('This account already has a real email.', 400, ErrorCode.VALIDATION_ERROR);
    }

    const { email } = await req.json();
    const normalized = String(email ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) throw new AppError('A valid email is required.', 400, ErrorCode.VALIDATION_ERROR);

    const taken = await UserService.getByEmail(normalized);
    if (taken) throw new AppError('That email is already in use. Sign in to that account and link instead.', 409, ErrorCode.CONFLICT);

    await UserService.update({ userId: user.userId, data: { email: normalized } });
    await AuthVerificationService.sendEmailVerification({ userId: user.userId, email: normalized, tenantId });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const status = e instanceof AppError ? e.statusCode : 500;
    const message = e instanceof Error ? e.message : 'complete_email_failed';
    return NextResponse.json({ ok: false, message }, { status });
  }
}
