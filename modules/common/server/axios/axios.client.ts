'use client';

import axios from 'axios';
import { AuthMessages } from '@kuraykaraaslan/auth/server/auth.messages';
import UserSessionMessages from '@kuraykaraaslan/user_session/server/user_session.messages';

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
  // Same-origin by default (NEXT_PUBLIC_API_URL unset → relative requests). In a
  // subdomain-per-tenant deployment the browser must call its own origin so the
  // proxy resolves the host to the right tenant; an absolute cross-subdomain
  // base URL breaks CORS and tenant isolation. Only set NEXT_PUBLIC_API_URL for
  // a dedicated, CORS-enabled API on a separate origin.
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

function getAuthContext(originalRequestUrl?: string): { refreshUrl: string; loginUrl: string } {
  const candidate = originalRequestUrl ?? (typeof window !== 'undefined' ? window.location.pathname : '');
  const tenantMatch = candidate.match(/\/tenant\/([^/]+)/);
  if (tenantMatch) {
    const tenantId = tenantMatch[1];
    return {
      refreshUrl: `/tenant/${tenantId}/api/auth/refresh`,
      loginUrl:   `/tenant/${tenantId}/auth/login`,
    };
  }
  return {
    refreshUrl: '/system/api/auth/refresh',
    loginUrl:   '/system/auth/login',
  };
}

function buildLoginUrlWithRedirect(loginUrl: string): string {
  if (typeof window === 'undefined') return loginUrl;
  const current = window.location.pathname + window.location.search;
  // Only allow safe relative redirects (single leading slash, not protocol-relative).
  const isSafe = current.startsWith('/') && !current.startsWith('//');
  if (!isSafe || current === loginUrl) return loginUrl;
  return `${loginUrl}?redirect=${encodeURIComponent(current)}`;
}

axiosInstance.interceptors.response.use(
  (response) => {
    const message = response.data?.message;

    if (
      message === AuthMessages.TOKEN_EXPIRED ||
      message === AuthMessages.USER_NOT_AUTHENTICATED ||
      message === UserSessionMessages.SESSION_EXPIRED
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

    // A truly dead session can't be refreshed — a refresh would just fail again.
    // These are terminal states (expired, revoked, deleted by reuse-detection,
    // malformed token, fingerprint changed). Without this branch those 401s fell
    // through unhandled and callers that swallow the rejection (e.g. the admin
    // shell's session fetch) silently rendered a logged-out UI with no redirect.
    // Skip the refresh round-trip and send the user straight to login.
    //
    // SESSION_NOT_FOUND is deliberately NOT here: it also fires when a concurrent
    // refresh rotated the access token away, leaving this request's token
    // orphaned. The refresh token may still be valid, so we let it fall through
    // to the refresh path below — which redirects only if the refresh itself fails.
    const DEAD_SESSION_MESSAGES: string[] = [
      UserSessionMessages.SESSION_EXPIRED,
      UserSessionMessages.SESSION_REVOKED,
      UserSessionMessages.INVALID_TOKEN,
      UserSessionMessages.REFRESH_TOKEN_REUSED,
      UserSessionMessages.DEVICE_FINGERPRINT_MISMATCH,
    ];
    if (error.response?.status === 401 && DEAD_SESSION_MESSAGES.includes(message)) {
      if (typeof window !== 'undefined') {
        const { loginUrl } = getAuthContext(originalRequest?.url);
        window.location.href = buildLoginUrlWithRedirect(loginUrl);
      }
      return Promise.reject(error);
    }

    const shouldRefresh =
      message === AuthMessages.TOKEN_EXPIRED ||
      message === AuthMessages.USER_NOT_AUTHENTICATED ||
      message === UserSessionMessages.SESSION_NOT_FOUND;

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

    const { refreshUrl, loginUrl } = getAuthContext(originalRequest?.url);

    try {
      await axios.post(refreshUrl, {}, { withCredentials: true });
      processQueue();
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);

      if (typeof window !== 'undefined') {
        window.location.href = buildLoginUrlWithRedirect(loginUrl);
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default axiosInstance;
