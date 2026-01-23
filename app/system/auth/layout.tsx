'use client';
import { usePathname } from 'next/navigation';
import { ReactNode, Suspense } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import SSOLogin from '@/modules/auth_sso/ui/auth_sso.login';
import Logo from '@/components/common/layout/logo';

export default function AuthLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    const titles = [
        {
            path: '/system/auth/login',
            title: 'Welcome back!'
        },
        {
            path: '/system/auth/register',
            title: 'Create an account'
        },
        {
            path: '/system/auth/forgot-password',
            title: 'Forgot Password'
        },
        {
            path: '/system/auth/reset-password',
            title: 'Reset Password'
        },
        {
            path: '/system/auth/logout',
            title: 'Logging out...'
        },
        {
            path: '/system/auth/select-tenant',
            title: 'Select Organization'
        },
        {
            path: '/system/auth/create-tenant',
            title: 'Create Organization'
        }
    ];

    // Hide SSO buttons on select-tenant and create-tenant pages
    const hideSSOPages = ['/system/auth/select-tenant', '/system/auth/create-tenant'];
    const showSSO = !hideSSOPages.some(p => pathname?.startsWith(p));

    return (
        <Suspense>
            <div className="flex flex-col items-center justify-center min-h-screen bg-base-200 relative"
                style={{
                    backgroundImage: 'url(/assets/img/auth-background.jpg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    height: '100%'
                }}
            >
                <div className="rounded-none shadow-md w-full md:max-w-md grid grid-cols-1 min-h-screen md:min-h-[600px] rounded-lg shadow-md bg-base-100 md:bg-base-100/70 border border-base-300">
                    <div className="col-span-1 flex flex-col items-center justify-center w-full p-8 pt-0">
                        <div className="flex items-center justify-center mb-3">
                            <Logo />
                        </div>
                        <h1 className="text-2xl font-bold text-center mb-4">
                            {titles?.find((item) => pathname?.startsWith(item.path))?.title}
                        </h1>
                        <div className="w-full">
                            {children}
                            {showSSO && (
                                <>
                                    <div className="flex items-center justify-center mt-4 mb-4">
                                    </div>
                                    <SSOLogin mode="pins" />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="hidden md:flex absolute bottom-2 right-2 text-center text-xs text-white">
                <span className='mr-1'>Background image by </span>
                <a href="https://unsplash.com/@jadestephens" target="_blank" rel="noopener noreferrer" className="underline">
                    Jade Stephens
                </a>
            </div>
            <ToastContainer />
        </Suspense>
    );
}
