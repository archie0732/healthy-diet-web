export const normalizePath = (path) => {
  if (typeof path !== 'string' || !path.trim()) return '/';
  return path.startsWith('/') ? path : `/${path}`;
};

export const resolveApiBase = (env = import.meta.env) => {
  const base = typeof env?.VITE_API_BASE === 'string' ? env.VITE_API_BASE.trim() : '';
  return base.replace(/\/+$/, '');
};

export const buildApiUrl = (path) => {
  const normalizedPath = normalizePath(path);

  if (normalizedPath.startsWith('/admin/')) {
    return `/api${normalizedPath}`;
  }

  return normalizedPath;
};
