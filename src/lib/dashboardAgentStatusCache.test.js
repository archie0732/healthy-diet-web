import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDashboardAgentStatusCacheKey,
  readDashboardAgentStatusCache,
  writeDashboardAgentStatusCache,
} from './dashboardAgentStatusCache.js';

const createStorage = () => {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
  };
};

test('buildDashboardAgentStatusCacheKey scopes cache by login nonce', () => {
  assert.equal(
    buildDashboardAgentStatusCacheKey('login-123'),
    'dashboardAgentStatus:login-123',
  );
});

test('writeDashboardAgentStatusCache persists both agent status blocks', () => {
  const storage = createStorage();

  writeDashboardAgentStatusCache('login-123', {
    chatbotStatus: { tone: 'online', label: '運行中', detail: '' },
    gemmaStatus: { tone: 'offline', label: '連線失敗', detail: 'HTTP 500' },
  }, storage);

  assert.deepEqual(readDashboardAgentStatusCache('login-123', storage), {
    chatbotStatus: { tone: 'online', label: '運行中', detail: '' },
    gemmaStatus: { tone: 'offline', label: '連線失敗', detail: 'HTTP 500' },
  });
});

test('readDashboardAgentStatusCache ignores malformed cache payloads', () => {
  const storage = createStorage();
  storage.setItem('dashboardAgentStatus:login-123', '{not-json');

  assert.equal(readDashboardAgentStatusCache('login-123', storage), null);
});
