// path: app/tenant/[tenantId]/api/ai/chat/profiles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import { z } from 'zod';

const PROFILES_KEY = 'aiChat.profiles';

const ProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  provider: z.string().min(1),
  model: z.string().max(120).optional().default(''),
  systemPrompt: z.string().max(8000).optional().default(''),
});
const ProfilesSchema = z.array(ProfileSchema).max(50);
export type ChatProfile = z.infer<typeof ProfileSchema>;

function readProfiles(raw: string | null): ChatProfile[] {
  if (!raw) return [];
  try {
    const parsed = ProfilesSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

/** GET — chat profiles for the tenant (provider + model + default system prompt). Admin-only. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId } = await params;
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
    const profiles = readProfiles(await SettingService.getValue(tenantId, PROFILES_KEY));
    return NextResponse.json({ success: true, profiles });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to load chat profiles' }, { status: 500 });
  }
}

/** PUT { profiles: ChatProfile[] } — replace the tenant's chat profiles. Admin-only. */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId } = await params;
    const { user } = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });

    const body = await request.json().catch(() => ({}));
    const parsed = ProfilesSchema.safeParse(body?.profiles);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }
    await SettingService.updateMany(tenantId, { [PROFILES_KEY]: JSON.stringify(parsed.data) }, user?.userId ? { actorId: user.userId } : undefined);
    await SettingService.clearCache(tenantId);
    return NextResponse.json({ success: true, profiles: parsed.data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to save chat profiles' }, { status: 500 });
  }
}
