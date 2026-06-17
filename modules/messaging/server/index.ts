import 'reflect-metadata';
import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createRedisConnection } from '@kuraykaraaslan/redis';
import { env } from '@kuraykaraaslan/env';
import Logger from '@kuraykaraaslan/logger';
import { WS_EVENTS } from './messaging.enums';
import {
  RT_CHANNEL,
  RtEventSchema,
  conversationRoom,
  userRoom,
  type RtEvent,
} from './messaging.realtime';
import { registerSocketAuth } from './socket.auth';
import { registerHandlers } from './socket.handlers';

/**
 * Standalone real-time messaging service.
 *
 * Runs as its own process (`npm run ws:start`) — Next.js App Router cannot host
 * a long-lived WebSocket server. It shares the exact same `@/modules/*` DB,
 * Redis and env code as the app (resolved via the `@/*` tsconfig path under tsx).
 *
 * Two Redis mechanisms, different hops:
 *   • @socket.io/redis-adapter — socket↔socket fan-out *within* the WS cluster
 *     (typing/presence/read broadcasts reach sockets on other instances).
 *   • the `msg:rt` pub/sub channel — how the Next HTTP process (no Socket.IO)
 *     hands persisted messages to the WS cluster for room delivery.
 *
 * IMPORTANT: only `@/modules/*` (pure Node) may be imported here — never
 * `@/modules_next/*`, which pulls `next/server` and crashes outside Next.
 */
async function bootstrap(): Promise<void> {
  const httpServer = createServer((req, res) => {
    if (req.url === '/healthz') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const io = new Server(httpServer, {
    cors: { origin: env.MESSAGING_WS_CORS_ORIGIN ?? true, credentials: true },
    // WebSocket-only avoids needing sticky sessions for the polling upgrade.
    transports: ['websocket'],
  });

  // Cross-instance broadcast — the adapter needs two dedicated connections.
  const pubClient = createRedisConnection();
  const subClient = createRedisConnection();
  io.adapter(createAdapter(pubClient, subClient));

  registerSocketAuth(io);
  io.on('connection', (socket) => registerHandlers(io, socket));

  startRealtimeSubscriber(io);

  const port = env.MESSAGING_WS_PORT;
  httpServer.listen(port, () => Logger.info(`[messaging-ws] listening on :${port}`));
}

/**
 * Subscribe to the `msg:rt` channel and fan persisted events into the right
 * rooms. Uses a dedicated connection (a subscriber-mode connection cannot run
 * normal commands).
 */
function startRealtimeSubscriber(io: Server): void {
  const sub = createRedisConnection();
  sub.subscribe(RT_CHANNEL).catch((err) => Logger.error(`[messaging-ws] subscribe failed: ${err}`));

  sub.on('message', (_channel: string, raw: string) => {
    let event: RtEvent;
    try {
      event = RtEventSchema.parse(JSON.parse(raw));
    } catch {
      return; // ignore malformed payloads
    }
    const room = conversationRoom(event.tenantId, event.conversationId);

    switch (event.kind) {
      case 'message:new':
        io.to(room).emit(WS_EVENTS.MESSAGE_NEW, event.message);
        break;
      case 'message:moderated': {
        // Targeted (e.g. sender's PENDING notice) vs whole-room moderation update.
        const target = event.forUserId ? userRoom(event.tenantId, event.forUserId) : room;
        io.to(target).emit(WS_EVENTS.MESSAGE_MODERATED, {
          conversationId: event.conversationId,
          messageId: event.messageId,
          status: event.status,
        });
        break;
      }
      case 'message:deleted':
        io.to(room).emit(WS_EVENTS.MESSAGE_DELETED, { conversationId: event.conversationId, messageId: event.messageId });
        break;
      case 'read':
        io.to(room).emit(WS_EVENTS.READ, {
          conversationId: event.conversationId,
          userId: event.userId,
          upToMessageId: event.upToMessageId,
        });
        break;
      case 'participant:added':
        io.to(room).emit(WS_EVENTS.PARTICIPANT_ADDED, event.participant);
        break;
      case 'participant:removed':
        io.to(room).emit(WS_EVENTS.PARTICIPANT_REMOVED, { conversationId: event.conversationId, userId: event.userId });
        break;
    }
  });
}

bootstrap().catch((err) => {
  Logger.error(`[messaging-ws] fatal: ${err}`);
  process.exit(1);
});
