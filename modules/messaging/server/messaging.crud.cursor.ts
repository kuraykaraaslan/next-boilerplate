import { AppError, ErrorCode } from '@nb/common/server/app-error';
import MessagingMessages from './messaging.messages';

// ─── Cursor helpers (keyset pagination over createdAt + id) ──────────────────

interface Cursor {
  createdAt: string; // ISO
  id: string;
}

export function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`, 'utf8').toString('base64url');
}

export function decodeCursor(raw: string): Cursor {
  try {
    const [createdAt, id] = Buffer.from(raw, 'base64url').toString('utf8').split('|');
    if (!createdAt || !id) throw new Error('malformed');
    return { createdAt, id };
  } catch {
    throw new AppError(MessagingMessages.INVALID_CURSOR, 400, ErrorCode.VALIDATION_ERROR);
  }
}

export function directDedupeKey(userA: string, userB: string): string {
  return `dm:${[userA, userB].sort().join(':')}`;
}
