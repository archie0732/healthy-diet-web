import test from 'node:test';
import assert from 'node:assert/strict';

import { buildApiUrl, resolveApiBase } from './api.js';

test('resolveApiBase trims trailing slashes from configured API base', () => {
  assert.equal(
    resolveApiBase({ VITE_API_BASE: 'https://daily-fezzed-larisa.ngrok-free.dev///' }),
    'https://daily-fezzed-larisa.ngrok-free.dev',
  );
});

test('resolveApiBase stays empty when API base is not configured', () => {
  assert.equal(resolveApiBase({}), '');
});

test('buildApiUrl preserves ordinary endpoint paths for Vercel rewrites', () => {
  assert.equal(
    buildApiUrl('/api/user/profile', { VITE_API_BASE: 'https://daily-fezzed-larisa.ngrok-free.dev' }),
    '/api/user/profile',
  );
});

test('buildApiUrl preserves chat, auth, and admin endpoint paths', () => {
  assert.equal(
    buildApiUrl('/admin/rag/documents', { VITE_API_BASE: 'https://daily-fezzed-larisa.ngrok-free.dev/' }),
    '/api/admin/rag/documents',
  );
  assert.equal(
    buildApiUrl('api/chat', { VITE_API_BASE: 'https://daily-fezzed-larisa.ngrok-free.dev/' }),
    '/api/chat',
  );
  assert.equal(
    buildApiUrl('/api/auth/login', { VITE_API_BASE: 'https://daily-fezzed-larisa.ngrok-free.dev/' }),
    '/api/auth/login',
  );
});
