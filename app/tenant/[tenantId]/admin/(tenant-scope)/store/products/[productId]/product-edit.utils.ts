import type { ProductStatus } from '@/modules_next/store/ui/ProductStatusBadge';

export type Product = {
  productId: string; categoryId: string;
  name: string; slug: string;
  shortDescription?: string | null; details?: string | null;
  basePrice: number; currency: string;
  sku?: string | null; stockQuantity?: number | null; trackInventory: boolean;
  status: ProductStatus; isFeatured: boolean; tags?: string[] | null;
  images: Array<{ imageId: string; url: string; altText?: string | null; isPrimary: boolean; sortOrder: number }>;
  specValues?: Array<{ specValueId: string; specId: string; value: string }>;
};

export type VariantGroupItemRow = {
  itemId: string; productId: string; label?: string | null; sortOrder: number;
};

export type VariantProductInfo = {
  productId: string; name: string; basePrice: number; currency: string;
  status: string; sku?: string | null; stockQuantity?: number | null;
};

export type EditForm = {
  name: string; slug: string; shortDescription: string; details: string;
  basePrice: string; currency: string;
  sku: string; stockQuantity: string; trackInventory: boolean;
  status: string; isFeatured: boolean; tags: string;
};

export const statusOptions = [
  { value: 'DRAFT', label: 'Draft' }, { value: 'ACTIVE', label: 'Active' },
  { value: 'ARCHIVED', label: 'Archived' }, { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
];

export function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}
