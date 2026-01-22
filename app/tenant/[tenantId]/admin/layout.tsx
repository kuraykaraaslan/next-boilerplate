'use client'
import { useEffect, useState, ReactNode } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import axiosInstance from "@/libs/axios";
import useGlobalStore from "@/libs/zustand";

const Navbar = dynamic(() => import('@/components/tenant/layout/navbar'), { ssr: false });

const Layout = ({
    children,
}: {
    children: ReactNode;
}) => {
    const router = useRouter();
    const params = useParams();
    const tenantId = params.tenantId as string;
    const { setUser } = useGlobalStore();
    const [isAuthChecked, setIsAuthChecked] = useState(false);
    const [tenant, setTenant] = useState<any>(null);
    const [tenantMember, setTenantMember] = useState<any>(null);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await axiosInstance.get('/api/auth/session');
                if (response.status === 200 && response.data.user) {
                    setUser(response.data.user);

                    // Check tenant membership
                    const tenantResponse = await axiosInstance.get(`/api/tenant/${tenantId}/auth`);
                    if (tenantResponse.status === 200 && tenantResponse.data.success) {
                        const { tenant, tenantMember } = tenantResponse.data;

                        // Check if user has admin role in tenant
                        if (tenantMember.memberRole !== 'OWNER' && tenantMember.memberRole !== 'ADMIN') {
                            router.push(`/tenant/${tenantId}?error=Access denied`);
                            return;
                        }

                        setTenant(tenant);
                        setTenantMember(tenantMember);
                        setIsAuthChecked(true);
                    }
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                router.push('/auth/login?error=Access denied');
            }
        };

        if (!isAuthChecked && tenantId) {
            checkAuth();
        }
    }, [isAuthChecked, router, setUser, tenantId]);

    if (!isAuthChecked) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="loading loading-spinner loading-lg"></div>
            </div>
        );
    }

    return (
        <>
            <Navbar tenant={tenant} tenantMember={tenantMember} />
            <div style={{ flex: 1 }} className="container mx-auto px-4 pt-4 md:pt-12 lg:px-8 max-w-8xl mb-8 flex flex-col md:flex-row gap-4">
                {children}
            </div>
            <ToastContainer />
        </>
    );
}

export default Layout;
