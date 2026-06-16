import { NextRequest, NextResponse } from "next/server";
import AIService from "@nb/ai/server/ai.service";
import Limiter from "@nb/limiter/server/limiter.service.next";
import { z } from "zod";

import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';
const UsageQuerySchema = z.object({
  provider: z.enum(["openai", "anthropic", "google"]).optional(),
  days: z.number().int().positive().max(90).default(30),
});

/**
 * GET /tenant/[tenantId]/api/ai/usage
 * Root-tenant admins only.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params
    try {

      await TenantSessionNextService.authenticateTenantByRequest({

        request, tenantId, requiredTenantRole: 'ADMIN',

      });

    } catch (err: any) {

      return NextResponse.json({ success: false, message: err.message }, { status: 403 });

    }
    const { searchParams } = new URL(request.url);
    const parsed = UsageQuerySchema.safeParse({
      provider: searchParams.get("provider") ?? undefined,
      days: searchParams.get("days") ? Number(searchParams.get("days")) : 30,
    });

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    const { provider, days } = parsed.data;
    const providers = provider ? [provider] : (["openai", "anthropic", "google"] as const);

    const usage: Record<string, { daily: Record<string, number>; total: number }> = {};

    await Promise.all(
      providers.map(async (p) => {
        const [daily, total] = await Promise.all([
          AIService.getUsage(tenantId, p, days),
          AIService.getTotalUsage(tenantId, p, days),
        ]);
        usage[p] = { daily, total };
      })
    );

    return NextResponse.json({ usage, days }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
