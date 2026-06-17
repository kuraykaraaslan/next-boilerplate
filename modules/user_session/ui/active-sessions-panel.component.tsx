'use client';

import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDesktop, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import type { SafeUserSession } from '@kuraykaraaslan/user_session/server/user_session.types';

interface Props {
  sessions: SafeUserSession[];
  currentSessionId: string | null;
  revoking: string | null;
  onRevoke: (sessionId: string) => void;
}

export function ActiveSessionsPanel({ sessions, currentSessionId, revoking, onRevoke }: Props) {
  return (
    <Card
      title="Active Sessions"
      subtitle={`${sessions.length} active session${sessions.length !== 1 ? 's' : ''}`}
    >
      {sessions.length === 0 ? (
        <p className="text-sm text-text-secondary py-2">No active sessions found.</p>
      ) : (
        <div className="divide-y divide-border">
          {sessions.map((s) => {
            const isCurrent = s.userSessionId === currentSessionId;
            const ua = s.userAgent ?? 'Unknown device';
            const ip = s.ipAddress ?? 'Unknown IP';
            const created = s.createdAt ? new Date(s.createdAt).toLocaleString() : '—';
            const expiry = new Date(s.sessionExpiry).toLocaleString();

            return (
              <div key={s.userSessionId} className="flex items-start justify-between gap-4 py-3 flex-wrap">
                <div className="flex items-start gap-3 min-w-0">
                  <FontAwesomeIcon icon={faDesktop} className="w-4 h-4 text-text-secondary mt-0.5 shrink-0" aria-hidden="true" />
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-text-primary truncate max-w-xs">{ua}</span>
                      {isCurrent && <Badge variant="success" dot>Current</Badge>}
                    </div>
                    <p className="text-xs text-text-secondary">{ip} · Started {created}</p>
                    <p className="text-xs text-text-disabled">Expires {expiry}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  loading={revoking === s.userSessionId}
                  onClick={() => onRevoke(s.userSessionId)}
                  className="text-error border-error hover:bg-error-subtle shrink-0"
                >
                  <FontAwesomeIcon icon={faRightFromBracket} className="w-3 h-3 mr-1.5" aria-hidden="true" />
                  {isCurrent ? 'Sign out' : 'Revoke'}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
