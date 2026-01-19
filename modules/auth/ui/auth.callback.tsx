'use client';
import axiosInstance from '@/libs/axios';
import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuthStore } from '../auth.store';
import { useRouter } from 'next/navigation';
import { useModuleDictionary } from '../hooks/useModuleDictionary';
import type { AuthLocale } from '../dictionaries';

interface AuthCallbackProps {
  locale?: AuthLocale;
}

const AuthCallback = ({ locale = 'en' }: AuthCallbackProps) => {
  const { t } = useModuleDictionary(locale);
  const router = useRouter();
  const { setUser } = useAuthStore();

  useEffect(() => {
    const fetchSession = async () => {
      await axiosInstance.get('/api/auth/session')
        .then((res) => {
          if (res.status === 200) {
            setUser(res.data.user);
            toast.success(t('logged_in_successfully'));
          } else {
            toast.error(res.data.error);
          }
        })
        .catch((err) => {
          toast.error(err.response?.data?.error);
        })
        .finally(() => {
          router.push('/');
        });
    };

    fetchSession();
  }, []);

  return (
    <div>
      <h1>{t('logging_in')}</h1>
    </div>
  );
};

export default AuthCallback;
