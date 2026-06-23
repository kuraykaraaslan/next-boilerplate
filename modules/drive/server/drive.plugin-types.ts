// ============================================================================
// Drive plugin (extension) contracts
// ----------------------------------------------------------------------------
// External / community plugins extend Drive by contributing into one of the
// `drive:*` extension points declared in module.json. Each contribution runs in
// the platform's sandboxed plugin isolate and is reached host-side through the
// generic `listExternalContributions` bridge — Drive never imports plugin code
// directly and never hands a plugin a storage secret (only short-lived
// presigned URLs cross the boundary). See drive.plugins.ts for the host wiring
// and PLUGIN_AUTHORING.md for the authoring guide.
//
// A plugin declares its contribution in its own module.json, e.g.:
//   "extensions": [
//     { "point": "drive:preview", "key": "office",
//       "export": "drive_office_preview/server/office.extension",
//       "metadata": { "label": "Office Preview",
//                     "mimeGroups": ["documents", "spreadsheets"] } }
//   ]
// and its default export implements the matching contract below. The host
// invokes the named operations via the isolate bridge (`invoke(op, input)`).
// ============================================================================

/** drive:preview — render a custom viewer for one or more MIME types/groups. */
export interface DrivePreviewContribution {
  /** Stable provider key (matches the contribution `key`). */
  readonly key: string;
  /**
   * Produce inline preview markup for a file. Receives a short-lived presigned
   * URL (the plugin fetches bytes itself if needed) and the content MIME type.
   * Returns either sanitized HTML to embed or a URL to render in an <iframe>.
   */
  render(input: { presignedUrl: string; mimeType: string }): Promise<{ html?: string; iframeUrl?: string }>;
}

/** drive:action — a custom file action surfaced in the context menu. */
export interface DriveActionContribution {
  readonly key: string;
  /** Whether this action applies to a given content type (host pre-filters by metadata too). */
  appliesTo(mimeType: string): boolean;
  /** Run the action against a file; returns a result URL and/or a status message. */
  run(input: { driveFileId: string; presignedUrl: string; mimeType: string | null }): Promise<{
    resultUrl?: string;
    message?: string;
  }>;
}

/** drive:source — mount an external storage backend as a virtual Drive folder. */
export interface DriveSourceContribution {
  readonly key: string;
  /** List entries at a path within the external source. */
  list(input: { path: string }): Promise<Array<{ id: string; name: string; type: 'file' | 'folder'; size?: number }>>;
  /** Resolve a streamable/presigned URL for an external object. */
  read(input: { externalId: string }): Promise<{ url: string; mimeType?: string }>;
}

/** Lifecycle events broadcast to drive:lifecycle hooks (fire-and-forget). */
export type DriveLifecycleEvent = 'onUploaded' | 'onDeleted' | 'onMoved';

/** drive:lifecycle — react to file lifecycle events (thumbnails, indexing, …). */
export interface DriveLifecycleHook {
  readonly key: string;
  onUploaded?(input: { driveFileId: string; storageKey: string }): Promise<void>;
  onDeleted?(input: { driveFileId: string; soft: boolean }): Promise<void>;
  onMoved?(input: { driveFileId: string; parentId: string | null }): Promise<void>;
}

/** Host-facing descriptor returned by the listing helpers in drive.plugins.ts. */
export interface DrivePluginDescriptor {
  key: string;
  label: string;
  metadata: Record<string, unknown>;
}
