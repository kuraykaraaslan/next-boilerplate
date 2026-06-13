import crypto from 'crypto';
import redis from '@/modules/redis';

/**
 * Short-lived, single-use WebSocket handshake tickets.
 *
 * Flow: the client calls an authenticated HTTP endpoint to mint a ticket, then
 * presents it on the Socket.IO handshake. The WS service consumes it atomically
 * (GETDEL) so a ticket can never be replayed. The ticket is the Redis lookup
 * key (flat, NOT tenant-prefixed — the WS server only receives the opaque ticket
 * string); the tenantId/userId travel inside the value.
 */
export interface TicketPayload {
  userId: string;
  tenantId: string;
  iat: number;
}

export default class MessagingTicketService {
  static readonly TICKET_TTL_SECONDS = 30;

  /** Flat Redis key for a ticket — shared by minter (HTTP) and consumer (WS). */
  static ticketKey(ticket: string): string {
    return `msg:ws-ticket:${ticket}`;
  }

  /** Mint a single-use ticket bound to {tenantId, userId}. */
  static async mintTicket(
    tenantId: string,
    userId: string,
  ): Promise<{ ticket: string; expiresIn: number }> {
    const ticket = crypto.randomBytes(32).toString('base64url');
    const payload: TicketPayload = { userId, tenantId, iat: Date.now() };
    await redis.set(
      this.ticketKey(ticket),
      JSON.stringify(payload),
      'EX',
      this.TICKET_TTL_SECONDS,
      'NX',
    );
    return { ticket, expiresIn: this.TICKET_TTL_SECONDS };
  }

  /**
   * Atomically consume a ticket (read + delete in one round trip). Returns the
   * payload on success or null if the ticket is missing/expired/already used.
   * Used by the standalone WS service during the handshake.
   */
  static async consumeTicket(ticket: string): Promise<TicketPayload | null> {
    if (!ticket) return null;
    let raw: string | null;
    try {
      // GETDEL (Redis 6.2+) — single-use without a GET/DEL race.
      raw = (await redis.call('GETDEL', this.ticketKey(ticket))) as string | null;
    } catch {
      return null;
    }
    if (!raw) return null;
    try {
      return JSON.parse(raw) as TicketPayload;
    } catch {
      return null;
    }
  }
}
