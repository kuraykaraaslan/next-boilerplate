'use client';
import { use, useEffect, useState } from 'react';
import api from '@/modules_next/common/axios';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { TabGroup } from '@/modules_next/common/ui/TabGroup';
import { Card } from '@/modules_next/common/ui/Card';
import { Badge } from '@/modules_next/common/ui/Badge';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { UserProfileForm, type UserProfileValues } from '@/modules_next/user/ui/UserProfileForm';
import { UserPreferencesForm, type UserPreferencesValues } from '@/modules_next/user/ui/UserPreferencesForm';
import { SocialAccountsPanel } from '@/modules_next/user/ui/SocialAccountsPanel';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faClock, faLayerGroup } from '@fortawesome/free-solid-svg-icons';

interface SecurityInfo {
  email?: string;
  lastLoginAt?: string | null;
  activeSessions?: number;
}

const ROLE_VARIANT: Record<string, 'success' | 'warning' | 'neutral' | 'primary'> = {
  OWNER: 'success',
  ADMIN: 'warning',
  USER:  'neutral',
};

export default function TenantMePage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [profile, setProfile] = useState<UserProfileValues>({ name: null, biography: null, profilePicture: null });
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const [security, setSecurity] = useState<SecurityInfo>({});
  const [preferences, setPreferences] = useState<Partial<UserPreferencesValues>>({});
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get(`/tenant/${tenantId}/api/auth/session`),
      api.get(`/tenant/${tenantId}/api/auth/me/profile`),
      api.get('/system/api/auth/me/preferences').catch(() => ({ data: {} })),
    ])
      .then(([sessionRes, profileRes, prefsRes]) => {
        setMemberRole(sessionRes.data.tenantMember?.memberRole ?? null);
        setSecurity({ email: sessionRes.data.user?.email, lastLoginAt: sessionRes.data.user?.lastLoginAt });
        const p = profileRes.data.userProfile ?? {};
        setProfile({ name: p.name ?? null, biography: p.biography ?? null, profilePicture: p.profilePicture ?? null });
        setPreferences(prefsRes.data.userPreferences ?? {});
      })
      .catch((err) => setErrorMsg(err.response?.data?.message ?? 'Failed to load profile.'))
      .finally(() => setLoading(false));
  }, [tenantId]);

  async function handleProfileSave(values: UserProfileValues) {
    setSuccessMsg(null); setErrorMsg(null);
    try {
      await api.put(`/tenant/${tenantId}/api/auth/me/profile`, { userProfile: values });
      setProfile(values);
      setSuccessMsg('Profile updated successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message ?? 'Failed to update profile.');
    }
  }

  async function handlePrefsSave(values: UserPreferencesValues) {
    setSuccessMsg(null); setErrorMsg(null);
    try {
      await api.put('/system/api/auth/me/preferences', { userPreferences: values });
      setPreferences(values);
      setSuccessMsg('Preferences updated.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message ?? 'Failed to update preferences.');
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>;
  }

  const lastLogin = security.lastLoginAt ? new Date(security.lastLoginAt).toLocaleString() : 'Never';

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        subtitle="Manage your personal information for this organization"
        badge={memberRole
          ? <Badge variant={ROLE_VARIANT[memberRole] ?? 'neutral'}>{memberRole}</Badge>
          : undefined
        }
      />

      {successMsg && <AlertBanner variant="success" message={successMsg} dismissible />}
      {errorMsg && <AlertBanner variant="error" message={errorMsg} dismissible />}

      <TabGroup
        label="Profile sections"
        tabs={[
          {
            id: 'profile',
            label: 'Profile',
            content: (
              <Card title="Profile Information" subtitle="Update your display name and bio">
                <UserProfileForm
                  initial={profile}
                  onSubmit={handleProfileSave}
                  uploadEndpoint={`/tenant/${tenantId}/api/storage`}
                />
              </Card>
            ),
          },
          {
            id: 'security',
            label: 'Security',
            content: (
              <Card title="Account Security" subtitle="Read-only account details">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <FontAwesomeIcon icon={faEnvelope} className="w-3.5 h-3.5" aria-hidden="true" />
                      <span className="font-medium text-text-primary">Email</span>
                    </div>
                    <span className="text-sm text-text-primary">{security.email ?? '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <FontAwesomeIcon icon={faClock} className="w-3.5 h-3.5" aria-hidden="true" />
                      <span className="font-medium text-text-primary">Last Login</span>
                    </div>
                    <span className="text-sm text-text-primary">{lastLogin}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <FontAwesomeIcon icon={faLayerGroup} className="w-3.5 h-3.5" aria-hidden="true" />
                      <span className="font-medium text-text-primary">Tenant Role</span>
                    </div>
                    {memberRole
                      ? <Badge variant={ROLE_VARIANT[memberRole] ?? 'neutral'}>{memberRole}</Badge>
                      : <span className="text-sm text-text-primary">—</span>
                    }
                  </div>
                </div>
              </Card>
            ),
          },
          {
            id: 'preferences',
            label: 'Preferences',
            content: (
              <Card title="Preferences" subtitle="Notification and display settings">
                <UserPreferencesForm
                  initial={preferences}
                  onSubmit={handlePrefsSave}
                />
              </Card>
            ),
          },
          {
            id: 'connected',
            label: 'Connected Accounts',
            content: <SocialAccountsPanel apiBase={`/tenant/${tenantId}/api/auth`} />,
          },
        ]}
      />
    </div>
  );
}
