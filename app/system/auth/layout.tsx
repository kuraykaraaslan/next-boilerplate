'use client';
import { ReactNode, Suspense } from 'react';
import 'react-toastify/dist/ReactToastify.css';
import Logo from '@/modules/ui/layout/logo';



export default function AuthLayout({ children }: { children: ReactNode }) {

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
                            
                        </h1>
                        <div className="w-full">
                            {children}

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
        </Suspense>
    );
}
