import { NextRequest, NextResponse } from 'next/server';
import Logger from '@nb/logger';
import Limiter from '@nb/limiter/server/limiter.service.next';
import AuthESignatureService from '@nb/auth_e_signature/server/auth_e_signature.service';
import { InitiateLoginDTO } from '@nb/e_signature/server/e_signature.dto';
import AuditLogService from '@nb/audit_log/server/audit_log.service';
import TenantService from '@nb/tenant/server/tenant.service';

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  try {
    const { tenantId } = await ctx.params;
    const tenant = await TenantService.getById(tenantId);
    if (!tenant || tenant.tenantStatus !== 'ACTIVE') {
      return NextResponse.json({ success: false, error: { message: 'Tenant not found or inactive' } }, { status: 404 });
    }

    const rl = await Limiter.checkRateLimit(request, 'auth');
    if (rl) return rl;

    const body = await request.json().catch(() => ({}));
    const parsed = InitiateLoginDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const ip = Limiter.getIpFromRequest(request);
    const ua = request.headers.get('user-agent') || null;

    const result = await AuthESignatureService.initiate({
      country: parsed.data.country,
      identifier: parsed.data.identifier,
      providerOverride: parsed.data.providerOverride,
      ip,
      ua,
      purpose: 'login',
      tenantId,
    });

    await AuditLogService.log({
      action: 'auth.e_signature.initiate',
      actorType: 'SYSTEM',
      tenantId,
      resourceType: 'e_signature_transaction',
      resourceId: result.transactionId,
      ipAddress: ip ?? undefined,
      userAgent: ua ?? undefined,
      metadata: { provider: result.providerName, country: parsed.data.country, purpose: 'login' },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'e_signature.initiate failed';
    Logger.warn(`tenant e_signature initiate failed: ${message}`);
    return NextResponse.json({ success: false, error: { message } }, { status: 400 });
  }
}
