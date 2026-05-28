const STORAGE_KEYS = {
  token: 'token',
  refreshToken: 'refreshToken',
  expiresIn: 'expiresIn',
  role: 'userRole',
};

const ADMIN_ROLES = new Set(['operator', 'super_admin']);

const toSafeString = (value) => (typeof value === 'string' ? value : '');

const toSafeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const isAdminRole = (role) => ADMIN_ROLES.has(toSafeString(role));

export const getStoredAuthSession = () => {
  const token = toSafeString(localStorage.getItem(STORAGE_KEYS.token));
  const refreshToken = toSafeString(localStorage.getItem(STORAGE_KEYS.refreshToken));
  const role = toSafeString(localStorage.getItem(STORAGE_KEYS.role));
  const expiresIn = toSafeNumber(localStorage.getItem(STORAGE_KEYS.expiresIn));

  return {
    token: token || null,
    refreshToken: refreshToken || null,
    expiresIn,
    role: role || null,
  };
};

export const persistAuthSession = (authPayload) => {
  const token = toSafeString(authPayload?.token);
  const refreshToken = toSafeString(authPayload?.refreshToken);
  const role = toSafeString(authPayload?.user?.role ?? authPayload?.role);
  const expiresIn = toSafeNumber(authPayload?.expiresIn);

  if (token) localStorage.setItem(STORAGE_KEYS.token, token);
  else localStorage.removeItem(STORAGE_KEYS.token);

  if (refreshToken) localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
  else localStorage.removeItem(STORAGE_KEYS.refreshToken);

  if (typeof expiresIn === 'number') localStorage.setItem(STORAGE_KEYS.expiresIn, String(expiresIn));
  else localStorage.removeItem(STORAGE_KEYS.expiresIn);

  if (role) localStorage.setItem(STORAGE_KEYS.role, role);
  else localStorage.removeItem(STORAGE_KEYS.role);

  return {
    token: token || null,
    refreshToken: refreshToken || null,
    expiresIn,
    role: role || null,
  };
};

export const clearAuthSession = () => {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
};

