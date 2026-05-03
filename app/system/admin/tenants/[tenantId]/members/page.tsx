'use client';

import { useParams, useRouter } from 'next/navigation';
import Table, {
    TableProvider,
    TableHeader,
    TableBody,
    TableFooter,
    ColumnDef,
    ActionButton
} from '@/modules/ui/forms/DynamicTable';
import {
    faCrown,
    faUserShield,
    faUser,
    faUserSecret,
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

const TenantMembersPage = () => {
    const params = useParams();
    const router = useRouter();
    const tenantId = params.tenantId as string;
    const { t } = useTranslation();

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
            href: (member) => `/system/admin/tenants/${tenantId}/members/${member.tenantMemberId}`,
            className: 'btn-primary'
        },
        {
            label: (
                <span className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faUserSecret} />
                    Impersonate
                </span>
            ),
            className: 'btn-warning btn-sm',
            confirm: {
                title: 'Impersonate User',
                description: 'You will temporarily act as this user. Your original session will be restored when you exit.',
                confirmText: 'Start Impersonation',
                confirmButtonClassName: 'btn-warning',
            },
            onClick: async (member) => {
                await axiosInstance.post('/system/api/auth/impersonate', {
                    targetUserId: member.userId,
                    tenantId,
                });
                router.push(`/tenant/${tenantId}/`);
            },
            hideOnMobile: true,
        },
        {
            label: 'Remove',
            onClick: async (member) => {
                if (!confirm(`Are you sure you want to remove ${member.user?.email}?`)) return;
                await axiosInstance.delete(`/api/tenant/${tenantId}/members/${member.tenantMemberId}`);
            },
            className: 'text-error',
            hideOnMobile: true,
        },
    ];

    return (
            <TableProvider<SafeTenantMember>
                apiEndpoint={`/api/tenant/${tenantId}/members`}
                dataKey="members"
                idKey="tenantMemberId"
                columns={columns}
                actions={actions}
            >
                <Table>
                    <TableHeader
                        title="Tenant Members"
                        searchPlaceholder="Search members..."
                        buttons={[{ label: "Add Member", href: `/system/admin/tenants/${tenantId}/members/create` }]}
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

export default TenantMembersPage;
