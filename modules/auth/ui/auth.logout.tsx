'use client';
import axiosInstance from '@/libs/axios';
import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuthStore } from '../auth.store';
import { useRouter } from 'next/navigation';
import { useModuleDictionary } from '../hooks/useModuleDictionary';
import type { AuthLocale } from '../dictionaries';

interface AuthLogoutProps {
  locale?: AuthLocale;
  basePath?: string;
  tenantId?: string;
}

const AuthLogout = ({ locale = 'en', basePath = '/auth', tenantId }: AuthLogoutProps) => {
  const { t } = useModuleDictionary(locale);
  const { clearUser } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await axiosInstance.post('/api/auth/logout')
      .then((res) => {
        if (res.status === 200) {
          toast.success(res.data.message);
        }
      })
      .catch((err) => {
        toast.error(err.response?.data?.message);
      })
      .finally(() => {
        clearUser();
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userSession');
        router.push(`${basePath}/login`);
      });
  };

  useEffect(() => {
    handleLogout();
  }, []);

  return null;
};

export default AuthLogout;
