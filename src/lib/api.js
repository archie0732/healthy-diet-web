const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');

const normalizePath = (path) => {
  if (typeof path !== 'string' || !path.trim()) return '/';
  return path.startsWith('/') ? path : `/${path}`;
};

export const RUST_API_ORIGIN = trimTrailingSlash(
  import.meta.env.VITE_RUST_API_ORIGIN || 'http://120.110.113.111:3000',
);

export const buildApiUrl = (path) => `${RUST_API_ORIGIN}${normalizePath(path)}`;
