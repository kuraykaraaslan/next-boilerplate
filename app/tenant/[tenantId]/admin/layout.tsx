import { ReactNode } from "react";
import TenantSettingService from '@/modules/tenant_setting/tenant_setting.service';
import { TENANT_BRANDING_KEYS } from '@/modules/tenant_branding/tenant_branding.setting.keys';
import AdminLayoutClient from './layout.client';

interface LayoutProps {
    children: ReactNode;
    params: Promise<{ tenantId: string }>;
}

export default async function AdminLayout({ children, params }: LayoutProps) {
    const { tenantId } = await params;

    const branding = await TenantSettingService.getByKeys(tenantId, [...TENANT_BRANDING_KEYS]);


    return (
        <AdminLayoutClient branding={branding}>
            {children}
        </AdminLayoutClient>
    );
}
