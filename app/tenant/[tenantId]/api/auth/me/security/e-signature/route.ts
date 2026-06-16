// path: app/tenant/[tenantId]/api/auth/me/security/e-signature/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@nb/limiter/server/limiter.service.next';
import Logger from '@nb/logger';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';
import AuthESignatureCertService from '@nb/auth_e_signature/server/auth_e_signature.cert.service';
import type { SigningCertificate } from '@nb/auth_e_signature/server/entities/signing_certificate.entity';

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

/**
 * Client-safe projection of a signing certificate. Sensitive fields
 * (fingerprint, subjectDN, nationalIdHash, userId) are intentionally omitted.
 */
function toClientCert(c: SigningCertificate) {
  return {
    signingCertificateId: c.signingCertificateId,
    providerName: c.providerName,
    country: c.country,
    commonName: c.commonName,
    certSerialHex: c.certSerialHex,
    issuerDN: c.issuerDN,
    loa: c.loa,
    notBefore: c.notBefore,
    notAfter: c.notAfter,
    boundAt: c.boundAt,
    lastUsedAt: c.lastUsedAt,
    revokedAt: c.revokedAt,
  };
}

/**
 * GET /tenant/[tenantId]/api/auth/me/security/e-signature
 * Lists the signing certificates bound to the current user.
 */
export async function GET(request: NextRequest, ctx: RouteContext) {
  try {
    const rl = await Limiter.checkRateLimit(request, 'api');
    if (rl) return rl;

    const { tenantId } = await ctx.params;
    const { user } = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId });

    const certs = await AuthESignatureCertService.findByUser(user.userId);

    return NextResponse.json({ success: true, data: certs.map(toClientCert) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load signing certificates.';
    Logger.warn(`me e-signature list failed: ${message}`);
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}
