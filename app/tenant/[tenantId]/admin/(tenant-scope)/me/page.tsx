'use client';
import { use, useEffect, useState } from 'react';
import api from '@/modules_next/common/axios';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { TabGroup } from '@/modules_next/common/ui/TabGroup';
import { Card } from '@/modules_next/common/ui/Card';
import { Badge } from '@/modules_next/common/ui/Badge';
import { Button } from '@/modules_next/common/ui/Button';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { UserProfileForm, type UserProfileValues } from '@/modules_next/user/ui/UserProfileForm';
import { UserPreferencesForm, type UserPreferencesValues } from '@/modules_next/user/ui/UserPreferencesForm';
import { UserRoleBadge } from '@/modules_next/user/ui/UserRoleBadge';
import { SocialAccountsPanel } from '@/modules_next/user/ui/SocialAccountsPanel';
import { PasskeysPanel } from '@/modules_next/user_security/ui/PasskeysPanel';
import { SigningCertificatesPanel } from '@/modules_next/e_signature/ui/SigningCertificatesPanel';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope, faClock, faLayerGroup, faShieldHalved,
  faCircleCheck, faCircleXmark, faDesktop, faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';
import type { SafeUserSession } from '@/modules/user_session/user_session.types';

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

                <Card title="Active Sessions" subtitle={`${sessions.length} active session${sessions.length !== 1 ? 's' : ''}`}>
                  {sessions.length === 0 ? (
                    <p className="text-sm text-text-secondary py-2">No active sessions found.</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {sessions.map((s) => {
                        const isCurrent = s.userSessionId === currentSessionId;
                        const ua = s.userAgent ?? 'Unknown device';
                        const ip = s.ipAddress ?? 'Unknown IP';
                        const created = s.createdAt ? new Date(s.createdAt).toLocaleString() : '—';
                        const expiry = new Date(s.sessionExpiry).toLocaleString();

                        return (
                          <div key={s.userSessionId} className="flex items-start justify-between gap-4 py-3 flex-wrap">
                            <div className="flex items-start gap-3 min-w-0">
                              <FontAwesomeIcon
                                icon={faDesktop}
                                className="w-4 h-4 text-text-secondary mt-0.5 shrink-0"
                                aria-hidden="true"
                              />
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium text-text-primary truncate max-w-xs">{ua}</span>
                                  {isCurrent && <Badge variant="success" dot>Current</Badge>}
                                </div>
                                <p className="text-xs text-text-secondary">{ip} · Started {created}</p>
                                <p className="text-xs text-text-disabled">Expires {expiry}</p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              loading={revoking === s.userSessionId}
                              onClick={() => handleRevokeSession(s.userSessionId)}
                              className="text-error border-error hover:bg-error-subtle shrink-0"
                            >
                              <FontAwesomeIcon icon={faRightFromBracket} className="w-3 h-3 mr-1.5" aria-hidden="true" />
                              {isCurrent ? 'Sign out' : 'Revoke'}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
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
