'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/libs/axios';
import { toast } from 'react-toastify';
import { useGlobalStore } from '@/libs/zustand';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding, faPlus, faSpinner, faArrowRight } from '@fortawesome/free-solid-svg-icons';

interface TenantMembership {
    tenantMemberId: string;
    memberRole: 'USER' | 'ADMIN' | 'OWNER';
    memberStatus: string;
    tenant: {
        tenantId: string;
        name: string;
        description?: string;
        tenantStatus: string;
    };
}

const SelectTenantPage = () => {
    const router = useRouter();
    const { user } = useGlobalStore();
    const [tenants, setTenants] = useState<TenantMembership[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTenants = async () => {
            try {
                const res = await axiosInstance.get('/api/auth/me/tenants');
                if (res.data.success) {
                    setTenants(res.data.tenants);
                }
            } catch (error: any) {
                // If not authenticated, redirect to login
                if (error.response?.status === 401) {
                    router.push('/auth/login');
                    return;
                }
                toast.error('Failed to load organizations');
            } finally {
                setLoading(false);
            }
        };

        fetchTenants();
    }, [router]);

    const handleSelectTenant = (tenantId: string) => {
        router.push(`/tenant/${tenantId}`);
    };

    const handleCreateTenant = () => {
        router.push('/system/auth/create-tenant');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <p className="text-sm text-base-content/70">
                    Select an organization to continue
                </p>
            </div>

            {tenants.length === 0 ? (
                <div className="text-center py-8">
                    <FontAwesomeIcon icon={faBuilding} className="text-4xl text-base-content/30 mb-4" />
                    <p className="text-base-content/60 mb-4">
                        You are not a member of any organization yet.
                    </p>
                    <button
                        onClick={handleCreateTenant}
                        className="btn btn-primary"
                    >
                        <FontAwesomeIcon icon={faPlus} className="mr-2" />
                        Create Organization
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {tenants.map((membership) => (
                        <button
                            key={membership.tenantMemberId}
                            onClick={() => handleSelectTenant(membership.tenant.tenantId)}
                            className="w-full p-4 bg-base-200 hover:bg-base-300 rounded-lg transition-colors flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                    <FontAwesomeIcon icon={faBuilding} className="text-primary" />
                                </div>
                                <div className="text-left">
                                    <div className="font-medium">{membership.tenant.name}</div>
                                    {membership.tenant.description && (
                                        <div className="text-sm text-base-content/60">
                                            {membership.tenant.description}
                                        </div>
                                    )}
                                    <div className="text-xs text-base-content/50">
                                        {membership.memberRole}
                                    </div>
                                </div>
                            </div>
                            <FontAwesomeIcon
                                icon={faArrowRight}
                                className="text-base-content/30 group-hover:text-primary transition-colors"
                            />
                        </button>
                    ))}

                    <div className="divider">or</div>

                    <button
                        onClick={handleCreateTenant}
                        className="w-full p-4 border-2 border-dashed border-base-300 hover:border-primary rounded-lg transition-colors flex items-center justify-center gap-2 text-base-content/60 hover:text-primary"
                    >
                        <FontAwesomeIcon icon={faPlus} />
                        Create New Organization
                    </button>
                </div>
            )}

            {/* Admin shortcut if user has admin role */}
            {user && (user.userRole === 'ADMIN' || user.userRole === 'SUPER_ADMIN') && (
                <div className="pt-4 border-t border-base-300">
                    <button
                        onClick={() => router.push('/system/admin')}
                        className="w-full btn btn-ghost btn-sm"
                    >
                        Go to System Admin
                    </button>
                </div>
            )}
        </div>
    );
};

export default SelectTenantPage;
