import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const vercelConfig = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'));

test('vercel rewrites use named wildcard segments so api POST routes reach functions', () => {
  assert.deepEqual(vercelConfig.rewrites, [
    {
      source: '/api/auth/:path*',
      destination: '/api/backend/auth/:path*',
    },
    {
      source: '/api/admin/:path*',
      destination: '/api/backend/admin/:path*',
    },
    {
      source: '/api/:path*',
      destination: '/api/backend/api/:path*',
    },
    {
      source: '/openapi.yml',
      destination: '/api/backend/openapi.yml',
    },
    {
      source: '/:path*',
      destination: '/index.html',
    },
  ]);
});
