'use client';

import { RowActionsMenu } from '@/modules_next/common/ui/RowActionsMenu';
import type { TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { ProductStatusBadge, StockBadge, type ProductStatus } from '@/modules_next/store/ui/ProductStatusBadge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrash, faCopy } from '@fortawesome/free-solid-svg-icons';

export type ProductRow = {
  productId: string;
  name: string;
  slug: string;
  basePrice: number;
  currency: string;
  status: ProductStatus;
  stockQuantity?: number | null;
  isFeatured: boolean;
  categoryId: string;
  createdAt: string;
};

export interface ProductColumnHandlers {
  onEdit: (p: ProductRow) => void;
  onDuplicate: (p: ProductRow) => void;
  onDelete: (p: ProductRow) => void;
}

export function formatProductPrice(amount: number, currency: string) {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount); }
  catch { return `${amount} ${currency}`; }
}

export function buildProductColumns(h: ProductColumnHandlers): TableColumn<ProductRow>[] {
  return [
    {
      key: 'name', header: 'Product',
      render: (p) => (
        <div>
          <p className="font-medium text-text-primary">{p.name}</p>
          <p className="text-xs text-text-secondary">{p.slug}</p>
        </div>
      ),
    },
    {
      key: 'price', header: 'Price',
      render: (p) => <span className="tabular-nums font-semibold text-text-primary">{formatProductPrice(p.basePrice, p.currency)}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (p) => <ProductStatusBadge status={p.status} size="sm" dot />,
    },
    {
      key: 'stock', header: 'Stock',
      render: (p) => <StockBadge qty={p.stockQuantity} />,
    },
    {
      key: 'createdAt', header: 'Created',
      render: (p) => <span className="text-text-secondary">{new Date(p.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: '_actions', header: '', align: 'right',
      render: (p) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Edit',      icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => h.onEdit(p) },
            { label: 'Duplicate', icon: <FontAwesomeIcon icon={faCopy} />,        onClick: () => h.onDuplicate(p) },
            { label: 'Delete',    icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger', onClick: () => h.onDelete(p) },
          ]} />
        </div>
      ),
    },
  ];
}
