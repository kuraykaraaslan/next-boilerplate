'use client';

import { Badge } from '@/modules_next/common/ui/Badge';
import { RowActionsMenu } from '@/modules_next/common/ui/RowActionsMenu';
import type { TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faCheckCircle, faGlobe, faLock, faLockOpen } from '@fortawesome/free-solid-svg-icons';
import type { DomainStatus, SslStatus } from '@/modules/tenant_domain/tenant_domain.enums';

export type DomainRow = {
  tenantDomainId: string;
  tenantId: string;
  domain: string;
  isPrimary: boolean;
  domainStatus: DomainStatus;
  verifiedAt: string | null;
  sslStatus: SslStatus;
  sslIssuedAt: string | null;
  sslExpiresAt: string | null;
  sslIssuer: string | null;
  sslLastCheckedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export const STATUS_BADGE: Record<DomainStatus, 'success' | 'warning' | 'neutral' | 'error'> = {
  ACTIVE:     'success', VERIFIED: 'success', PENDING: 'warning', INACTIVE: 'neutral', DNS_FAILED: 'error',
};

export const STATUS_LABEL: Record<DomainStatus, string> = {
  ACTIVE: 'Active', VERIFIED: 'Verified', PENDING: 'Pending', INACTIVE: 'Inactive', DNS_FAILED: 'DNS Failed',
};

export const SSL_BADGE: Record<SslStatus, 'success' | 'warning' | 'neutral' | 'error'> = {
  ACTIVE: 'success', EXPIRING: 'warning', PROVISIONING: 'warning', PENDING: 'warning', DISABLED: 'neutral', FAILED: 'error', EXPIRED: 'error',
};

export const SSL_LABEL: Record<SslStatus, string> = {
  ACTIVE: 'SSL Active', EXPIRING: 'SSL Expiring', PROVISIONING: 'Provisioning', PENDING: 'SSL Pending', DISABLED: 'No SSL', FAILED: 'SSL Failed', EXPIRED: 'SSL Expired',
};

export type DomainColumnHandlers = {
  canManage: boolean;
  isOwner: boolean;
  verifying: Record<string, boolean>;
  onVerify: (d: DomainRow) => void;
  onDelete: (d: DomainRow) => void;
};

export function buildDomainColumns(h: DomainColumnHandlers): TableColumn<DomainRow>[] {
  return [
    {
      key: 'domain',
      header: 'Domain',
      render: (d) => (
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faGlobe} className="shrink-0 text-text-disabled w-3.5 h-3.5" />
          <span className="font-medium text-text-primary">{d.domain}</span>
          {d.isPrimary && <Badge variant="primary">Primary</Badge>}
        </div>
      ),
    },
    {
      key: 'domainStatus',
      header: 'Status',
      render: (d) => <Badge variant={STATUS_BADGE[d.domainStatus]}>{STATUS_LABEL[d.domainStatus]}</Badge>,
    },
    {
      key: 'sslStatus',
      header: 'SSL',
      render: (d) => {
        const Icon = d.sslStatus === 'ACTIVE' || d.sslStatus === 'EXPIRING' ? faLock : faLockOpen;
        return (
          <div className="flex items-center gap-1.5">
            <FontAwesomeIcon icon={Icon} className="w-3 h-3 text-text-secondary" />
            <Badge variant={SSL_BADGE[d.sslStatus]}>{SSL_LABEL[d.sslStatus]}</Badge>
            {d.sslExpiresAt && (d.sslStatus === 'ACTIVE' || d.sslStatus === 'EXPIRING') && (
              <span className="text-xs text-text-secondary ml-1" title={`Issued by ${d.sslIssuer ?? 'unknown'}`}>
                expires {new Date(d.sslExpiresAt).toLocaleDateString()}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Added',
      render: (d) => <span className="text-text-secondary">{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}</span>,
    },
    {
      key: '_actions',
      header: '',
      align: 'right',
      render: (d) => {
        const actions: Parameters<typeof RowActionsMenu>[0]['actions'] = [];
        const needsVerification = d.domainStatus === 'PENDING' || d.domainStatus === 'INACTIVE';
        if (h.canManage && needsVerification) {
          actions.push({ label: h.verifying[d.tenantDomainId] ? 'Verifying…' : 'Verify DNS', icon: <FontAwesomeIcon icon={faCheckCircle} />, onClick: () => h.onVerify(d) });
        }
        if (h.isOwner && !d.isPrimary) {
          actions.push({ label: 'Delete', icon: <FontAwesomeIcon icon={faTrash} />, onClick: () => h.onDelete(d), variant: 'danger' });
        }
        if (actions.length === 0) return null;
        return <div onClick={(e) => e.stopPropagation()}><RowActionsMenu actions={actions} /></div>;
      },
    },
  ];
}
