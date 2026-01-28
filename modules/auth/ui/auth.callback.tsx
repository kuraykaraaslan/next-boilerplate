'use client';
import axiosInstance from '@/libs/axios';
import axios from 'axios';
import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuthStore } from '../auth.store';
import { useRouter, useSearchParams } from 'next/navigation';
import { useModuleDictionary } from '../hooks/useModuleDictionary';
import type { AuthLocale } from '../dictionaries';

interface AuthCallbackProps {
  locale?: AuthLocale;
  basePath?: string;
  tenantId?: string;
}

const AuthCallback = ({ locale = 'en', basePath = '/auth', tenantId }: AuthCallbackProps) => {
  const { t } = useModuleDictionary(locale);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();

  const accessToken = searchParams.get('accessToken');
  const refreshToken = searchParams.get('refreshToken');

  useEffect(() => {
    const fetchSession = async () => {
      // If tokens are provided in URL (SSO callback), set them first
      if (accessToken || refreshToken) {
        try {
          await axios.post('/api/auth/session/token-set', {
            accessToken,
            refreshToken
          }, { withCredentials: true });
          await axios.get('/api/auth/csrf', { withCredentials: true });
        } catch (err) {
          console.error('Failed to set credentials:', err);
        }
      }

      const homePath = tenantId ? (basePath.replace('/auth', '') || '/') : '/';

      await axios.get('/api/auth/session', { withCredentials: true })
        .then((res) => {
          if (res.status === 200 && res.data.success) {
            setUser(res.data.user);
            toast.success(t('logged_in_successfully'));
            router.push(homePath);
          } else {
            toast.error(res.data.error || res.data.message);
            router.push(`${basePath}/login`);
          }
        })
        .catch((err) => {
          toast.error(err.response?.data?.error);
          router.push(`${basePath}/login`);
        });
    };

    fetchSession();
  }, [accessToken, refreshToken, tenantId, basePath]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
      <h1 className="text-xl font-medium">{t('logging_in')}</h1>
    </div>
  );
};

export default AuthCallback;
