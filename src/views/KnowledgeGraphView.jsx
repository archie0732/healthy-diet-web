import React, { useMemo, useState } from 'react';
import { ArrowRight, FileText, GitBranch, LoaderCircle, Network, Search, ShieldAlert, Sparkles } from 'lucide-react';

import {
  buildKnowledgeGraphQueryPayload,
  clampKnowledgeGraphMaxNodes,
  encodeKnowledgeGraphParam,
} from '@/lib/knowledgeGraph';

const SOURCE_OPTIONS = [
  { value: 'uploaded_knowledge', label: 'uploaded_knowledge' },
  { value: 'mohw_news', label: 'mohw_news' },
  { value: 'nutrition_rules', label: 'nutrition_rules' },
];

const DEFAULT_SOURCE_TYPES = ['uploaded_knowledge', 'mohw_news'];

const sourceTypeTone = (value) => {
  if (value === 'uploaded_knowledge') return 'bg-blue-100 text-blue-700';
  if (value === 'mohw_news') return 'bg-emerald-100 text-emerald-700';
  if (value === 'nutrition_rules') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
};

const formatList = (items = [], empty = 'None') => {
  if (!Array.isArray(items) || items.length === 0) return empty;
  return items.join(', ');
};

const extractErrorMessage = (error) => error?.message || 'Request failed.';

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

