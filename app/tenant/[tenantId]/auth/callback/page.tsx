'use client';
import axiosInstance from '@/libs/axios';
import axios from 'axios';
import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { useGlobalStore } from '@/libs/zustand';
import { useRouter, useSearchParams, useParams } from 'next/navigation';

export default function TenantCallbackPage() {
    const params = useParams();
    const tenantId = params.tenantId as string;

    const searchParams = useSearchParams();

    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    const router = useRouter();
    const { setUser } = useGlobalStore();

    useEffect(() => {
        const fetchSession = async () => {
            console.log("[CALLBACK] Starting session fetch", { hasAccessToken: !!accessToken });
            if (accessToken || refreshToken) {
                try {
                    console.log("[CALLBACK] Setting tokens...");
                    await axios.post('/api/auth/session/token-set', {
                        accessToken,
                        refreshToken
                    }, { withCredentials: true });
                    console.log("[CALLBACK] Tokens set successfully");

                    // Also initialize CSRF token on the new domain
                    console.log("[CALLBACK] Initializing CSRF...");
                    await axios.get('/api/auth/csrf', { withCredentials: true });
                    console.log("[CALLBACK] CSRF initialized");
                } catch (err) {
                    console.error('[CALLBACK] Failed to set credentials:', err);
                }
            }

            try {
                console.log("[CALLBACK] Verifying session...");
                const res = await axios.get('/api/auth/session', { withCredentials: true });
                console.log("[CALLBACK] Session verify response:", res.status, res.data);
                if (res.status === 200 && res.data.success) {
                    setUser(res.data.user);
                    toast.success('Logged in successfully.');
                    
                    // On custom domains, we should redirect to / instead of /tenant/[id]
                    // This creates a cleaner URL and works better with proxying.
                    const isCustomDomain = !window.location.hostname.includes('localhost') && 
                                          !window.location.hostname.endsWith('example.com'); // Adapt if needed
                    
                    if (isCustomDomain) {
                        router.push('/');
                    } else {
                        router.push(`/tenant/${tenantId}`);
                    }
                } else {
                    console.warn("[CALLBACK] Session verify failed:", res.data.message);
                    toast.error(res.data.message || 'Session verification failed');
                    router.push('/auth/login');
                }
            } catch (err: any) {
                console.error('[CALLBACK] Session fetch error:', err);
                const errorMsg = err.response?.data?.message || 'Failed to verify session';
                toast.error(errorMsg);
                router.push('/auth/login');
            } 
        };

        fetchSession();
    }, [accessToken, refreshToken, tenantId, router, setUser]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
            <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
            <h1 className="text-xl font-medium">Completing secure transfer...</h1>
            <p className="text-base-content/60">We are logging you in to your organization.</p>
        </div>
    );
}
