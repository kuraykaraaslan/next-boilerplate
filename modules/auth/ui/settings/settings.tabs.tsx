'use client';

import { faGear, faLock, faNoteSticky, faRing, faSms, faUser } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import Tabs, { Tab } from '@/modules/ui/tabs';
import BasicTab from '@/modules/user/ui/user.basic';
import ProfileTab from '@/modules/user_profile/ui/user_profile.edit';
import SecurityTab from '@/modules/user_security/ui/user_security.password';
import OTPTab from '@/modules/user_security/ui/user_security.otp';
import PreferencesTab from '@/modules/user_preferences/ui/user_preferences.edit';
import NotificationsTab from '@/modules/user_preferences/ui/user_preferences.notifications';

export default function SettingsTabs() {
  const { t } = useTranslation();

  const tabs: Tab[] = [
    {
      id: 'basic',
      label: t('frontend.settings.basic'),
      icon: faNoteSticky,
      content: <BasicTab />,
    },
    {
      id: 'profile',
      label: t('frontend.settings.profile'),
      icon: faUser,
      content: <ProfileTab />,
    },
    {
      id: 'security',
      label: t('frontend.settings.security'),
      icon: faLock,
      content: <SecurityTab />,
    },
    {
      id: 'otp',
      label: t('frontend.settings.otp'),
      icon: faSms,
      content: <OTPTab />,
    },
    {
      id: 'preferences',
      label: t('frontend.settings.preferences'),
      icon: faGear,
      content: <PreferencesTab />,
    },
    {
      id: 'notifications',
      label: t('frontend.settings.notifications'),
      icon: faRing,
      content: <NotificationsTab />,
    },
  ];

  return (
    <Tabs
      tabs={tabs}
      defaultTab="profile"
      variant="underline"
      size="md"
      tabsClassName="px-4 sm:px-0"
    />
  );
}
