import Logger from '@/modules/logger';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getSystemDataSource } from '@/modules/db';
import { User as UserEntity } from '@/modules/user/entities/user.entity';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import UserSessionNextService from '@/modules_next/user_session/user_session.service.next';
import UserSessionService from '@/modules/user_session/user_session.service';
import AuthService from '@/modules/auth/auth.service';
import { ChangePasswordDTO } from '@/modules/auth/auth.dto';
import AuthMessages from '@/modules/auth/auth.messages';

/**
 * POST /api/system/auth/change-password
 *
 * Authenticated password change for the current user. The route:
 *   - requires a valid access token (httpOnly cookie)
 *   - re-verifies the current password (KD-2/KD-8 safe-guard against
 *     session hijack — knowledge of a single hijacked session must not
 *     be enough to change the password)
 *   - delegates policy enforcement (KD-5 complexity, KD-7 reuse) to
 *     AuthService.changePassword
 *   - invalidates other sessions of the same user so the rotation is real
 */
export async function POST(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'auth');
    if (_rl) return _rl;

    const { user, userSession } = await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredUserRole: 'USER',
    });
    if (!user) {
      return NextResponse.json({ error: AuthMessages.USER_NOT_AUTHENTICATED }, { status: 401 });
    }

    const body = await request.json();
    const parsed = ChangePasswordDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }
    const { currentPassword, newPassword } = parsed.data;

    const ds = await getSystemDataSource();
    const dbUser = await ds.getRepository(UserEntity).findOne({ where: { userId: user.userId } });
    if (!dbUser) {
      return NextResponse.json({ error: AuthMessages.USER_NOT_FOUND }, { status: 404 });
    }

    const ok = await bcrypt.compare(currentPassword, dbUser.password);
    if (!ok) {
      return NextResponse.json({ error: AuthMessages.INVALID_CREDENTIALS }, { status: 401 });
    }

    await AuthService.changePassword({ userId: user.userId, newPassword });

    // Drop sibling sessions so other devices are forced to re-authenticate
    // with the new password.
    await UserSessionService.deleteOtherSessions(user.userId, userSession.userSessionId).catch(
      (err: unknown) => Logger.warn(`change-password: failed to clear sibling sessions: ${err instanceof Error ? err.message : err}`),
    );

    return NextResponse.json({ message: AuthMessages.PASSWORD_RESET_SUCCESSFUL }, { status: 200 });
  } catch (error: any) {
    const knownPolicy = new Set<string>([
      AuthMessages.PASSWORD_TOO_SHORT,
      AuthMessages.PASSWORD_MISSING_UPPERCASE,
      AuthMessages.PASSWORD_MISSING_LOWERCASE,
      AuthMessages.PASSWORD_MISSING_DIGIT,
      AuthMessages.PASSWORD_MISSING_SPECIAL,
      AuthMessages.PASSWORD_CONTAINS_IDENTITY,
      AuthMessages.PASSWORD_HAS_SEQUENTIAL_OR_REPEATED,
      AuthMessages.PASSWORD_REUSED,
    ]);
    if (knownPolicy.has(error?.message)) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    Logger.error(`change-password failed: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json({ error: AuthMessages.UNKNOWN_ERROR }, { status: 500 });
  }
}
