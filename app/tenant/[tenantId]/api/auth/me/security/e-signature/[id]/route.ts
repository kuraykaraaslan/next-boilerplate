// path: app/tenant/[tenantId]/api/auth/me/security/e-signature/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import Logger from '@/modules/logger';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import AuthESignatureCertService from '@/modules/auth_e_signature/auth_e_signature.cert.service';
import AuditLogService from '@/modules/audit_log/audit_log.service';

interface RouteContext {
  params: Promise<{ tenantId: string; id: string }>;
}

/**
 * DELETE /tenant/[tenantId]/api/auth/me/security/e-signature/[id]
 * Revokes a signing certificate bound to the current user.
 */
export async function DELETE(request: NextRequest, ctx: RouteContext) {
  try {
    const rl = await Limiter.checkRateLimit(request, 'api');
    if (rl) return rl;

    const { tenantId, id } = await ctx.params;
    const { user } = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId });

    // Ownership check — a user may only revoke their own certificates.
    const certs = await AuthESignatureCertService.findByUser(user.userId);
    const target = certs.find((c) => c.signingCertificateId === id);
    if (!target) {
      return NextResponse.json({ success: false, error: { message: 'Certificate not found' } }, { status: 404 });
    }

    if (!target.revokedAt) {
      await AuthESignatureCertService.revoke(id);

      const ip = Limiter.getIpFromRequest(request);
      const ua = request.headers.get('user-agent') || null;
      await AuditLogService.log({
        action: 'auth.e_signature.cert.revoke',
        actorType: 'USER',
        actorId: user.userId,
        tenantId,
        resourceType: 'signing_certificate',
        resourceId: id,
        ipAddress: ip ?? undefined,
        userAgent: ua ?? undefined,
        metadata: { provider: target.providerName, country: target.country },
      });
    }

    return NextResponse.json({ success: true, data: { signingCertificateId: id } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to revoke certificate.';
    Logger.warn(`me e-signature revoke failed: ${message}`);
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}
