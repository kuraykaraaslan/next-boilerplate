'use client';
import { use, useEffect, useState } from 'react';
import api from '@/libs/axios';
import { Card } from '@/modules/ui/Card';
import { Badge } from '@/modules/ui/Badge';
import { Button } from '@/modules/ui/Button';
import { Input } from '@/modules/ui/Input';
import { AlertBanner } from '@/modules/ui/AlertBanner';
import { Spinner } from '@/modules/ui/Spinner';
import { Modal } from '@/modules/ui/Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faSearch, faUser, faTrash } from '@fortawesome/free-solid-svg-icons';

type MemberRole = 'USER' | 'ADMIN' | 'OWNER';

type Member = {
  tenantMemberId: string;
  memberRole: MemberRole;
  memberStatus: string;
  createdAt: string;
  user: { userId: string; email: string };
};

type SessionData = {
  tenantMember: { tenantMemberId: string; memberRole: MemberRole };
  tenant: { name: string };
};

const ROLE_BADGE: Record<MemberRole, 'primary' | 'warning' | 'neutral'> = {
  OWNER: 'primary',
  ADMIN: 'warning',
  USER: 'neutral',
};

export default function TenantMembersPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const [members, setMembers] = useState<Member[]>([]);
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('USER');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSent, setInviteSent] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/tenant/${tenantId}/api/auth/session`),
      api.get(`/tenant/${tenantId}/api/members`, { params: { pageSize: 100 } }),
    ])
      .then(([sessionRes, membersRes]) => {
        setSession(sessionRes.data);
        setMembers(membersRes.data.members ?? []);
      })
      .catch(() => setFetchError('Failed to load members. Please refresh.'))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const canManage = session?.tenantMember.memberRole === 'ADMIN' || session?.tenantMember.memberRole === 'OWNER';

  const filtered = members.filter((m) =>
    m.user.email.toLowerCase().includes(search.toLowerCase())
  );

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    setInviteError('');
    try {
      await api.post(`/tenant/${tenantId}/api/invitations`, { email: inviteEmail, memberRole: inviteRole });
      setInviteSent(true);
      setInviteEmail('');
      setInviteRole('USER');
      setTimeout(() => setInviteSent(false), 4000);
    } catch (err: any) {
      setInviteError(err.response?.data?.message ?? err.message ?? 'Failed to send invitation.');
    } finally {
      setInviting(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/tenant/${tenantId}/api/members/${confirmDelete.tenantMemberId}`);
      setMembers((prev) => prev.filter((m) => m.tenantMemberId !== confirmDelete.tenantMemberId));
      setConfirmDelete(null);
    } catch (err: any) {
      setDeleteError(err.response?.data?.message ?? err.message ?? 'Failed to remove member.');
    } finally {
      setDeleting(false);
    }
  }

  function canDelete(member: Member) {
    if (!canManage) return false;
    if (member.tenantMemberId === session?.tenantMember.tenantMemberId) return false;
    if (member.memberRole === 'OWNER') return session?.tenantMember.memberRole === 'OWNER';
    return true;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Members</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          {loading ? '…' : `${members.length} member${members.length !== 1 ? 's' : ''} in this organization`}
        </p>
      </div>

      {fetchError && <AlertBanner variant="error" message={fetchError} />}
      {inviteSent && <AlertBanner variant="success" message="Invitation sent successfully." dismissible />}

      {canManage && (
        <Card title="Invite Member" subtitle="Send an invitation email to add someone to this organization">
          <form onSubmit={handleInvite} className="space-y-3">
            {inviteError && <AlertBanner variant="error" message={inviteError} />}
            <div className="flex gap-3 flex-wrap items-end">
              <div className="flex-1 min-w-48">
                <Input
                  id="invite-email"
                  label="Email address"
                  type="email"
                  required
                  placeholder="colleague@example.com"
                  prefixIcon={<FontAwesomeIcon icon={faUser} className="w-3.5 h-3.5" />}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="invite-role" className="text-xs font-medium text-text-secondary">Role</label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as MemberRole)}
                  className="h-9 rounded-lg border border-border bg-surface-base px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus"
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                  {session?.tenantMember.memberRole === 'OWNER' && (
                    <option value="OWNER">Owner</option>
                  )}
                </select>
              </div>
              <Button type="submit" loading={inviting} iconLeft={<FontAwesomeIcon icon={faUserPlus} />}>
                Send Invite
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="pb-4">
          <Input
            id="member-search"
            label="Search members"
            placeholder="Search by email…"
            prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Spinner size="lg" /></div>
        ) : (
          <div className="overflow-x-auto -mx-6 -mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Member</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Role</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Joined</th>
                  {canManage && <th className="px-6 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((member) => (
                  <tr key={member.tenantMemberId} className="hover:bg-surface-overlay transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-subtle text-primary text-xs font-semibold shrink-0">
                          {member.user.email.charAt(0).toUpperCase()}
                        </span>
                        <p className="font-medium text-text-primary truncate">{member.user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={ROLE_BADGE[member.memberRole]}>{member.memberRole}</Badge>
                    </td>
                    <td className="px-6 py-4 text-text-secondary">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        {canDelete(member) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            aria-label="Remove member"
                            onClick={() => setConfirmDelete(member)}
                            iconLeft={<FontAwesomeIcon icon={faTrash} className="text-error" />}
                          />
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={canManage ? 4 : 3} className="px-6 py-10 text-center text-sm text-text-secondary">
                      No members found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={confirmDelete !== null}
        onClose={() => { setConfirmDelete(null); setDeleteError(''); }}
        title="Remove Member"
        description={`Remove ${confirmDelete?.user.email} from this organization?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>Remove</Button>
          </>
        }
      >
        {deleteError && <AlertBanner variant="error" message={deleteError} />}
        <p className="text-sm text-text-secondary">
          This will immediately revoke their access. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
