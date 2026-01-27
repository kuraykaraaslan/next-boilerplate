// Example usage of TenantAuthNextService
// This file demonstrates different ways to use the tenant authentication service

import { NextResponse } from "next/server";
import TenantAuthNextService from "./tenant_session.service.next";
import Limiter from "@/libs/limiter";

/**
 * Example 1: Basic tenant authentication with USER role
 * Tenant ID from header (x-tenant-id)
 */
export async function exampleBasicAuth(request: NextRequest) {
  try {
    await Limiter.checkRateLimit(request);
    
    // Authenticate user and verify tenant membership (minimum USER role)
    await TenantAuthNextService.authenticateTenantByRequest({ 
      request, 
      requiredTenantRole: "USER" 
    });

    // After authentication, these are available on request:
    const userId = request.user!.userId;
    const tenantId = request.tenant!.tenantId;
    const memberRole = request.tenantMember!.memberRole;

    return NextResponse.json({ 
      message: "Success",
      userId,
      tenantId,
      memberRole
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Example 2: ADMIN role required
 */
export async function exampleAdminOnly(request: NextRequest) {
  try {
    await Limiter.checkRateLimit(request);
    
    // Only ADMIN and OWNER can access this
    await TenantAuthNextService.authenticateTenantByRequest({ 
      request, 
      requiredTenantRole: "ADMIN" 
    });

    // Perform admin operations
    return NextResponse.json({ message: "Admin operation successful" });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 403 }
    );
  }
}

/**
 * Example 3: OWNER only
 */
export async function exampleOwnerOnly(request: NextRequest) {
  try {
    await Limiter.checkRateLimit(request);
    
    // Only OWNER can access this
    await TenantAuthNextService.authenticateTenantByRequest({ 
      request, 
      requiredTenantRole: "OWNER" 
    });

    // Perform owner-only operations (e.g., delete tenant)
    return NextResponse.json({ message: "Owner operation successful" });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 403 }
    );
  }
}

/**
 * Example 4: Tenant ID from query parameter
 */
export async function exampleQuerySource(request: NextRequest) {
  try {
    await Limiter.checkRateLimit(request);
    
    // Get tenant ID from ?tenantId=xxx
    await TenantAuthNextService.authenticateTenantByRequest({ 
      request, 
      requiredTenantRole: "USER",
      tenantIdSource: "query"
    });

    return NextResponse.json({ message: "Success" });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Example 5: Tenant ID from subdomain
 */
export async function exampleSubdomainSource(request: NextRequest) {
  try {
    await Limiter.checkRateLimit(request);
    
    // Get tenant from subdomain (e.g., acme.yourdomain.com)
    await TenantAuthNextService.authenticateTenantByRequest({ 
      request, 
      requiredTenantRole: "USER",
      tenantIdSource: "subdomain"
    });

    return NextResponse.json({ message: "Success" });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Example 6: Direct tenant ID (e.g., from route params)
 */
export async function exampleDirectTenantId(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    await Limiter.checkRateLimit(request);
    
    // Use tenant ID from route params /api/tenant/[tenantId]/...
    await TenantAuthNextService.authenticateTenantByRequest({ 
      request, 
      requiredTenantRole: "USER",
      tenantId: params.tenantId // Direct tenant ID
    });

    return NextResponse.json({ message: "Success" });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Example 7: Full usage with destructuring
 */
export async function exampleFullUsage(request: NextRequest) {
  try {
    await Limiter.checkRateLimit(request);
    
    // Get all entities
    const { user, userSession, tenant, tenantMember } = 
      await TenantAuthNextService.authenticateTenantByRequest({ 
        request, 
        requiredTenantRole: "ADMIN" 
      });

    return NextResponse.json({ 
      user: {
        userId: user.userId,
        email: user.email,
      },
      tenant: {
        tenantId: tenant.tenantId,
        name: tenant.name,
      },
      role: tenantMember.memberRole,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Example 8: Clear tenant cache after updates
 */
export async function exampleClearCache(request: NextRequest) {
  try {
    await Limiter.checkRateLimit(request);
    
    const { user, tenant } = await TenantAuthNextService.authenticateTenantByRequest({ 
      request, 
      requiredTenantRole: "ADMIN" 
    });

    // Perform some update operation...
    // await TenantMemberService.update(...)

    // Clear cache for this user-tenant combination
    await TenantAuthNextService.clearTenantCache(user.userId, tenant.tenantId);

    return NextResponse.json({ message: "Cache cleared" });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}
