/* global process */

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'content-encoding',
  'transfer-encoding',
]);

export const getProxyBaseUrl = (env = process.env) => {
  const rawBase = typeof env?.VITE_API_BASE === 'string'
    ? env.VITE_API_BASE.trim()
    : typeof env?.API_BASE === 'string'
      ? env.API_BASE.trim()
      : '';

  return rawBase.replace(/\/+$/, '');
};

export const getRequestPathSegments = (query = {}) => {
  if (Array.isArray(query?.path)) return query.path;
  if (typeof query?.path === 'string') return [query.path];
  return [];
};

export const buildProxyTargetUrl = (baseUrl, pathSegments = [], search = '') => {
  const normalizedBase = typeof baseUrl === 'string' ? baseUrl.replace(/\/+$/, '') : '';
  const normalizedPath = Array.isArray(pathSegments) ? pathSegments.filter(Boolean).join('/') : '';
  const normalizedSearch = typeof search === 'string' && search.length > 0
    ? `?${search.replace(/^\?/, '')}`
    : '';

  return normalizedPath
    ? `${normalizedBase}/${normalizedPath}${normalizedSearch}`
    : `${normalizedBase}${normalizedSearch}`;
};

export const getResponseHeaderEntries = (headers) => {
  return Array.from(headers.entries())
    .filter(([name]) => !HOP_BY_HOP_HEADERS.has(name.toLowerCase()))
    .sort(([left], [right]) => left.localeCompare(right));
};

export const shouldStreamResponse = (contentType) => {
  return typeof contentType === 'string' && contentType.toLowerCase().includes('text/event-stream');
};
