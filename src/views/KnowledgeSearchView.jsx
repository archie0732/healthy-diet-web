import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Database, Filter, RefreshCw, Search, Sparkles } from 'lucide-react';

const SOURCE_OPTIONS = [
  { value: 'nutrition_rules', label: 'nutrition_rules' },
  { value: 'mohw_news', label: 'mohw_news' },
  { value: 'uploaded_knowledge', label: 'uploaded_knowledge' },
];

const DEFAULT_SOURCE_TYPES = ['mohw_news', 'uploaded_knowledge'];

const clampTopK = (value) => {
  const parsed = Number.parseInt(String(value || '5'), 10);
  if (Number.isNaN(parsed)) return 5;
  return Math.max(1, Math.min(12, parsed));
};

const sourceTypeTone = (value) => {
  if (value === 'mohw_news') return 'bg-emerald-100 text-emerald-700';
  if (value === 'uploaded_knowledge') return 'bg-blue-100 text-blue-700';
  if (value === 'nutrition_rules') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
};

const KnowledgeSearchView = ({ apiFetch }) => {
  const [mode, setMode] = useState('filtered');
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(5);
  const [forceRefresh, setForceRefresh] = useState(false);
  const [sourceTypes, setSourceTypes] = useState(DEFAULT_SOURCE_TYPES);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const debounceRef = useRef(null);
  const latestRequestKeyRef = useRef('');

  const activeRouteLabel = useMemo(
    () => (mode === 'quick' ? 'GET /rag/search' : 'POST /rag/search'),
    [mode],
  );

  const runSearch = useCallback(async (rawQuery) => {
    const nextQuery = rawQuery.trim();
    if (!nextQuery) {
      setResult(null);
      setError('');
      setFormError('');
      return;
    }

    const nextTopK = clampTopK(topK);
    const requestKey = JSON.stringify({
      mode,
      query: nextQuery,
      topK: nextTopK,
      forceRefresh,
      sourceTypes: mode === 'filtered' ? sourceTypes : [],
    });

    latestRequestKeyRef.current = requestKey;
    setLoading(true);
    setError('');
    setFormError('');

    try {
      const response =
        mode === 'quick'
          ? await apiFetch(
              `/rag/search?query=${encodeURIComponent(nextQuery)}&top_k=${nextTopK}&force_refresh=${forceRefresh}`,
            )
          : await apiFetch('/rag/search', {
              method: 'POST',
              body: JSON.stringify({
                query: nextQuery,
                top_k: nextTopK,
                source_types: sourceTypes,
                force_refresh: forceRefresh,
              }),
            });

      if (latestRequestKeyRef.current !== requestKey) return;

      if (response?.ok === false && response?.error === 'invalid_payload') {
        setFormError('查詢條件格式不正確，請檢查查詢字串與來源篩選。');
        setResult(null);
        return;
      }

      setResult({
        query: response?.query || nextQuery,
        total_hits: Number(response?.total_hits) || 0,
        hits: Array.isArray(response?.hits) ? response.hits : [],
      });
    } catch (err) {
      if (latestRequestKeyRef.current !== requestKey) return;
      if (err?.message === 'invalid_payload') {
        setFormError('查詢條件格式不正確，請檢查查詢字串與來源篩選。');
      } else {
        setError(err?.message || '知識搜尋失敗');
      }
      setResult(null);
    } finally {
      if (latestRequestKeyRef.current === requestKey) {
        setLoading(false);
      }
    }
  }, [apiFetch, forceRefresh, mode, sourceTypes, topK]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(query);
    }, 450);

    return () => clearTimeout(debounceRef.current);
  }, [query, runSearch]);

  const toggleSourceType = (value) => {
    setSourceTypes((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearTimeout(debounceRef.current);
    await runSearch(query);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-linear-to-br from-[#0f172a] via-[#10253f] to-[#0d5a52] p-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.24em] text-emerald-200">
              <Database size={14} />
              RAG Search
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">知識搜尋</h1>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-200 sm:text-base">
                頁面會依模式切換到 `GET /rag/search` 或 `POST /rag/search`，並支援 debounce、來源篩選、空狀態與錯誤提示。
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">Active Route</p>
            <p className="mt-2 text-lg font-black text-white">{activeRouteLabel}</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-500">Search Console</p>
            <h2 className="text-2xl font-black text-slate-900">查詢條件</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('quick')}
              className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
                mode === 'quick'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              簡易搜尋
            </button>
            <button
              type="button"
              onClick={() => setMode('filtered')}
              className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
                mode === 'filtered'
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              篩選搜尋
            </button>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-600">查詢字串</span>
            <textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="輸入想查找的衛教、法規或上傳知識內容"
              rows={5}
              className="w-full rounded-3xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-600">top_k</span>
            <input
              type="number"
              min="1"
              max="12"
              value={topK}
              onChange={(event) => setTopK(clampTopK(event.target.value))}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-400"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={forceRefresh}
              onChange={(event) => setForceRefresh(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            force_refresh
          </label>

          {mode === 'filtered' ? (
            <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-black text-slate-800">
                <Filter size={16} />
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
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
              簡易搜尋模式只會送出 query、top_k 與 force_refresh，不帶 `source_types`。
            </div>
          )}

          {formError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
              {formError}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
            {loading ? '查詢中...' : '立即搜尋'}
          </button>
        </form>

        <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">Results</p>
              <h2 className="text-2xl font-black text-slate-900">搜尋結果</h2>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {result ? (
                <>
                  查詢 <span className="font-black text-slate-900">{result.query}</span>，共{' '}
                  <span className="font-black text-slate-900">{result.total_hits}</span> 筆
                </>
              ) : (
                '輸入查詢後會自動 debounce 搜尋'
              )}
            </div>
          </div>

          {loading ? (
            <div className="mt-5 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`rag-skeleton-${index}`} className="animate-pulse rounded-3xl border border-slate-200 p-5">
                  <div className="mb-3 h-5 w-32 rounded-full bg-slate-200" />
                  <div className="mb-2 h-7 w-2/3 rounded-full bg-slate-200" />
                  <div className="mb-2 h-4 w-full rounded-full bg-slate-200" />
                  <div className="h-4 w-5/6 rounded-full bg-slate-200" />
                </div>
              ))}
            </div>
          ) : null}

          {!loading && !error && !formError && query.trim() && result && result.hits.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <p className="text-lg font-black text-slate-700">沒有找到相關內容</p>
              <p className="mt-2 text-sm text-slate-500">可以調整查詢字詞、改用簡易模式，或放寬 `source_types` 篩選。</p>
            </div>
          ) : null}

          {!loading && !error && result?.hits?.length > 0 ? (
            <div className="mt-5 space-y-4">
              {result.hits.map((hit) => (
                <article
                  key={hit.id}
                  className="rounded-[28px] border border-slate-200 bg-white p-5 transition hover:border-emerald-300 hover:bg-emerald-50/30"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${sourceTypeTone(hit.source_type)}`}>
                      {hit.source_type || 'unknown'}
                    </span>
                    {hit.published_date ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        {hit.published_date}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      score: {hit.score}
                    </span>
                  </div>

                  <h3 className="text-xl font-black tracking-tight text-slate-900">{hit.title || '未命名內容'}</h3>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{hit.snippet || '沒有摘要內容'}</p>

                  <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
                    <p>ID: {hit.id}</p>
                    <p>來源路徑: {hit.source_path || '-'}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {!loading && !query.trim() ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700">
                <Sparkles size={28} />
              </div>
              <p className="mt-4 text-lg font-black text-slate-700">開始查詢知識庫</p>
              <p className="mt-2 text-sm text-slate-500">
                輸入問題後，系統會自動以 450ms debounce 呼叫對應的 RAG search route。
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
};

export default KnowledgeSearchView;
