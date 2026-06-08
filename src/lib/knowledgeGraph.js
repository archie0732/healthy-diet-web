const DEFAULT_MAX_NODES = 12;
const MIN_MAX_NODES = 1;
const MAX_MAX_NODES = 24;

export const clampKnowledgeGraphMaxNodes = (value) => {
  const parsed = Number.parseInt(String(value || DEFAULT_MAX_NODES), 10);
  if (Number.isNaN(parsed)) return DEFAULT_MAX_NODES;
  return Math.max(MIN_MAX_NODES, Math.min(MAX_MAX_NODES, parsed));
};

export const encodeKnowledgeGraphParam = (value) => encodeURIComponent(String(value || ''));

export const buildKnowledgeGraphQueryPayload = ({
  query,
  maxNodes,
  sourceTypes,
  documentIdsText,
}) => {
  const trimmedQuery = String(query || '').trim();
  const documentIds = String(documentIdsText || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const payload = {
    query: trimmedQuery,
    max_nodes: clampKnowledgeGraphMaxNodes(maxNodes),
  };

  if (Array.isArray(sourceTypes) && sourceTypes.length > 0) {
    payload.source_types = sourceTypes;
  }

  if (documentIds.length > 0) {
    payload.document_ids = documentIds;
  }

  return payload;
};
