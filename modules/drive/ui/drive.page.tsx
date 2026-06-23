'use client';
import { use, useCallback, useEffect, useRef, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { EmptyState } from '@kuraykaraaslan/common/ui/empty-state.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { DrivePreviewModal } from '@kuraykaraaslan/drive/ui/drive-preview-modal.component';
import { DriveShareModal } from '@kuraykaraaslan/drive/ui/drive-share-modal.component';
import type { DriveNode, Breadcrumb, SystemFile } from '@kuraykaraaslan/drive/ui/drive.types';
import { extractMessage, formatBytes, iconFor } from '@kuraykaraaslan/drive/ui/drive.types';

type Tab = 'drive' | 'trash' | 'system';

function Icon({ name, className }: { name: string; className?: string }) {
  const key = name.replace(/^fa-/, '');
  const camel = `fa${key.charAt(0).toUpperCase()}${key.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())}`;
  const icon = (fas as Record<string, unknown>)[camel] ?? fas.faFile;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <FontAwesomeIcon icon={icon as any} className={className} />;
}

export default function DrivePage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const apiBase = `/tenant/${tenantId}/api/drive`;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const [tab, setTab] = useState<Tab>('drive');
  const [parentId, setParentId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<Breadcrumb[]>([{ driveFileId: null, name: 'Drive' }]);
  const [nodes, setNodes] = useState<DriveNode[]>([]);
  const [trash, setTrash] = useState<DriveNode[]>([]);
  const [system, setSystem] = useState<SystemFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [preview, setPreview] = useState<DriveNode | null>(null);
  const [share, setShare] = useState<DriveNode | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const loadDrive = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(apiBase, { params: { parentId: parentId ?? undefined, pageSize: 200 } });
      setNodes(res.data.nodes ?? []);
      setBreadcrumb(res.data.breadcrumb ?? [{ driveFileId: null, name: 'Drive' }]);
    } catch (err) {
      setError(extractMessage(err, 'Failed to load Drive.'));
    } finally {
      setLoading(false);
    }
  }, [apiBase, parentId]);

  const loadTrash = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`${apiBase}/trash`, { params: { pageSize: 200 } });
      setTrash(res.data.nodes ?? []);
    } catch (err) {
      setError(extractMessage(err, 'Failed to load trash.'));
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  const loadSystem = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`${apiBase}/system`, { params: { pageSize: 200 } });
      setSystem(res.data.files ?? []);
    } catch (err) {
      setError(extractMessage(err, 'System files are available to tenant admins only.'));
      setSystem([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    if (tab === 'drive') loadDrive();
    else if (tab === 'trash') loadTrash();
    else loadSystem();
  }, [tab, loadDrive, loadTrash, loadSystem]);

  function openNode(node: DriveNode) {
    if (node.type === 'folder') {
      setParentId(node.driveFileId);
    } else {
      setPreview(node);
    }
  }

  async function createFolder() {
    const name = window.prompt('New folder name:');
    if (!name) return;
    try {
      await api.post(apiBase, { name, parentId: parentId ?? undefined });
      toast.success('Folder created.');
      loadDrive();
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to create folder.'));
    }
  }

  async function onFilesPicked(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);
      if (parentId) fd.append('parentId', parentId);
      try {
        await api.post(`${apiBase}/upload`, fd);
        toast.success(`Uploaded ${file.name}.`);
      } catch (err) {
        toast.error(extractMessage(err, `Failed to upload ${file.name}.`));
      }
    }
    if (fileRef.current) fileRef.current.value = '';
    loadDrive();
  }

  async function rename(node: DriveNode) {
    const name = window.prompt('Rename to:', node.name);
    if (!name || name === node.name) return;
    try {
      await api.patch(`${apiBase}/${node.driveFileId}`, { name });
      toast.success('Renamed.');
      loadDrive();
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to rename.'));
    }
  }

  async function trashNode(node: DriveNode) {
    if (!window.confirm(`Move "${node.name}" to trash?`)) return;
    try {
      await api.delete(`${apiBase}/${node.driveFileId}`);
      toast.success('Moved to trash.');
      loadDrive();
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete.'));
    }
  }

  async function restore(node: DriveNode) {
    try {
      await api.post(`${apiBase}/${node.driveFileId}/restore`);
      toast.success('Restored.');
      loadTrash();
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to restore.'));
    }
  }

  async function purge(node: DriveNode) {
    if (!window.confirm(`Permanently delete "${node.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`${apiBase}/${node.driveFileId}/permanent`);
      toast.success('Permanently deleted.');
      loadTrash();
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete.'));
    }
  }

  async function adopt(file: SystemFile) {
    try {
      await api.post(`${apiBase}/system/${file.uploadedFileId}/adopt`, {});
      toast.success('Added to Drive.');
      loadSystem();
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to add to Drive.'));
    }
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'drive', label: 'My Drive', icon: 'fa-folder-open' },
    { id: 'trash', label: 'Trash', icon: 'fa-trash' },
    { id: 'system', label: 'System Files', icon: 'fa-database' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drive"
        subtitle="Store, organize, preview and share your files."
        actions={
          tab === 'drive'
            ? [
                { label: 'New Folder', variant: 'secondary' as const, onClick: createFolder },
                { label: 'Upload', onClick: () => fileRef.current?.click() },
              ]
            : []
        }
      />

      <input ref={fileRef} type="file" multiple hidden onChange={(e) => onFilesPicked(e.target.files)} />

      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.id ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon name={t.icon} /> {t.label}
          </button>
        ))}
      </div>

      {error && <AlertBanner variant="error" message={error} />}

      {tab === 'drive' && (
        <nav className="flex flex-wrap items-center gap-1 text-sm text-text-secondary">
          {breadcrumb.map((b, i) => (
            <span key={b.driveFileId ?? 'root'} className="flex items-center gap-1">
              {i > 0 && <span className="text-text-tertiary">/</span>}
              <button
                className={i === breadcrumb.length - 1 ? 'text-text-primary font-medium' : 'hover:underline'}
                onClick={() => setParentId(b.driveFileId)}
              >
                {b.name}
              </button>
            </span>
          ))}
        </nav>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : tab === 'drive' ? (
        nodes.length === 0 ? (
          <EmptyState title="This folder is empty" description="Upload a file or create a folder to get started." />
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {nodes.map((node) => (
              <li key={node.driveFileId} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-base">
                <button className="flex flex-1 items-center gap-3 text-left" onClick={() => openNode(node)}>
                  <Icon name={iconFor(node)} className="text-text-secondary w-4" />
                  <span className="truncate text-sm text-text-primary">{node.name}</span>
                </button>
                <span className="hidden sm:block text-xs text-text-tertiary w-20 text-right">
                  {node.type === 'file' ? formatBytes(node.size) : '—'}
                </span>
                <div className="flex items-center gap-1">
                  {node.type === 'file' && (
                    <Button variant="ghost" onClick={() => setPreview(node)} title="Preview">
                      <Icon name="fa-eye" />
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => setShare(node)} title="Share">
                    <Icon name="fa-user-plus" />
                  </Button>
                  <Button variant="ghost" onClick={() => rename(node)} title="Rename">
                    <Icon name="fa-pen" />
                  </Button>
                  <Button variant="ghost" onClick={() => trashNode(node)} title="Delete">
                    <Icon name="fa-trash" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : tab === 'trash' ? (
        trash.length === 0 ? (
          <EmptyState title="Trash is empty" description="Deleted files and folders show up here." />
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {trash.map((node) => (
              <li key={node.driveFileId} className="flex items-center gap-3 px-4 py-2.5">
                <Icon name={iconFor(node)} className="text-text-secondary w-4" />
                <span className="flex-1 truncate text-sm text-text-primary">{node.name}</span>
                <Button variant="ghost" onClick={() => restore(node)}>
                  Restore
                </Button>
                <Button variant="danger" onClick={() => purge(node)}>
                  Delete forever
                </Button>
              </li>
            ))}
          </ul>
        )
      ) : system.length === 0 ? (
        <EmptyState title="No system files" description="Storage objects from every module appear here for admins." />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {system.map((file) => (
            <li key={file.uploadedFileId} className="flex items-center gap-3 px-4 py-2.5">
              <Icon name={iconFor({ type: 'file', mimeType: file.mimeType })} className="text-text-secondary w-4" />
              <span className="flex-1 truncate text-sm text-text-primary">{file.name}</span>
              {file.source && <span className="hidden sm:block text-xs text-text-tertiary">{file.source}</span>}
              <span className="hidden sm:block text-xs text-text-tertiary w-20 text-right">{formatBytes(file.size)}</span>
              <Button variant="ghost" disabled={file.adopted} onClick={() => adopt(file)}>
                {file.adopted ? 'In Drive' : 'Add to Drive'}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <DrivePreviewModal apiBase={apiBase} node={preview} onClose={() => setPreview(null)} />
      <DriveShareModal apiBase={apiBase} origin={origin} node={share} onClose={() => setShare(null)} />
    </div>
  );
}
