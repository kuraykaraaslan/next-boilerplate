'use client';
import { useRef, useState } from 'react';
import { cn } from '@/modules_next/common/utils/cn';
import { Modal } from '@/modules_next/common/ui/Modal';
import { Input } from '@/modules_next/common/ui/Input';
import { Button } from '@/modules_next/common/ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolderOpen, faXmark } from '@fortawesome/free-solid-svg-icons';

const MAX_BYTES = 5 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageInsertModal({
  open,
  onClose,
  onInsert,
}: {
  open: boolean;
  onClose: () => void;
  onInsert: (payload: { src: string; alt: string }) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setUrl('');
    setAlt('');
    setError('');
    setBusy(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClose() {
    reset();
    onClose();
  }

  const canInsert = !busy && (!!file || url.trim().length > 0);

  function handleFile(f: File | null) {
    setError('');
    if (!f) { setFile(null); return; }
    if (!f.type.startsWith('image/')) {
      setError('File must be an image.');
      setFile(null);
      return;
    }
    if (f.size > MAX_BYTES) {
      setError(`Image exceeds ${formatBytes(MAX_BYTES)} limit.`);
      setFile(null);
      return;
    }
    setFile(f);
  }

  async function handleInsert() {
    if (!canInsert) return;
    setBusy(true);
    try {
      let src = url.trim();
      if (file) {
        src = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.onerror = () => reject(new Error('Failed to read file.'));
          r.readAsDataURL(file);
        });
      }
      onInsert({ src, alt: alt.trim() });
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to insert image.');
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Insert image"
      description="Upload a file or paste an image URL."
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" onClick={handleInsert} disabled={!canInsert} loading={busy}>
            Insert
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <span className="block text-sm font-medium text-text-primary">Image file</span>
          <div
            className={cn(
              'relative rounded-md border-2 border-dashed border-border bg-surface-base',
              'flex items-center justify-center gap-2 px-4 py-4 text-center text-sm',
              file && 'border-primary bg-primary-subtle'
            )}
          >
            {!file ? (
              <>
                <FontAwesomeIcon icon={faFolderOpen} className="w-4 h-4 text-text-disabled" aria-hidden="true" />
                <span className="text-text-secondary">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-primary underline underline-offset-2 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus rounded"
                  >
                    Choose file
                  </button>{' '}
                  or drop here
                </span>
              </>
            ) : (
              <span className="flex items-center gap-2 truncate">
                <span className="font-medium text-text-primary truncate">{file.name}</span>
                <span className="text-xs text-text-secondary">{formatBytes(file.size)}</span>
                <button
                  type="button"
                  aria-label="Remove file"
                  onClick={() => handleFile(null)}
                  className="text-text-disabled hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus rounded"
                >
                  <FontAwesomeIcon icon={faXmark} className="w-3 h-3" aria-hidden="true" />
                </button>
              </span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <p className="text-xs text-text-disabled">Max {formatBytes(MAX_BYTES)}. PNG, JPG, GIF, WebP, SVG.</p>
        </div>

        <Input
          id="rte-image-url"
          label="Or paste URL"
          type="url"
          placeholder="https://example.com/image.png"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={!!file}
        />

        <Input
          id="rte-image-alt"
          label="Alt text"
          hint="Describe the image for screen readers."
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
        />

        {error && <p className="text-sm text-error" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}
