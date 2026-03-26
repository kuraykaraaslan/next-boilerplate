'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import axiosInstance from '@/libs/axios';
import Form from '@/components/common/forms/Form';
import DynamicText from '@/components/common/forms/DynamicText';
import DynamicSelect from '@/components/common/forms/DynamicSelect';
import Tabs from '@/components/common/tabs';
import Table, {
    TableProvider,
    TableHeader,
    TableBody,
    TableFooter,
    ColumnDef,
    ActionButton
} from '@/components/common/forms/DynamicTable';
import { faBuilding, faUsers, faCrown, faUserShield, faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { SafeTenant } from '@/modules/tenant/tenant.types';
import type { SafeTenantMember } from '@/modules/tenant_member/tenant_member.types';

const STATUS_OPTIONS = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
    { value: 'SUSPENDED', label: 'Suspended' },
];

const REGION_OPTIONS = [
    { value: 'TR', label: 'Turkey' },
    { value: 'US', label: 'United States' },
    { value: 'EU', label: 'Europe' },
];

const TenantDetailsPage = () => {
    const params = useParams();
    const router = useRouter();
    const tenantId = params.tenantId as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tenant, setTenant] = useState<SafeTenant | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [tenantStatus, setTenantStatus] = useState('ACTIVE');
    const [region, setRegion] = useState('TR');

    useEffect(() => {
        const fetchTenant = async () => {
            try {
                const res = await axiosInstance.get(`/api/tenants/${tenantId}`);
                const t = res.data.tenant;
                setTenant(t);
                setName(t.name || '');
                setDescription(t.description || '');
                setTenantStatus(t.tenantStatus || 'ACTIVE');
                setRegion(t.region || 'TR');
            } catch (error: any) {
                toast.error(error.response?.data?.message || 'Failed to load tenant');
            } finally {
                setLoading(false);
            }
        };

        fetchTenant();
    }, [tenantId]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await axiosInstance.put(`/api/tenants/${tenantId}`, {
                name,
                description,
                tenantStatus,
                region,
            });
            setTenant(res.data.tenant);
            toast.success('Tenant updated successfully');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update tenant');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
            return;
        }

        try {
            await axiosInstance.delete(`/api/tenants/${tenantId}`);
            toast.success('Tenant deleted successfully');
            router.push('/admin/tenants');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete tenant');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    if (!tenant) {
        return (
            <div className="alert alert-error">
                Tenant not found
            </div>
        );
    }

    const DetailsTab = (
        <Form
            actions={[
                {
                    label: saving ? 'Saving...' : 'Save Changes',
                    onClick: handleSave,
                    className: 'btn-primary',
                },
                {
                    label: 'Delete Tenant',
                    onClick: handleDelete,
                    className: 'btn-error btn-outline',
                },
            ]}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DynamicText
                    label="Tenant Name"
                    value={name}
                    setValue={setName}
                    placeholder="Enter tenant name"
                />

                <DynamicSelect
                    label="Status"
                    options={STATUS_OPTIONS}
                    selectedValue={tenantStatus}
                    onValueChange={setTenantStatus}
                    searchable={false}
                />

                <DynamicSelect
                    label="Region"
                    options={REGION_OPTIONS}
                    selectedValue={region}
                    onValueChange={setRegion}
                    searchable={false}
                />

                <DynamicText
                    label="Tenant ID"
                    value={tenantId}
                    setValue={() => {}}
                    disabled
                />
            </div>

            <div className="mt-4">
                <DynamicText
                    label="Description"
                    value={description}
                    setValue={setDescription}
                    placeholder="Enter tenant description"
                    isTextarea
                    rows={4}
                />
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-base-content/60">
                <div>
                    <span className="font-medium">Created:</span>{' '}
                    {tenant.createdAt ? new Date(tenant.createdAt).toLocaleString() : 'N/A'}
                </div>
                <div>
                    <span className="font-medium">Updated:</span>{' '}
                    {tenant.updatedAt ? new Date(tenant.updatedAt).toLocaleString() : 'N/A'}
                </div>
            </div>
        </Form>
    );

    const ROLE_ICONS = {
        OWNER: faCrown,
        ADMIN: faUserShield,
        USER: faUser,
    };

    const ROLE_COLORS = {
        OWNER: 'badge-warning',
        ADMIN: 'badge-primary',
        USER: 'badge-ghost',
    };

    const MEMBER_STATUS_COLORS = {
        ACTIVE: 'badge-success',
        INACTIVE: 'badge-ghost',
        SUSPENDED: 'badge-error',
        PENDING: 'badge-info',
    };

    const memberColumns: ColumnDef<SafeTenantMember>[] = [
        {
            key: 'user',
            header: 'User',
            accessor: (member) => (
                <div className="flex items-center gap-3">
                    <div className="avatar placeholder">
                        <div className="bg-neutral text-neutral-content rounded-full w-10">
                            <span className="text-sm">
                                {member.user?.email?.[0]?.toUpperCase() || '?'}
                            </span>
                        </div>
                    </div>
                    <div>
                        <div className="font-medium">{member.user?.email || 'Unknown'}</div>
                    </div>
                </div>
            )
        },
        {
            key: 'role',
            header: 'Role',
            accessor: (member) => (
                <span className={`badge ${ROLE_COLORS[member.memberRole]} gap-1`}>
                    <FontAwesomeIcon icon={ROLE_ICONS[member.memberRole]} size="xs" />
                    {member.memberRole}
                </span>
            )
        },
        {
            key: 'status',
            header: 'Status',
            accessor: (member) => (
                <span className={`badge ${MEMBER_STATUS_COLORS[member.memberStatus]}`}>
                    {member.memberStatus}
                </span>
            )
        },
        {
            key: 'createdAt',
            header: 'Joined',
            accessor: (member) => (
                <span className="text-sm text-base-content/60">
                    {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'N/A'}
                </span>
            )
        },
    ];

    const memberActions: ActionButton<SafeTenantMember>[] = [
        {
            label: 'Remove',
            onClick: async (member) => {
                if (!confirm(`Are you sure you want to remove ${member.user?.email}?`)) return;
                await axiosInstance.delete(`/api/tenant/${tenantId}/members/${member.tenantMemberId}`);
            },
            className: 'text-error',
        },
    ];

    const MembersTab = (
        <TableProvider<SafeTenantMember>
            apiEndpoint={`/api/tenant/${tenantId}/members`}
            dataKey="members"
            idKey="tenantMemberId"
            columns={memberColumns}
            actions={memberActions}
        >
            <Table>
                <TableHeader
                    title=""
                    searchPlaceholder="Search members..."
                    buttons={[{ label: "Add Member", href: `/admin/tenants/${tenantId}/members/create` }]}
                />
                <TableBody />
                <TableFooter
                    showingText="Showing"
                    previousText="Previous"
                    nextText="Next"
                />
            </Table>
        </TableProvider>
    );

    const tabs = [
        {
            id: 'details',
            label: 'Details',
            icon: faBuilding,
            content: DetailsTab,
        },
        {
            id: 'members',
            label: 'Members',
            icon: faUsers,
            content: MembersTab,
        },
    ];

    return (
        <div className="container mx-auto p-4">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">{tenant.name}</h1>
                <p className="text-base-content/60">Manage tenant settings and members</p>
            </div>

            <Tabs
                tabs={tabs}
                defaultTab="details"
                variant="boxed"
            />
        </div>
    );
};

export default TenantDetailsPage;
