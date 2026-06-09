import test from 'node:test';
import assert from 'node:assert/strict';

import { buildApiUrl, DEFAULT_DIRECT_API_BASE, resolveDirectApiBase, shouldUseDirectApi } from './api.js';

test('resolveDirectApiBase trims trailing slashes from configured direct API base', () => {
  assert.equal(
    resolveDirectApiBase({ VITE_DIRECT_API_BASE: 'https://daily-fezzed-larisa.ngrok-free.dev///' }),
    'https://daily-fezzed-larisa.ngrok-free.dev',
  );
});

test('resolveDirectApiBase falls back to the current deployed backend origin', () => {
  assert.equal(resolveDirectApiBase({}), DEFAULT_DIRECT_API_BASE);
});

test('buildApiUrl keeps ordinary endpoints on the Vercel proxy', () => {
  assert.equal(
    buildApiUrl('/api/user/profile', { VITE_DIRECT_API_BASE: 'https://daily-fezzed-larisa.ngrok-free.dev' }),
    '/backend/api/user/profile',
  );
});

test('shouldUseDirectApi enables direct origin only for the RAG document upload endpoint', () => {
  const env = { VITE_DIRECT_API_BASE: 'https://daily-fezzed-larisa.ngrok-free.dev' };

  assert.equal(shouldUseDirectApi('/admin/rag/documents', env), true);
  assert.equal(shouldUseDirectApi('/admin/rag/documents/doc-1/file', env), false);
  assert.equal(shouldUseDirectApi('/admin/announcements', env), false);
});

test('buildApiUrl sends RAG document upload requests directly to the backend origin', () => {
  assert.equal(
    buildApiUrl('/admin/rag/documents', { VITE_DIRECT_API_BASE: 'https://daily-fezzed-larisa.ngrok-free.dev/' }),
    'https://daily-fezzed-larisa.ngrok-free.dev/admin/rag/documents',
  );
});
