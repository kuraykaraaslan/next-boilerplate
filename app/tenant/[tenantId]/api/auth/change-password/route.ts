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
 * POST /api/tenant/{tenantId}/auth/change-password
 *
 * Same contract as the system route, but uses the tenantId for policy
 * resolution so tenant-level overrides (KD-5 / KD-7) take effect.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const { tenantId } = await params;
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

    await AuthService.changePassword({ userId: user.userId, newPassword, tenantId });

    await UserSessionService.deleteOtherSessions(user.userId, userSession.userSessionId).catch(
      (err: unknown) => Logger.warn(`change-password (tenant): failed to clear sibling sessions: ${err instanceof Error ? err.message : err}`),
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
    Logger.error(`change-password (tenant) failed: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json({ error: AuthMessages.UNKNOWN_ERROR }, { status: 500 });
  }
}
