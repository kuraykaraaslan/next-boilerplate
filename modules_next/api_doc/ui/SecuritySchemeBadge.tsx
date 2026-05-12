import { cn } from '@/libs/utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faKey, faLock, faShield, faFingerprint, faUserShield } from '@fortawesome/free-solid-svg-icons';
import type { SecuritySchemeType } from './types';

const schemeConfig: Record<SecuritySchemeType, { label: string; icon: typeof faKey; style: string }> = {
  apiKey:        { label: 'API Key',        icon: faKey,         style: 'bg-warning-subtle text-warning-fg' },
  http:          { label: 'HTTP',           icon: faLock,        style: 'bg-info-subtle text-info-fg' },
  oauth2:        { label: 'OAuth 2.0',      icon: faShield,      style: 'bg-primary-subtle text-primary' },
  openIdConnect: { label: 'OpenID Connect', icon: faFingerprint, style: 'bg-success-subtle text-success-fg' },
  mutualTLS:     { label: 'Mutual TLS',     icon: faUserShield,  style: 'bg-surface-sunken text-text-secondary' },
};

export function SecuritySchemeBadge({
  type,
  name,
  size = 'md',
  className,
}: {
  type: string;
  name?: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const config = schemeConfig[type as SecuritySchemeType] ?? schemeConfig.apiKey;
  const sizeClass = size === 'sm' ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-xs';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        sizeClass,
        config.style,
        className,
      )}
    >
      <FontAwesomeIcon icon={config.icon} className="text-[10px]" aria-hidden />
      {name ?? config.label}
    </span>
  );
}
