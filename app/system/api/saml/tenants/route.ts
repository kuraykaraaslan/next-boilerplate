import { NextRequest, NextResponse } from 'next/server';
import UserSessionNextService from '@/modules_next/user_session/user_session.service.next';
import { getDefaultTenantDataSource } from '@/modules/db';
import { SamlConfig } from '@/modules/auth_saml/entities/saml_config.entity';
import TenantService from '@/modules/tenant/tenant.service';

export async function GET(req: NextRequest) {
  try {
    await UserSessionNextService.authenticateUserByRequest({ request: req, requiredUserRole: 'ADMIN' });

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') ?? '20', 10));

    const ds = await getDefaultTenantDataSource();
    const [configs, total] = await ds.getRepository(SamlConfig).findAndCount({
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const rows = await Promise.all(
      configs.map(async (c) => {
        const tenant = await TenantService.getById(c.tenantId).catch(() => null);
        return {
          tenantId: c.tenantId,
          tenantName: tenant?.name ?? c.tenantId,
          isEnabled: c.isEnabled,
          idpEntityId: c.idpEntityId,
          idpSsoUrl: c.idpSsoUrl,
          updatedAt: c.updatedAt.toISOString(),
        };
      }),
    );

    return NextResponse.json({ success: true, rows, total });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: e.status ?? 400 });
  }
}
