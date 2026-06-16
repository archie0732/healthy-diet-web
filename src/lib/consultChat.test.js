import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildConsultChatPayload,
  DEFAULT_MODEL_SOURCE,
  normalizeModelSource,
  resolveConsultStreamEventType,
} from './consultChat.js';

test('normalizeModelSource falls back to auto for unsupported values', () => {
  assert.equal(normalizeModelSource('remote'), DEFAULT_MODEL_SOURCE);
  assert.equal(normalizeModelSource(undefined), DEFAULT_MODEL_SOURCE);
});

test('buildConsultChatPayload includes selected model_source and thread_id', () => {
  const payload = buildConsultChatPayload({
    message: 'hello',
    roomId: 'room-1',
    image: 'data:image/png;base64,abc',
    modelSource: 'google',
    threadId: 'thread-1',
    user: {
      name: 'Alice',
      gender: 'female',
      height: 165,
      weight: 55,
      diet_goal: 'cut',
    },
  });

  assert.deepEqual(payload, {
    message: 'hello',
    room_id: 'room-1',
    image: 'data:image/png;base64,abc',
    model_source: 'google',
    thread_id: 'thread-1',
    user_context: {
      name: 'Alice',
      gender: 'female',
      height: 165,
      weight: 55,
      diet_goal: 'cut',
    },
  });
});

test('buildConsultChatPayload defaults model_source to auto', () => {
  const payload = buildConsultChatPayload({
    message: 'hello',
    roomId: 'room-1',
    image: null,
    user: null,
  });

  assert.equal(payload.model_source, 'auto');
  assert.equal(payload.user_context, null);
});

test('resolveConsultStreamEventType falls back to SSE event field when payload type is missing', () => {
  assert.equal(resolveConsultStreamEventType({ content: 'thinking' }, 'status'), 'status');
  assert.equal(resolveConsultStreamEventType({ content: 'calling tool' }, 'tool'), 'tool');
  assert.equal(resolveConsultStreamEventType({ type: 'answer' }, 'status'), 'answer');
  assert.equal(resolveConsultStreamEventType({}, ''), '');
});
