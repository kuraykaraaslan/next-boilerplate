// path: app/api/tenant/[tenantId]/settings/route.ts
import { NextResponse } from "next/server";
import TenantAuthNextService from "@/modules/tenant_auth/tenant_auth.service.next";
import TenantService from "@/modules/tenant/tenant.service";
import Limiter from "@/libs/limiter";

/**
 * GET /api/tenant/[tenantId]/settings
 * Get tenant settings (requires USER role)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    await Limiter.checkRateLimit(request);
    
    await TenantAuthNextService.authenticateTenantByRequest({ 
      request, 
      requiredTenantRole: "USER",
      tenantId: params.tenantId
    });

    // Tenant is already loaded and available on request
    const tenant = request.tenant!;

    return NextResponse.json({ 
      tenant
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tenant/[tenantId]/settings
 * Update tenant settings (requires ADMIN role)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    await Limiter.checkRateLimit(request);
    
    // Only ADMIN and OWNER can update tenant settings
    await TenantAuthNextService.authenticateTenantByRequest({ 
      request, 
      requiredTenantRole: "ADMIN",
      tenantId: params.tenantId
    });

    const body = await request.json();
    
    // Update tenant
    const updatedTenant = await TenantService.update(params.tenantId, {
      name: body.name,
      description: body.description,
    });

    // Clear cache after update
    await TenantAuthNextService.clearTenantCache(
      request.user!.userId, 
      params.tenantId
    );

    return NextResponse.json({ 
      message: "Tenant updated successfully",
      tenant: updatedTenant
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tenant/[tenantId]/settings
 * Delete tenant (requires OWNER role only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    await Limiter.checkRateLimit(request);
    
    // Only OWNER can delete tenant
    await TenantAuthNextService.authenticateTenantByRequest({ 
      request, 
      requiredTenantRole: "OWNER",
      tenantId: params.tenantId
    });

    await TenantService.delete(params.tenantId);

    // Clear all caches for this user
    await TenantAuthNextService.clearUserTenantCaches(request.user!.userId);

    return NextResponse.json({ 
      message: "Tenant deleted successfully"
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}
