'use client';
import axiosInstance from '@/libs/axios';
import { faQuestion } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Link from 'next/link';
import { MouseEvent, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuthStore } from '../auth.store';
import { useRouter } from 'next/navigation';
import { useModuleDictionary } from '../hooks/useModuleDictionary';
import type { AuthLocale } from '../dictionaries';

interface AuthLoginProps {
  locale?: AuthLocale;
}

const AuthLogin = ({ locale = 'en' }: AuthLoginProps) => {
  const { t } = useModuleDictionary(locale);

  const emailRegex = /\S+@\S+\.\S+/;
  const passwordRegex = /^.{6,}$/;

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const { setUser } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!email || !password) {
      return;
    }

    if (!emailRegex.test(email)) {
      toast.error(t('invalid_email'));
      return;
    }

    if (!passwordRegex.test(password)) {
      toast.error(t('password_min_length'));
      return;
    }

    await axiosInstance.post('/api/auth/login', {
      email,
      password,
    }).then((res) => {
      const { user } = res.data;
      setUser(user);
      toast.success(t('login_successful'));
      router.push('/');
    }).catch((err) => {
      toast.error(err.response?.data?.error || t('login_failed'));
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/auth/register"
          className="block w-full py-2.5 bg-primary font-semibold rounded-lg shadow-md text-white text-center"
        >
          {t('create_account')}
        </Link>
      </div>
      <div className="flex items-center justify-center">
        <span className="text-sm font-semibold">{t('or')}</span>
      </div>
      <div>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('email_address')}
          className="block w-full rounded-lg border-0 py-1.5 shadow-sm ring-1 ring-inset placeholder:text-primary sm:text-sm sm:leading-6 h-12 p-4"
        />
      </div>
      <div className="relative">
        <Link
          className="absolute inset-y-0 right-2 pl-3 flex items-center"
          href="/auth/forgot-password"
        >
          <FontAwesomeIcon icon={faQuestion} className="text-primary" />
        </Link>
        <input
          id="password"
          name="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder={t('password')}
          className="block w-full rounded-lg border-0 py-1.5 shadow-sm ring-1 ring-inset placeholder:text-primary sm:text-sm sm:leading-6 h-12 p-4"
        />
      </div>
      <div>
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={!email || !password}
          className="block w-full py-2.5 bg-primary font-semibold rounded-lg shadow-md text-white"
        >
          {t('sign_in')}
        </button>
      </div>
    </div>
  );
};

export default AuthLogin;
