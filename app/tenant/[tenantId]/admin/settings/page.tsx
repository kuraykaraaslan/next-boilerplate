'use client';
import { use, useState } from 'react';
import api from '@/libs/axios';
import { Card } from '@/modules/ui/Card';
import { Input } from '@/modules/ui/Input';
import { Button } from '@/modules/ui/Button';
import { AlertBanner } from '@/modules/ui/AlertBanner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faBuilding, faGlobe, faTrash } from '@fortawesome/free-solid-svg-icons';

export default function TenantSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [saved, setSaved] = useState(false);
  const [general, setGeneral] = useState({ name: tenantId, domain: '' });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await api.patch(`/tenant/${tenantId}/api/settings`, general);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Organization Settings</h1>
        <p className="text-sm text-text-secondary mt-0.5">Manage your organization configuration</p>
      </div>

      {saved && (
        <AlertBanner variant="success" message="Settings saved successfully." dismissible />
      )}

      <Card title="General" subtitle="Basic organization information">
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            id="org-name"
            label="Organization Name"
            prefixIcon={<FontAwesomeIcon icon={faBuilding} className="w-3.5 h-3.5" />}
            value={general.name}
            onChange={(e) => setGeneral((v) => ({ ...v, name: e.target.value }))}
          />
          <Input
            id="org-domain"
            label="Custom Domain"
            placeholder="app.yourcompany.com"
            hint="Add a CNAME record pointing to our servers."
            prefixIcon={<FontAwesomeIcon icon={faGlobe} className="w-3.5 h-3.5" />}
            value={general.domain}
            onChange={(e) => setGeneral((v) => ({ ...v, domain: e.target.value }))}
          />
          <div className="flex justify-end">
            <Button type="submit" iconLeft={<FontAwesomeIcon icon={faSave} />}>Save Settings</Button>
          </div>
        </form>
      </Card>

      <Card title="Danger Zone" subtitle="Irreversible actions — proceed with caution">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium text-text-primary">Delete Organization</p>
              <p className="text-xs text-text-secondary mt-0.5">This will permanently delete all data and cannot be undone.</p>
            </div>
            <Button variant="danger" iconLeft={<FontAwesomeIcon icon={faTrash} />}>
              Delete Organization
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
