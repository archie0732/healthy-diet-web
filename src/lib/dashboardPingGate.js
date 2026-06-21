let activeLocationKey = null;
let clearTimerId = null;

const normalizeLocationKey = (locationKey) => String(locationKey || 'default');

export const beginDashboardPingCycle = (locationKey) => {
  const normalizedKey = normalizeLocationKey(locationKey);

  if (clearTimerId !== null) {
    clearTimeout(clearTimerId);
    clearTimerId = null;
  }

  if (activeLocationKey === normalizedKey) {
    return false;
  }

  activeLocationKey = normalizedKey;
  return true;
};

export const endDashboardPingCycle = (locationKey) => {
  const normalizedKey = normalizeLocationKey(locationKey);

  clearTimerId = setTimeout(() => {
    if (activeLocationKey === normalizedKey) {
      activeLocationKey = null;
    }
    clearTimerId = null;
  }, 0);
};

export const resetDashboardPingGate = () => {
  if (clearTimerId !== null) {
    clearTimeout(clearTimerId);
    clearTimerId = null;
  }

  activeLocationKey = null;
};
