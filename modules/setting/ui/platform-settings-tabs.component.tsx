'use client';

/**
 * Per-tenant integration / provider configuration tabs surfaced inside the
 * tenant Settings page. Each tenant owns its own row in the `settings` table
 * and configures its own Email, SMS, Storage, Payment, AI providers as well
 * as Auth (SSO), Security policy, and Notification routing.
 *
 * Backend: `/tenant/[tenantId]/api/admin-settings` — admin-only, no root
 * gate (every tenant admin manages its own credentials).
 */

import { useCallback, useEffect, useState } from 'react';
import api from '@nb/common/server/axios';
import { Spinner } from '@nb/common/ui/spinner.component';
import { AlertBanner } from '@nb/common/ui/alert-banner.component';
import { TabGroup } from '@nb/common/ui/tab-group.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope, faServer, faCreditCard, faRobot,
  faShieldHalved, faBell, faUserLock, faMobile, faPlug,
} from '@fortawesome/free-solid-svg-icons';

import { type SR, type TabProps } from './tabs/platform-tab.shared.component';
import { PlatformAuthTab } from './tabs/platform-auth-tab.component';
import { PlatformEmailTab } from './tabs/platform-email-tab.component';
import { PlatformSmsTab } from './tabs/platform-sms-tab.component';
import { PlatformStorageTab } from './tabs/platform-storage-tab.component';
import { PlatformPaymentTab } from './tabs/platform-payment-tab.component';
import { PlatformAiTab } from './tabs/platform-ai-tab.component';
import { PlatformSecurityTab } from './tabs/platform-security-tab.component';
import { PlatformNotificationsTab } from './tabs/platform-notifications-tab.component';
import { PlatformScimTab } from './tabs/platform-scim-tab.component';

export {
  PlatformAuthTab, PlatformEmailTab, PlatformSmsTab, PlatformStorageTab,
  PlatformPaymentTab, PlatformAiTab, PlatformSecurityTab, PlatformNotificationsTab,
  PlatformScimTab,
};

const ICON = (icon: React.ReactNode) => <span className="text-sm">{icon}</span>;

export function PlatformSettingsTabs({ tenantId }: { tenantId: string }) {
  const [settings, setSettings] = useState<SR>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    api.get(`/tenant/${tenantId}/api/admin-settings`)
      .then((res) => setSettings(res.data.settings ?? {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantId]);

  const handleSave = useCallback(async (patch: SR) => {
    setSaving(true);
    setToast(null);
    try {
      await api.put(`/tenant/${tenantId}/api/admin-settings`, { settings: { ...settings, ...patch } });
      setSettings((prev) => ({ ...prev, ...patch }));
      setToast({ type: 'success', msg: 'Platform settings saved.' });
    } catch (err: any) {
      setToast({ type: 'error', msg: err.response?.data?.message ?? err.message ?? 'Failed to save.' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 4000);
    }
  }, [tenantId, settings]);

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  }

  const sharedProps: TabProps = { settings, onSave: handleSave, saving };

  return (
    <div className="space-y-4">
      <AlertBanner variant="info" message="These provider credentials and policies apply only to this tenant. Other tenants keep their own configuration." />
      {toast && (
        <AlertBanner
          variant={toast.type === 'success' ? 'success' : 'error'}
          message={toast.msg}
          dismissible
        />
      )}
      <TabGroup
        label="Platform settings"
        lazy
        tabs={[
          { id: 'p-auth',  label: 'SSO Providers',    icon: ICON(<FontAwesomeIcon icon={faUserLock} />),     content: <PlatformAuthTab          {...sharedProps} /> },
          { id: 'p-scim',  label: 'SCIM Provisioning', icon: ICON(<FontAwesomeIcon icon={faPlug} />),         content: <PlatformScimTab          tenantId={tenantId} /> },
          { id: 'p-email', label: 'Email',             icon: ICON(<FontAwesomeIcon icon={faEnvelope} />),     content: <PlatformEmailTab         {...sharedProps} /> },
          { id: 'p-sms',   label: 'SMS',               icon: ICON(<FontAwesomeIcon icon={faMobile} />),       content: <PlatformSmsTab           {...sharedProps} /> },
          { id: 'p-stor',  label: 'Storage',           icon: ICON(<FontAwesomeIcon icon={faServer} />),       content: <PlatformStorageTab       {...sharedProps} /> },
          { id: 'p-pay',   label: 'Payments',          icon: ICON(<FontAwesomeIcon icon={faCreditCard} />),   content: <PlatformPaymentTab       {...sharedProps} /> },
          { id: 'p-ai',    label: 'AI',                icon: ICON(<FontAwesomeIcon icon={faRobot} />),        content: <PlatformAiTab            {...sharedProps} /> },
          { id: 'p-sec',   label: 'Security',          icon: ICON(<FontAwesomeIcon icon={faShieldHalved} />), content: <PlatformSecurityTab      {...sharedProps} /> },
          { id: 'p-notif', label: 'Notifications',     icon: ICON(<FontAwesomeIcon icon={faBell} />),         content: <PlatformNotificationsTab {...sharedProps} /> },
        ]}
      />
    </div>
  );
}
