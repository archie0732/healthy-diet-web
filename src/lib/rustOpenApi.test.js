import test from 'node:test';
import assert from 'node:assert/strict';

import { parseRustOpenApiYaml } from './rustOpenApi.js';

const sampleYaml = `openapi: 3.0.3
info:
  title: Healthy Diet API
  version: 1.0.0
  description: API specification synchronized with current Axum routes.
servers:
  - url: http://localhost:3000
    description: Local development
tags:
  - name: System
  - name: Knowledge
  - name: Admin
paths:
  /openapi.yml:
    get:
      tags: [System]
      summary: Get OpenAPI YAML document
      operationId: getOpenApiYaml
      responses:
        '200':
          description: OpenAPI specification in YAML format
          content:
            application/yaml:
              schema:
                type: string
  /news:
    get:
      tags: [Knowledge]
      summary: Get paginated local news list
      operationId: listNews
      parameters:
        - in: query
          name: page
          schema:
            type: integer
      responses:
        '200':
          description: News list response
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok:
                    type: boolean
                  items:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                        title:
                          type: string
  /admin/rag/documents/{document_id}/reindex:
    post:
      tags: [Admin]
      summary: Requeue a RAG document for indexing
      operationId: reindexRagDocument
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Updated document record
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                  status:
                    type: string
        '404':
          description: Document not found
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: string
`;

test('parseRustOpenApiYaml builds runtime docs metadata and endpoints from yaml text', () => {
  const parsed = parseRustOpenApiYaml(sampleYaml);

  assert.equal(parsed.meta.title, 'Healthy Diet API');
  assert.equal(parsed.meta.subtitle, 'Loaded from Rust /openapi.yml');
  assert.equal(parsed.meta.baseUrls[0].value, '/api');
  assert.equal(parsed.groups.length, 3);

  const newsEndpoint = parsed.endpoints.find((endpoint) => endpoint.path === '/news');
  assert.ok(newsEndpoint);
  assert.equal(newsEndpoint.method, 'GET');
  assert.equal(newsEndpoint.auth, false);
  assert.match(newsEndpoint.req, /Query Parameters/);
  assert.deepEqual(newsEndpoint.resSuccess, {
    ok: true,
    items: [
      {
        id: 'string',
        title: 'string',
      },
    ],
  });

  const reindexEndpoint = parsed.endpoints.find(
    (endpoint) => endpoint.path === '/admin/rag/documents/{document_id}/reindex',
  );
  assert.ok(reindexEndpoint);
  assert.equal(reindexEndpoint.auth, true);
  assert.deepEqual(reindexEndpoint.resError, { error: 'string' });
  assert.equal(parsed.capabilities.ragDocuments.reindex, true);
});

test('parseRustOpenApiYaml disables missing RAG document capabilities when paths are absent', () => {
  const parsed = parseRustOpenApiYaml(sampleYaml);

  assert.equal(parsed.capabilities.ragDocuments.remove, false);
  assert.equal(parsed.capabilities.ragDocuments.preview, false);
});
