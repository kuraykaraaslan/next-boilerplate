// ── Collections (Wix-style CMS data tables) ────────────────────────────────
// Unique key is (tenantId, slug). Field defs follow the collection schema.

export const postsCollectionDef = {
  slug: 'posts',
  label: 'Blog Posts',
  description: 'Articles displayed by the Blog List block.',
  fields: [
    { name: 'title', type: 'text', label: 'Title', required: true },
    { name: 'excerpt', type: 'text', label: 'Excerpt', required: false },
    { name: 'coverImage', type: 'image', label: 'Cover Image', required: false },
    { name: 'publishedAt', type: 'date', label: 'Published At', required: false },
    { name: 'author', type: 'text', label: 'Author', required: false },
  ],
  isSystem: false,
};

export const leadsCollectionDef = {
  slug: 'leads',
  label: 'Lead Form Submissions',
  description: 'Contact form submissions collected by the Lead Form block.',
  fields: [
    { name: 'name', type: 'text', label: 'Full Name', required: true },
    { name: 'email', type: 'email', label: 'Email', required: true },
    { name: 'phone', type: 'text', label: 'Phone', required: false },
    { name: 'message', type: 'richtext', label: 'Message', required: false },
  ],
  isSystem: false,
};

// Sample posts — only seeded when the posts collection has no items yet.
export const samplePosts = [
  { title: 'Getting Started with Next.js', excerpt: 'A beginner guide to Next.js App Router.', author: 'Alice', publishedAt: '2026-03-01' },
  { title: 'Multi-Tenant Architecture Explained', excerpt: 'How to isolate tenant data with TypeORM.', author: 'Bob', publishedAt: '2026-04-15' },
  { title: 'Scaling with Redis and BullMQ', excerpt: 'Background jobs and caching patterns.', author: 'Alice', publishedAt: '2026-05-10' },
];
