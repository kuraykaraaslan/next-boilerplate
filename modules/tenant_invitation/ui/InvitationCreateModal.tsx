'use client';

import { useState } from 'react';
import api from '@nb/common/server/axios';
import { Button } from '@nb/common/ui/Button';
import { Input } from '@nb/common/ui/Input';
import { Select } from '@nb/common/ui/Select';
import { Modal } from '@nb/common/ui/Modal';
import { AlertBanner } from '@nb/common/ui/AlertBanner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import type { TenantMemberRole as MemberRole } from '@nb/tenant_member/server/tenant_member.enums';
import type { InvitationRow } from './invitation-columns';

interface Props {
  open: boolean;
  tenantId: string;
  availableRoles: { value: string; label: string }[];
  onClose: () => void;
  onCreated: (invitation: InvitationRow) => void;
}

export function InvitationCreateModal({ open, tenantId, availableRoles, onClose, onCreated }: Props) {
  const [email, setEmail] = useState('');
  const [role, setRole]   = useState<MemberRole>('USER');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  function handleClose() {
    setEmail(''); setRole('USER'); setError('');
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSaving(true); setError('');
    try {
      const res = await api.post(`/tenant/${tenantId}/api/invitations`, {
        email: email.trim(),
        memberRole: role,
      });
      handleClose();
      onCreated(res.data.invitation);
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e2?.response?.data?.message ?? e2?.message ?? 'Failed to send invitation.');
    } finally { setSaving(false); }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New Invitation"
      description="Send an invitation email to add someone to this organization."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={saving}>Cancel</Button>
          <Button form="invite-form" type="submit" loading={saving} iconLeft={<FontAwesomeIcon icon={faEnvelope} />}>
            Send Invitation
          </Button>
        </>
      }
    >
      <form id="invite-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <AlertBanner variant="error" message={error} />}
        <Input
          id="inv-email" label="Email address" type="email" required
          placeholder="colleague@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Select
          id="inv-role" label="Role"
          options={availableRoles}
          value={role}
          onChange={(e) => setRole(e.target.value as MemberRole)}
        />
      </form>
    </Modal>
  );
}
