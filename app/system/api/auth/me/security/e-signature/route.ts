import { NextRequest, NextResponse } from 'next/server';
import Logger from '@/modules/logger';
import UserSessionNextService from '@/modules_next/user_session/user_session.service.next';
import ESignatureCertService from '@/modules/e_signature/e_signature.cert.service';

export async function GET(request: NextRequest) {
  try {
    const auth = await UserSessionNextService.authenticateUserByRequest({ request });
    if (!auth) {
      return NextResponse.json({ success: false, error: { message: 'Authentication required' } }, { status: 401 });
    }

    const rows = await ESignatureCertService.findByUser(auth.user.userId);
    return NextResponse.json({
      success: true,
      data: rows.map((row) => ({
        signingCertificateId: row.signingCertificateId,
        providerName: row.providerName,
        country: row.country,
        commonName: row.commonName,
        certSerialHex: row.certSerialHex,
        issuerDN: row.issuerDN,
        loa: row.loa,
        notBefore: row.notBefore,
        notAfter: row.notAfter,
        boundAt: row.boundAt,
        lastUsedAt: row.lastUsedAt,
        revokedAt: row.revokedAt,
      })),
    });
  } catch (err) {
    Logger.warn(`e_signature certs list failed: ${err instanceof Error ? err.message : err}`);
    return NextResponse.json({ success: false, error: { message: 'Failed to list signing certificates' } }, { status: 500 });
  }
}
