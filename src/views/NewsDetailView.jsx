import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, ExternalLink, FileText, Newspaper } from 'lucide-react';

const NOT_FOUND_ERRORS = new Set(['news_not_found', 'news_file_not_found']);

const markdownClassName =
  'prose prose-slate max-w-none prose-headings:font-extrabold prose-headings:tracking-tight prose-p:text-slate-700 prose-li:text-slate-700 prose-a:text-blue-600 prose-strong:text-slate-900 prose-code:rounded-md prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-pre:rounded-2xl prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-table:w-full prose-table:border-collapse prose-th:border prose-th:border-slate-300 prose-th:bg-slate-100 prose-th:p-3 prose-td:border prose-td:border-slate-300 prose-td:p-3';

const NewsDetailView = ({ apiFetch }) => {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const fetchDetail = async () => {
      setLoading(true);
      setNotFound(false);
      setError('');

      try {
        const response = await apiFetch(`/api/news/${id}`);
        if (cancelled) return;

        if (response?.ok === false && NOT_FOUND_ERRORS.has(response?.error)) {
          setNotFound(true);
          setItem(null);
          return;
        }

        setItem(response?.item || null);
      } catch (err) {
        if (cancelled) return;

        if (NOT_FOUND_ERRORS.has(err?.message) || err?.status === 404) {
          setNotFound(true);
          setItem(null);
        } else {
          setError(err?.message || '無法載入新聞內容');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [apiFetch, id]);

  useEffect(() => {
    const title = item?.title ? `${item.title} | Healthy Diet` : '新聞詳情 | Healthy Diet';
    document.title = title;
    return () => {
      document.title = 'Healthy Diet';
    };
  }, [item]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/news"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          返回新聞列表
        </Link>
        <Link
          to="/knowledge-search"
          className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
        >
          <FileText size={16} />
          前往知識搜尋
        </Link>
      </div>

      {loading ? (
        <div className="animate-pulse rounded-[36px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-4 h-4 w-32 rounded-full bg-slate-200" />
          <div className="mb-3 h-10 w-3/4 rounded-full bg-slate-200" />
          <div className="mb-6 h-4 w-1/3 rounded-full bg-slate-200" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`detail-skeleton-${index}`} className="h-4 rounded-full bg-slate-200" />
            ))}
          </div>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-5 text-rose-700 shadow-sm">
          <p className="text-lg font-black">載入失敗</p>
          <p className="mt-2 text-sm font-semibold">{error}</p>
        </div>
      ) : null}

      {!loading && !error && notFound ? (
        <div className="rounded-[36px] border border-dashed border-slate-300 bg-white px-8 py-14 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500">
            <Newspaper size={28} />
          </div>
          <h1 className="mt-5 text-2xl font-black text-slate-900">找不到這篇新聞</h1>
          <p className="mt-3 text-sm font-medium text-slate-500">
            後端回傳 `news_not_found` 或 `news_file_not_found`，可以返回列表重新選擇文章。
          </p>
        </div>
      ) : null}

      {!loading && !error && !notFound && item ? (
        <>
          <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-linear-to-br from-white via-slate-50 to-emerald-50 p-8 shadow-sm">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-white">
              <Newspaper size={14} />
              News Detail
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{item.title || '未命名文章'}</h1>
              <div className="flex flex-col gap-3 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <p>發布日期：{item.publishedDate || '未提供'}</p>
                {item.sourceUrl ? (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-slate-700 transition hover:bg-slate-50"
                  >
                    原始來源
                    <ExternalLink size={15} />
                  </a>
                ) : null}
              </div>
            </div>
          </section>

          <article className="rounded-[36px] border border-slate-200 bg-white p-8 shadow-sm">
            {item.content ? (
              <div className={markdownClassName}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{String(item.content)}</ReactMarkdown>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-500">
                文章內容目前為空。
              </div>
            )}
          </article>
        </>
      ) : null}
    </div>
  );
};

export default NewsDetailView;
