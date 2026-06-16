'use client';

import { useState } from 'react';
import { Button } from '@nb/common/ui/Button';
import { Input } from '@nb/common/ui/Input';
import { Modal } from '@nb/common/ui/Modal';
import { AlertBanner } from '@nb/common/ui/AlertBanner';

type IssueForm = {
  amountMajor: string;
  currency: string;
  recipientEmail: string;
  message: string;
  expiresAt: string;
  quantity: string;
};

const EMPTY: IssueForm = {
  amountMajor: '',
  currency: 'USD',
  recipientEmail: '',
  message: '',
  expiresAt: '',
  quantity: '1',
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
};

export function GiftCardIssueModal({ open, onClose, onSave }: Props) {
  const [form, setForm] = useState<IssueForm>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function handleField(key: keyof IssueForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function handleClose() { setForm(EMPTY); setError(''); onClose(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      // Amount is entered in major units; gift cards store integer minor units.
      const amount = Math.round(parseFloat(form.amountMajor) * 100);
      await onSave({
        amount,
        currency: form.currency.toUpperCase(),
        recipientEmail: form.recipientEmail || undefined,
        message: form.message || undefined,
        expiresAt: form.expiresAt || undefined,
        quantity: form.quantity ? parseInt(form.quantity, 10) : 1,
      });
      handleClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to issue gift card.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Issue Gift Card"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" form="gift-card-issue-form" loading={submitting}>Issue</Button>
        </>
      }
    >
      <form id="gift-card-issue-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <AlertBanner variant="error" message={error} />}
        <div className="grid grid-cols-2 gap-4">
          <Input id="gc-amount" label="Amount" type="number" min="0" step="0.01" placeholder="50.00"
            value={form.amountMajor} required
            onChange={(e) => handleField('amountMajor', e.target.value)} />
          <Input id="gc-currency" label="Currency" placeholder="USD" maxLength={3}
            value={form.currency} required className="uppercase"
            onChange={(e) => handleField('currency', e.target.value.toUpperCase())} />
        </div>
        <Input id="gc-recipient" label="Recipient Email" type="email" placeholder="optional"
          value={form.recipientEmail} onChange={(e) => handleField('recipientEmail', e.target.value)} />
        <Input id="gc-message" label="Message" placeholder="Optional gift message"
          value={form.message} onChange={(e) => handleField('message', e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <Input id="gc-expires" label="Expires At" type="datetime-local"
            value={form.expiresAt} onChange={(e) => handleField('expiresAt', e.target.value)} />
          <Input id="gc-quantity" label="Quantity" type="number" min="1" max="500"
            value={form.quantity} onChange={(e) => handleField('quantity', e.target.value)} />
        </div>
      </form>
    </Modal>
  );
}
