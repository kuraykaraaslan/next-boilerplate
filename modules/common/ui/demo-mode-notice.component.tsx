'use client';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { Modal } from './modal.component';
import { Button } from './button.component';

const DISMISS_KEY = 'demo-mode-notice-dismissed';

/**
 * Rendered in the root layout only when DEMO_MODE is enabled. Warns the visitor
 * that this is a throwaway demo: the database is wiped and reseeded every 15
 * minutes, so any data or settings they change will be lost. Dismissed for the
 * rest of the browser session via sessionStorage.
 */
export function DemoModeNotice() {
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(DISMISS_KEY) !== '1';
  });

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* sessionStorage unavailable (private mode) — just close */
    }
    setOpen(false);
  };

  return (
    <Modal
      open={open}
      onClose={dismiss}
      title="Demo Modu"
      size="md"
      footer={
        <Button variant="primary" onClick={dismiss}>
          Anladım, devam et
        </Button>
      }
    >
      <div className="flex gap-3">
        <FontAwesomeIcon
          icon={faTriangleExclamation}
          className="w-5 h-5 text-warning shrink-0 mt-0.5"
          aria-hidden
        />
        <div className="space-y-2 text-sm text-text-secondary">
          <p>
            Bu ortam bir <strong className="text-text-primary">demo</strong>{' '}
            ortamıdır. Veritabanı{' '}
            <strong className="text-text-primary">her 15 dakikada bir</strong>{' '}
            tamamen sıfırlanır.
          </p>
          <p>
            Oluşturduğunuz tüm kayıtlar, kullanıcılar ve{' '}
            <strong className="text-text-primary">tüm ayarlar kalıcı olarak silinir</strong>{' '}
            ve başlangıç durumuna geri döner. Lütfen kalıcı olmasını istediğiniz
            hiçbir veriyi buraya girmeyin.
          </p>
        </div>
      </div>
    </Modal>
  );
}
