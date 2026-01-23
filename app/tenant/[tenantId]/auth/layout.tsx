'use client';
import { usePathname, useParams } from 'next/navigation';
import { ReactNode, Suspense, useEffect, useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import SSOLogin from '@/modules/auth_sso/ui/auth_sso.login';
import axiosInstance from '@/libs/axios';

interface TenantBranding {
    logo?: string;
    name?: string;
    primaryColor?: string;
    backgroundImage?: string;
}

export default function TenantAuthLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const params = useParams();
    const tenantId = params.tenantId as string;

    const [branding, setBranding] = useState<TenantBranding>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTenantBranding = async () => {
            try {
                const res = await axiosInstance.get(`/api/settings`);
                if (res.data.success) {
                    setBranding({
                        logo: res.data.settings?.logo,
                        name: res.data.settings?.name,
                        primaryColor: res.data.settings?.primaryColor,
                        backgroundImage: res.data.settings?.backgroundImage,
                    });
                }
            } catch (error) {
                console.error('Failed to fetch tenant branding:', error);
            } finally {
                setLoading(false);
            }
        };

        if (tenantId) {
            fetchTenantBranding();
        }
    }, [tenantId]);

    const isProxied = typeof window !== 'undefined' && !window.location.pathname.startsWith('/tenant/');
    const tenantBase = isProxied ? '' : `/tenant/${tenantId}`;
    const basePath = `${tenantBase}/auth`;

    const titles = [
        {
            path: `${basePath}/login`,
            title: 'Welcome back!'
        },
        {
            path: `${basePath}/register`,
            title: 'Create an account'
        },
        {
            path: `${basePath}/forgot-password`,
            title: 'Forgot Password'
        },
        {
            path: `${basePath}/reset-password`,
            title: 'Reset Password'
        },
        {
            path: `${basePath}/logout`,
            title: 'Logging out...'
        }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="loading loading-spinner loading-lg"></div>
            </div>
        );
    }

    return (
        <Suspense>
            <div
                className="flex flex-col items-center justify-center min-h-screen bg-base-200 relative"
                style={{
                    backgroundImage: `url(${branding.backgroundImage || '/assets/img/auth-background.jpg'})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    height: '100%',
                    ...(branding.primaryColor && { '--primary': branding.primaryColor } as any)
                }}
            >
                <div className="rounded-none shadow-md w-full md:max-w-md grid grid-cols-1 min-h-screen md:min-h-[600px] rounded-lg shadow-md bg-base-100 md:bg-base-100/70 border border-base-300">
                    <div className="col-span-1 flex flex-col items-center justify-center w-full p-8 pt-0">
                        <div className="flex items-center justify-center mb-3">
                            {branding.logo ? (
                                <img src={branding.logo} alt={branding.name || 'Logo'} className="h-12" />
                            ) : (
                                <span className="text-2xl font-bold">{branding.name || 'Welcome'}</span>
                            )}
                        </div>
                        <h1 className="text-2xl font-bold text-center mb-4">
                            {titles?.find((item) => pathname?.startsWith(item.path))?.title}
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
            <ToastContainer />
        </Suspense>
    );
}
