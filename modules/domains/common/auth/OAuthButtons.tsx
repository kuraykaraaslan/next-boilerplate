'use client';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle, faGithub, faDiscord, faMicrosoft } from '@fortawesome/free-brands-svg-icons';
import { Button } from '@/modules/ui/Button';
import { cn } from '@/libs/utils/cn';

type OAuthProvider = 'GOOGLE' | 'GITHUB' | 'DISCORD' | 'MICROSOFT';

const providerMeta: Record<OAuthProvider, { label: string; icon: React.ReactNode; iconClass: string }> = {
  GOOGLE:    { label: 'Continue with Google',    icon: <FontAwesomeIcon icon={faGoogle}    />, iconClass: 'text-[#EA4335]' },
  GITHUB:    { label: 'Continue with GitHub',    icon: <FontAwesomeIcon icon={faGithub}    />, iconClass: 'text-text-primary' },
  DISCORD:   { label: 'Continue with Discord',   icon: <FontAwesomeIcon icon={faDiscord}   />, iconClass: 'text-[#5865F2]' },
  MICROSOFT: { label: 'Continue with Microsoft', icon: <FontAwesomeIcon icon={faMicrosoft} />, iconClass: 'text-[#00A4EF]' },
};

type OAuthButtonsProps = {
  providers?: OAuthProvider[];
  onProvider: (provider: OAuthProvider) => Promise<void> | void;
  className?: string;
};

export function OAuthButtons({
  providers = ['GOOGLE', 'GITHUB', 'DISCORD', 'MICROSOFT'],
  onProvider,
  className,
}: OAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null);

  async function handleClick(provider: OAuthProvider) {
    setLoadingProvider(provider);
    try { await onProvider(provider); } finally { setLoadingProvider(null); }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {providers.map((provider) => {
        const meta = providerMeta[provider];
        const isLoading = loadingProvider === provider;
        return (
          <Button
            key={provider}
            variant="outline"
            fullWidth
            loading={isLoading}
            disabled={loadingProvider !== null}
            aria-label={meta.label}
            onClick={() => handleClick(provider)}
            iconLeft={<span className={meta.iconClass}>{meta.icon}</span>}
          >
            {meta.label}
          </Button>
        );
      })}
    </div>
  );
}
