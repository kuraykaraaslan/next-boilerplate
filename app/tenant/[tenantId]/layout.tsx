export const dynamic = 'force-dynamic';

import { Suspense, ReactNode } from "react";
import "react-toastify/dist/ReactToastify.css";
import TenantSettingService from "@/modules/tenant_setting/tenant_setting.service";
import { Metadata } from "next";
import { TENANT_BRANDING_KEYS } from "@/modules/tenant_branding/tenant_branding.setting.keys";

export async function generateMetadata({ params }: { params: Promise<{ tenantId: string }> }): Promise<Metadata> {
    
    const { tenantId } = await params;

    const branding = await TenantSettingService.getByKeys(tenantId, [...TENANT_BRANDING_KEYS]);

    const brandName = branding.brandName || "My App";
    const brandTagline = branding.brandTagline || "Welcome to my app";
    const brandFavicon = branding.brandFavicon;

    return {
        title: {
            template: `%s - ${brandName}`,
            default: brandName,
        },
        description: brandTagline,
        ...(brandFavicon && {
            icons: {
                icon: brandFavicon,
                shortcut: brandFavicon,
                apple: brandFavicon,
            },
        }),
    };
}


const Layout = async ({ children }: { children: ReactNode }) => {
    return (
        <Suspense>
            {children}
        </Suspense>
    );
};

export default Layout;
