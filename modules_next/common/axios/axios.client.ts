'use client';

import axios from 'axios';
import { AuthMessages } from '@/modules/auth/auth.messages';

const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_NAME = 'csrf-token';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

async function ensureCSRFToken(): Promise<string | null> {
  let token = getCookie(CSRF_COOKIE_NAME);

  if (!token) {
    try {
      const response = await axios.get(`/api/auth/csrf`, { withCredentials: true });
      token = response.data?.data?.token || getCookie(CSRF_COOKIE_NAME);
    } catch {
      console.warn('[CSRF] Failed to fetch CSRF token');
    }
  }

  return token;
}

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  async (config) => {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    const method = config.method?.toUpperCase() || 'GET';

    if (!safeMethods.includes(method)) {
      const csrfToken = await ensureCSRFToken();
      if (csrfToken) {
        config.headers[CSRF_HEADER_NAME] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

let isRefreshing = false;
let failedQueue: { resolve: () => void; reject: (err: any) => void }[] = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach((p) => {
    error ? p.reject(error) : p.resolve();
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => {
    const message = response.data?.message;

    if (
      message === AuthMessages.TOKEN_EXPIRED ||
      message === AuthMessages.USER_NOT_AUTHENTICATED
    ) {
      return Promise.reject({
        config: response.config,
        response: { status: 401, data: response.data },
      });
    }

    return response;
  },

  async (error) => {
    const originalRequest = error.config;

    if (originalRequest?.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    if (originalRequest?._retry) {
      return Promise.reject(error);
    }

    const message = error.response?.data?.message || error.message;

    const shouldRefresh =
      message === AuthMessages.TOKEN_EXPIRED ||
      message === AuthMessages.USER_NOT_AUTHENTICATED;

    if (!shouldRefresh) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: () => resolve(axiosInstance(originalRequest)),
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      await axios.post(`/api/auth/refresh`, {}, { withCredentials: true });
      processQueue();
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);

      if (typeof window !== 'undefined') {
        const redirect = encodeURIComponent(window.location.pathname);
        window.location.href = `/auth/login?redirect=${redirect}`;
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default axiosInstance;
