import type { Server, Socket } from 'socket.io';
import MessagingPolicyService from './messaging.policy.service';
import MessagingLifecycleService from './messaging.lifecycle.service';
import { WS_EVENTS } from './messaging.enums';
import { conversationRoom } from './messaging.realtime';
import type { SocketData } from './socket.auth';
import {
  touchPresence,
  clearPresence,
  setTyping,
  clearTyping,
  PRESENCE_HEARTBEAT_MS,
} from './socket.presence';

interface JoinPayload {
  conversationId?: string;
}
interface TypingPayload {
  conversationId?: string;
}
interface ReadPayload {
  conversationId?: string;
  upToMessageId?: string;
}

/**
 * Wire up the per-socket event handlers. Identity ({userId, tenantId}) is taken
 * exclusively from `socket.data` (set during the ticket handshake) — never from
 * client-supplied fields. A socket may only join conversation rooms it is an
 * active participant of.
 */
export function registerHandlers(_io: Server, socket: Socket): void {
  const { userId, tenantId } = socket.data as SocketData;

  // Presence: mark online + heartbeat for the life of the connection.
  void touchPresence(tenantId, userId);
  const heartbeat = setInterval(() => void touchPresence(tenantId, userId), PRESENCE_HEARTBEAT_MS);

  socket.on(WS_EVENTS.JOIN, async (payload: JoinPayload) => {
    const conversationId = payload?.conversationId;
    if (!conversationId) return;
    try {
      await MessagingPolicyService.assertParticipant(tenantId, userId, conversationId);
      await socket.join(conversationRoom(tenantId, conversationId));
      // Announce presence to others already in the room.
      socket.to(conversationRoom(tenantId, conversationId)).emit(WS_EVENTS.PRESENCE, {
        conversationId,
        userId,
        status: 'online',
      });
    } catch (err) {
      socket.emit(WS_EVENTS.ERROR, { event: WS_EVENTS.JOIN, message: (err as Error).message });
    }
  });

  socket.on(WS_EVENTS.LEAVE, async (payload: JoinPayload) => {
    const conversationId = payload?.conversationId;
    if (!conversationId) return;
    await socket.leave(conversationRoom(tenantId, conversationId));
  });

  socket.on(WS_EVENTS.TYPING_START, async (payload: TypingPayload) => {
    const conversationId = payload?.conversationId;
    if (!conversationId) return;
    void setTyping(tenantId, conversationId, userId);
    socket.to(conversationRoom(tenantId, conversationId)).emit(WS_EVENTS.TYPING_START, { conversationId, userId });
  });

  socket.on(WS_EVENTS.TYPING_STOP, async (payload: TypingPayload) => {
    const conversationId = payload?.conversationId;
    if (!conversationId) return;
    void clearTyping(tenantId, conversationId, userId);
    socket.to(conversationRoom(tenantId, conversationId)).emit(WS_EVENTS.TYPING_STOP, { conversationId, userId });
  });

  socket.on(WS_EVENTS.READ, async (payload: ReadPayload) => {
    const { conversationId, upToMessageId } = payload ?? {};
    if (!conversationId || !upToMessageId) return;
    try {
      // Persists the read cursor AND publishes a 'read' realtime event for fan-out.
      await MessagingLifecycleService.markRead(tenantId, userId, conversationId, { upToMessageId });
    } catch (err) {
      socket.emit(WS_EVENTS.ERROR, { event: WS_EVENTS.READ, message: (err as Error).message });
    }
  });

  socket.on('disconnect', () => {
    clearInterval(heartbeat);
    void clearPresence(tenantId, userId);
  });
}
