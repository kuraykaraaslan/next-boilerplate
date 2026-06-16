import { NextRequest, NextResponse } from 'next/server';
import AuthAcsService from '@nb/auth_acs/server/auth_acs.service';

type Params = { params: Promise<{ provider: string }> };

/** SP metadata XML for registering this service with the national authority (SAML only). */
export async function GET(_req: NextRequest, { params }: Params) {
  const { provider: raw } = await params;
  try {
    const provider = AuthAcsService.assertKnown(raw);
    const xml = AuthAcsService.generateMetadata(provider);
    return new NextResponse(xml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'metadata_unavailable';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
