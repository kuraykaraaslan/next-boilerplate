import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faNewspaper,
  faCartShopping,
  faUsers,
  faListCheck,
  faGear,
  faCode,
  faEllipsis,
} from '@fortawesome/free-solid-svg-icons';

// ── Workspace catalog ────────────────────────────────────────────────────────
// Top-level workspaces group the sidebar's many module `group`s into a handful
// of switchable sections, so installing 80+ modules no longer produces an
// unusable flat menu. Each menu item declares its `workspace` in module.json
// (manifest-driven); this catalog only holds display metadata (label/icon/order)
// per workspace id. To rename/reorder workspaces, edit THIS file only.

export type WorkspaceDef = {
  id: string;
  label: string;
  icon: IconDefinition;
  order: number;
};

export const WORKSPACES: WorkspaceDef[] = [
  { id: 'content',    label: 'Content',    icon: faNewspaper,    order: 10 },
  { id: 'commerce',   label: 'Commerce',   icon: faCartShopping, order: 20 },
  { id: 'crm',        label: 'CRM',        icon: faUsers,        order: 30 },
  { id: 'operations', label: 'Operations', icon: faListCheck,    order: 40 },
  { id: 'developer',  label: 'Developer',  icon: faCode,         order: 45 },
  { id: 'system',     label: 'System',     icon: faGear,         order: 50 },
];

// Synthetic catch-all for any group not claimed by a workspace above (e.g. a new
// plugin's group, or the runtime "Plugins" fallback). Ensures nothing is hidden
// before someone assigns it a workspace.
export const FALLBACK_WORKSPACE: WorkspaceDef = {
  id: 'more', label: 'More', icon: faEllipsis, order: 999,
};

// Groups that appear in EVERY workspace (pinned above the workspace-scoped
// groups), never gated by the switcher.
export const ALWAYS_ON_GROUPS = ['Overview', 'Account'];

// Fallback map for items that predate the manifest `workspace` field, and to
// resolve a sidebar group's workspace from its label. Keep in sync with the
// `workspace` values seeded into module.json manifests.
export const GROUP_WORKSPACE: Record<string, string> = {
  Content: 'content', Blog: 'content', Drive: 'content',
  Commerce: 'commerce', Store: 'commerce',
  Management: 'crm', Insights: 'crm',
  Operations: 'operations',
  Developer: 'developer',
  Security: 'system', AI: 'system', Configuration: 'system',
  Platform: 'system', 'Platform System': 'system',
};

// Resolve a menu item's workspace id: explicit manifest value wins, else derive
// from its group, else the synthetic catch-all.
export function resolveWorkspaceId(item: { workspace?: string; group?: string }): string {
  return (
    item.workspace ??
    (item.group ? GROUP_WORKSPACE[item.group] : undefined) ??
    FALLBACK_WORKSPACE.id
  );
}

export function workspaceById(id: string): WorkspaceDef {
  return WORKSPACES.find((w) => w.id === id) ?? FALLBACK_WORKSPACE;
}
