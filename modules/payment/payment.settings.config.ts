import { faCreditCard } from '@fortawesome/free-solid-svg-icons';
import { SettingsTabEntry, registerModule } from '@/modules/setting/settings.registry';
import { PAYMENT_KEYS, TENANT_BILLING_KEYS } from './payment.setting.keys';
import PaymentSettings from './ui/payment.settings';
import BillingTab from './ui/payment.tenant';

export const SETTINGS_TABS: SettingsTabEntry[] = [
  {
    id: 'payment',
    label: 'Payment',
    icon: faCreditCard,
    keys: PAYMENT_KEYS,
    component: PaymentSettings,
    order: 100,
    type: 'system',
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: faCreditCard,
    keys: TENANT_BILLING_KEYS,
    component: BillingTab,
    order: 60,
    type: 'tenant',
  },
];

registerModule({ settingsTabs: SETTINGS_TABS });