const MiniGraph = ({ nodes, edges, onSelectNode, onSelectEdge, selectedItem }) => {
  if (!nodes.length) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700">
          <Network size={26} />
        </div>
        <p className="mt-4 text-lg font-black text-slate-700">圖譜視覺區已預留</p>
        <p className="mt-2 text-sm text-slate-500">送出查詢後，這裡會用輕量方式把節點和關係先整理成簡易圖譜摘要。</p>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-slate-200 bg-linear-to-br from-slate-950 via-slate-900 to-emerald-950 p-5 text-white shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200">Lightweight Graph</p>
          <h2 className="mt-2 text-2xl font-black">節點關係預覽</h2>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold text-slate-200">
          {nodes.length} nodes / {edges.length} edges
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap gap-3">
            {nodes.map((node) => {
              const active = selectedItem?.type === 'node' && selectedItem.id === node.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => onSelectNode(node)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    active
                      ? 'border-emerald-300 bg-emerald-400/20 text-white'
                      : 'border-white/10 bg-white/10 text-slate-100 hover:border-emerald-300/50 hover:bg-white/15'
                  }`}
                >
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">{node.node_type || 'node'}</p>
                  <p className="mt-2 text-sm font-bold">{node.label || node.id}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
          {edges.slice(0, 6).map((edge) => {
            const active = selectedItem?.type === 'relation' && selectedItem.id === edge.id;
            return (
              <button
                key={edge.id}
                type="button"
                onClick={() => onSelectEdge(edge)}
                className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                  active
                    ? 'border-sky-300 bg-sky-400/20 text-white'
                    : 'border-white/10 bg-white/10 text-slate-100 hover:border-sky-300/50 hover:bg-white/15'
                }`}
              >
                <div className="rounded-xl bg-white/10 p-2 text-emerald-200">
                  <GitBranch size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black">{edge.relation_type || 'relation'}</p>
                  <p className="truncate text-xs text-slate-300">
                    {edge.source} <ArrowRight size={12} className="mx-1 inline" /> {edge.target}
                  </p>
                </div>
              </button>
            );
          })}
          {edges.length > 6 ? (
            <p className="text-xs font-semibold text-slate-300">其餘 {edges.length - 6} 條關係可在下方清單查看。</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const KnowledgeGraphView = ({ apiFetch }) => {
  const [query, setQuery] = useState('');
  const [maxNodes, setMaxNodes] = useState(12);
  const [sourceTypes, setSourceTypes] = useState(DEFAULT_SOURCE_TYPES);
  const [documentIdsText, setDocumentIdsText] = useState('');
  const [graphResult, setGraphResult] = useState(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState('');

  const [selectedItem, setSelectedItem] = useState(null);
  const [nodeDetail, setNodeDetail] = useState(null);
  const [nodeLoading, setNodeLoading] = useState(false);
  const [nodeError, setNodeError] = useState('');
  const [relationDetail, setRelationDetail] = useState(null);
  const [relationLoading, setRelationLoading] = useState(false);
  const [relationError, setRelationError] = useState('');

  const nodes = graphResult?.nodes || [];
  const edges = graphResult?.edges || [];
  const evidence = graphResult?.evidence || [];
  const documents = graphResult?.documents || [];

  const selectionSummary = useMemo(() => {
    if (!selectedItem) return '點選節點或關係後，右側會顯示延伸細節。';
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

  const handleSearch = async (event) => {
    event.preventDefault();

    const payload = buildKnowledgeGraphQueryPayload({
      query,
      maxNodes,
      sourceTypes,
      documentIdsText,
    });

    if (!payload.query) {
      setQueryError('請先輸入查詢內容。');
      setGraphResult(null);
      resetDetail();
      return;
    }

    setQueryLoading(true);
    setQueryError('');
    resetDetail();

    try {
      const response = await apiFetch('/knowledge-graph/query', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setGraphResult({
        query: response?.query || payload.query,
        nodes: Array.isArray(response?.nodes) ? response.nodes : [],
        edges: Array.isArray(response?.edges) ? response.edges : [],
        evidence: Array.isArray(response?.evidence) ? response.evidence : [],
        documents: Array.isArray(response?.documents) ? response.documents : [],
      });
    } catch (error) {
      setGraphResult(null);
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
      const response = await apiFetch(`/knowledge-graph/nodes/${encodeKnowledgeGraphParam(node.id)}`);
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

    try {
      const response = await apiFetch(`/knowledge-graph/relations/${encodeKnowledgeGraphParam(edge.id)}/evidence`);
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
                透過 Rust gateway 查詢子圖、查看節點鄰居、追蹤關係證據，主畫面以清單工作台為主，並保留簡易圖譜視覺區。
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">Public Routes</p>
            <p className="mt-2 text-lg font-black text-white">/api/knowledge-graph/*</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)_360px]">
        <form onSubmit={handleSearch} className="space-y-4 rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-500">Query Console</p>
            <h2 className="text-2xl font-black text-slate-900">查詢條件</h2>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-600">query</span>
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

          <div className="grid grid-cols-2 gap-3">
            <button
              type="submit"
              disabled={queryLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {queryLoading ? <LoaderCircle size={16} className="animate-spin" /> : <Search size={16} />}
              {queryLoading ? '查詢中...' : '查詢子圖'}
            </button>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setMaxNodes(12);
                setSourceTypes(DEFAULT_SOURCE_TYPES);
                setDocumentIdsText('');
                setGraphResult(null);
                setQueryError('');
                resetDetail();
              }}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              清除條件
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <MiniGraph
            nodes={nodes}
            edges={edges}
            onSelectNode={handleSelectNode}
            onSelectEdge={handleSelectEdge}
            selectedItem={selectedItem}
          />

          {!graphResult && !queryLoading ? (
            <div className="rounded-[32px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700">
                <Search size={28} />
              </div>
              <p className="mt-4 text-lg font-black text-slate-700">先送出一筆知識圖譜查詢</p>
              <p className="mt-2 text-sm text-slate-500">結果會依序整理成節點、關係、證據與文件清單，方便繼續往下鑽。</p>
            </div>
          ) : null}

          {graphResult ? (
            <>
              <SectionCard title="節點" subtitle={`Query: ${graphResult.query}`} count={`${nodes.length} nodes`}>
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
                    這次查詢沒有回傳節點。
                  </p>
                )}
              </SectionCard>

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
          ) : null}
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
              <p className="mt-2 text-sm text-slate-500">點一下節點看 neighbors，或點一下關係看 evidence。</p>
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
