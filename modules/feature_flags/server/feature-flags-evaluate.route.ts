import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import { FeatureFlagsService, EvaluateDTO } from '@kuraykaraaslan/feature_flags';

/**
 * POST /tenant/[tenantId]/api/feature-flags/evaluate
 * Evaluate one flag (when `key` is supplied) or every flag for the caller's
 * context. Any authenticated tenant user may evaluate; the caller's userId is
 * used as the default subject when the body omits one.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;
    const { user } = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId });

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const parsed = EvaluateDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }

    const ctx = {
      userId: parsed.data.userId ?? user.userId,
      anonymousId: parsed.data.anonymousId,
      attributes: parsed.data.attributes,
    };

    if (parsed.data.key) {
      return NextResponse.json(await FeatureFlagsService.evaluate(tenantId, parsed.data.key, ctx), { status: 200 });
    }
    return NextResponse.json({ flags: await FeatureFlagsService.evaluateAll(tenantId, ctx) }, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
