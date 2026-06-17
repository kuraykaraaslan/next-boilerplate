// path: app/tenant/[tenantId]/api/auth/me/preferences/route.ts
import { NextRequest, NextResponse } from 'next/server';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import UserPreferencesService from '@kuraykaraaslan/user_preferences/server/user_preferences.service';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import { UpdatePreferencesRequestSchema } from '@kuraykaraaslan/user_preferences/server/user_preferences.dto';
import AuthMessages from '@kuraykaraaslan/auth/server/auth.messages';

/**
 * GET /tenant/[tenantId]/api/auth/me/preferences
 * Tenant-scoped /api/auth/me endpoint.
 * Preferences are user-global; tenant membership is checked for authentication only.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    const { user } = await TenantSessionNextService.authenticateTenantByRequest({
      request,
      tenantId,
    });

    const userPreferences = await UserPreferencesService.getByUserId(user.userId);
    return NextResponse.json({ userPreferences }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'An error occurred' },
      { status: 500 },
    );
  }
}

/**
 * PUT /tenant/[tenantId]/api/auth/me/preferences
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    const { user } = await TenantSessionNextService.authenticateTenantByRequest({
      request,
      tenantId,
    });

    const body = await request.json();
    const prefsData = body.userPreferences ?? body;
    const parsedData = UpdatePreferencesRequestSchema.safeParse(prefsData);

    if (!parsedData.success) {
      return NextResponse.json(
        { message: parsedData.error.issues.map((e: any) => e.message).join(', ') },
        { status: 400 },
      );
    }

    const updatedPreferences = await UserPreferencesService.update(user.userId, parsedData.data);
    return NextResponse.json(
      {
        message: AuthMessages.PREFERENCES_UPDATED_SUCCESSFULLY,
        userPreferences: updatedPreferences,
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'An error occurred' },
      { status: 500 },
    );
  }
}
