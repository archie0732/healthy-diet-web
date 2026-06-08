import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, Newspaper, RefreshCw, Shield, Sparkles } from 'lucide-react';
import { isAdminRole } from '@/lib/authSession';

const PAGE_SIZE = 10;

const clampPage = (value) => {
  const parsed = Number.parseInt(value || '1', 10);
  if (Number.isNaN(parsed) || parsed < 1) return 1;
  return parsed;
};

const formatDate = (value) => {
  if (!value) return '日期未提供';
  return value;
};

const NewsListView = ({ apiFetch, role }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = clampPage(searchParams.get('page'));

  const [data, setData] = useState({
    items: [],
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadNonce, setReloadNonce] = useState(0);

  const showAdminTools = useMemo(() => isAdminRole(role), [role]);

  useEffect(() => {
    let cancelled = false;

    const fetchNews = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await apiFetch(`/api/news?page=${page}&pageSize=${PAGE_SIZE}`);
        if (cancelled) return;

        setData({
          items: Array.isArray(response?.items) ? response.items : [],
          page: Number(response?.page) || page,
          pageSize: Number(response?.pageSize) || PAGE_SIZE,
          total: Number(response?.total) || 0,
          totalPages: Math.max(1, Number(response?.totalPages) || 1),
        });
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || '無法載入新聞列表');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchNews();
    return () => {
      cancelled = true;
    };
  }, [apiFetch, page, reloadNonce]);

  const changePage = (nextPage) => {
    setSearchParams((current) => {
      const params = new URLSearchParams(current);
      if (nextPage <= 1) params.delete('page');
      else params.set('page', String(nextPage));
      return params;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-linear-to-br from-slate-900 via-slate-800 to-emerald-900 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.24em] text-emerald-200">
              <Newspaper size={14} />
              FDA News Feed
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">衛教新聞</h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-200 sm:text-base">
                這裡直接串接 Rust 後端的 `/news` 系列路由，提供最新同步的新聞列表與文章詳情。
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setReloadNonce((value) => value + 1)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15"
            >
              <RefreshCw size={16} />
              重新整理
            </button>
            <Link
              to="/knowledge-search"
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300"
            >
              <Sparkles size={16} />
              前往知識搜尋
            </Link>
            {showAdminTools ? (
              <Link
                to="/admin/news-tools"
                className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/40 bg-amber-300/15 px-4 py-3 text-sm font-bold text-amber-100 transition hover:bg-amber-300/20"
              >
                <Shield size={16} />
                管理工具
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">News List</p>
            <h2 className="text-2xl font-black text-slate-900">最新文章</h2>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            第 <span className="font-black text-slate-900">{data.page}</span> 頁，共{' '}
            <span className="font-black text-slate-900">{data.totalPages}</span> 頁，總計{' '}
            <span className="font-black text-slate-900">{data.total}</span> 篇
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-5 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`news-skeleton-${index}`} className="animate-pulse rounded-3xl border border-slate-200 p-5">
                <div className="mb-3 h-4 w-28 rounded-full bg-slate-200" />
                <div className="mb-2 h-6 w-3/4 rounded-full bg-slate-200" />
                <div className="h-4 w-1/3 rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        ) : null}

        {!loading && !error && data.items.length === 0 ? (
          <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
            <p className="text-lg font-black text-slate-700">目前沒有新聞資料</p>
            <p className="mt-2 text-sm text-slate-500">如果你是管理者，可以先到 News 工具頁手動觸發同步。</p>
          </div>
        ) : null}

        {!loading && !error && data.items.length > 0 ? (
          <div className="mt-5 space-y-3">
            {data.items.map((item) => (
              <Link
                key={item.id}
                to={`/news/${item.id}`}
                className="group block rounded-[28px] border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50/40"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      <CalendarDays size={13} />
                      {formatDate(item.publishedDate)}
                    </div>
                    <h3 className="text-xl font-black tracking-tight text-slate-900">{item.title || '未命名文章'}</h3>
                    <p className="text-sm font-medium text-slate-500">文章 ID: {item.id}</p>
                  </div>
                  <div className="inline-flex items-center gap-2 self-start rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition group-hover:bg-emerald-600">
                    閱讀全文
                    <ArrowRight size={16} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : null}

        {!loading && !error && data.totalPages > 1 ? (
          <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              每頁 {data.pageSize} 筆，現在顯示第 {data.page} / {data.totalPages} 頁
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => changePage(page - 1)}
                disabled={page <= 1}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
              >
                上一頁
              </button>
              <button
                type="button"
                onClick={() => changePage(page + 1)}
                disabled={page >= data.totalPages}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                下一頁
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default NewsListView;
