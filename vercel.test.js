import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const vercelConfig = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'));

test('vercel function config points at the native api splat handler', () => {
  assert.deepEqual(vercelConfig.functions, {
    'api/[...].js': {
      maxDuration: 60,
    },
  });
});

test('vercel rewrites only keep non-api routes when api paths are handled by native functions', () => {
  assert.deepEqual(vercelConfig.rewrites, [
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
