'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { FileInput } from '@kuraykaraaslan/common/ui/file-input.component';
import { ImageGallery, type ImageGalleryImage } from '@kuraykaraaslan/common/ui/image-gallery.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

type GalleryEntityType = 'store_category' | 'store_product' | 'store_bundle' | 'store_variant';

type GalleryPanelProps = {
  tenantId: string;
  entityType: GalleryEntityType;
  entityId: string;
};

type GalleryItem = {
  itemId: string;
  galleryId: string;
  uploadedFileId: string;
  url: string;
  altText?: string | null;
  title?: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

type Gallery = { galleryId: string; items: GalleryItem[] };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export function GalleryPanel({ tenantId, entityType, entityId }: GalleryPanelProps) {
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const itemsUrl = `/tenant/${tenantId}/api/media-gallery/${entityType}/${entityId}/items`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(itemsUrl);
      setGallery(res.data.gallery);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to load gallery.'));
    } finally { setLoading(false); }
  }, [itemsUrl]);

  useEffect(() => { load(); }, [load]);

  async function handleUpload(files: File[]) {
    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'images');

      const storageRes = await api.post(`/tenant/${tenantId}/api/storage`, fd);
      const uploadedFileId: string | undefined = storageRes.data.uploadedFileId;
      if (!uploadedFileId) {
        toast.error('Upload audit row missing; cannot attach to gallery.');
        continue;
      }

      await api.post(itemsUrl, {
        uploadedFileId,
        altText: file.name,
        isPrimary: (gallery?.items.length ?? 0) === 0,
      });
    }
    toast.success(files.length === 1 ? 'Image added' : `${files.length} images added`);
    setShowAdd(false);
    load();
  }

  async function handleRemove(_index: number, image: ImageGalleryImage) {
    const item = gallery?.items.find((i) => i.url === image.src);
    if (!item) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/media-gallery/items/${item.itemId}`);
      toast.success('Image removed');
      load();
    } catch (err) { toast.error(extractMessage(err, 'Failed to remove image.')); }
  }

  async function handleReorder(reordered: ImageGalleryImage[]) {
    if (!gallery) return;
    const orderedIds = reordered
      .map((img) => gallery.items.find((i) => i.url === img.src)?.itemId)
      .filter(Boolean) as string[];
    try {
      await api.put(`${itemsUrl}/reorder`, { galleryId: gallery.galleryId, orderedIds });
    } catch (err) { toast.error(extractMessage(err, 'Failed to reorder.')); }
  }

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>;

  const galleryImages: ImageGalleryImage[] = (gallery?.items ?? []).map((item) => ({
    src:     item.url,
    alt:     item.altText ?? item.url,
    caption: item.title   ?? undefined,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {galleryImages.length} image{galleryImages.length !== 1 ? 's' : ''}
        </p>
        <Button variant="secondary" size="sm" onClick={() => setShowAdd(true)}>
          <FontAwesomeIcon icon={faPlus} /> Add Images
        </Button>
      </div>

      {galleryImages.length === 0 ? (
        <p className="text-sm text-text-secondary py-6 text-center">
          No images yet. Add one to get started.
        </p>
      ) : (
        <ImageGallery
          images={galleryImages}
          columns={4}
          aspect="square"
          gap="md"
          lightbox
          showCaptions
          reorderable
          onReorder={handleReorder}
          onRemove={handleRemove}
        />
      )}

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Images"
        footer={<Button variant="ghost" onClick={() => setShowAdd(false)}>Close</Button>}
      >
        <FileInput
          id="gallery-upload"
          label="Select images"
          hint="PNG, JPG, WEBP — drag & drop or browse"
          multiple
          accept="image/*"
          allowedTypes={['image/jpeg', 'image/png', 'image/webp', 'image/avif']}
          maxSizeBytes={10 * 1024 * 1024}
          uploadLabel="Upload"
          onUpload={handleUpload}
        />
      </Modal>
    </div>
  );
}
