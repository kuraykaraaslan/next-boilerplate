'use client';
import axiosInstance from '@/libs/axios';
import Link from 'next/link';
import { useState, MouseEvent } from 'react';
import { toast } from 'react-toastify';
import { useModuleDictionary } from '../hooks/useModuleDictionary';
import type { AuthLocale } from '../dictionaries';

interface AuthRegisterProps {
  locale?: AuthLocale;
}

const AuthRegister = ({ locale = 'en' }: AuthRegisterProps) => {
  const { t } = useModuleDictionary(locale);

  const emailRegex = /\S+@\S+\.\S+/;
  const passwordRegex = /^.{6,}$/;

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const handleSubmit = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!email || !password) {
      return;
    }

    if (!confirmPassword) {
      toast.error(t('please_confirm_password'));
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

    if (password !== confirmPassword) {
      toast.error(t('passwords_not_match'));
      return;
    }

    toast.info(t('registering'));

    await axiosInstance.post('/api/auth/register', {
      email,
      password,
    }).then((res) => {
      if (res.data.error) {
        toast.error(res.data.error);
      } else {
        toast.success(res.data.message);
      }
    }).catch((err) => {
      toast.error(err.response?.data?.error);
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <Link
          href="/auth/login"
          className="block w-full py-2.5 bg-primary font-semibold rounded-lg shadow-md text-white text-center"
        >
          {t('login')}
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
      <div>
        <input
          id="password"
          name="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder={t('password')}
          className="block w-full rounded-lg border-0 py-1.5 shadow-sm ring-1 ring-inset placeholder:text-primary sm:text-sm sm:leading-6 h-12 p-4"
        />
      </div>
      <div>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          placeholder={t('confirm_password')}
          className="block w-full rounded-lg border-0 py-1.5 shadow-sm ring-1 ring-inset placeholder:text-primary sm:text-sm sm:leading-6 h-12 p-4"
        />
      </div>
      <div>
        <button
          type="submit"
          onClick={handleSubmit}
          className="block w-full py-2.5 bg-primary font-semibold rounded-lg shadow-md text-white"
        >
          {t('create_account')}
        </button>
      </div>
    </div>
  );
};

export default AuthRegister;
