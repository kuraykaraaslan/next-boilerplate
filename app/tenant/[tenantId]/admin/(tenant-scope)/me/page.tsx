'use client';
import { use, useEffect, useState } from 'react';
import api from '@nb/common/server/axios';
import { PageHeader } from '@nb/common/ui/page-header.component';
import { TabGroup } from '@nb/common/ui/tab-group.component';
import { Card } from '@nb/common/ui/card.component';
import { Badge } from '@nb/common/ui/badge.component';
import { Spinner } from '@nb/common/ui/spinner.component';
import { AlertBanner } from '@nb/common/ui/alert-banner.component';
import { UserProfileForm, type UserProfileValues } from '@nb/user/ui/user-profile-form.component';
import { UserPreferencesForm, type UserPreferencesValues } from '@nb/user/ui/user-preferences-form.component';
import { UserRoleBadge } from '@nb/user/ui/user-role-badge.component';
import { SocialAccountsPanel } from '@nb/user/ui/social-accounts-panel.component';
import { PasskeysPanel } from '@nb/user_security/ui/passkeys-panel.component';
import { SigningCertificatesPanel } from '@nb/auth_e_signature/ui/signing-certificates-panel.component';
import { ActiveSessionsPanel } from '@nb/user_session/ui/active-sessions-panel.component';
import { useSlotContributions } from '@nb/common/ui/slot.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faClock, faLayerGroup, faShieldHalved, faCircleCheck, faCircleXmark } from '@fortawesome/free-solid-svg-icons';
import type { SafeUserSession } from '@nb/user_session/server/user_session.types';

interface SecurityInfo {
  email?: string;
  userRole?: 'ADMIN' | 'USER';
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  lastLoginIp?: string | null;
  activeSessions?: number;
}

const ROLE_VARIANT: Record<string, 'success' | 'warning' | 'neutral' | 'primary'> = {
  OWNER: 'success',
  ADMIN: 'warning',
  USER:  'neutral',
};

export default function TenantMePage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  // Plugin-contributed profile tabs (e.g. payment's Billing tab) via the
  // `user.profile.tabs` slot — appear/disappear with the contributing module.
  const profileSlotTabs = useSlotContributions('user.profile.tabs');

  const [profile, setProfile] = useState<UserProfileValues>({ name: null, biography: null, profilePicture: null });
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const [security, setSecurity] = useState<SecurityInfo>({});
  const [preferences, setPreferences] = useState<Partial<UserPreferencesValues>>({});
  const [sessions, setSessions] = useState<SafeUserSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get(`/tenant/${tenantId}/api/auth/session`),
      api.get(`/tenant/${tenantId}/api/auth/me/profile`),
      api.get(`/tenant/${tenantId}/api/auth/me/security`).catch(() => ({ data: { userSecurity: {} } })),
      api.get(`/tenant/${tenantId}/api/auth/me/preferences`).catch(() => ({ data: {} })),
      api.get(`/tenant/${tenantId}/api/auth/me/sessions`).catch(() => ({ data: { sessions: [] } })),
    ])
      .then(([sessionRes, profileRes, secRes, prefsRes, sessionsRes]) => {
        setMemberRole(sessionRes.data.tenantMember?.memberRole ?? null);
        const sec = secRes.data.userSecurity ?? {};
        setSecurity({
          email: sec.email ?? sessionRes.data.user?.email,
          userRole: sec.userRole,
          emailVerifiedAt: sec.emailVerifiedAt ?? null,
          lastLoginAt: sec.lastLoginAt ?? sessionRes.data.user?.lastLoginAt ?? null,
          lastLoginIp: sec.lastLoginIp ?? null,
        });
        const p = profileRes.data.userProfile ?? {};
        setProfile({ name: p.name ?? null, biography: p.biography ?? null, profilePicture: p.profilePicture ?? null });
        setPreferences(prefsRes.data.userPreferences ?? {});
        setSessions(sessionsRes.data.sessions ?? []);
        setCurrentSessionId(sessionRes.data.userSession?.userSessionId ?? null);
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
      await api.put(`/tenant/${tenantId}/api/auth/me/preferences`, { userPreferences: values });
      setPreferences(values);
      setSuccessMsg('Preferences updated.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message ?? 'Failed to update preferences.');
    }
  }

  async function handleRevokeSession(sessionId: string) {
    setRevoking(sessionId);
    try {
      const res = await api.delete(`/tenant/${tenantId}/api/auth/me/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s.userSessionId !== sessionId));
      if (res.data.isCurrentSession) {
        window.location.href = `/tenant/${tenantId}/auth/logout`;
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message ?? 'Failed to revoke session.');
    } finally {
      setRevoking(null);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>;
  }

  const isEmailVerified = Boolean(security.emailVerifiedAt);
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
              <div className="space-y-4">
                <Card title="Account Security" subtitle="Overview of your account">
                  <div className="space-y-4">
                    <SecurityRow icon={faEnvelope} label="Email" value={security.email ?? '—'} />
                    {security.userRole && (
                      <SecurityRow
                        icon={faShieldHalved}
                        label="Global Role"
                        value={<UserRoleBadge role={security.userRole} />}
                      />
                    )}
                    <SecurityRow
                      icon={faLayerGroup}
                      label="Tenant Role"
                      value={memberRole
                        ? <Badge variant={ROLE_VARIANT[memberRole] ?? 'neutral'}>{memberRole}</Badge>
                        : <span className="text-sm text-text-secondary">—</span>
                      }
                    />
                    <SecurityRow
                      icon={isEmailVerified ? faCircleCheck : faCircleXmark}
                      label="Email Verified"
                      value={
                        <Badge variant={isEmailVerified ? 'success' : 'warning'}>
                          {isEmailVerified ? 'Verified' : 'Not verified'}
                        </Badge>
                      }
                    />
                    <SecurityRow icon={faClock} label="Last Login" value={lastLogin} border={false} />
                  </div>
                </Card>

                <ActiveSessionsPanel
                  sessions={sessions}
                  currentSessionId={currentSessionId}
                  revoking={revoking}
                  onRevoke={handleRevokeSession}
                />
              </div>
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
            id: 'passkeys',
            label: 'Passkeys',
            content: <PasskeysPanel />,
          },
          {
            id: 'signing',
            label: 'Signing Certificates',
            content: <SigningCertificatesPanel />,
          },
          {
            id: 'connected',
            label: 'Connected Accounts',
            content: <SocialAccountsPanel apiBase={`/tenant/${tenantId}/api/auth`} />,
          },
          ...profileSlotTabs.map(({ id, Component, props }) => ({
            id,
            label: String(props.label ?? id),
            content: <Component tenantId={tenantId} {...props} />,
          })),
        ]}
      />
    </div>
  );
}

function SecurityRow({
  icon,
  label,
  value,
  border = true,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
  border?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 flex-wrap ${border ? 'border-b border-border pb-4' : ''}`}>
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <FontAwesomeIcon icon={icon} className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span className="font-medium text-text-primary">{label}</span>
      </div>
      {typeof value === 'string'
        ? <span className="text-sm text-text-primary">{value}</span>
        : value
      }
    </div>
  );
}
