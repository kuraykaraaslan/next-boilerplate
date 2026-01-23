'use client';
import axios from 'axios';
import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { useGlobalStore } from '@/libs/zustand';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CallbackPage() {
    const searchParams = useSearchParams();

    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    const router = useRouter();
    const { setUser } = useGlobalStore();

    useEffect(() => {
        const fetchSession = async () => {
            if (accessToken || refreshToken) {
                try {
                    await axios.post('/api/auth/session/token-set', {
                        accessToken,
                        refreshToken
                    }, { withCredentials: true });
                } catch (err) {
                    console.error('Failed to set tokens:', err);
                }
            }

            try {
                const res = await axios.get('/api/auth/session', { withCredentials: true });
                if (res.status === 200) {
                    setUser(res.data.user);
                    toast.success('Logged in successfully.');
                } else {
                    toast.error(res.data.error || 'Login failed');
                }
            } catch (err: any) {
                console.error('Session fetch error:', err);
                toast.error(err.response?.data?.error || 'Failed to verify session');
            } finally {
                router.push('/');
            }
        };

        fetchSession();
    }, [accessToken, refreshToken, router, setUser]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
            <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
            <h1 className="text-xl font-medium">Logging you in...</h1>
        </div>
    );
}
