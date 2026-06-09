import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Database,
  FileText,
  GitBranch,
  LoaderCircle,
  Minus,
  Network,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

import {
  buildKnowledgeGraphModeLabel,
  buildKnowledgeGraphQueryPayload,
  buildSvgGraphLayout,
  clampGraphScale,
  clampKnowledgeGraphMaxNodes,
  deriveFullGraphEdges,
  encodeKnowledgeGraphParam,
  normalizeKnowledgeGraphStatus,
  zoomGraphViewport,
} from '@/lib/knowledgeGraph';
import { isAdminRole } from '@/lib/authSession';

const SOURCE_OPTIONS = [
  { value: 'uploaded_knowledge', label: 'uploaded_knowledge' },
  { value: 'mohw_news', label: 'mohw_news' },
  { value: 'nutrition_rules', label: 'nutrition_rules' },
];

const DEFAULT_SOURCE_TYPES = ['uploaded_knowledge', 'mohw_news'];
const SVG_WIDTH = 960;
const SVG_HEIGHT = 560;
const DEFAULT_VIEWPORT = { scale: 1, translateX: 0, translateY: 0 };

const sourceTypeTone = (value) => {
  if (value === 'uploaded_knowledge') return 'bg-blue-100 text-blue-700';
  if (value === 'mohw_news') return 'bg-emerald-100 text-emerald-700';
  if (value === 'nutrition_rules') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
};

const nodeTypeStyle = (value) => {
  if (value === 'food') return { fill: '#22c55e', stroke: '#14532d' };
  if (value === 'nutrient') return { fill: '#38bdf8', stroke: '#0f172a' };
  if (value === 'condition') return { fill: '#f59e0b', stroke: '#78350f' };
  if (value === 'document') return { fill: '#a78bfa', stroke: '#312e81' };
  return { fill: '#94a3b8', stroke: '#1e293b' };
};

const formatList = (items = [], empty = 'None') => {
  if (!Array.isArray(items) || items.length === 0) return empty;
  return items.join(', ');
};

const extractErrorMessage = (error) => error?.message || 'Request failed.';

const GraphStat = ({ label, value }) => (
  <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
    <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">{label}</p>
    <p className="mt-2 text-lg font-black text-white">{value}</p>
  </div>
);

const SectionCard = ({ title, subtitle, count, children }) => (
  <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-end justify-between gap-3 border-b border-slate-200 pb-4">
      <div>
        <p className="text-sm font-semibold text-slate-500">{subtitle}</p>
        <h2 className="text-2xl font-black text-slate-900">{title}</h2>
      </div>
      <div className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-600">
        {count}
      </div>
    </div>
    {children}
  </section>
);

