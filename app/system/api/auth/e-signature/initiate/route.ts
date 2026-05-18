import { NextRequest, NextResponse } from 'next/server';
import Logger from '@/modules/logger';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import ESignatureService from '@/modules/e_signature/e_signature.service';
import { InitiateLoginDTO } from '@/modules/e_signature/e_signature.dto';
import AuditLogService from '@/modules/audit_log/audit_log.service';

export async function POST(request: NextRequest) {
  try {
    const rl = await Limiter.checkRateLimit(request, 'auth');
    if (rl) return rl;

    const body = await request.json().catch(() => ({}));
    const parsed = InitiateLoginDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const ip = Limiter.getIpFromRequest(request);
    const ua = request.headers.get('user-agent') || null;

    const result = await ESignatureService.initiateLogin({
      country: parsed.data.country,
      identifier: parsed.data.identifier,
      providerOverride: parsed.data.providerOverride,
      ip,
      ua,
      purpose: 'login',
    });

    await AuditLogService.log({
      action: 'auth.e_signature.initiate',
      actorType: 'SYSTEM',
      resourceType: 'e_signature_transaction',
      resourceId: result.transactionId,
      ipAddress: ip ?? undefined,
      userAgent: ua ?? undefined,
      metadata: {
        provider: result.providerName,
        country: parsed.data.country,
        purpose: 'login',
      },
    });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'e_signature.initiate failed';
    Logger.warn(`e_signature initiate failed: ${message}`);
    return NextResponse.json({ success: false, error: { message } }, { status: 400 });
  }
}
