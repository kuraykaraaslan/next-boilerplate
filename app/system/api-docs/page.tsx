'use client';

import { SwaggerDocs } from '@/components/common/swagger';

export default function SystemApiDocsPage() {
  return (
    <SwaggerDocs
      specUrl="/assets/openapi.json"
      title="Next Boilerplate"
      homeUrl="/"
      loginUrl="/system/auth/login"
      badgeText="System API"
    />
  );
}
