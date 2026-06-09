import test from 'node:test';
import assert from 'node:assert/strict';

import { buildApiUrl, resolveApiBase } from './api.js';

test('resolveApiBase trims trailing slashes from configured api base', () => {
  assert.equal(
    resolveApiBase({ VITE_API_BASE: 'https://daily-fezzed-larisa.ngrok-free.dev///' }),
    'https://daily-fezzed-larisa.ngrok-free.dev',
  );
});

test('resolveApiBase stays empty when api base is not explicitly configured', () => {
  assert.equal(resolveApiBase({}), '');
});

test('buildApiUrl keeps relative endpoints unchanged when no api base is configured', () => {
  assert.equal(buildApiUrl('/api/user/profile', {}), '/api/user/profile');
});

test('buildApiUrl sends endpoints to the configured backend origin', () => {
  assert.equal(
    buildApiUrl('/admin/rag/documents', { VITE_API_BASE: 'https://daily-fezzed-larisa.ngrok-free.dev/' }),
    'https://daily-fezzed-larisa.ngrok-free.dev/admin/rag/documents',
  );
});
