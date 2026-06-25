/* global process */

import { Buffer } from 'node:buffer';
import { Readable } from 'node:stream';

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'content-encoding',
  'transfer-encoding',
]);

export const getProxyBaseUrl = (env = process.env) => {
  const candidates = [
    env?.VITE_API_BASE,
    env?.API_BASE,
    env?.TARGET_API_SERVER,
  ];

  const rawBase = candidates.find((value) => typeof value === 'string' && value.trim())?.trim() || '';

  return rawBase.replace(/\/+$/, '');
};

export const getRequestPathSegments = (query = {}) => {
  if (Array.isArray(query?.path)) return query.path;
  if (typeof query?.path === 'string') return query.path.split('/').filter(Boolean);
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

const readRequestBody = async (req) => {
  if (req.method === 'GET' || req.method === 'HEAD') return null;

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  return chunks.length > 0 ? Buffer.concat(chunks) : null;
};

const buildUpstreamHeaders = (req, body) => {
  const headers = new Headers();

  Object.entries(req.headers || {}).forEach(([name, value]) => {
    if (value == null) return;
    if (name.toLowerCase() === 'host') return;
    if (name.toLowerCase() === 'content-length' && !body) return;

    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(name, item));
      return;
    }

    headers.set(name, value);
  });

  headers.set('ngrok-skip-browser-warning', 'true');
  return headers;
};

const sendProxyError = (res, statusCode, message) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: message }));
};

export default async function handler(req, res) {
  const baseUrl = getProxyBaseUrl(process.env);
  if (!baseUrl) {
    return sendProxyError(res, 500, 'VITE_API_BASE is not configured.');
  }

  const pathSegments = getRequestPathSegments(req.query);
  const queryStringIndex = req.url.indexOf('?');
  const searchParams = new URLSearchParams(queryStringIndex >= 0 ? req.url.slice(queryStringIndex + 1) : '');
  searchParams.delete('path');
  const targetUrl = buildProxyTargetUrl(baseUrl, pathSegments, searchParams.toString());

  try {
    const body = await readRequestBody(req);
    const upstreamResponse = await fetch(targetUrl, {
      method: req.method,
      headers: buildUpstreamHeaders(req, body),
      body,
      redirect: 'manual',
    });

    res.statusCode = upstreamResponse.status;
    getResponseHeaderEntries(upstreamResponse.headers).forEach(([name, value]) => {
      res.setHeader(name, value);
    });

    if (!upstreamResponse.body) {
      res.end();
      return;
    }

    if (shouldStreamResponse(upstreamResponse.headers.get('content-type') || '')) {
      Readable.fromWeb(upstreamResponse.body).pipe(res);
      return;
    }

    const buffer = Buffer.from(await upstreamResponse.arrayBuffer());
    res.end(buffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown proxy error.';
    sendProxyError(res, 502, `Backend proxy failed: ${message}`);
  }
}
