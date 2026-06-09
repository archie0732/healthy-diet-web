const normalizePath = (path) => {
  if (typeof path !== 'string' || !path.trim()) return '/';
  return path.startsWith('/') ? path : `/${path}`;
};

export const API_BASE = '';

export const resolveApiBase = (env = import.meta.env) => {
  const base = typeof env?.VITE_API_BASE === 'string' ? env.VITE_API_BASE.trim() : '';
  return base.replace(/\/+$/, '');
};

export const buildApiUrl = (path, env = import.meta.env) => {
  const normalizedPath = normalizePath(path);
  const apiBase = resolveApiBase(env);
  return `${apiBase || API_BASE}${normalizedPath}`;
};
