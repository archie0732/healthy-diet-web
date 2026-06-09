const normalizePath = (path) => {
  if (typeof path !== 'string' || !path.trim()) return '/';
  return path.startsWith('/') ? path : `/${path}`;
};

export const API_PROXY_BASE = '/backend';
export const DIRECT_API_PATHS = ['/admin/rag/documents'];

export const resolveDirectApiBase = (env = import.meta.env) => {
  const base = typeof env?.VITE_DIRECT_API_BASE === 'string' ? env.VITE_DIRECT_API_BASE.trim() : '';
  return base.replace(/\/+$/, '');
};

export const shouldUseDirectApi = (path, env = import.meta.env) => {
  const normalizedPath = normalizePath(path);
  const directApiBase = resolveDirectApiBase(env);

  if (!directApiBase) return false;

  return DIRECT_API_PATHS.includes(normalizedPath);
};

export const buildApiUrl = (path, env = import.meta.env) => {
  const normalizedPath = normalizePath(path);
  const directApiBase = resolveDirectApiBase(env);

  if (shouldUseDirectApi(normalizedPath, env)) {
    return `${directApiBase}${normalizedPath}`;
  }

  return `${API_PROXY_BASE}${normalizedPath}`;
};
