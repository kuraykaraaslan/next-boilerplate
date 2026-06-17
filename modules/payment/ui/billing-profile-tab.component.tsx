'use client';
import { Card } from '@kuraykaraaslan/common/ui/card.component';

/**
 * Demo slot contribution: the payment module injects this billing summary into
 * the user-profile tab strip (slot `user.profile.tabs`) declared in
 * modules/payment/module.json. It appears only when the payment module is
 * enabled for the tenant — toggling payment off removes this tab.
 */
export function BillingProfileTab({ tenantId }: { tenantId?: string }) {
  return (
    <Card title="Billing" subtitle="Contributed by the payment module via a slot">
      <p className="text-sm text-text-secondary">
        This panel is rendered by <code>@kuraykaraaslan/payment/ui/BillingProfileTab</code>, contributed into the{' '}
        <code>user.profile.tabs</code> slot. Disable the payment module for this tenant and it disappears.
      </p>
      {tenantId && (
        <p className="mt-2 text-xs text-text-tertiary">Tenant: {tenantId}</p>
      )}
    </Card>
  );
}
