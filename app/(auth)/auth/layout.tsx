'use client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Link from 'next/link';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { usePathname } from 'next/navigation';
import { faCode } from '@fortawesome/free-solid-svg-icons';
import { ReactNode, Suspense } from 'react';
import SSOLogin from '@/modules/auth_sso/ui/auth_sso.login';
import Logo from '@/components/common/layout/logo';


export default function AuthLayout({ children }: { children: ReactNode }) {

  //Create a context to store the user's authentication status

  const pathname = usePathname();

  const titles = [
    {
      path: '/auth/login',
      title: 'Welcome back!'
    },
    {
      path: '/auth/register',
      title: 'Create an account'
    },
    {
      path: '/auth/forgot-password',
      title: 'Forgot Password'
    },
    {
      path: '/auth/reset-password',
      title: 'Reset Password'
    },
    {
      path: '/auth/logout',
      title: 'Logging out...'
    }
  ]

  return (
    <Suspense>
      <div className="flex flex-col items-center justify-center min-h-screen bg-base-200 relative"
        style={{
          backgroundImage: 'url(/assets/img/auth-background.jpg)',

          backgroundSize: 'cover', backgroundPosition: 'center', height: '100%'
        }}
      >
        <div className="rounded-none shadow-md w-full md:max-w-md grid grid-cols-1 min-h-screen md:min-h-[600px] rounded-lg shadow-md bg-base-100 md:bg-base-100/70 border border-base-300">
          <div className="col-span-1 flex flex-col items-center justify-center w-full p-8 pt-0">
            <div className="flex items-center justify-center mb-3">
                <Logo />
            </div>
            <h1 className="text-2xl font-bold text-center mb-4">{titles?.find((item) => pathname?.startsWith(item.path))?.title}</h1>
            <div className="w-full">
              {children}
              <div className="flex items-center justify-center mt-4 mb-4">
              </div>
              <SSOLogin mode="pins" />
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
  )
}
