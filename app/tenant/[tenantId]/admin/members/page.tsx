'use client';

import { useParams } from 'next/navigation';
import Table, {
    TableProvider,
    TableHeader,
    TableBody,
    TableFooter,
    ColumnDef,
    ActionButton
} from '@/components/common/forms/DynamicTable';
import {
    faCrown,
    faUserShield,
    faUser,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { SafeTenantMember } from '@/modules/tenant_member/tenant_member.types';
import axiosInstance from '@/libs/axios';
import { useTranslation } from 'react-i18next';

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

const STATUS_COLORS = {
    ACTIVE: 'badge-success',
    INACTIVE: 'badge-ghost',
    SUSPENDED: 'badge-error',
    PENDING: 'badge-info',
};

const Page = () => {
    const params = useParams();
    const tenantId = params.tenantId as string;
    const { t } = useTranslation();

    // If the path doesn't start with /tenant/, base is empty (we are on a custom domain)
    const isProxied = typeof window !== 'undefined' && !window.location.pathname.startsWith('/tenant/');
    const tenantBase = isProxied ? '' : `/tenant/${tenantId}`;

    const columns: ColumnDef<SafeTenantMember>[] = [
        { 
            key: 'user', 
            header: 'User', 
            accessor: (member) => (
                <div className="flex items-center gap-3">
                    <div className="avatar placeholder">
                        <div className="bg-neutral text-neutral-content rounded-full w-10">
                            <span className="text-sm">
                                {member.user?.userProfile?.name?.[0] || member.user?.email?.[0]?.toUpperCase() || '?'}
                            </span>
                        </div>
                    </div>
                    <div>
                        <div className="font-medium">
                            {member.user?.userProfile?.name
                                ? member.user.userProfile.name
                                : member.user?.email || 'Unknown'}
                        </div>
                        <div className="text-sm text-base-content/60">
                            {member.user?.email}
                        </div>
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
                <span className={`badge ${STATUS_COLORS[member.memberStatus]}`}>
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

    const actions: ActionButton<SafeTenantMember>[] = [
        { 
            label: 'Edit', 
            href: (member) => `${tenantBase}/admin/members/${member.tenantMemberId}`, 
            className: 'btn-primary' 
        },
        { 
            label: 'Remove', 
            onClick: async (member) => {
                if (!confirm(`Are you sure you want to remove ${member.user?.email}?`)) return;
                // Use relative API path which proxy rewrites
                await axiosInstance.delete(`${tenantBase}/api/members/${member.tenantMemberId}`);
            },
            className: 'text-error',
            hideOnMobile: true,
        },
    ];

    return (
        <TableProvider<SafeTenantMember>
            apiEndpoint={`${tenantBase}/api/members`}
            dataKey="members"
            idKey="tenantMemberId"
            columns={columns}
            actions={actions}
        >
            <Table>
                <TableHeader
                    title="Members"
                    searchPlaceholder="Search members..."
                    buttonText="Add Member"
                    buttonLink={`${tenantBase}/admin/members/create`}
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
};

export default Page;
