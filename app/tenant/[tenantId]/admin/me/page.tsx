'use client';
import { use, useEffect, useState } from 'react';
import api from '@/libs/axios';
import { Card } from '@/modules/ui/Card';
import { Input } from '@/modules/ui/Input';
import { Button } from '@/modules/ui/Button';
import { Spinner } from '@/modules/ui/Spinner';
import { AlertBanner } from '@/modules/ui/AlertBanner';
import { Badge } from '@/modules/ui/Badge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faUser } from '@fortawesome/free-solid-svg-icons';

interface UserProfile {
  name: string | null;
  biography: string | null;
  profilePicture: string | null;
  headerImage: string | null;
}

export default function TenantMePage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    biography: '',
    profilePicture: '',
    headerImage: '',
  });
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [sessionRes, profileRes] = await Promise.all([
          api.get(`/tenant/${tenantId}/api/auth/session`),
          api.get(`/tenant/${tenantId}/api/auth/me/profile`),
        ]);
        setMemberRole(sessionRes.data.tenantMember?.memberRole ?? null);
        const p = profileRes.data.userProfile ?? {};
        setProfile({
          name: p.name ?? '',
          biography: p.biography ?? '',
          profilePicture: p.profilePicture ?? '',
          headerImage: p.headerImage ?? '',
        });
      } catch (err: any) {
        setErrorMsg(err.response?.data?.message ?? err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [tenantId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await api.put(`/tenant/${tenantId}/api/auth/me/profile`, { userProfile: profile });
      setSuccessMsg('Profile updated successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message ?? err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const roleBadgeVariant =
    memberRole === 'OWNER' ? 'success' : memberRole === 'ADMIN' ? 'warning' : 'default';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">My Profile</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Manage your personal information for this organization
          </p>
        </div>
        {memberRole && (
          <Badge variant={roleBadgeVariant}>{memberRole}</Badge>
        )}
      </div>

      {successMsg && (
        <AlertBanner variant="success" message={successMsg} dismissible />
      )}
      {errorMsg && (
        <AlertBanner variant="error" message={errorMsg} dismissible />
      )}

      <Card title="Profile Information" subtitle="Update your display name and biography">
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            id="name"
            label="Display Name"
            prefixIcon={<FontAwesomeIcon icon={faUser} className="w-3.5 h-3.5" />}
            value={profile.name ?? ''}
            onChange={(e) => setProfile((v) => ({ ...v, name: e.target.value }))}
            placeholder="Your full name"
          />
          <Input
            id="biography"
            label="Biography"
            value={profile.biography ?? ''}
            onChange={(e) => setProfile((v) => ({ ...v, biography: e.target.value }))}
            placeholder="A short bio about yourself"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              iconLeft={<FontAwesomeIcon icon={faSave} />}
            >
              Save Profile
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
