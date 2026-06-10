// path: app/tenant/[tenantId]/api/domains/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantDomainService from "@/modules/tenant_domain/tenant_domain.service";
import TenantSessionNextService from "@/modules_next/tenant_session/tenant_session.service.next";
import { CreateTenantDomainDTO } from "@/modules/tenant_domain/tenant_domain.dto";
import Limiter from "@/modules_next/limiter/limiter.service.next";

/**
 * GET /tenant/[tenantId]/api/domains
 * Get all domains for a tenant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "ADMIN",
      tenantId
    });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    const result = await TenantDomainService.getByTenantId({
      tenantId,
      page,
      pageSize
    });

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: error.message.includes('Limit') ? 403 : 401 }
    );
  }
}

/**
 * POST /tenant/[tenantId]/api/domains
 * Add a new domain to a tenant
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "OWNER",
      tenantId
    });

    const body = await request.json();
    const parsed = CreateTenantDomainDTO.safeParse({ ...body, tenantId });

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        message: "Invalid domain data",
        errors: parsed.error.issues
      }, { status: 400 });
    }

    const domain = await TenantDomainService.create(parsed.data);

    return NextResponse.json({
      success: true,
      domain
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: error.statusCode ?? 400 }
    );
  }
}
