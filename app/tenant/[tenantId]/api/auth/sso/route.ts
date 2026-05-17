import { NextResponse } from 'next/server';
import SSOService from '@/modules/auth_sso/auth_sso.service';

export async function GET() {
  const providers = SSOService.getAllowedProviders();
  return NextResponse.json({ providers });
}
