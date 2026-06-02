import type { SettingFieldDef } from '@/modules_next/setting/setting-fields.types';

// UI metadata for the Members settings page. Pure data — safe to import into a
// 'use client' page. Phase 2 wires defaultMemberRole into the invitation flow so
// new members/invitees get this role by default (see docs/ROADMAP_SETTINGS.md).
export const TENANT_MEMBER_SETTINGS_FIELDS: SettingFieldDef[] = [
  {
    key: 'defaultMemberRole',
    label: 'Default Member Role',
    description: 'Role assigned to new members when they join or accept an invitation.',
    group: 'Membership',
    type: 'select',
    // OWNER is intentionally excluded — defaulting new members to owner is unsafe.
    options: [
      { value: 'USER', label: 'User' },
      { value: 'ADMIN', label: 'Admin' },
    ],
    defaultValue: 'USER',
  },
];
