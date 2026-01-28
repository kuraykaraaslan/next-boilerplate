import { faUsers } from '@fortawesome/free-solid-svg-icons';
import { NavMenuEntry, registerModule } from '@/modules/setting/settings.registry';

// ============================================================================
// Menu Items
// ============================================================================

export const MENU_ITEMS: NavMenuEntry[] = [
  {
    id: 'users',
    label: 'Users',
    href: '/system/admin/users',
    icon: faUsers,
    order: 600,
    type: 'system',
  },
];

registerModule({ menuItems: MENU_ITEMS });
