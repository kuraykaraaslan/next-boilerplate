'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import api from '@/modules_next/common/axios';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Card } from '@/modules_next/common/ui/Card';
import { Button } from '@/modules_next/common/ui/Button';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faBuilding, faPalette, faFileInvoice, faEnvelope, faMobile, faServer,
  faCreditCard, faRobot, faIdCard, faUserLock, faPlug, faShieldHalved,
  faBell, faUsers, faGlobe, faBolt, faUserPlus, faKey, faChevronRight,
  faTriangleExclamation, faTrash,
} from '@fortawesome/free-solid-svg-icons';

type LinkItem = { title: string; desc: string; icon: IconDefinition; to: string };
type LinkSection = { label: string; items: LinkItem[] };

const SECTIONS: LinkSection[] = [
  {
    label: 'Organization',
    items: [
      { title: 'General',  desc: 'Identity, contact, and locale',     icon: faBuilding,    to: 'settings/general' },
      { title: 'Branding', desc: 'Logo, colors, and custom code',     icon: faPalette,     to: 'settings/branding' },
      { title: 'Billing',  desc: 'Billing identity and invoice setup', icon: faFileInvoice, to: 'settings/billing' },
    ],
  },
  {
    label: 'Integrations',
    items: [
      { title: 'Email',       desc: 'SMTP and sender identity',          icon: faEnvelope,   to: 'settings/email' },
      { title: 'SMS',         desc: 'SMS provider credentials',          icon: faMobile,     to: 'settings/sms' },
      { title: 'Storage',     desc: 'Object storage provider',           icon: faServer,     to: 'settings/storage' },
      { title: 'Payments',    desc: 'Currency, tax, and providers',      icon: faCreditCard, to: 'payments/settings' },
      { title: 'AI',          desc: 'AI providers and API keys',         icon: faRobot,      to: 'ai/settings' },
      { title: 'E-Signature', desc: 'E-signature provider configuration', icon: faIdCard,    to: 'settings/e-signature' },
    ],
  },
  {
    label: 'Access & Security',
    items: [
      { title: 'Authentication & SSO', desc: 'Registration, sessions, OAuth', icon: faUserLock,     to: 'settings/auth' },
      { title: 'SCIM Provisioning',    desc: 'IdP user provisioning',         icon: faPlug,         to: 'settings/scim' },
      { title: 'Security',             desc: 'Rate limit, CORS, reCAPTCHA',   icon: faShieldHalved, to: 'settings/security' },
      { title: 'Notifications',        desc: 'Push, email alerts, Slack',     icon: faBell,         to: 'settings/notifications' },
    ],
  },
  {
    label: 'Modules',
    items: [
      { title: 'Members',     desc: 'Default member role',         icon: faUsers,    to: 'members/settings' },
      { title: 'Domains',     desc: 'Custom domain limits',        icon: faGlobe,    to: 'domains/settings' },
      { title: 'Webhooks',    desc: 'Delivery and retry behavior', icon: faBolt,     to: 'webhooks/settings' },
      { title: 'Invitations', desc: 'Invitation lookup caching',   icon: faUserPlus, to: 'invitations/settings' },
      { title: 'API Keys',    desc: 'API key lookup caching',      icon: faKey,      to: 'api-keys/settings' },
    ],
  },
];

function DangerZone({ tenantId }: { tenantId: string }) {
  const [confirm, setConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    if (confirm !== 'DELETE') return;
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/tenant/${tenantId}/api/settings`);
      window.location.href = `/tenant/${tenantId}/auth/select-tenant`;
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to delete organization.');
      setDeleting(false);
    }
  }

  return (
    <Card title="Danger Zone" subtitle="Irreversible actions — proceed with extreme caution">
      <div className="rounded-lg border border-error/30 bg-error/5 p-4 space-y-4">
        <div className="flex items-start gap-3">
          <FontAwesomeIcon icon={faTriangleExclamation} className="w-5 h-5 text-error mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-text-primary">Delete Organization</p>
            <p className="text-xs text-text-secondary mt-1">
              This will permanently delete all organization data including members, settings,
              subscription history, and files. This action cannot be undone.
            </p>
          </div>
        </div>

        {error && <AlertBanner variant="error" message={error} />}

        <div className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="deleteConfirm" className="text-xs font-medium text-text-secondary">
              Type <span className="font-mono font-bold text-error">DELETE</span> to confirm
            </label>
            <input
              id="deleteConfirm"
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="DELETE"
              className="w-full max-w-xs rounded-lg border border-border bg-surface-base px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-error/50"
            />
          </div>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={confirm !== 'DELETE'}
            loading={deleting}
            iconLeft={<FontAwesomeIcon icon={faTrash} />}
          >
            Permanently Delete Organization
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function TenantSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const base = `/tenant/${tenantId}/admin`;

  return (
    <div className="space-y-8">
      <PageHeader title="Organization Settings" subtitle="Choose an area to configure" />

      {SECTIONS.map((section) => (
        <section key={section.label} className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{section.label}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {section.items.map((item) => (
              <Link
                key={item.to}
                href={`${base}/${item.to}`}
                className="group flex items-start gap-3 rounded-lg border border-border bg-surface-base p-4 transition-colors hover:border-primary/40 hover:bg-surface-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-overlay text-text-secondary group-hover:text-primary">
                  <FontAwesomeIcon icon={item.icon} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">{item.title}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{item.desc}</p>
                </div>
                <FontAwesomeIcon
                  icon={faChevronRight}
                  className="ml-auto mt-1 w-3 h-3 text-text-disabled group-hover:text-text-secondary"
                  aria-hidden
                />
              </Link>
            ))}
          </div>
        </section>
      ))}

      <DangerZone tenantId={tenantId} />
    </div>
  );
}
