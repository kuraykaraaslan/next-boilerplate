'use client';
import { useRef, useState } from 'react';
import { cn } from '@nb/common/server/utils/cn';
import { Avatar } from '@nb/common/ui/Avatar';
import { Spinner } from '@nb/common/ui/Spinner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faXmark } from '@fortawesome/free-solid-svg-icons';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export function AvatarUpload({
  src,
  name,
  uploadEndpoint,
  onUpload,
  onRemove,
  size = 'xl',
  disabled = false,
  className,
}: {
  src?: string | null;
  name: string;
  uploadEndpoint: string;
  onUpload: (url: string) => void;
  onRemove?: () => void;
  size?: 'md' | 'lg' | 'xl';
  disabled?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displaySrc = preview ?? src ?? null;

  async function handleFile(file: File) {
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPEG, PNG, WebP, or GIF images are allowed.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be under 5 MB.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'users');

      const res = await fetch(uploadEndpoint, { method: 'POST', body: form });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message ?? 'Upload failed.');

      URL.revokeObjectURL(objectUrl);
      setPreview(null);
      onUpload(data.url);
    } catch (err: any) {
      URL.revokeObjectURL(objectUrl);
      setPreview(null);
      setError(err.message ?? 'Upload failed.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const avatarSizeMap = { md: 'md', lg: 'lg', xl: 'xl' } as const;

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className="relative group">
        <Avatar src={displaySrc} name={name} size={avatarSizeMap[size]} />

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Spinner size="sm" className="text-white" />
          </div>
        )}

        {!uploading && !disabled && (
          <button
            type="button"
            aria-label="Change profile picture"
            onClick={() => inputRef.current?.click()}
            className={cn(
              'absolute inset-0 flex items-center justify-center rounded-full',
              'bg-black/0 group-hover:bg-black/40 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus'
            )}
          >
            <FontAwesomeIcon
              icon={faCamera}
              className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              aria-hidden="true"
            />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="text-xs text-primary underline underline-offset-2 hover:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus rounded"
        >
          {uploading ? 'Uploading…' : 'Upload photo'}
        </button>

        {(displaySrc || src) && onRemove && !uploading && (
          <>
            <span className="text-xs text-text-disabled">·</span>
            <button
              type="button"
              disabled={disabled}
              onClick={onRemove}
              className="flex items-center gap-1 text-xs text-error hover:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus rounded"
            >
              <FontAwesomeIcon icon={faXmark} className="w-3 h-3" aria-hidden="true" />
              Remove
            </button>
          </>
        )}
      </div>

      {error && <p role="alert" className="text-xs text-error text-center">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
