'use client';
import { MouseEvent, useEffect, useState } from 'react';
import axiosInstance from '@/libs/axios';
import { toast } from 'react-toastify';
import { useSearchParams } from 'next/navigation';
import { useModuleDictionary } from '../hooks/useModuleDictionary';
import type { AuthLocale } from '../dictionaries';

interface AuthForgotPasswordProps {
  locale?: AuthLocale;
  basePath?: string;
  tenantId?: string;
}

const AuthForgotPassword = ({ locale = 'en', basePath = '/auth', tenantId }: AuthForgotPasswordProps) => {
  const { t } = useModuleDictionary(locale);
  const searchParams = useSearchParams();

  const emailRegex = /\S+@\S+\.\S+/;

  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1);

  useEffect(() => {
    const resetTokenParam = searchParams.get('resetToken');
    const emailParam = searchParams.get('email');

    if (resetTokenParam && emailParam) {
      setResetToken(resetTokenParam);
      setEmail(emailParam);
      setStep(2);
    }
  }, [searchParams]);

  const handleSubmit = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (step === 1) {
      if (!email || !emailRegex.test(email)) {
        toast.error(t('email_required'));
        return;
      }

      const forgotApiPath = tenantId ? `${basePath.replace('/auth', '')}/api/auth/forgot-password` : '/api/auth/forgot-password';

      await axiosInstance.post(forgotApiPath, { email, tenantId })
        .then((res) => {
          if (res.data.error) {
            console.error(res.data.error);
            return;
          }
          toast.success(t('verification_code_sent'));
          setStep(2);
        })
        .catch((error) => {
          toast.error(error.response?.data?.error);
        });
    } else {
      if (password !== confirmPassword) {
        toast.error(t('passwords_not_match'));
        return;
      }

      const resetApiPath = tenantId ? `${basePath.replace('/auth', '')}/api/auth/reset-password` : '/api/auth/reset-password';

      await axiosInstance.post(resetApiPath, {
        email,
        resetToken,
        password,
        tenantId,
      })
        .then((res) => {
          if (res.data.error) {
            console.error(res.data.error);
            return;
          }
          toast.success(t('password_reset_success'));
        })
        .catch((error) => {
          toast.error(error.response?.data?.error);
        });
    }
  };

  if (step === 1) {
    return (
      <div className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium leading-6">
            {t('email_address')}
          </label>
          <div className="mt-2">
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-primary focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 p-4"
            />
          </div>
        </div>
        <div>
          <button
            type="submit"
            className="block w-full py-2.5 bg-primary font-semibold rounded-lg shadow-md text-white"
            onClick={handleSubmit}
          >
            {t('send_verification_code')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="verificationCode" className="block text-sm font-medium leading-6">
          {t('verification_code')}
        </label>
        <div className="mt-2">
          <input
            id="verificationCode"
            name="verificationCode"
            value={resetToken}
            onChange={(e) => setResetToken(e.target.value)}
            type="text"
            required
            className="block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-primary focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 p-4"
          />
        </div>
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium leading-6">
          {t('new_password')}
        </label>
        <div className="mt-2">
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 p-4"
          />
        </div>
      </div>
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium leading-6">
          {t('confirm_password')}
        </label>
        <div className="mt-2">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 p-4"
          />
        </div>
      </div>
      <div>
        <button
          type="submit"
          className="block w-full py-2.5 bg-primary font-semibold rounded-lg shadow-md text-white"
          onClick={handleSubmit}
        >
          {t('reset_password')}
        </button>
      </div>
    </div>
  );
};

export default AuthForgotPassword;
