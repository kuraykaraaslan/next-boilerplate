'use client';
import { Badge } from '@nb/common/ui/badge.component';

export type PostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type CommentStatus = 'NOT_PUBLISHED' | 'PUBLISHED' | 'SPAM';

const postMeta: Record<PostStatus, { label: string; variant: 'warning' | 'success' | 'neutral' }> = {
  DRAFT:     { label: 'Draft',     variant: 'warning' },
  PUBLISHED: { label: 'Published', variant: 'success' },
  ARCHIVED:  { label: 'Archived',  variant: 'neutral' },
};

const commentMeta: Record<CommentStatus, { label: string; variant: 'warning' | 'success' | 'error' }> = {
  NOT_PUBLISHED: { label: 'Pending',   variant: 'warning' },
  PUBLISHED:     { label: 'Published', variant: 'success' },
  SPAM:          { label: 'Spam',      variant: 'error'   },
};

export function PostStatusBadge({ status, size = 'md', dot = false }: { status: PostStatus; size?: 'sm' | 'md' | 'lg'; dot?: boolean }) {
  const meta = postMeta[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={meta.variant} size={size} dot={dot}>{meta.label}</Badge>;
}

export function CommentStatusBadge({ status, size = 'sm' }: { status: CommentStatus; size?: 'sm' | 'md' | 'lg' }) {
  const meta = commentMeta[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={meta.variant} size={size} dot>{meta.label}</Badge>;
}
