import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const vercelConfig = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'));

test('vercel function config points at the native api splat handler', () => {
  assert.deepEqual(vercelConfig.functions, {
    'api/proxy.js': {
      maxDuration: 60,
    },
  });
});

test('vercel routes send api traffic directly to the proxy function file', () => {
  assert.deepEqual(vercelConfig.routes, [
    {
      src: '/api/auth/(.*)',
      dest: '/api/proxy.js?path=auth/$1',
    },
    {
      src: '/api/admin/(.*)',
      dest: '/api/proxy.js?path=admin/$1',
    },
    {
      src: '/api/(.*)',
      dest: '/api/proxy.js?path=api/$1',
    },
    {
      src: '/openapi.yml',
      dest: '/api/proxy.js?path=openapi.yml',
    },
    {
      handle: 'filesystem',
    },
    {
      src: '/(.*)',
      dest: '/index.html',
    },
  ]);
});
