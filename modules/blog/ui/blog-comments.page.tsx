'use client';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';

// Placeholder comment-moderation surface for the Blog module in the Content
// workspace. Comment moderation APIs already exist; this central queue is
// scaffolded and will list pending/spam comments across all posts.
export default function BlogCommentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Comments" subtitle="Scaffolded — coming soon" />
      <p className="text-text-secondary">
        Central comment-moderation queue is scaffolded. Comments are moderated
        per-post today via the blog API.
      </p>
    </div>
  );
}
