'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@kuraykaraaslan/setting/ui/module-settings-page.component';
import { FORM_BUILDER_SETTINGS_FIELDS } from '@kuraykaraaslan/form_builder/server/form_builder.settings.fields';

export default function FormBuilderSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Form Settings"
      subtitle="Defaults, notifications and anti-spam for forms"
      parentCrumb={{ label: 'Forms', href: `/tenant/${tenantId}/admin/forms` }}
      fields={FORM_BUILDER_SETTINGS_FIELDS}
    />
  );
}
