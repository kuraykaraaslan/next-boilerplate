import { NextResponse } from 'next/server';
import SSOService from '@/modules/auth_sso/auth_sso.service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  // GOODTOHAVE (multi-tenancy): narrow to providers this tenant permits.
  const providers = await SSOService.getAllowedProviders(tenantId);
  return NextResponse.json({ providers });
}
