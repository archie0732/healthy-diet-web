/* global process */

import { Buffer } from 'node:buffer';
import { Readable } from 'node:stream';

import {
  buildProxyTargetUrl,
  getProxyBaseUrl,
  getResponseHeaderEntries,
  shouldStreamResponse,
} from '../proxy.js';

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

  const pathSegments = Array.isArray(req.query?.path)
    ? req.query.path
    : typeof req.query?.path === 'string'
      ? [req.query.path]
      : [];
  const queryStringIndex = req.url.indexOf('?');
  const search = queryStringIndex >= 0 ? req.url.slice(queryStringIndex + 1) : '';
  const targetUrl = buildProxyTargetUrl(baseUrl, pathSegments, search);

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
