import { describe, it, expect } from 'vitest';
import {
  CreateConversationDTO,
  ListMessagesDTO,
  SendMessageDTO,
} from '../messaging.dto';

const PEER = '660e8400-e29b-41d4-a716-446655440001';
const PEER2 = '660e8400-e29b-41d4-a716-446655440002';

describe('CreateConversationDTO', () => {
  it('accepts a direct conversation with exactly one peer', () => {
    const r = CreateConversationDTO.safeParse({ type: 'direct', participantUserIds: [PEER] });
    expect(r.success).toBe(true);
  });

  it('rejects a direct conversation with more than one peer', () => {
    const r = CreateConversationDTO.safeParse({ type: 'direct', participantUserIds: [PEER, PEER2] });
    expect(r.success).toBe(false);
  });

  it('rejects a group conversation without a title', () => {
    const r = CreateConversationDTO.safeParse({ type: 'group', participantUserIds: [PEER, PEER2] });
    expect(r.success).toBe(false);
  });

  it('accepts a group conversation with a title', () => {
    const r = CreateConversationDTO.safeParse({ type: 'group', title: 'Team', participantUserIds: [PEER, PEER2] });
    expect(r.success).toBe(true);
  });
});

describe('SendMessageDTO', () => {
  it('defaults contentType to text', () => {
    const r = SendMessageDTO.parse({ body: 'hello' });
    expect(r.contentType).toBe('text');
  });

  it('rejects an empty body', () => {
    expect(SendMessageDTO.safeParse({ body: '' }).success).toBe(false);
  });
});

describe('ListMessagesDTO', () => {
  it('defaults and clamps the limit', () => {
    expect(ListMessagesDTO.parse({}).limit).toBe(30);
    expect(ListMessagesDTO.safeParse({ limit: 999 }).success).toBe(false);
  });
});
