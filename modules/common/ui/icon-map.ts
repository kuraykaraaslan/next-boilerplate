// Resolve a manifest icon string (e.g. "fas fa-gear" or "gear") to a concrete
// FontAwesome IconDefinition. A STATIC import map (not a dynamic FA lookup) so
// the bundler tree-shakes to only the icons actually referenced. Seeded from the
// icon set the admin sidebar already used; extend this list as modules declare
// new icons in their manifests.

import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faUsers, faBuilding, faGear, faServer, faBook, faPeopleGroup, faShieldHalved,
  faClockRotateLeft, faCreditCard, faCircleUser, faEnvelope, faGlobe, faRobot,
  faKey, faHeartPulse, faIdCard, faPlug, faFileInvoice, faTag, faBoxOpen,
  faLayerGroup, faFileAlt, faPuzzlePiece, faNewspaper, faFolderOpen, faWallet,
  faGaugeHigh, faClipboardCheck, faLifeRing, faHouse, faToggleOn,
  faMagnifyingGlass, faChartLine, faCookieBite, faFileContract, faGift,
  faCube,
} from '@fortawesome/free-solid-svg-icons';

const ICON_LIST: IconDefinition[] = [
  faUsers, faBuilding, faGear, faServer, faBook, faPeopleGroup, faShieldHalved,
  faClockRotateLeft, faCreditCard, faCircleUser, faEnvelope, faGlobe, faRobot,
  faKey, faHeartPulse, faIdCard, faPlug, faFileInvoice, faTag, faBoxOpen,
  faLayerGroup, faFileAlt, faPuzzlePiece, faNewspaper, faFolderOpen, faWallet,
  faGaugeHigh, faClipboardCheck, faLifeRing, faHouse, faToggleOn,
  faMagnifyingGlass, faChartLine, faCookieBite, faFileContract, faGift, faCube,
];

// keyed by FontAwesome icon name, e.g. "gear", "shield-halved"
const ICONS: Record<string, IconDefinition> = Object.fromEntries(
  ICON_LIST.map((icon) => [icon.iconName, icon]),
);

/** Fallback used when a manifest icon string is missing or unknown. */
export const DEFAULT_ICON = faCube;

/**
 * Accepts "fas fa-gear", "fa-gear", or "gear" and returns the IconDefinition,
 * or undefined if not in the static map.
 */
export function resolveIcon(name?: string): IconDefinition | undefined {
  if (!name) return undefined;
  const key = name.trim().replace(/^fa[a-z]?\s+fa-/, '').replace(/^fa-/, '');
  return ICONS[key];
}
