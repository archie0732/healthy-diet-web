import test from 'node:test';
import assert from 'node:assert/strict';

import { API_PROXY_BASE, buildApiUrl, resolveApiBase } from './api.js';

test('resolveApiBase trims trailing slashes from configured API base', () => {
  assert.equal(
    resolveApiBase({ VITE_API_BASE: 'https://daily-fezzed-larisa.ngrok-free.dev///' }),
    'https://daily-fezzed-larisa.ngrok-free.dev',
  );
});

test('resolveApiBase stays empty when API base is not configured', () => {
  assert.equal(resolveApiBase({}), '');
});

test('buildApiUrl keeps ordinary endpoints on the local proxy path', () => {
  assert.equal(
    buildApiUrl('/api/user/profile', { VITE_API_BASE: 'https://daily-fezzed-larisa.ngrok-free.dev' }),
    '/api/backend/api/user/profile',
  );
});

test('buildApiUrl keeps chat and admin endpoints on the local proxy path', () => {
  assert.equal(
    buildApiUrl('/admin/rag/documents', { VITE_API_BASE: 'https://daily-fezzed-larisa.ngrok-free.dev/' }),
    '/api/backend/admin/rag/documents',
  );
  assert.equal(
    buildApiUrl('api/chat', { VITE_API_BASE: 'https://daily-fezzed-larisa.ngrok-free.dev/' }),
    '/api/backend/api/chat',
  );
  assert.equal(API_PROXY_BASE, '/api/backend');
});
