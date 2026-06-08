import { useEffect, useState } from 'react';
import yaml from 'js-yaml';
import { buildApiUrl } from '@/lib/api';

export const OPENAPI_PROXY_PATH = buildApiUrl('/openapi.yml');

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const DEFAULT_RAG_CAPABILITIES = Object.freeze({
  list: false,
  upload: false,
  detail: false,
  remove: false,
  reindex: false,
  file: false,
  preview: false,
});

let cachedSpec = null;
let inFlightSpec = null;

const cloneValue = (value) => {
  if (value === null || value === undefined) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

const resolveRef = (schema, components, seenRefs = new Set()) => {
  if (!schema || typeof schema !== 'object' || !schema.$ref) return schema;

  const ref = schema.$ref;
  if (seenRefs.has(ref)) return {};

  const refName = ref.split('/').pop();
  const nextSchema = components?.schemas?.[refName];
  if (!nextSchema) return {};

  const nextSeenRefs = new Set(seenRefs);
  nextSeenRefs.add(ref);
  return resolveRef(nextSchema, components, nextSeenRefs);
};

const buildSchemaExample = (schema, components, seenRefs = new Set()) => {
  if (!schema || typeof schema !== 'object') return null;

  const resolvedSchema = resolveRef(schema, components, seenRefs);
  if (!resolvedSchema || typeof resolvedSchema !== 'object') return null;

  if (Object.prototype.hasOwnProperty.call(resolvedSchema, 'example')) {
    return cloneValue(resolvedSchema.example);
  }

  const examples = resolvedSchema.examples;
  if (examples && typeof examples === 'object') {
    const firstExample = Object.values(examples)[0];
    if (firstExample && typeof firstExample === 'object' && 'value' in firstExample) {
      return cloneValue(firstExample.value);
    }
  }

  if (Array.isArray(resolvedSchema.enum) && resolvedSchema.enum.length > 0) {
    return cloneValue(resolvedSchema.enum[0]);
  }

  if (Array.isArray(resolvedSchema.oneOf) && resolvedSchema.oneOf.length > 0) {
    return buildSchemaExample(resolvedSchema.oneOf[0], components, seenRefs);
  }

  if (Array.isArray(resolvedSchema.anyOf) && resolvedSchema.anyOf.length > 0) {
    return buildSchemaExample(resolvedSchema.anyOf[0], components, seenRefs);
  }

  if (Array.isArray(resolvedSchema.allOf) && resolvedSchema.allOf.length > 0) {
    return resolvedSchema.allOf.reduce((accumulator, item) => {
      const value = buildSchemaExample(item, components, seenRefs);
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return { ...accumulator, ...value };
      }
      return accumulator;
    }, {});
  }

  switch (resolvedSchema.type) {
    case 'boolean':
      return true;
    case 'integer':
    case 'number':
      return 0;
    case 'string':
      if (resolvedSchema.format === 'date-time') return '2026-01-01T00:00:00Z';
      if (resolvedSchema.format === 'date') return '2026-01-01';
      if (resolvedSchema.format === 'uuid') return '00000000-0000-4000-8000-000000000000';
      if (resolvedSchema.format === 'uri') return 'https://example.com';
      return 'string';
    case 'array':
      return [buildSchemaExample(resolvedSchema.items, components, seenRefs)];
    case 'object': {
      const properties = resolvedSchema.properties || {};
      const entries = Object.entries(properties).map(([key, value]) => [
        key,
        buildSchemaExample(value, components, seenRefs),
      ]);

      if (entries.length > 0) {
        return Object.fromEntries(entries);
      }

      if (resolvedSchema.additionalProperties) {
        return {
          key: buildSchemaExample(resolvedSchema.additionalProperties, components, seenRefs) ?? 'string',
        };
      }

      return {};
    }
    default:
      if (resolvedSchema.properties) {
        return Object.fromEntries(
          Object.entries(resolvedSchema.properties).map(([key, value]) => [
            key,
            buildSchemaExample(value, components, seenRefs),
          ]),
        );
      }
      return null;
  }
};

