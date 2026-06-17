// Neutral setting-key helpers for per-tenant community-plugin install markers.
// Lives in plugin_runtime (the generic runtime) with NO marketplace import, so both
// the marketplace (writer) and the runtime resolver (reader) can share them without
// creating a runtime→marketplace dependency.

export const communityInstallKeys = {
  version: (listingId: string) => `plugin.community.${listingId}.version`,
  active: (listingId: string) => `plugin.community.${listingId}.active`,
};
