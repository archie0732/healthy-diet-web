import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough, Readable } from 'node:stream';

import {
  buildProxyTargetUrl,
  getRequestPathSegments,
  getProxyBaseUrl,
  getResponseHeaderEntries,
  shouldStreamResponse,
} from './proxy.js';
import handler from './proxy.js';

test('getProxyBaseUrl trims trailing slashes from configured upstream origin', () => {
  assert.equal(
    getProxyBaseUrl({ VITE_API_BASE: 'https://daily-fezzed-larisa.ngrok-free.dev///' }),
    'https://daily-fezzed-larisa.ngrok-free.dev',
  );
});

test('getProxyBaseUrl falls back to other configured upstream env vars when VITE_API_BASE is empty', () => {
  assert.equal(
    getProxyBaseUrl({
      VITE_API_BASE: '   ',
      API_BASE: '',
      TARGET_API_SERVER: 'https://fallback.example.com///',
    }),
    'https://fallback.example.com',
  );
});

test('buildProxyTargetUrl appends path and query onto upstream origin', () => {
  assert.equal(
    buildProxyTargetUrl('https://daily-fezzed-larisa.ngrok-free.dev', ['api', 'chat'], 'thread_id=1'),
    'https://daily-fezzed-larisa.ngrok-free.dev/api/chat?thread_id=1',
  );
});

test('getRequestPathSegments normalizes Vercel catch-all query payloads', () => {
  assert.deepEqual(getRequestPathSegments({ path: ['auth', 'login'] }), ['auth', 'login']);
  assert.deepEqual(getRequestPathSegments({ path: 'auth/login' }), ['auth', 'login']);
  assert.deepEqual(getRequestPathSegments({ path: 'openapi.yml' }), ['openapi.yml']);
  assert.deepEqual(getRequestPathSegments({}), []);
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

test('proxy handler forwards SSE bytes without wrapping or rewriting event lines', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env;

  const upstreamSsePayload = [
    'event: status',
    'data: {"type":"status","content":"Tool analyze_food_image: running"}',
    '',
    'event: text',
    'data: {"type":"text","content":"hello"}',
    '',
  ].join('\n');

  process.env = {
    ...originalEnv,
    VITE_API_BASE: 'https://agent.example.com',
  };

  globalThis.fetch = async () => new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(upstreamSsePayload));
        controller.close();
      },
    }),
    {
      status: 200,
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache',
      },
    },
  );

  const req = Readable.from([]);
  req.method = 'GET';
  req.url = '/api/chat.rs?path=api/chat.rs';
  req.query = { path: ['api', 'chat.rs'] };
  req.headers = {};

  const res = new PassThrough();
  const responseHeaders = new Map();
  res.statusCode = 200;
  res.setHeader = (name, value) => {
    responseHeaders.set(String(name).toLowerCase(), value);
  };

  try {
    await handler(req, res);

    const chunks = [];
    await new Promise((resolve, reject) => {
      res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      res.on('end', resolve);
      res.on('error', reject);
    });

    assert.equal(res.statusCode, 200);
    assert.equal(responseHeaders.get('content-type'), 'text/event-stream; charset=utf-8');
    assert.equal(Buffer.concat(chunks).toString('utf8'), upstreamSsePayload);
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});
