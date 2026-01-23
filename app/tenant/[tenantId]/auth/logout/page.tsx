'use client';
import axiosInstance from '@/libs/axios';
import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { useGlobalStore } from '@/libs/zustand';
import { useRouter, useParams } from 'next/navigation';

const TenantLogoutPage = () => {
    const params = useParams();
    const tenantId = params.tenantId as string;

    const { setUser } = useGlobalStore();
    const router = useRouter();

    const isProxied = typeof window !== 'undefined' && !window.location.pathname.startsWith('/tenant/');
    const tenantBase = isProxied ? '' : `/tenant/${tenantId}`;

    const handleLogout = async () => {
        await axiosInstance.post(`/api/auth/logout`).then(res => {
            if (res.status === 200) {
                toast.success(res.data.message);
            }
        }).catch(err => {
            toast.error(err.response.data.message);
        }).finally(() => {
            setUser(null);
            localStorage.removeItem('user');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('userSession');
            router.push(`${tenantBase}/auth/login`);
        });
    };

    useEffect(() => {
        handleLogout();
    }, []);

    return (
        <>
        </>
    );
};

export default TenantLogoutPage;
