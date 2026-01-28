'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/libs/axios';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSpinner } from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import { useModuleDictionary } from '../hooks/useModuleDictionary';
import type { TenantLocale } from '../dictionaries';

interface TenantCreateProps {
    locale?: TenantLocale;
}

const TenantCreate = ({ locale = 'en' }: TenantCreateProps) => {
    const { t } = useModuleDictionary(locale);
    const router = useRouter();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error(t('organization_name_required'));
            return;
        }

        if (name.trim().length < 2) {
            toast.error(t('organization_name_min_length'));
            return;
        }

        setLoading(true);

        try {
            const res = await axiosInstance.post('/system/api/tenants/create', {
                name: name.trim(),
                description: description.trim() || undefined,
            });

            if (res.data.success) {
                toast.success(t('organization_created'));
                router.push(`/tenant/${res.data.tenant.tenantId}`);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || t('failed_to_create'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="mb-4">
                <Link
                    href="/system/auth/select-tenant"
                    className="text-sm text-base-content/60 hover:text-primary flex items-center gap-2"
                >
                    <FontAwesomeIcon icon={faArrowLeft} />
                    {t('back_to_organizations')}
                </Link>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-1">
                        {t('organization_name')} *
                    </label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="My Company"
                        className="block w-full rounded-lg border-0 py-1.5 shadow-sm ring-1 ring-inset placeholder:text-base-content/40 sm:text-sm sm:leading-6 h-12 p-4"
                        required
                        minLength={2}
                        maxLength={100}
                    />
                </div>

                <div>
                    <label htmlFor="description" className="block text-sm font-medium mb-1">
                        {t('description_optional')}
                    </label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t('description_placeholder')}
                        className="block w-full rounded-lg border-0 py-1.5 shadow-sm ring-1 ring-inset placeholder:text-base-content/40 sm:text-sm sm:leading-6 p-4 min-h-[100px]"
                        maxLength={500}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !name.trim()}
                    className="w-full btn btn-primary"
                >
                    {loading ? (
                        <>
                            <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                            {t('creating')}
                        </>
                    ) : (
                        t('create_organization')
                    )}
                </button>
            </form>

            <p className="text-xs text-center text-base-content/50">
                {t('owner_note')}
            </p>
        </div>
    );
};

export default TenantCreate;
