import type { SettingFieldDef } from '@kuraykaraaslan/setting/server/setting-fields.types';

// UI metadata for the Order settings page. One entry per per-tenant setting key.
export const ORDER_SETTINGS_FIELDS: SettingFieldDef[] = [
  {
    key: 'orderNumberPrefix',
    label: 'Order Number Prefix',
    description: 'Prefix for generated sales-order numbers.',
    group: 'Numbering',
    type: 'text',
    defaultValue: 'SO-',
    placeholder: 'SO-',
  },
  {
    key: 'orderDefaultCurrency',
    label: 'Default Currency',
    description: 'ISO currency applied to new orders.',
    group: 'Defaults',
    type: 'text',
    defaultValue: 'USD',
    placeholder: 'USD',
  },
  {
    key: 'orderDefaultStatus',
    label: 'Default Status',
    description: 'Status assigned to a newly created order.',
    group: 'Defaults',
    type: 'select',
    options: [
      { value: 'DRAFT', label: 'Draft' },
      { value: 'CONFIRMED', label: 'Confirmed' },
    ],
    defaultValue: 'DRAFT',
  },
  {
    key: 'orderRequireCustomer',
    label: 'Require Customer',
    description: 'Block confirming an order that has no customer assigned.',
    group: 'Policy',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    key: 'orderAutoConfirmOnPayment',
    label: 'Auto-confirm on Payment',
    description: 'Move an order to CONFIRMED automatically when it is paid.',
    group: 'Policy',
    type: 'boolean',
    defaultValue: 'false',
  },
];
