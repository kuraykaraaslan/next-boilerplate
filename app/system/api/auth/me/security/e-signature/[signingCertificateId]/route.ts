import { NextRequest, NextResponse } from 'next/server';
import Logger from '@/modules/logger';
import UserSessionNextService from '@/modules_next/user_session/user_session.service.next';
import ESignatureCertService from '@/modules/e_signature/e_signature.cert.service';
import AuditLogService from '@/modules/audit_log/audit_log.service';

interface RouteContext {
  params: Promise<{ signingCertificateId: string }>;
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  try {
    const auth = await UserSessionNextService.authenticateUserByRequest({ request });
    if (!auth) {
      return NextResponse.json({ success: false, error: { message: 'Authentication required' } }, { status: 401 });
    }
    const { signingCertificateId } = await ctx.params;

    // Ownership check — refuse to revoke someone else's certificate
    const owned = await ESignatureCertService.findByUser(auth.user.userId);
    const target = owned.find((c) => c.signingCertificateId === signingCertificateId);
    if (!target) {
      return NextResponse.json({ success: false, error: { message: 'Signing certificate not found' } }, { status: 404 });
    }

    await ESignatureCertService.revoke(signingCertificateId);

    await AuditLogService.log({
      action: 'auth.e_signature.revoke',
      actorType: 'USER',
      actorId: auth.user.userId,
      resourceType: 'signing_certificate',
      resourceId: signingCertificateId,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      metadata: {
        provider: target.providerName,
        country: target.country,
        cert_serial: target.certSerialHex,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    Logger.warn(`e_signature cert revoke failed: ${err instanceof Error ? err.message : err}`);
    return NextResponse.json({ success: false, error: { message: 'Failed to revoke signing certificate' } }, { status: 500 });
  }
}
