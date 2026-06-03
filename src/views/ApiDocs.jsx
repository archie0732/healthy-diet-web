import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Code,
  Files,
  HeartPulse,
  KeyRound,
  Search,
  Server,
  Shield,
  Sparkles,
  TerminalSquare,
  Upload,
  UserCircle2,
  XCircle,
} from 'lucide-react';
import { useRustOpenApi } from '@/lib/rustOpenApi';

const methodTone = {
  GET: 'bg-blue-100 text-blue-700 border-blue-200',
  POST: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  PUT: 'bg-amber-100 text-amber-700 border-amber-200',
  PATCH: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  DELETE: 'bg-rose-100 text-rose-700 border-rose-200',
};

const serverTone = {
  emerald: 'text-emerald-400',
  sky: 'text-sky-400',
  indigo: 'text-indigo-400',
};

const categoryIcons = {
  System: TerminalSquare,
  Authentication: KeyRound,
  Users: UserCircle2,
  Nutrition: Sparkles,
  Diet: HeartPulse,
  Chat: Search,
  Knowledge: Files,
  Admin: Shield,
  General: Code,
};

const getMethodColor = (method) => methodTone[method] || 'bg-slate-100 text-slate-700 border-slate-200';

const ApiDocs = () => {
  const { data: openApi, loading, error } = useRustOpenApi();
  const endpoints = useMemo(() => openApi?.endpoints || [], [openApi]);
  const groups = useMemo(() => openApi?.groups || [], [openApi]);
  const meta = openApi?.meta;
  const ragCapabilities = openApi?.capabilities?.ragDocuments || {};

  const [activeEndpointKey, setActiveEndpointKey] = useState('');
  const [activeTab, setActiveTab] = useState('success');
  const detailsRef = useRef(null);

  const activeEndpoint = useMemo(() => {
    if (!endpoints.length) return null;
    return endpoints.find((endpoint) => endpoint.key === activeEndpointKey) || endpoints[0];
  }, [activeEndpointKey, endpoints]);

  const handleSelectEndpoint = (endpoint) => {
    setActiveEndpointKey(endpoint.key);
    setActiveTab(endpoint.req ? 'req' : 'success');

    if (window.innerWidth < 1024 && detailsRef.current) {
      setTimeout(() => {
        detailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  };

  if (loading && !meta) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-600 shadow-sm">
          正在從 Rust `/openapi.yml` 載入 API 文件...
        </div>
      </div>
    );
  }

  if (error && !meta) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 text-sm font-semibold text-rose-700 shadow-sm">
          無法載入 Rust `/openapi.yml`：{error}
        </div>
      </div>
    );
  }

  if (!activeEndpoint || !meta) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pb-20 sm:px-6">
      <section className="relative overflow-hidden rounded-[32px] border border-slate-800 bg-slate-950 p-6 text-white shadow-2xl sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.2),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(34,197,94,0.18),_transparent_30%)]" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-sky-200">
              <TerminalSquare size={14} />
              {meta.subtitle}
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
              Healthy Diet API <span className="text-sky-300">Reference</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-300 sm:text-base">
              {meta.description}
            </p>
          </div>

          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Base URLs</p>
            <div className="space-y-2 font-mono text-xs sm:text-sm">
              {meta.baseUrls.map((baseUrl) => (
                <div key={`${baseUrl.label}:${baseUrl.value}`} className="flex items-start gap-2 text-slate-300">
                  <Server size={14} className={`mt-0.5 shrink-0 ${serverTone[baseUrl.tone] || 'text-slate-400'}`} />
                  <span className="break-all">{`${baseUrl.label}: ${baseUrl.value}`}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_1.95fr]">
        <div className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
              <Code size={18} className="text-sky-600" />
              Endpoint Index
            </h2>

            <div className="space-y-5">
              {groups.map((group) => {
                const GroupIcon = categoryIcons[group.category] || Code;

                return (
                  <div key={group.category} className="space-y-2">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                      <GroupIcon size={18} />
                      {group.category}
                    </div>

                    <div className="space-y-1.5">
                      {group.endpoints.map((endpoint) => {
                        const selected =
                          activeEndpoint.path === endpoint.path && activeEndpoint.method === endpoint.method;

                        return (
                          <button
                            key={`${endpoint.method}-${endpoint.path}`}
                            type="button"
                            onClick={() => handleSelectEndpoint(endpoint)}
                            className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left text-sm transition ${
                              selected
                                ? 'border-sky-200 bg-sky-50 text-sky-950'
                                : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                          >
                            <span
                              className={`w-14 shrink-0 rounded-md border px-2 py-0.5 text-center text-[10px] font-black ${getMethodColor(endpoint.method)}`}
                            >
                              {endpoint.method}
                            </span>
                            <span className="truncate font-semibold">{endpoint.path}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-amber-950">
              <KeyRound size={18} />
              Spec Notes
            </h2>
            <div className="space-y-2 text-sm leading-6 text-amber-900">
              {meta.notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
              {error ? <p>最近一次重新載入失敗：{error}</p> : null}
            </div>
          </div>
        </div>

        <div ref={detailsRef} className="space-y-4 scroll-mt-24">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-lg border px-3 py-1 text-sm font-black ${getMethodColor(activeEndpoint.method)}`}>
                    {activeEndpoint.method}
                  </span>
                  <span className="break-all font-mono text-lg font-black text-slate-900 sm:text-2xl">
                    {activeEndpoint.path}
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-black text-slate-900">{activeEndpoint.summary}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{activeEndpoint.desc}</p>
              </div>

              <div className="flex flex-col gap-2 text-xs font-bold">
                {activeEndpoint.auth ? (
                  <span className="inline-flex w-fit items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-700">
                    <Shield size={14} />
                    Bearer token required
                  </span>
                ) : (
                  <span className="inline-flex w-fit items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700">
                    <Search size={14} />
                    Public route
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Request Type</p>
                <p className="mt-1 font-semibold text-slate-900">{activeEndpoint.req ? 'Body / Payload' : 'No body'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Category</p>
                <p className="mt-1 font-semibold text-slate-900">{activeEndpoint.category || '-'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Current Spec</p>
                <p className="mt-1 font-semibold text-slate-900">{meta.subtitle}</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border-4 border-slate-900 bg-slate-950 shadow-2xl">
            <div className="flex overflow-x-auto border-b border-slate-800 bg-slate-900/80">
              {activeEndpoint.req ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('req')}
                  className={`flex items-center gap-2 whitespace-nowrap px-5 py-4 text-xs font-black sm:text-sm ${
                    activeTab === 'req'
                      ? 'border-t-2 border-emerald-400 bg-slate-950 text-emerald-300'
                      : 'border-t-2 border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <Upload size={16} />
                  Request
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setActiveTab('success')}
                className={`flex items-center gap-2 whitespace-nowrap px-5 py-4 text-xs font-black sm:text-sm ${
                  activeTab === 'success'
                    ? 'border-t-2 border-sky-400 bg-slate-950 text-sky-300'
                    : 'border-t-2 border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <CheckCircle2 size={16} />
                Success
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('error')}
                className={`flex items-center gap-2 whitespace-nowrap px-5 py-4 text-xs font-black sm:text-sm ${
                  activeTab === 'error'
                    ? 'border-t-2 border-rose-400 bg-slate-950 text-rose-300'
                    : 'border-t-2 border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <XCircle size={16} />
                Error
              </button>
            </div>

            <div className="max-h-[52vh] overflow-auto p-4 sm:p-6">
              {activeTab === 'req' && activeEndpoint.req ? (
                <PayloadBlock tone="emerald">
                  {typeof activeEndpoint.req === 'string' ? activeEndpoint.req : JSON.stringify(activeEndpoint.req, null, 2)}
                </PayloadBlock>
              ) : null}

              {activeTab === 'success' ? (
                <PayloadBlock tone="sky">
                  {typeof activeEndpoint.resSuccess === 'string'
                    ? activeEndpoint.resSuccess
                    : JSON.stringify(activeEndpoint.resSuccess, null, 2)}
                </PayloadBlock>
              ) : null}

              {activeTab === 'error' ? (
                <PayloadBlock tone="rose">
                  {typeof activeEndpoint.resError === 'string'
                    ? activeEndpoint.resError
                    : JSON.stringify(activeEndpoint.resError, null, 2)}
                </PayloadBlock>
              ) : null}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-900">
              <Files size={18} className="text-slate-700" />
              RAG Capability Note
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              這個頁面會直接依照 Rust `/openapi.yml` 的能力旗標顯示內容。現在 `reindex` 能力為
              {' '}
              `{String(ragCapabilities.reindex)}`。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

const PayloadBlock = ({ children, tone }) => {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-300'
      : tone === 'rose'
        ? 'text-rose-300'
        : 'text-sky-300';

  return (
    <pre className={`whitespace-pre-wrap break-all font-mono text-xs leading-6 sm:text-sm ${toneClass}`}>
      <code>{children}</code>
    </pre>
  );
};

export default ApiDocs;
