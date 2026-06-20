import test from 'node:test';
import assert from 'node:assert/strict';

import {
  appendAssistantChunk,
  buildConsultErrorMessage,
  buildConsultChatPayload,
  DEFAULT_MODEL_SOURCE,
  normalizeModelSource,
  resolveConsultStreamEventType,
  upsertAssistantMessage,
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

test('appendAssistantChunk creates one assistant message and appends streamed chunks', () => {
  const first = appendAssistantChunk([
    { role: 'user', content: 'hi' },
  ], 'Hello');

  assert.deepEqual(first, [
    { role: 'user', content: 'hi' },
    { role: 'ai', content: 'Hello' },
  ]);

  const second = appendAssistantChunk(first, ' world');

  assert.deepEqual(second, [
    { role: 'user', content: 'hi' },
    { role: 'ai', content: 'Hello world' },
  ]);
});

test('appendAssistantChunk ignores empty chunks and preserves history', () => {
  const history = [{ role: 'ai', content: 'Existing' }];
  assert.deepEqual(appendAssistantChunk(history, ''), history);
  assert.deepEqual(appendAssistantChunk(history, '   '), history);
});

test('upsertAssistantMessage replaces the current assistant text without creating a duplicate bubble', () => {
  const history = [{ role: 'user', content: 'hi' }];

  assert.deepEqual(upsertAssistantMessage(history, ''), history);
  assert.deepEqual(upsertAssistantMessage(history, 'Ready'), [
    { role: 'user', content: 'hi' },
    { role: 'ai', content: 'Ready' },
  ]);
  assert.deepEqual(upsertAssistantMessage([
    { role: 'user', content: 'hi' },
    { role: 'ai', content: 'Ready' },
  ], 'Updated'), [
    { role: 'user', content: 'hi' },
    { role: 'ai', content: 'Updated' },
  ]);
});

test('appendAssistantChunk appends successive SSE text chunks into one assistant reply', () => {
  let history = [{ role: 'user', content: 'Breakfast ideas?' }];

  history = appendAssistantChunk(history, 'Start with ');
  history = appendAssistantChunk(history, 'protein and fiber');
  history = appendAssistantChunk(history, '.');

  assert.deepEqual(history, [
    { role: 'user', content: 'Breakfast ideas?' },
    { role: 'ai', content: 'Start with protein and fiber.' },
  ]);
});

test('buildConsultErrorMessage formats a visible assistant error bubble', () => {
  assert.equal(
    buildConsultErrorMessage('Timed out'),
    '[System] AI reply failed: Timed out',
  );
});

test('buildConsultErrorMessage falls back to a default visible message', () => {
  assert.equal(
    buildConsultErrorMessage(''),
    '[System] AI reply failed. Please try again.',
  );
});
