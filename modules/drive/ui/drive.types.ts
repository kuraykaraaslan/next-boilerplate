// Client-side shapes (dates arrive as ISO strings over JSON).

export type DriveRole = 'viewer' | 'editor' | 'owner';

export type DriveNode = {
  driveFileId: string;
  parentId: string | null;
  ownerUserId: string;
  type: 'file' | 'folder';
  name: string;
  uploadedFileId: string | null;
  storageKey: string | null;
  mimeType: string | null;
  size: number | null;
  createdAt: string;
  updatedAt: string;
};

export type Breadcrumb = { driveFileId: string | null; name: string };

export type SystemFile = {
  uploadedFileId: string;
  name: string;
  storageKey: string;
  mimeType: string | null;
  size: number | null;
  source: string | null;
  createdAt: string;
  adopted: boolean;
};

export type ShareView = {
  driveShareId: string;
  driveFileId: string;
  sharedWithUserId: string;
  role: DriveRole;
  createdAt: string;
};

export type PublicLinkView = {
  drivePublicLinkId: string;
  driveFileId: string;
  token: string;
  role: 'viewer' | 'editor';
  expiresAt: string | null;
  createdAt: string;
};

export type PreviewKind = 'image' | 'pdf' | 'text' | 'audio' | 'video' | 'none';

export type PreviewResponse = {
  url: string;
  kind: PreviewKind;
  mimeType: string | null;
  name: string;
  plugin?: { key: string; html?: string; iframeUrl?: string };
};

export function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export function formatBytes(bytes: number | null): string {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** FontAwesome icon name for a node, by type/MIME. */
export function iconFor(node: { type: string; mimeType: string | null }): string {
  if (node.type === 'folder') return 'fa-folder';
  const m = node.mimeType ?? '';
  if (m.startsWith('image/')) return 'fa-file-image';
  if (m === 'application/pdf') return 'fa-file-pdf';
  if (m.startsWith('video/')) return 'fa-file-video';
  if (m.startsWith('audio/')) return 'fa-file-audio';
  if (m.startsWith('text/') || m === 'application/json' || m === 'application/xml') return 'fa-file-lines';
  return 'fa-file';
}
