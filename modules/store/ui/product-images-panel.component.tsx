'use client';

import { useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faTrash } from '@fortawesome/free-solid-svg-icons';

type ProductImage = { imageId: string; url: string; altText?: string | null; isPrimary: boolean; sortOrder: number };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export function ProductImagesPanel({
  tenantId,
  productId,
  images,
  onRefresh,
}: {
  tenantId: string;
  productId: string;
  images: ProductImage[];
  onRefresh: () => void;
}) {
  const [showAdd, setShowAdd]     = useState(false);
  const [form, setForm]           = useState({ url: '', altText: '', isPrimary: false });
  const [saving, setSaving]       = useState(false);

  async function handleAdd() {
    setSaving(true);
    try {
      await api.post(`/tenant/${tenantId}/api/store/products/${productId}/images`, {
        url: form.url, altText: form.altText || undefined, isPrimary: form.isPrimary,
      });
      toast.success('Image added');
      setShowAdd(false); setForm({ url: '', altText: '', isPrimary: false });
      onRefresh();
    } catch (err) { toast.error(extractMessage(err, 'Failed to add image.')); }
    finally { setSaving(false); }
  }

  async function handleDelete(imageId: string) {
    if (!confirm('Remove this image?')) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/store/products/${productId}/images/${imageId}`);
      toast.success('Image removed');
      onRefresh();
    } catch (err) { toast.error(extractMessage(err, 'Failed to remove.')); }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => setShowAdd(true)}>
            <FontAwesomeIcon icon={faImage} /> Add Image
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img) => (
            <div key={img.imageId} className="relative group rounded-lg overflow-hidden border border-border bg-surface-raised">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.altText ?? ''} className="w-full aspect-square object-cover" />
              {img.isPrimary && <Badge className="absolute top-1 left-1" variant="success" size="sm">Primary</Badge>}
              <button
                className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center w-6 h-6 rounded bg-error text-white text-xs"
                onClick={() => handleDelete(img.imageId)}
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          ))}
          {images.length === 0 && <p className="col-span-full text-text-secondary text-sm">No images yet.</p>}
        </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Image"
        footer={<>
          <Button variant="ghost" onClick={() => setShowAdd(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleAdd} loading={saving}>Add</Button>
        </>}
      >
        <div className="space-y-4">
          <Input id="img-url" label="Image URL" required value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
          <Input id="img-alt" label="Alt Text" value={form.altText}
            onChange={(e) => setForm((f) => ({ ...f, altText: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.isPrimary} onChange={(e) => setForm((f) => ({ ...f, isPrimary: e.target.checked }))} />
            Set as primary image
          </label>
        </div>
      </Modal>
    </>
  );
}
