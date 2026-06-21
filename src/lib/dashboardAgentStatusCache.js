const DASHBOARD_AGENT_STATUS_CACHE_PREFIX = 'dashboardAgentStatus';

const normalizeLoginNonce = (loginNonce) => String(loginNonce || 'default');

export const buildDashboardAgentStatusCacheKey = (loginNonce) =>
  `${DASHBOARD_AGENT_STATUS_CACHE_PREFIX}:${normalizeLoginNonce(loginNonce)}`;

export const readDashboardAgentStatusCache = (loginNonce, storage) => {
  const rawValue = storage?.getItem?.(buildDashboardAgentStatusCacheKey(loginNonce));
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue);
    const chatbotStatus = parsed?.chatbotStatus;
    const gemmaStatus = parsed?.gemmaStatus;

    if (!chatbotStatus || !gemmaStatus) return null;

    return {
      chatbotStatus,
      gemmaStatus,
    };
  } catch {
    return null;
  }
};

export const writeDashboardAgentStatusCache = (loginNonce, value, storage) => {
  if (!storage?.setItem) return;

  const payload = JSON.stringify({
    chatbotStatus: value?.chatbotStatus ?? null,
    gemmaStatus: value?.gemmaStatus ?? null,
  });

  storage.setItem(buildDashboardAgentStatusCacheKey(loginNonce), payload);
};
