'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/libs/axios';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSpinner } from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

const CreateTenantPage = () => {
    const router = useRouter();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error('Organization name is required');
            return;
        }

        if (name.trim().length < 2) {
            toast.error('Organization name must be at least 2 characters');
            return;
        }

        setLoading(true);

        try {
            const res = await axiosInstance.post('/system/api/tenants/create', {
                name: name.trim(),
                description: description.trim() || undefined,
            });

            if (res.data.success) {
                toast.success('Organization created successfully!');
                // Redirect to the new tenant
                router.push(`/tenant/${res.data.tenant.tenantId}`);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create organization');
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
                    Back to organizations
                </Link>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-1">
                        Organization Name *
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
                        Description (optional)
                    </label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Brief description of your organization..."
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
                            Creating...
                        </>
                    ) : (
                        'Create Organization'
                    )}
                </button>
            </form>

            <p className="text-xs text-center text-base-content/50">
                You will be the owner of this organization and can invite others later.
            </p>
        </div>
    );
};

export default CreateTenantPage;
