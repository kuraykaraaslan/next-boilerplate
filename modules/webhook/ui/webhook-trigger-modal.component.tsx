'use client';

import { useEffect, useState } from 'react';
import { Button } from '@nb/common/ui/button.component';
import { Modal } from '@nb/common/ui/modal.component';
import { AlertBanner } from '@nb/common/ui/alert-banner.component';
import type { WebhookEvent } from '@nb/webhook/server/webhook.enums';
import type { Webhook } from './webhook.types';

type Props = {
  webhook: Webhook | null;
  onClose: () => void;
  onTrigger: (webhookId: string, event: WebhookEvent, payload: unknown) => Promise<void>;
};

export function WebhookTriggerModal({ webhook, onClose, onTrigger }: Props) {
  const [triggerEvent, setTriggerEvent] = useState<WebhookEvent | ''>('');
  const [triggerPayload, setTriggerPayload] = useState('{}');
  const [triggering, setTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState('');

  useEffect(() => {
    if (webhook) {
      setTriggerEvent(webhook.events[0] ?? '');
      setTriggerPayload('{}');
      setTriggerError('');
    }
  }, [webhook]);

  async function handleTrigger() {
    if (!webhook || !triggerEvent) { setTriggerError('Pick an event.'); return; }
    let payload: unknown = {};
    if (triggerPayload.trim()) {
      try { payload = JSON.parse(triggerPayload); }
      catch { setTriggerError('Payload must be valid JSON.'); return; }
    }
    setTriggering(true);
    setTriggerError('');
    try {
      await onTrigger(webhook.webhookId, triggerEvent as WebhookEvent, payload);
      onClose();
    } catch (err: any) {
      setTriggerError(err?.response?.data?.message ?? err?.message ?? 'Trigger failed.');
    } finally {
      setTriggering(false);
    }
  }

  return (
    <Modal
      open={!!webhook}
      onClose={onClose}
      title="Trigger event"
      description={webhook ? `Send a real event to "${webhook.name}" with a sample payload.` : ''}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={triggering}>Cancel</Button>
          <Button variant="primary" onClick={handleTrigger} loading={triggering}>Trigger</Button>
        </>
      }
    >
      <div className="space-y-4">
        {triggerError && <AlertBanner variant="error" message={triggerError} />}
        <div>
          <label htmlFor="trigger-event" className="text-sm font-medium text-text-primary mb-1 block">Event</label>
          <select id="trigger-event"
            className="w-full rounded-md border border-border bg-surface-base px-2.5 py-1.5 text-sm font-mono"
            value={triggerEvent}
            onChange={(e) => setTriggerEvent(e.target.value as WebhookEvent)}>
            {(webhook?.events ?? []).map((ev) => (
              <option key={ev} value={ev}>{ev}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="trigger-payload" className="text-sm font-medium text-text-primary mb-1 block">Sample payload (JSON)</label>
          <textarea id="trigger-payload"
            className="w-full rounded-md border border-border bg-surface-base px-2.5 py-1.5 text-sm font-mono min-h-32"
            value={triggerPayload}
            onChange={(e) => setTriggerPayload(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
