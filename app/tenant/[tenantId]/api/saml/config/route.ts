import { NextRequest, NextResponse } from 'next/server';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import SamlService from '@/modules/auth_saml/auth_saml.service';
import { UpsertSamlConfigDTO } from '@/modules/auth_saml/auth_saml.dto';

type Params = { params: Promise<{ tenantId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { tenantId } = await params;
  try {
    await TenantSessionNextService.authenticateTenantByRequest({
      request: req,
      tenantId,
      requiredTenantRole: 'ADMIN',
    });
    const config = await SamlService.getConfig(tenantId);
    const metadata = await SamlService.generateMetadata(tenantId);
    return NextResponse.json({ success: true, config, metadata });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: e.status ?? 400 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { tenantId } = await params;
  try {
    await TenantSessionNextService.authenticateTenantByRequest({
      request: req,
      tenantId,
      requiredTenantRole: 'ADMIN',
    });
    const body = await req.json();
    const input = UpsertSamlConfigDTO.parse(body);
    const config = await SamlService.upsertConfig(tenantId, input);
    return NextResponse.json({ success: true, config });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: e.status ?? 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { tenantId } = await params;
  try {
    await TenantSessionNextService.authenticateTenantByRequest({
      request: req,
      tenantId,
      requiredTenantRole: 'ADMIN',
    });
    await SamlService.deleteConfig(tenantId);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: e.status ?? 400 });
  }
}
