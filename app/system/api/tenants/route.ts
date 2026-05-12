import Logger from '@/modules/logger';
import { NextRequest, NextResponse } from "next/server";
import TenantService from "@/modules/tenant/tenant.service";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import Limiter from "@/modules_next/limiter/limiter.service.next";
import { getDefaultTenantDataSource } from '@/libs/typeorm';
import { TenantSubscription } from '@/modules/tenant_subscription/entities/tenant_subscription.entity';
import { In } from 'typeorm';

/**
 * GET handler for retrieving all tenants.
 * @param request - The incoming request object
 * @returns A NextResponse containing the tenant data or an error message
 */
export async function GET(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    // Only admins can view all tenants
    await UserSessionNextService.authenticateUserByRequest({ 
      request, 
      requiredUserRole: "ADMIN" 
    });

    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const page = searchParams.get('page') ? parseInt(searchParams.get('page') || '1', 10) : 1;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize') || '10', 10) : 10;
    const search = searchParams.get('search') || null;

    Logger.info('Fetching tenants with', { page, pageSize, search });

    const { tenants, total } = await TenantService.getAll({
      page,
      pageSize,
      search,
      tenantId: null
    });

    Logger.info(`Fetched ${tenants.length} tenants (total: ${total})`);

    // Enrich with subscription health
    const ds = await getDefaultTenantDataSource();
    const subRepo = ds.getRepository(TenantSubscription);
    const tenantIds = tenants.map((t: { tenantId: string }) => t.tenantId);

    const subscriptions = tenantIds.length > 0
      ? await subRepo.find({ where: { tenantId: In(tenantIds) } })
      : [];

    const subMap = Object.fromEntries(subscriptions.map((s) => [s.tenantId, s]));

    const now = new Date();

    function computeHealthStatus(tenant: { tenantStatus: string }, sub: TenantSubscription | undefined): string {
      if (tenant.tenantStatus === 'SUSPENDED') return 'suspended';
      if (tenant.tenantStatus === 'PENDING_DELETION') return 'pending_deletion';
      if (!sub) return 'no_subscription';
      if (sub.status === 'TRIALING') return 'trialing';
      if (sub.status === 'ACTIVE') return 'active';
      if ((sub.status === 'PAST_DUE' || sub.status === 'CANCELLED') && sub.gracePeriodEndsAt && sub.gracePeriodEndsAt > now) return 'grace_period';
      if (sub.status === 'PAST_DUE') return 'past_due';
      return 'expired';
    }

    const enrichedTenants = tenants.map((t: { tenantId: string; tenantStatus: string }) => ({
      ...t,
      healthStatus: computeHealthStatus(t, subMap[t.tenantId]),
    }));

    return NextResponse.json({ tenants: enrichedTenants, total, page, pageSize });
  } catch (error: unknown) {
    Logger.error('Error fetching tenants:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

/**
 * POST handler for creating a new tenant.
 * @param request - The incoming request object
 * @returns A NextResponse containing the new tenant data or an error message
 */
export async function POST(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    // Only admins can create tenants
    await UserSessionNextService.authenticateUserByRequest({ 
      request, 
      requiredUserRole: "ADMIN" 
    });

    const body = await request.json();

    const tenant = await TenantService.create({
      name: body.name,
      description: body.description || null,
      region: body.region || 'TR'
    });

    return NextResponse.json({ tenant }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