const buildQuerySummary = (parameters) => {
  if (!Array.isArray(parameters) || parameters.length === 0) return null;

  const relevantParameters = parameters.filter((parameter) => parameter?.in === 'query' || parameter?.in === 'path');
  if (relevantParameters.length === 0) return null;

  return [
    'Query Parameters',
    ...relevantParameters.map((parameter) => {
      const type = parameter?.schema?.type || 'string';
      const required = parameter?.required ? 'required' : 'optional';
      return `${parameter.name}: ${type} (${required})`;
    }),
  ].join('\n');
};

const buildMultipartSummary = (schema, components) => {
  const resolvedSchema = resolveRef(schema, components);
  const properties = resolvedSchema?.properties || {};

  return [
    'Content-Type: multipart/form-data',
    '',
    ...Object.entries(properties).map(([name, value]) => {
      const resolvedValue = resolveRef(value, components);
      const fieldType = resolvedValue?.format === 'binary' ? '<binary>' : resolvedValue?.type || 'string';
      return `${name}: ${fieldType}`;
    }),
  ].join('\n');
};

const getContentEntry = (content) => {
  if (!content || typeof content !== 'object') return null;
  const priority = ['application/json', 'multipart/form-data', 'text/plain', 'application/yaml'];
  for (const mediaType of priority) {
    if (content[mediaType]) return [mediaType, content[mediaType]];
  }
  const firstEntry = Object.entries(content)[0];
  return firstEntry || null;
};

const buildRequestPayload = (operation, pathItem, components) => {
  const parameters = [...(pathItem?.parameters || []), ...(operation?.parameters || [])];
  const requestBody = operation?.requestBody;

  if (requestBody?.content) {
    const [mediaType, mediaValue] = getContentEntry(requestBody.content) || [];
    const schema = mediaValue?.schema;

    if (mediaType === 'multipart/form-data') {
      return buildMultipartSummary(schema, components);
    }

    const example = buildSchemaExample(schema, components);
    if (example !== null) {
      return example;
    }

    if (mediaType) {
      return `Content-Type: ${mediaType}`;
    }
  }

  return buildQuerySummary(parameters);
};

const getResponseSchemaExample = (responses, predicate, components) => {
  const entries = Object.entries(responses || {});
  const matched = entries.find(([statusCode]) => predicate(statusCode));
  if (!matched) return null;

  const [, response] = matched;
  const [mediaType, mediaValue] = getContentEntry(response?.content) || [];
  const schema = mediaValue?.schema;
  if (!schema) {
    return response?.description || (mediaType ? `Content-Type: ${mediaType}` : null);
  }

  const example = buildSchemaExample(schema, components);
  return example ?? response?.description ?? null;
};

const buildCapabilities = (paths) => ({
  ragDocuments: {
    list: Boolean(paths['/admin/rag/documents']?.get),
    upload: Boolean(paths['/admin/rag/documents']?.post),
    detail: Boolean(paths['/admin/rag/documents/{document_id}']?.get),
    remove: Boolean(paths['/admin/rag/documents/{document_id}']?.delete),
    reindex: Boolean(paths['/admin/rag/documents/{document_id}/reindex']?.post),
    file: Boolean(paths['/admin/rag/documents/{document_id}/file']?.get),
    preview: Boolean(paths['/admin/rag/documents/{document_id}/preview']?.get),
  },
});

const buildNotes = (capabilities) => [
  '這頁會在執行時直接抓取 Rust 後端的 `/openapi.yml`，不再讀取前端 repo 內的本地快照。',
  capabilities.ragDocuments.reindex
    ? '目前 spec 已列出 RAG document reindex 路由，因此前端會顯示重新索引操作。'
    : '目前 spec 沒有列出 RAG document reindex 路由，因此前端會隱藏重新索引操作。',
  capabilities.ragDocuments.remove
    ? '目前 spec 已列出 RAG document delete 路由，因此前端會顯示刪除操作。'
    : '目前 spec 沒有列出 RAG document delete 路由，因此前端會隱藏刪除操作。',
];

