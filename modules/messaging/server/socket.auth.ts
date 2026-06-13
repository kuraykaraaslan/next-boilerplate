import type { Server, Socket } from 'socket.io';
import MessagingTicketService from '../messaging.ticket.service';
import { userRoom } from '../messaging.realtime';
import MessagingMessages from '../messaging.messages';

/**
 * Socket carries its resolved identity in `socket.data` after a successful
 * ticket handshake. The WS process NEVER trusts client-supplied tenant/user ids;
 * they come only from the consumed ticket value.
 */
export interface SocketData {
  userId: string;
  tenantId: string;
}

/**
 * Handshake middleware: read the single-use ticket, consume it atomically from
 * Redis (GETDEL → no replay), and bind {userId, tenantId} to the socket. The
 * socket immediately joins its per-user room so it can be addressed across the
 * cluster (e.g. "you were added to a conversation").
 */
export function registerSocketAuth(io: Server): void {
  io.use(async (socket: Socket, next: (err?: Error) => void) => {
    try {
      const ticket = String(socket.handshake.auth?.ticket ?? '');
      const payload = await MessagingTicketService.consumeTicket(ticket);
      if (!payload) {
        next(new Error(MessagingMessages.TICKET_INVALID));
        return;
      }
      const data = socket.data as SocketData;
      data.userId = payload.userId;
      data.tenantId = payload.tenantId;
      socket.join(userRoom(payload.tenantId, payload.userId));
      next();
    } catch {
      next(new Error(MessagingMessages.TICKET_INVALID));
    }
  });
}
