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

test('vercel rewrites route api traffic through the stable proxy function', () => {
  assert.deepEqual(vercelConfig.rewrites, [
    {
      source: '/api/auth/:path*',
      destination: '/api/proxy?path=auth/:path*',
    },
    {
      source: '/api/admin/:path*',
      destination: '/api/proxy?path=admin/:path*',
    },
    {
      source: '/api/:path*',
      destination: '/api/proxy?path=api/:path*',
    },
    {
      source: '/openapi.yml',
      destination: '/api/proxy?path=openapi.yml',
    },
    {
      source: '/:path*',
      destination: '/index.html',
    },
  ]);
});
