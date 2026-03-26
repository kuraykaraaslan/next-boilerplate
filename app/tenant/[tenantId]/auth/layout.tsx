export const dynamic = 'force-dynamic';

import { ReactNode, Suspense } from 'react';
import 'react-toastify/dist/ReactToastify.css';
import TenantSettingService from '@/modules/tenant_setting/tenant_setting.service';
import { TENANT_BRANDING_KEYS } from '@/modules/tenant_branding/tenant_branding.setting.keys';
import SSOLogin from '@/modules/auth_sso/ui/auth_sso.login';

interface LayoutProps {
    children: ReactNode;
    params: Promise<{ tenantId: string }>;
}


export default async function TenantAuthLayout({ children, params }: LayoutProps) {
    const { tenantId } = await params;
    
    const branding = await TenantSettingService.getByKeys(tenantId, [...TENANT_BRANDING_KEYS]);

    const brandName = branding.brandName || 'Welcome';
    const brandLogoLight = branding.brandLogoLight;
    const brandLogoDark = branding.brandLogoDark;
    const brandPrimaryColor = branding.brandPrimaryColor;
    const authWallpaper = branding.authWallpaper || '/assets/img/auth-background.jpg';

    return (
        <Suspense>
            <div
                className="flex flex-col items-center justify-center min-h-screen bg-base-200 relative"
                style={{
                    backgroundImage: `url(${authWallpaper})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    height: '100%',
                    ...(brandPrimaryColor && { '--primary': brandPrimaryColor } as any)
                }}
            >
                <div className="rounded-none shadow-md w-full md:max-w-md grid grid-cols-1 min-h-screen md:min-h-[600px] rounded-lg shadow-md bg-base-100 md:bg-base-100/70 border border-base-300">
                    <div className="col-span-1 flex flex-col items-center justify-center w-full p-8 pt-0">
                        <div className="flex items-center justify-center mb-3">
                            {brandLogoLight ? (
                                <>
                                    <img src={brandLogoLight} alt={brandName} className="h-12 dark:hidden" />
                                    <img src={brandLogoDark || brandLogoLight} alt={brandName} className="h-12 hidden dark:block" />
                                </>
                            ) : (
                                <span className="text-2xl font-bold">{brandName}</span>
                            )}
                        </div>
                        <h1 className="text-2xl font-bold text-center mb-4">
                            {/* Title will be set by each page's metadata */}
                        </h1>
                        <div className="w-full">
                            {children}
                            <div className="flex items-center justify-center mt-4 mb-4">
                            </div>
                            <SSOLogin mode="pins" tenantId={tenantId} />
                        </div>
                    </div>
                </div>
            </div>
            <div className="hidden md:flex absolute bottom-2 right-2 text-center text-xs text-white">
                <span className="mr-1">Background image by </span>
                <a href="https://unsplash.com/@jadestephens" target="_blank" rel="noopener noreferrer" className="underline">
                    Jade Stephens
                </a>
            </div>
        </Suspense>
    );
}
