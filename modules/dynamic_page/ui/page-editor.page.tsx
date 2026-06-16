'use client';
import { use } from 'react';
import DynamicPageEditor from '@nb/dynamic_page/ui/dynamic/Editor';

export default function PageEditorPage({
  params,
}: {
  params: Promise<{ tenantId: string; pageId: string }>;
}) {
  const { tenantId, pageId } = use(params);
  return <DynamicPageEditor tenantId={tenantId} pageId={pageId} />;
}
