'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/libs/axios';
import { toast } from 'react-toastify';
import { useAuthStore } from '@/modules/auth/auth.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding, faPlus, faSpinner, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { useModuleDictionary } from '../hooks/useModuleDictionary';
import type { TenantLocale } from '../dictionaries';
import type { TenantMember } from '@/modules/tenant_member/tenant_member.types';

interface TenantSelectProps {
    locale?: TenantLocale;
}

const TenantSelect = ({ locale = 'en' }: TenantSelectProps) => {
    const { t } = useModuleDictionary(locale);
    const router = useRouter();
    const { user } = useAuthStore();
    const [tenants, setTenants] = useState<TenantMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTenants = async () => {
            try {
                const res = await axiosInstance.get('/api/auth/me/tenants');
                if (res.data.success) {
                    setTenants(res.data.tenants);
                }
            } catch (error: any) {
                if (error.response?.status === 401) {
                    router.push('/auth/login');
                    return;
                }
                toast.error(t('failed_to_load'));
            } finally {
                setLoading(false);
            }
        };

        fetchTenants();
    }, [router, t]);

    const handleSelectTenant = async (membership: TenantMember) => {
        const tenant = membership.tenant;
        const primaryDomain = tenant?.domains?.find(d => d.isPrimary) || tenant?.domains?.[0];

        if (primaryDomain) {
            try {
                const res = await axiosInstance.get('/api/auth/session/tokens');
                if (res.data.success) {
                    const { accessToken, refreshToken } = res.data;
                    const domain = primaryDomain.domain;
                    const protocol = window.location.protocol;
                    const host = window.location.host;

                    let targetHost = domain;
                    if (host.includes(':') && !domain.includes(':')) {
                        const port = host.split(':')[1];
                        targetHost = `${domain}:${port}`;
                    }

                    const callbackUrl = `${protocol}//${targetHost}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`;
                    window.location.href = callbackUrl;
                    return;
                }
            } catch (error) {
                console.error('Failed to get session tokens:', error);
                toast.error(t('failed_to_transfer_session'));
            }
        }

        router.push(`/tenant/${tenant?.tenantId}`);
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
                    {t('select_to_continue')}
                </p>
            </div>

            {tenants.length === 0 ? (
                <div className="text-center py-8">
                    <FontAwesomeIcon icon={faBuilding} className="text-4xl text-base-content/30 mb-4" />
                    <p className="text-base-content/60 mb-4">
                        {t('no_organizations')}
                    </p>
                    <button
                        onClick={handleCreateTenant}
                        className="btn btn-primary"
                    >
                        <FontAwesomeIcon icon={faPlus} className="mr-2" />
                        {t('create_organization')}
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {tenants.map((membership) => (
                        <button
                            key={membership.tenantMemberId}
                            onClick={() => handleSelectTenant(membership)}
                            className="w-full p-4 bg-base-200 hover:bg-base-300 rounded-lg transition-colors flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                    <FontAwesomeIcon icon={faBuilding} className="text-primary" />
                                </div>
                                <div className="text-left">
                                    <div className="font-medium">{membership.tenant?.name}</div>
                                    {membership.tenant?.description && (
                                        <div className="text-sm text-base-content/60">
                                            {membership.tenant.description}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="badge badge-outline badge-xs opacity-50">
                                            {membership.memberRole}
                                        </div>
                                        {membership.tenant?.domains && membership.tenant.domains.length > 0 && (
                                            <div className="text-xs text-primary/70 font-mono">
                                                {membership.tenant.domains.find(d => d.isPrimary)?.domain || membership.tenant.domains[0].domain}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <FontAwesomeIcon
                                icon={faArrowRight}
                                className="text-base-content/30 group-hover:text-primary transition-colors"
                            />
                        </button>
                    ))}

                    <div className="divider">{t('or') || 'or'}</div>

                    <button
                        onClick={handleCreateTenant}
                        className="w-full p-4 border-2 border-dashed border-base-300 hover:border-primary rounded-lg transition-colors flex items-center justify-center gap-2 text-base-content/60 hover:text-primary"
                    >
                        <FontAwesomeIcon icon={faPlus} />
                        {t('create_new_organization')}
                    </button>
                </div>
            )}

            {user && (user.userRole === 'ADMIN') && (
                <div className="pt-4 border-t border-base-300">
                    <button
                        onClick={() => router.push('/system/admin')}
                        className="w-full btn btn-ghost btn-sm"
                    >
                        {t('go_to_admin_panel')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default TenantSelect;