const GraphCanvas = ({
  mode,
  modeLabel,
  summary,
  nodes,
  edges,
  loading,
  error,
  graphReady,
  activeQuery,
  onSelectNode,
  onSelectEdge,
  selectedItem,
  viewport,
  setViewport,
}) => {
  const svgRef = useRef(null);
  const dragStateRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const title = mode === 'subgraph' ? '查詢子圖' : '全量知識圖譜';
  const limitedNodes = nodes.slice(0, mode === 'subgraph' ? 18 : 24);
  const activeEdges = mode === 'subgraph' ? edges : deriveFullGraphEdges(limitedNodes);
  const layout = buildSvgGraphLayout({
    nodes: limitedNodes,
    edges: activeEdges,
    width: SVG_WIDTH,
    height: SVG_HEIGHT,
  });

  const handleZoomButton = (nextScale) => {
    setViewport((current) =>
      zoomGraphViewport({
        ...current,
        nextScale,
        focalX: SVG_WIDTH / 2,
        focalY: SVG_HEIGHT / 2,
      }),
    );
  };

  const handleWheel = (event) => {
    event.preventDefault();
    if (!svgRef.current) return;

    const bounds = svgRef.current.getBoundingClientRect();
    const focalX = ((event.clientX - bounds.left) / bounds.width) * SVG_WIDTH;
    const focalY = ((event.clientY - bounds.top) / bounds.height) * SVG_HEIGHT;
    const delta = event.deltaY > 0 ? -0.12 : 0.12;

    setViewport((current) =>
      zoomGraphViewport({
        ...current,
        nextScale: clampGraphScale(current.scale + delta),
        focalX,
        focalY,
      }),
    );
  };

  const handlePointerDown = (event) => {
    if (event.target.dataset.graphControl === 'true') return;
    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startTranslateX: viewport.translateX,
      startTranslateY: viewport.translateY,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event) => {
    if (!dragStateRef.current) return;
    const deltaX = ((event.clientX - dragStateRef.current.startX) / (svgRef.current?.clientWidth || SVG_WIDTH)) * SVG_WIDTH;
    const deltaY = ((event.clientY - dragStateRef.current.startY) / (svgRef.current?.clientHeight || SVG_HEIGHT)) * SVG_HEIGHT;

    setViewport((current) => ({
      ...current,
      translateX: dragStateRef.current.startTranslateX + deltaX,
      translateY: dragStateRef.current.startTranslateY + deltaY,
    }));
  };

  const stopDragging = () => {
    dragStateRef.current = null;
    setIsDragging(false);
  };

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">Graph Canvas</p>
          <h2 className="text-2xl font-black text-slate-900">{title}</h2>
          <p className="mt-2 text-sm font-semibold text-emerald-700">{modeLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-600">
            {graphReady ? 'ready=true' : 'ready=false'}
          </span>
          {activeQuery ? (
            <span className="rounded-full bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700">
              query: {activeQuery}
            </span>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
          <LoaderCircle size={28} className="mx-auto animate-spin text-emerald-600" />
          <p className="mt-4 text-lg font-black text-slate-700">圖譜讀取中</p>
          <p className="mt-2 text-sm text-slate-500">畫布已先顯示，正在等待知識圖譜資料。</p>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-6 py-12 text-center">
          <p className="text-lg font-black text-rose-700">圖譜載入失敗</p>
          <p className="mt-2 text-sm text-rose-600">{error}</p>
        </div>
      ) : null}

      {!loading && !error && !graphReady ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-900 text-white">
            <Database size={24} />
          </div>
          <p className="mt-4 text-lg font-black text-slate-700">目前全量圖譜尚未準備完成</p>
          <p className="mt-2 text-sm text-slate-500">側邊欄仍可保留條件，之後再回來查看全量圖譜。</p>
        </div>
      ) : null}

      {!loading && !error && graphReady ? (
        <div className="space-y-5">
          <div className="rounded-[28px] border border-slate-200 bg-linear-to-br from-slate-950 via-slate-900 to-emerald-950 p-5 text-white">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200">Visual Graph</p>
                <h3 className="mt-2 text-2xl font-black">{mode === 'subgraph' ? '聚焦子圖' : '全量節點總覽'}</h3>
                <p className="mt-2 text-sm text-slate-200">
                  {mode === 'subgraph'
                    ? '目前顯示依 query 生成的子圖，節點與關係都可直接點擊查看細節。'
                    : '目前顯示全量知識節點的 SVG 圖譜總覽，線條會先用共用文件來源做關聯提示。'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <GraphStat label="Nodes" value={summary.node_count || nodes.length} />
                <GraphStat label="Edges" value={summary.edge_count || edges.length} />
                <GraphStat label="Docs" value={summary.document_count || 0} />
                <GraphStat label="Evidence" value={summary.evidence_count || 0} />
              </div>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                data-graph-control="true"
                onClick={() => handleZoomButton(viewport.scale + 0.2)}
                className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-black text-white transition hover:bg-white/15"
              >
                <Plus size={16} />
              </button>
              <button
                type="button"
                data-graph-control="true"
                onClick={() => handleZoomButton(viewport.scale - 0.2)}
                className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-black text-white transition hover:bg-white/15"
              >
                <Minus size={16} />
              </button>
              <button
                type="button"
                data-graph-control="true"
                onClick={() => setViewport(DEFAULT_VIEWPORT)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-black text-white transition hover:bg-white/15"
              >
                <RefreshCw size={14} />
                重置
              </button>
              <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200">
                縮放 {viewport.scale.toFixed(2)}x
              </span>
            </div>

            <div
              className={`overflow-hidden rounded-[28px] border border-white/10 bg-white/5 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              onPointerMove={handlePointerMove}
              onPointerUp={stopDragging}
              onPointerLeave={stopDragging}
            >
              <svg
                ref={svgRef}
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                className="h-[560px] w-full touch-none"
                onWheel={handleWheel}
                onPointerDown={handlePointerDown}
              >
                <defs>
                  <linearGradient id="graph-bg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#14532d" />
                  </linearGradient>
                </defs>
                <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#graph-bg)" />

                <g transform={`translate(${viewport.translateX} ${viewport.translateY}) scale(${viewport.scale})`}>
                  {layout.edges.map((edge) => {
                    const isSelected = selectedItem?.type === 'relation' && selectedItem.id === edge.id;
                    const x1 = edge.sourceNode.x;
                    const y1 = edge.sourceNode.y;
                    const x2 = edge.targetNode.x;
                    const y2 = edge.targetNode.y;
                    const midX = (x1 + x2) / 2;
                    const midY = (y1 + y2) / 2;

                    return (
                      <g key={edge.id}>
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={isSelected ? '#7dd3fc' : edge.derived ? '#86efac' : '#cbd5e1'}
                          strokeWidth={isSelected ? 4 : 2}
                          opacity={0.9}
                          className="cursor-pointer"
                          onClick={() => onSelectEdge(edge)}
                        />
                        <text
                          x={midX}
                          y={midY - 8}
                          textAnchor="middle"
                          className="pointer-events-none fill-slate-200 text-[11px] font-bold"
                        >
                          {edge.relation_type}
                        </text>
                      </g>
                    );
                  })}

                  {layout.nodes.map((node) => {
                    const isSelected = selectedItem?.type === 'node' && selectedItem.id === node.id;
                    const colors = nodeTypeStyle(node.node_type);

                    return (
                      <g key={node.id} className="cursor-pointer" onClick={() => onSelectNode(node)}>
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={isSelected ? 22 : 18}
                          fill={colors.fill}
                          stroke={isSelected ? '#f8fafc' : colors.stroke}
                          strokeWidth={isSelected ? 4 : 2}
                        />
                        <text
                          x={node.x}
                          y={node.y - 30}
                          textAnchor="middle"
                          className="pointer-events-none fill-white text-[12px] font-bold"
                        >
                          {String(node.label || node.id).slice(0, 18)}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>

            <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-300">
              <span>顯示節點: {layout.nodes.length}</span>
              <span>顯示連線: {layout.edges.length}</span>
              <span>互動方式: 滾輪縮放、拖曳平移</span>
              {nodes.length > layout.nodes.length ? <span>其餘 {nodes.length - layout.nodes.length} 個節點已先收斂。</span> : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

const KnowledgeGraphView = ({ apiFetch, role }) => {
  const [query, setQuery] = useState('');
  const [maxNodes, setMaxNodes] = useState(12);
  const [sourceTypes, setSourceTypes] = useState(DEFAULT_SOURCE_TYPES);
  const [documentIdsText, setDocumentIdsText] = useState('');
  const [viewport, setViewport] = useState(DEFAULT_VIEWPORT);

  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState('');
  const [graphStatus, setGraphStatus] = useState(() => normalizeKnowledgeGraphStatus());
  const [graphPreparing, setGraphPreparing] = useState(false);

  const [fullGraphLoading, setFullGraphLoading] = useState(false);
  const [fullGraphError, setFullGraphError] = useState('');
  const [fullGraphNodes, setFullGraphNodes] = useState([]);

  const [graphMode, setGraphMode] = useState('full');
  const [activeQuery, setActiveQuery] = useState('');
  const [subgraphData, setSubgraphData] = useState(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState('');

  const [selectedItem, setSelectedItem] = useState(null);
  const [nodeDetail, setNodeDetail] = useState(null);
  const [nodeLoading, setNodeLoading] = useState(false);
  const [nodeError, setNodeError] = useState('');
  const [relationDetail, setRelationDetail] = useState(null);
  const [relationLoading, setRelationLoading] = useState(false);
  const [relationError, setRelationError] = useState('');

  useEffect(() => {
    const loadStatusAndNodes = async () => {
      const statusResponse = await apiFetch('/api/knowledge-graph/status');
      const normalizedStatus = normalizeKnowledgeGraphStatus(statusResponse);
      setGraphStatus(normalizedStatus);

      if (!normalizedStatus.ready) {
        setFullGraphNodes([]);
        return normalizedStatus;
      }

      setFullGraphLoading(true);
      try {
        const nodesResponse = await apiFetch('/api/knowledge-graph/nodes');
        setFullGraphNodes(Array.isArray(nodesResponse?.items) ? nodesResponse.items : []);
      } finally {
        setFullGraphLoading(false);
      }

      return normalizedStatus;
    };

    const loadInitialGraph = async () => {
      setStatusLoading(true);
      setStatusError('');
      setFullGraphError('');

      try {
        let normalizedStatus = await loadStatusAndNodes();

        if (!normalizedStatus.ready && isAdminRole(role)) {
          setGraphPreparing(true);
          try {
            await apiFetch('/api/graph/extract-all', {
              method: 'POST',
              body: JSON.stringify({ force: true }),
            });
            normalizedStatus = await loadStatusAndNodes();
          } finally {
            setGraphPreparing(false);
          }
        }
      } catch (error) {
        const message = extractErrorMessage(error);
        setStatusError(message);
        setFullGraphError(message);
      } finally {
        setStatusLoading(false);
      }
    };

    loadInitialGraph();
  }, [apiFetch, role]);

  const graphSummary = graphStatus.summary;
  const fullGraphData = useMemo(
    () => ({
      query: '',
      nodes: fullGraphNodes,
      edges: [],
      evidence: [],
      documents: [],
    }),
    [fullGraphNodes],
  );

  const activeGraphData = graphMode === 'subgraph' && subgraphData ? subgraphData : fullGraphData;
  const nodes = activeGraphData.nodes || [];
  const edges = activeGraphData.edges || [];
  const evidence = activeGraphData.evidence || [];
  const documents = activeGraphData.documents || [];
  const graphReady = graphStatus.ready;
  const graphLoading = statusLoading || graphPreparing || (graphReady && fullGraphLoading);
  const graphError = statusError || fullGraphError;
  const modeLabel = buildKnowledgeGraphModeLabel({ mode: graphMode, query: activeQuery });

  const selectionSummary = useMemo(() => {
    if (!selectedItem) return '點一下節點看 neighbors，或在子圖模式點關係看 evidence。';
    if (selectedItem.type === 'node') return `目前查看節點 ${selectedItem.id}`;
    return `目前查看關係 ${selectedItem.id}`;
  }, [selectedItem]);

  const toggleSourceType = (value) => {
    setSourceTypes((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const resetDetail = () => {
    setSelectedItem(null);
    setNodeDetail(null);
    setNodeError('');
    setRelationDetail(null);
    setRelationError('');
  };

  const resetViewport = () => setViewport(DEFAULT_VIEWPORT);

  const handleBackToFullGraph = () => {
    setGraphMode('full');
    setActiveQuery('');
    setQueryError('');
    resetDetail();
    resetViewport();
  };

  const handleSearch = async (event) => {
    event.preventDefault();

    const payload = buildKnowledgeGraphQueryPayload({
      query,
      maxNodes,
      sourceTypes,
      documentIdsText,
    });

    if (!payload.query) {
      setQueryError('請先輸入提示詞或查詢內容。');
      return;
    }

    setQueryLoading(true);
    setQueryError('');
    resetDetail();

    try {
      const response = await apiFetch('/api/knowledge-graph/query', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSubgraphData({
        query: response?.query || payload.query,
        nodes: Array.isArray(response?.nodes) ? response.nodes : [],
        edges: Array.isArray(response?.edges) ? response.edges : [],
        evidence: Array.isArray(response?.evidence) ? response.evidence : [],
        documents: Array.isArray(response?.documents) ? response.documents : [],
      });
      setGraphMode('subgraph');
      setActiveQuery(response?.query || payload.query);
      resetViewport();
    } catch (error) {
      setQueryError(extractErrorMessage(error));
    } finally {
      setQueryLoading(false);
    }
  };

  const handleSelectNode = async (node) => {
    setSelectedItem({ type: 'node', id: node.id });
    setNodeLoading(true);
    setNodeError('');
    setNodeDetail(null);
    setRelationDetail(null);
    setRelationError('');

    try {
      const response = await apiFetch(`/api/knowledge-graph/nodes/${encodeKnowledgeGraphParam(node.id)}`);
      setNodeDetail({
        node: response?.node || node,
        edges: Array.isArray(response?.edges) ? response.edges : [],
        neighbors: Array.isArray(response?.neighbors) ? response.neighbors : [],
        evidence: Array.isArray(response?.evidence) ? response.evidence : [],
      });
    } catch (error) {
      setNodeError(extractErrorMessage(error));
    } finally {
      setNodeLoading(false);
    }
  };

  const handleSelectEdge = async (edge) => {
    setSelectedItem({ type: 'relation', id: edge.id });
    setRelationLoading(true);
    setRelationError('');
    setRelationDetail(null);
    setNodeDetail(null);
    setNodeError('');

    if (edge.derived) {
      setRelationError('全量圖譜中的這條線是前端衍生關聯，沒有獨立 evidence 可查。');
      setRelationLoading(false);
      return;
    }

    try {
      const response = await apiFetch(`/api/knowledge-graph/relations/${encodeKnowledgeGraphParam(edge.id)}/evidence`);
      setRelationDetail({
        relation: response?.relation || edge,
        evidence: Array.isArray(response?.evidence) ? response.evidence : [],
      });
    } catch (error) {
      setRelationError(extractErrorMessage(error));
    } finally {
      setRelationLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-linear-to-br from-[#082f49] via-[#0f172a] to-[#14532d] p-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.24em] text-emerald-200">
              <Network size={14} />
              Knowledge Graph
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">知識圖譜工作台</h1>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-200 sm:text-base">
                頁面預設會先載入全量 RAG 知識圖譜總覽，之後可從側邊欄生成聚焦子圖，並持續保留節點與關係的細節鑽取。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <GraphStat label="Ready" value={graphReady ? 'true' : 'false'} />
            <GraphStat label="Nodes" value={graphSummary.node_count} />
            <GraphStat label="Edges" value={graphSummary.edge_count} />
            <GraphStat label="Docs" value={graphSummary.document_count} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)_360px]">
        <form onSubmit={handleSearch} className="space-y-4 rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-500">Graph Controls</p>
            <h2 className="text-2xl font-black text-slate-900">生成子圖</h2>
            <p className="mt-2 text-sm text-slate-500">預設中心區會顯示全量圖譜；你可以在這裡用提示詞與條件生成新的聚焦子圖。</p>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-600">query / prompt</span>
            <textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              rows={5}
              placeholder="例如：fiber、broccoli、omega 3"
              className="w-full rounded-3xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-600">max_nodes</span>
            <input
              type="number"
              min="1"
              max="24"
              value={maxNodes}
              onChange={(event) => setMaxNodes(clampKnowledgeGraphMaxNodes(event.target.value))}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-600">document_ids</span>
            <input
              type="text"
              value={documentIdsText}
              onChange={(event) => setDocumentIdsText(event.target.value)}
              placeholder="doc-upload-1, doc-upload-2"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-400"
            />
            <span className="mt-2 block text-xs text-slate-500">以逗號分隔，可留空。</span>
          </label>

          <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-slate-800">
              <Sparkles size={16} />
              source_types
            </div>
            <div className="space-y-2">
              {SOURCE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={sourceTypes.includes(option.value)}
                    onChange={() => toggleSourceType(option.value)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          {queryError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {queryError}
            </div>
          ) : null}

          <div className="grid gap-3">
            <button
              type="submit"
              disabled={queryLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {queryLoading ? <LoaderCircle size={16} className="animate-spin" /> : <Search size={16} />}
              {queryLoading ? '生成中...' : '生成新子圖'}
            </button>

            <button
              type="button"
              onClick={handleBackToFullGraph}
              disabled={graphMode === 'full'}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={16} />
              回到全量圖譜
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <GraphCanvas
            mode={graphMode}
            modeLabel={modeLabel}
            summary={graphSummary}
            nodes={nodes}
            edges={edges}
            loading={graphLoading}
            error={graphError}
            graphReady={graphReady}
            activeQuery={activeQuery}
            onSelectNode={handleSelectNode}
            onSelectEdge={handleSelectEdge}
            selectedItem={selectedItem}
            viewport={viewport}
            setViewport={setViewport}
          />

          {graphMode === 'subgraph' ? (
            <>
              <SectionCard title="關係" subtitle="Edges / Relations" count={`${edges.length} edges`}>
                {edges.length ? (
                  <div className="space-y-3">
                    {edges.map((edge) => (
                      <button
                        key={edge.id}
                        type="button"
                        onClick={() => handleSelectEdge(edge)}
                        className={`w-full rounded-[24px] border p-4 text-left transition ${
                          selectedItem?.type === 'relation' && selectedItem.id === edge.id
                            ? 'border-sky-300 bg-sky-50'
                            : 'border-slate-200 hover:border-sky-300 hover:bg-sky-50/30'
                        }`}
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                            {edge.relation_type || 'relation'}
                          </span>
                          {typeof edge.confidence === 'number' ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                              confidence: {edge.confidence}
                            </span>
                          ) : null}
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                            evidence: {(edge.evidence_ids || []).length}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-700">
                          {edge.source} <ArrowRight size={12} className="mx-1 inline" /> {edge.target}
                        </p>
                        <p className="mt-2 break-all text-xs text-slate-500">{edge.id}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    這次查詢沒有回傳關係。
                  </p>
                )}
              </SectionCard>

              <SectionCard title="證據" subtitle="Evidence" count={`${evidence.length} items`}>
                {evidence.length ? (
                  <div className="space-y-3">
                    {evidence.map((item) => (
                      <article key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-black ${sourceTypeTone(item.source_type)}`}>
                            {item.source_type || 'unknown'}
                          </span>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                            {item.document_title || item.document_id || 'document'}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.snippet || 'No snippet'}</p>
                        <p className="mt-3 break-all text-xs text-slate-500">edge_id: {item.edge_id || '-'}</p>
                        <p className="mt-1 break-all text-xs text-slate-500">source_path: {item.source_path || '-'}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    這次查詢沒有回傳證據。
                  </p>
                )}
              </SectionCard>

              <SectionCard title="文件" subtitle="Documents" count={`${documents.length} docs`}>
                {documents.length ? (
                  <div className="space-y-3">
                    {documents.map((document) => (
                      <article key={document.id} className="rounded-[24px] border border-slate-200 p-4">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-black ${sourceTypeTone(document.source_type)}`}>
                            {document.source_type || 'unknown'}
                          </span>
                          {document.extracted_at ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                              extracted: {document.extracted_at}
                            </span>
                          ) : null}
                        </div>
                        <h3 className="text-lg font-black text-slate-900">{document.title || document.id}</h3>
                        <p className="mt-1 break-all text-sm text-slate-500">{document.id}</p>
                        <p className="mt-3 break-all text-sm text-slate-700">source_path: {document.source_path || '-'}</p>
                        <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-3">
                          <div className="rounded-2xl bg-slate-50 px-3 py-2">nodes: {(document.node_ids || []).length}</div>
                          <div className="rounded-2xl bg-slate-50 px-3 py-2">edges: {(document.edge_ids || []).length}</div>
                          <div className="rounded-2xl bg-slate-50 px-3 py-2">evidence: {(document.evidence_ids || []).length}</div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    這次查詢沒有回傳文件摘要。
                  </p>
                )}
              </SectionCard>
            </>
          ) : (
            <SectionCard title="全量節點" subtitle="All Knowledge Points" count={`${nodes.length} nodes`}>
              {nodes.length ? (
                <div className="space-y-3">
                  {nodes.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => handleSelectNode(node)}
                      className={`w-full rounded-[24px] border p-4 text-left transition ${
                        selectedItem?.type === 'node' && selectedItem.id === node.id
                          ? 'border-emerald-300 bg-emerald-50'
                          : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                      }`}
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                          {node.node_type || 'node'}
                        </span>
                        {(node.source_types || []).map((sourceType) => (
                          <span key={`${node.id}-${sourceType}`} className={`rounded-full px-3 py-1 text-xs font-black ${sourceTypeTone(sourceType)}`}>
                            {sourceType}
                          </span>
                        ))}
                      </div>
                      <h3 className="text-lg font-black text-slate-900">{node.label || node.id}</h3>
                      <p className="mt-1 break-all text-sm text-slate-500">{node.id}</p>
                      <p className="mt-3 text-sm text-slate-700">aliases: {formatList(node.aliases)}</p>
                      <p className="mt-1 text-sm text-slate-700">document_ids: {formatList(node.document_ids)}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  全量圖譜目前沒有節點資料。
                </p>
              )}
            </SectionCard>
          )}
        </div>

        <aside className="space-y-4 rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-500">Detail Sidebar</p>
            <h2 className="text-2xl font-black text-slate-900">延伸細節</h2>
            <p className="mt-2 text-sm text-slate-500">{selectionSummary}</p>
          </div>

          {!selectedItem ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-900 text-white">
                <FileText size={24} />
              </div>
              <p className="mt-4 text-lg font-black text-slate-700">等待選取項目</p>
              <p className="mt-2 text-sm text-slate-500">點一下節點看 neighbors，或在子圖模式點關係看 evidence。</p>
            </div>
          ) : null}

          {selectedItem?.type === 'node' ? (
            <>
              {nodeLoading ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm font-semibold text-slate-600">
                  <LoaderCircle size={18} className="mx-auto mb-3 animate-spin" />
                  載入節點細節中...
                </div>
              ) : null}
              {nodeError ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-700">
                  {nodeError === 'admin_auth_required' ? (
                    <span className="inline-flex items-center gap-2">
                      <ShieldAlert size={16} />
                      admin_auth_required
                    </span>
                  ) : (
                    nodeError
                  )}
                </div>
              ) : null}
              {nodeDetail ? (
                <div className="space-y-4">
                  <div className="rounded-3xl border border-slate-200 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">{nodeDetail.node?.node_type || 'node'}</p>
                    <h3 className="mt-2 text-xl font-black text-slate-900">{nodeDetail.node?.label || nodeDetail.node?.id}</h3>
                    <p className="mt-1 break-all text-sm text-slate-500">{nodeDetail.node?.id}</p>
                    <p className="mt-3 text-sm text-slate-700">aliases: {formatList(nodeDetail.node?.aliases)}</p>
                    <p className="mt-1 text-sm text-slate-700">document_ids: {formatList(nodeDetail.node?.document_ids)}</p>
                  </div>

                  <div className="rounded-3xl border border-slate-200 p-4">
                    <h4 className="text-sm font-black uppercase tracking-[0.18em] text-slate-600">Neighbors</h4>
                    {(nodeDetail.neighbors || []).length ? (
                      <div className="mt-3 space-y-2">
                        {nodeDetail.neighbors.map((neighbor) => (
                          <button
                            key={neighbor.id}
                            type="button"
                            onClick={() => handleSelectNode(neighbor)}
                            className="w-full rounded-2xl bg-slate-50 px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-emerald-50"
                          >
                            {neighbor.label || neighbor.id}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">這個節點目前沒有鄰居資料。</p>
                    )}
                  </div>

                  <div className="rounded-3xl border border-slate-200 p-4">
                    <h4 className="text-sm font-black uppercase tracking-[0.18em] text-slate-600">Related Edges</h4>
                    {(nodeDetail.edges || []).length ? (
                      <div className="mt-3 space-y-2">
                        {nodeDetail.edges.map((edge) => (
                          <button
                            key={edge.id}
                            type="button"
                            onClick={() => handleSelectEdge(edge)}
                            className="w-full rounded-2xl bg-slate-50 px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-sky-50"
                          >
                            {edge.relation_type || 'relation'}: {edge.source} {'->'} {edge.target}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">這個節點目前沒有邊資料。</p>
                    )}
                  </div>

                  <div className="rounded-3xl border border-slate-200 p-4">
                    <h4 className="text-sm font-black uppercase tracking-[0.18em] text-slate-600">Evidence</h4>
                    {(nodeDetail.evidence || []).length ? (
                      <div className="mt-3 space-y-3">
                        {nodeDetail.evidence.map((item) => (
                          <article key={item.id} className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                            <p>{item.snippet || 'No snippet'}</p>
                            <p className="mt-2 text-xs text-slate-500">{item.document_title || item.document_id || '-'}</p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">這個節點目前沒有證據資料。</p>
                    )}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {selectedItem?.type === 'relation' ? (
            <>
              {relationLoading ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm font-semibold text-slate-600">
                  <LoaderCircle size={18} className="mx-auto mb-3 animate-spin" />
                  載入關係證據中...
                </div>
              ) : null}
              {relationError ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-700">
                  {relationError === 'admin_auth_required' ? (
                    <span className="inline-flex items-center gap-2">
                      <ShieldAlert size={16} />
                      admin_auth_required
                    </span>
                  ) : (
                    relationError
                  )}
                </div>
              ) : null}
              {relationDetail ? (
                <div className="space-y-4">
                  <div className="rounded-3xl border border-slate-200 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
                      {relationDetail.relation?.relation_type || 'relation'}
                    </p>
                    <h3 className="mt-2 break-all text-lg font-black text-slate-900">{relationDetail.relation?.id}</h3>
                    <p className="mt-3 text-sm text-slate-700">
                      {relationDetail.relation?.source} <ArrowRight size={12} className="mx-1 inline" /> {relationDetail.relation?.target}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      confidence: {typeof relationDetail.relation?.confidence === 'number' ? relationDetail.relation.confidence : '-'}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-slate-200 p-4">
                    <h4 className="text-sm font-black uppercase tracking-[0.18em] text-slate-600">Evidence</h4>
                    {(relationDetail.evidence || []).length ? (
                      <div className="mt-3 space-y-3">
                        {relationDetail.evidence.map((item) => (
                          <article key={item.id} className="rounded-2xl bg-slate-50 px-3 py-3">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className={`rounded-full px-3 py-1 text-xs font-black ${sourceTypeTone(item.source_type)}`}>
                                {item.source_type || 'unknown'}
                              </span>
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                                {item.document_title || item.document_id || 'document'}
                              </span>
                            </div>
                            <p className="text-sm leading-6 text-slate-700">{item.snippet || 'No snippet'}</p>
                            <p className="mt-2 break-all text-xs text-slate-500">{item.source_path || '-'}</p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">這條關係目前沒有證據資料。</p>
                    )}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
};

export default KnowledgeGraphView;
