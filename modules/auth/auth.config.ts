import { faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { NavMenuEntry, registerModule } from '@/modules/setting/settings.registry';

// ============================================================================
// Menu Items
// ============================================================================

export const MENU_ITEMS: NavMenuEntry[] = [
  {
    id: 'logout',
    label: 'Logout',
    href: '/auth/logout',
    icon: faSignOutAlt,
    order: 1000,
    type: 'system',
  },
];

registerModule({ menuItems: MENU_ITEMS });
