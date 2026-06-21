import test from 'node:test';
import assert from 'node:assert/strict';

import {
  beginDashboardPingCycle,
  endDashboardPingCycle,
  resetDashboardPingGate,
} from './dashboardPingGate.js';

const waitForCleanup = () => new Promise((resolve) => setTimeout(resolve, 0));

test.beforeEach(() => {
  resetDashboardPingGate();
});

test.after(() => {
  resetDashboardPingGate();
});

test('prevents duplicate homepage ping during an immediate remount with the same location key', () => {
  assert.equal(beginDashboardPingCycle('home-key'), true);
  endDashboardPingCycle('home-key');

  assert.equal(beginDashboardPingCycle('home-key'), false);
});

test('allows homepage ping again after the previous mount cycle has fully ended', async () => {
  assert.equal(beginDashboardPingCycle('home-key'), true);
  endDashboardPingCycle('home-key');

  await waitForCleanup();

  assert.equal(beginDashboardPingCycle('home-key'), true);
});

test('treats a new location key as a fresh homepage visit', () => {
  assert.equal(beginDashboardPingCycle('home-key-1'), true);
  assert.equal(beginDashboardPingCycle('home-key-2'), true);
});
