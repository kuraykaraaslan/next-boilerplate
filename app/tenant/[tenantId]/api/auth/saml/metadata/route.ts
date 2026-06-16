import { NextRequest, NextResponse } from 'next/server';
import SamlService from '@nb/auth_saml/server/auth_saml.service';

type Params = { params: Promise<{ tenantId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { tenantId } = await params;
  try {
    const { xml } = await SamlService.generateMetadata(tenantId);
    return new NextResponse(xml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}
