import type { SettingFieldDef } from '@kuraykaraaslan/setting/server/setting-fields.types';
import { PROCUREMENT_SETTING_KEYS } from './procurement.setting.keys';

// UI metadata for the Procurement settings page. Drives the generic
// ModuleSettingsPage scaffold; values persist via the generic settings API.
export const PROCUREMENT_SETTINGS_FIELDS: SettingFieldDef[] = [
  {
    key: PROCUREMENT_SETTING_KEYS.PO_NUMBER_PREFIX,
    label: 'PO Number Prefix',
    description: 'Prefix for generated purchase-order numbers.',
    group: 'Numbering',
    type: 'text',
    defaultValue: 'PO-',
    placeholder: 'PO-',
  },
  {
    key: PROCUREMENT_SETTING_KEYS.DEFAULT_CURRENCY,
    label: 'Default Currency',
    description: 'ISO currency applied to new purchase orders.',
    group: 'Defaults',
    type: 'text',
    defaultValue: 'USD',
    placeholder: 'USD',
  },
  {
    key: PROCUREMENT_SETTING_KEYS.APPROVAL_THRESHOLD,
    label: 'Approval Threshold',
    description: 'PO total above which manager approval is required (0 = no approval needed).',
    group: 'Policy',
    type: 'number',
    defaultValue: '0',
    placeholder: '0',
  },
  {
    key: PROCUREMENT_SETTING_KEYS.AUTO_RECEIVE_ON_FULL,
    label: 'Auto-receive when fully received',
    description: 'Move a PO to RECEIVED automatically once all lines are received.',
    group: 'Policy',
    type: 'boolean',
    defaultValue: 'false',
  },
];
