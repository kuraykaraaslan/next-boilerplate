// ============================================================================
// Icon Registry
// ============================================================================
// Maps icon string names to FontAwesome icon objects

import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faCog,
  faShield,
  faGlobe,
  faBell,
  faPlug,
  faChartLine,
  faShareNodes,
  faHome,
  faUserShield,
  faSignOutAlt,
  faUsers,
  faCreditCard,
  faRobot,
  faDatabase,
  faEnvelope,
  faComment,
  faBuilding,
  faTachometerAlt,
  faArrowLeft,
  faPalette,
  faKey,
  faUserGroup,
  faDesktop,
  faSliders,
  faIdCard,
  faLock,
  faClock,
} from '@fortawesome/free-solid-svg-icons';

const ICON_MAP: Record<string, IconDefinition> = {
  faCog,
  faShield,
  faGlobe,
  faBell,
  faPlug,
  faChartLine,
  faShareNodes,
  faHome,
  faUserShield,
  faSignOutAlt,
  faUsers,
  faCreditCard,
  faRobot,
  faDatabase,
  faEnvelope,
  faComment,
  faBuilding,
  faTachometerAlt,
  faArrowLeft,
  faPalette,
  faKey,
  faUserGroup,
  faDesktop,
  faSliders,
  faIdCard,
  faLock,
  faClock,
};

export function getIcon(name: string): IconDefinition {
  const icon = ICON_MAP[name];
  if (!icon) {
    console.warn(`Icon "${name}" not found in registry, using faCog as fallback`);
    return faCog;
  }
  return icon;
}

export function registerIcon(name: string, icon: IconDefinition): void {
  ICON_MAP[name] = icon;
}
