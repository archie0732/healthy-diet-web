import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildProxyTargetUrl,
  getProxyBaseUrl,
  getResponseHeaderEntries,
  shouldStreamResponse,
} from './proxy.js';

test('getProxyBaseUrl trims trailing slashes from configured upstream origin', () => {
  assert.equal(
    getProxyBaseUrl({ VITE_API_BASE: 'https://daily-fezzed-larisa.ngrok-free.dev///' }),
    'https://daily-fezzed-larisa.ngrok-free.dev',
  );
});

test('buildProxyTargetUrl appends path and query onto upstream origin', () => {
  assert.equal(
    buildProxyTargetUrl('https://daily-fezzed-larisa.ngrok-free.dev', ['api', 'chat'], 'thread_id=1'),
    'https://daily-fezzed-larisa.ngrok-free.dev/api/chat?thread_id=1',
  );
});

test('getResponseHeaderEntries strips hop-by-hop headers before proxying', () => {
  const headers = new Headers({
    'content-type': 'text/event-stream',
    'content-length': '42',
    connection: 'keep-alive',
    'cache-control': 'no-cache',
  });

  assert.deepEqual(getResponseHeaderEntries(headers), [
    ['cache-control', 'no-cache'],
    ['content-type', 'text/event-stream'],
  ]);
});

test('shouldStreamResponse detects SSE payloads', () => {
  assert.equal(shouldStreamResponse('text/event-stream'), true);
  assert.equal(shouldStreamResponse('application/json; charset=utf-8'), false);
});
