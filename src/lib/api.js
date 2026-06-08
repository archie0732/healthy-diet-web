const normalizePath = (path) => {
  if (typeof path !== 'string' || !path.trim()) return '/';
  return path.startsWith('/') ? path : `/${path}`;
};

export const API_PROXY_BASE = '/backend';

export const buildApiUrl = (path) => `${API_PROXY_BASE}${normalizePath(path)}`;