const normalizeServerUrls = (servers) => [
  { label: 'Rust API', value: OPENAPI_PROXY_PATH.replace(/\/openapi\.yml$/, ''), tone: 'emerald' },
  ...(Array.isArray(servers)
    ? servers.map((server, index) => ({
        label: server?.description || `Server ${index + 1}`,
        value: server?.url || '',
        tone: index % 2 === 0 ? 'sky' : 'indigo',
      }))
    : []),
];

export const parseRustOpenApiYaml = (yamlText) => {
  const spec = yaml.load(yamlText);
  const components = spec?.components || {};
  const paths = spec?.paths || {};
  const capabilities = buildCapabilities(paths);

  const groupsMap = new Map();

  for (const [path, pathItem] of Object.entries(paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem?.[method];
      if (!operation) continue;

      const category = operation?.tags?.[0] || 'General';
      const endpoint = {
        key: operation?.operationId || `${method}:${path}`,
        category,
        method: method.toUpperCase(),
        path,
        summary: operation?.summary || `${method.toUpperCase()} ${path}`,
        desc: operation?.description || operation?.summary || '',
        auth: Array.isArray(operation?.security) ? operation.security.length > 0 : false,
        req: buildRequestPayload(operation, pathItem, components),
        resSuccess: getResponseSchemaExample(
          operation?.responses,
          (statusCode) => String(statusCode).startsWith('2'),
          components,
        ),
        resError: getResponseSchemaExample(
          operation?.responses,
          (statusCode) => /^[45]/.test(String(statusCode)),
          components,
        ),
      };

      if (!groupsMap.has(category)) {
        groupsMap.set(category, []);
      }
      groupsMap.get(category).push(endpoint);
    }
  }

  const groups = Array.from(groupsMap.entries()).map(([category, endpoints]) => ({
    category,
    endpoints,
  }));

  return {
    meta: {
      title: spec?.info?.title || 'Healthy Diet API',
      version: spec?.info?.version || '1.0.0',
      subtitle: 'Loaded from Rust /openapi.yml',
      description:
        spec?.info?.description ||
        'API specification synchronized with current Axum routes.',
      baseUrls: normalizeServerUrls(spec?.servers),
      notes: buildNotes(capabilities.ragDocuments ? capabilities : { ragDocuments: DEFAULT_RAG_CAPABILITIES }),
    },
    groups,
    endpoints: groups.flatMap((group) => group.endpoints),
    capabilities,
  };
};

export const clearRustOpenApiCache = () => {
  cachedSpec = null;
  inFlightSpec = null;
};

export const loadRustOpenApi = async (fetchImpl = fetch) => {
  if (cachedSpec) return cachedSpec;
  if (inFlightSpec) return inFlightSpec;

  inFlightSpec = fetchImpl(OPENAPI_PROXY_PATH, {
    headers: {
      Accept: 'application/yaml,text/yaml,text/plain,application/octet-stream;q=0.8,*/*;q=0.5',
    },
  })
    .then(async (response) => {
      const rawText = await response.text();
      if (!response.ok) {
        throw new Error(rawText?.trim() || `Failed to load OpenAPI spec: HTTP ${response.status}`);
      }
      const parsed = parseRustOpenApiYaml(rawText);
      cachedSpec = parsed;
      return parsed;
    })
    .finally(() => {
      inFlightSpec = null;
    });

  return inFlightSpec;
};

export const useRustOpenApi = () => {
  const [data, setData] = useState(cachedSpec);
  const [loading, setLoading] = useState(!cachedSpec);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    loadRustOpenApi()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError('');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load Rust OpenAPI spec.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
};
