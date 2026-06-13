'use client';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faApple,
  faFacebook,
  faGithub,
  faGoogle,
  faLinkedin,
  faMicrosoft,
  faSlack,
  faTiktok,
  faWeixin,
  faXTwitter,
  faVk,
  faYandex,
  faQq,
  faWeibo,
  faAlipay,
} from '@fortawesome/free-brands-svg-icons';
import { faCube } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@/modules_next/common/ui/Button';
import { cn } from '@/modules_next/common/utils/cn';

export const SSO_PROVIDERS = [
  'google',
  'apple',
  'facebook',
  'github',
  'linkedin',
  'microsoft',
  'twitter',
  'slack',
  'tiktok',
  'wechat',
  'autodesk',
  'yandex',
  'vk',
  'qq',
  'weibo',
  'alipay',
] as const;

export type OAuthProvider = (typeof SSO_PROVIDERS)[number];

const providerMeta: Record<OAuthProvider, { label: string; icon: React.ReactNode; iconClass: string }> = {
  google:    { label: 'Continue with Google',    icon: <FontAwesomeIcon icon={faGoogle} />,    iconClass: 'text-[#EA4335]' },
  apple:     { label: 'Continue with Apple',     icon: <FontAwesomeIcon icon={faApple} />,     iconClass: 'text-text-primary' },
  facebook:  { label: 'Continue with Facebook',  icon: <FontAwesomeIcon icon={faFacebook} />,  iconClass: 'text-[#1877F2]' },
  github:    { label: 'Continue with GitHub',    icon: <FontAwesomeIcon icon={faGithub} />,    iconClass: 'text-text-primary' },
  linkedin:  { label: 'Continue with LinkedIn',  icon: <FontAwesomeIcon icon={faLinkedin} />,  iconClass: 'text-[#0A66C2]' },
  microsoft: { label: 'Continue with Microsoft', icon: <FontAwesomeIcon icon={faMicrosoft} />, iconClass: 'text-[#00A4EF]' },
  twitter:   { label: 'Continue with X',         icon: <FontAwesomeIcon icon={faXTwitter} />,  iconClass: 'text-text-primary' },
  slack:     { label: 'Continue with Slack',     icon: <FontAwesomeIcon icon={faSlack} />,     iconClass: 'text-[#4A154B]' },
  tiktok:    { label: 'Continue with TikTok',    icon: <FontAwesomeIcon icon={faTiktok} />,    iconClass: 'text-text-primary' },
  wechat:    { label: 'Continue with WeChat',    icon: <FontAwesomeIcon icon={faWeixin} />,    iconClass: 'text-[#07C160]' },
  autodesk:  { label: 'Continue with Autodesk',  icon: <FontAwesomeIcon icon={faCube} />,      iconClass: 'text-[#0696D7]' },
  yandex:    { label: 'Continue with Yandex',    icon: <FontAwesomeIcon icon={faYandex} />,    iconClass: 'text-[#FC3F1D]' },
  vk:        { label: 'Continue with VK',        icon: <FontAwesomeIcon icon={faVk} />,        iconClass: 'text-[#0077FF]' },
  qq:        { label: 'Continue with QQ',        icon: <FontAwesomeIcon icon={faQq} />,        iconClass: 'text-[#12B7F5]' },
  weibo:     { label: 'Continue with Weibo',     icon: <FontAwesomeIcon icon={faWeibo} />,     iconClass: 'text-[#E6162D]' },
  alipay:    { label: 'Continue with Alipay',    icon: <FontAwesomeIcon icon={faAlipay} />,    iconClass: 'text-[#1677FF]' },
};

type OAuthButtonsProps = {
  /** Which providers to render. Defaults to ['google','github']. Pass [] to render none. */
  providers?: OAuthProvider[];
  onProvider: (provider: OAuthProvider) => Promise<void> | void;
  className?: string;
};

export function OAuthButtons({
  providers = ['google', 'github'],
  onProvider,
  className,
}: OAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null);

  if (providers.length === 0) return null;

  async function handleClick(provider: OAuthProvider) {
    setLoadingProvider(provider);
    try { await onProvider(provider); } finally { setLoadingProvider(null); }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {providers.map((provider) => {
        const meta = providerMeta[provider];
        if (!meta) return null;
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
