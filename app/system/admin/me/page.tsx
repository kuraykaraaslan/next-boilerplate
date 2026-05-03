'use client';
import { useEffect, useState } from 'react';
import api from '@/libs/axios';
import { Card } from '@/modules/ui/Card';
import { Input } from '@/modules/ui/Input';
import { Button } from '@/modules/ui/Button';
import { Spinner } from '@/modules/ui/Spinner';
import { AlertBanner } from '@/modules/ui/AlertBanner';
import { Badge } from '@/modules/ui/Badge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSave,
  faUser,
  faShieldHalved,
  faEnvelope,
  faCircleCheck,
  faCircleXmark,
  faClock,
  faLayerGroup,
} from '@fortawesome/free-solid-svg-icons';

interface UserProfile {
  name: string | null;
  biography: string | null;
  profilePicture: string | null;
  headerImage: string | null;
}

interface UserSecurity {
  email?: string;
  userRole?: string;
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  lastLoginIp?: string | null;
  lastLoginDevice?: string | null;
  activeSessions?: number;
  passkeyEnabled?: boolean;
  otpMethods?: string[];
}

export default function SystemMePage() {
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    biography: '',
    profilePicture: '',
    headerImage: '',
  });
  const [security, setSecurity] = useState<UserSecurity>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [profileRes, securityRes] = await Promise.all([
          api.get('/system/api/auth/me/profile'),
          api.get('/system/api/auth/me/security'),
        ]);
        const p = profileRes.data.userProfile ?? {};
        setProfile({
          name: p.name ?? '',
          biography: p.biography ?? '',
          profilePicture: p.profilePicture ?? '',
          headerImage: p.headerImage ?? '',
        });
        setSecurity(securityRes.data.userSecurity ?? {});
      } catch (err: any) {
        setErrorMsg(err.response?.data?.message ?? err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await api.put('/system/api/auth/me/profile', { userProfile: profile });
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

  const isEmailVerified = Boolean(security.emailVerifiedAt);
  const lastLogin = security.lastLoginAt
    ? new Date(security.lastLoginAt).toLocaleString()
    : 'Never';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">My Profile</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Manage your personal information and account details
        </p>
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

      <Card
        title="Security Information"
        subtitle="Read-only overview of your account security"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap border-b border-border pb-4">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <FontAwesomeIcon icon={faEnvelope} className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium text-text-primary">Email</span>
            </div>
            <span className="text-sm text-text-primary">{security.email ?? '—'}</span>
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap border-b border-border pb-4">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <FontAwesomeIcon icon={faShieldHalved} className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium text-text-primary">Role</span>
            </div>
            {security.userRole ? (
              <Badge variant="default">{security.userRole}</Badge>
            ) : (
              <span className="text-sm text-text-secondary">—</span>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap border-b border-border pb-4">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <FontAwesomeIcon
                icon={isEmailVerified ? faCircleCheck : faCircleXmark}
                className="w-3.5 h-3.5 shrink-0"
              />
              <span className="font-medium text-text-primary">Email Verified</span>
            </div>
            <Badge variant={isEmailVerified ? 'success' : 'warning'}>
              {isEmailVerified ? 'Verified' : 'Not Verified'}
            </Badge>
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap border-b border-border pb-4">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <FontAwesomeIcon icon={faClock} className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium text-text-primary">Last Login</span>
            </div>
            <span className="text-sm text-text-primary">{lastLogin}</span>
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <FontAwesomeIcon icon={faLayerGroup} className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium text-text-primary">Active Sessions</span>
            </div>
            <span className="text-sm text-text-primary">
              {security.activeSessions ?? '—'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
