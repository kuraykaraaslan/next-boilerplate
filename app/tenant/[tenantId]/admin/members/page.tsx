'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Table, {
    TableProvider,
    TableHeader,
    TableBody,
    TableFooter,
    ColumnDef,
    ActionButton
} from '@/components/common/forms/DynamicTable';
import HeadlessModal, { useModal } from '@/modules/ui/modal';
import {
    faCrown,
    faUserShield,
    faUser,
    faPaperPlane,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { SafeTenantMember } from '@/modules/tenant_member/tenant_member.types';
import axiosInstance from '@/libs/axios';

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

// ── Invite Modal ──────────────────────────────────────────────────────────────

function InviteModal({
    open,
    onClose,
    tenantBase,
}: {
    open: boolean;
    onClose: () => void;
    tenantBase: string;
}) {
    const [email, setEmail] = useState('');
    const [memberRole, setMemberRole] = useState<'USER' | 'ADMIN'>('USER');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const reset = () => {
        setEmail('');
        setMemberRole('USER');
        setError(null);
        setSuccess(false);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await axiosInstance.post(`${tenantBase}/api/invitations`, { email, memberRole });
            setSuccess(true);
            setEmail('');
            setMemberRole('USER');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to send invitation');
        } finally {
            setLoading(false);
        }
    };

    return (
        <HeadlessModal open={open} onClose={handleClose} title="Invite Member" size="sm">
            {success ? (
                <div className="flex flex-col items-center gap-4 py-2">
                    <div className="text-success text-4xl">✓</div>
                    <p className="text-center font-medium">Invitation sent!</p>
                    <p className="text-sm text-base-content/60 text-center">
                        An email has been sent to <strong>{email || 'the recipient'}</strong>.
                    </p>
                    <div className="flex gap-2 pt-2">
                        <button className="btn btn-ghost btn-sm" onClick={handleClose}>
                            Close
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => setSuccess(false)}>
                            Send Another
                        </button>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium">Email address</span>
                        </label>
                        <input
                            type="email"
                            className="input input-bordered w-full"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium">Role</span>
                        </label>
                        <select
                            className="select select-bordered w-full"
                            value={memberRole}
                            onChange={(e) => setMemberRole(e.target.value as 'USER' | 'ADMIN')}
                        >
                            <option value="USER">User</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                        <label className="label">
                            <span className="label-text-alt text-base-content/60">
                                Admins can manage members, settings and invitations.
                            </span>
                        </label>
                    </div>

                    {error && (
                        <div className="alert alert-error text-sm py-2">{error}</div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" className="btn btn-ghost" onClick={handleClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary gap-2" disabled={loading || !email}>
                            {loading
                                ? <span className="loading loading-spinner loading-sm" />
                                : <FontAwesomeIcon icon={faPaperPlane} />
                            }
                            Send Invite
                        </button>
                    </div>
                </form>
            )}
        </HeadlessModal>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const Page = () => {
    const params = useParams();
    const tenantId = params.tenantId as string;
    const { open, openModal, closeModal } = useModal();

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
                            {member.user?.userProfile?.name ?? member.user?.email ?? 'Unknown'}
                        </div>
                        <div className="text-sm text-base-content/60">{member.user?.email}</div>
                    </div>
                </div>
            ),
        },
        {
            key: 'role',
            header: 'Role',
            accessor: (member) => (
                <span className={`badge ${ROLE_COLORS[member.memberRole]} gap-1`}>
                    <FontAwesomeIcon icon={ROLE_ICONS[member.memberRole]} size="xs" />
                    {member.memberRole}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            accessor: (member) => (
                <span className={`badge ${STATUS_COLORS[member.memberStatus]}`}>
                    {member.memberStatus}
                </span>
            ),
        },
        {
            key: 'createdAt',
            header: 'Joined',
            hideOnMobile: true,
            accessor: (member) => (
                <span className="text-sm text-base-content/60">
                    {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'N/A'}
                </span>
            ),
        },
    ];

    const actions: ActionButton<SafeTenantMember>[] = [
        {
            label: 'Edit',
            href: (member) => `${tenantBase}/admin/members/${member.tenantMemberId}`,
            className: 'btn-primary',
        },
        {
            label: 'Remove',
            className: 'text-error',
            hideOnMobile: true,
            confirm: {
                title: 'Remove Member',
                description: 'Are you sure you want to remove this member from the tenant?',
                confirmText: 'Remove',
                confirmButtonClassName: 'btn-error',
            },
            onClick: async (member) => {
                await axiosInstance.delete(`${tenantBase}/api/members/${member.tenantMemberId}`);
            },
        },
    ];

    return (
        <>
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
                        showRefresh
                        buttons={[
                            {
                                label: (
                                    <span className="flex items-center gap-2">
                                        <FontAwesomeIcon icon={faPaperPlane} />
                                        Invite
                                    </span>
                                ),
                                onClick: openModal,
                                className: 'btn-primary',
                            },
                        ]}
                    />
                    <TableBody />
                    <TableFooter />
                </Table>
            </TableProvider>

            <InviteModal open={open} onClose={closeModal} tenantBase={tenantBase} />
        </>
    );
};

export default Page;
