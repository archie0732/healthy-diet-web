const DEFAULT_MAX_NODES = 12;
const MIN_MAX_NODES = 1;
const MAX_MAX_NODES = 24;
const MIN_GRAPH_SCALE = 0.6;
const MAX_GRAPH_SCALE = 2.4;

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

export const normalizeKnowledgeGraphStatus = (payload = {}) => ({
  ready: Boolean(payload?.ready),
  summary: {
    document_count: Number(payload?.summary?.document_count) || 0,
    node_count: Number(payload?.summary?.node_count) || 0,
    edge_count: Number(payload?.summary?.edge_count) || 0,
    evidence_count: Number(payload?.summary?.evidence_count) || 0,
    generated_at: payload?.summary?.generated_at || '',
    source_counts: payload?.summary?.source_counts || {},
  },
});

export const buildKnowledgeGraphModeLabel = ({ mode, query }) => {
  if (mode === 'subgraph' && query) return `目前檢視：查詢子圖 - ${query}`;
  return '目前檢視：全量知識圖譜';
};

export const deriveFullGraphEdges = (nodes = [], limit = 80) => {
  const safeNodes = Array.isArray(nodes) ? nodes : [];
  const edges = [];

  for (let index = 0; index < safeNodes.length; index += 1) {
    const source = safeNodes[index];
    const sourceDocs = new Set(source?.document_ids || []);

    for (let nextIndex = index + 1; nextIndex < safeNodes.length; nextIndex += 1) {
      if (edges.length >= limit) return edges;

      const target = safeNodes[nextIndex];
      const shared = (target?.document_ids || []).some((documentId) => sourceDocs.has(documentId));
      if (!shared) continue;

      edges.push({
        id: `derived:${source.id}|co_document|${target.id}`,
        source: source.id,
        target: target.id,
        relation_type: 'co_document',
        derived: true,
      });
    }
  }

  return edges;
};

export const buildSvgGraphLayout = ({
  nodes = [],
  edges = [],
  width = 900,
  height = 520,
  padding = 40,
}) => {
  const safeNodes = Array.isArray(nodes) ? nodes : [];
  const safeEdges = Array.isArray(edges) ? edges : [];
  const usableWidth = Math.max(width - padding * 2, 100);
  const usableHeight = Math.max(height - padding * 2, 100);
  const columns = Math.max(1, Math.ceil(Math.sqrt(safeNodes.length || 1)));
  const rows = Math.max(1, Math.ceil((safeNodes.length || 1) / columns));
  const xGap = columns > 1 ? usableWidth / (columns - 1) : usableWidth / 2;
  const yGap = rows > 1 ? usableHeight / (rows - 1) : usableHeight / 2;

  const positionedNodes = safeNodes.map((node, index) => {
    const column = columns === 1 ? 0 : index % columns;
    const row = rows === 1 ? 0 : Math.floor(index / columns);
    const x = columns === 1 ? padding + usableWidth / 2 : padding + column * xGap;
    const y = rows === 1 ? padding + usableHeight / 2 : padding + row * yGap;

    return {
      ...node,
      x,
      y,
    };
  });

  const positionedMap = new Map(positionedNodes.map((node) => [node.id, node]));
  const positionedEdges = safeEdges
    .map((edge) => ({
      ...edge,
      sourceNode: positionedMap.get(edge.source),
      targetNode: positionedMap.get(edge.target),
    }))
    .filter((edge) => edge.sourceNode && edge.targetNode);

  return {
    width,
    height,
    nodes: positionedNodes,
    edges: positionedEdges,
  };
};

export const clampGraphScale = (scale) => Math.max(MIN_GRAPH_SCALE, Math.min(MAX_GRAPH_SCALE, scale));

export const zoomGraphViewport = ({
  scale,
  translateX,
  translateY,
  nextScale,
  focalX,
  focalY,
}) => {
  const safeNextScale = clampGraphScale(nextScale);
  const ratio = safeNextScale / scale;

  return {
    scale: safeNextScale,
    translateX: focalX - (focalX - translateX) * ratio,
    translateY: focalY - (focalY - translateY) * ratio,
  };
};
