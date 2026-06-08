import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, FolderSearch, RefreshCw, ShieldCheck } from 'lucide-react';

const AdminNewsToolsView = ({ apiFetch, showNotification }) => {
  const [files, setFiles] = useState([]);
  const [syncResult, setSyncResult] = useState(null);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  const fetchFiles = useCallback(async () => {
    setLoadingFiles(true);
    setError('');

    try {
      const response = await apiFetch('/api/news-files');
      setFiles(Array.isArray(response?.files) ? response.files : []);
    } catch (err) {
      setError(err?.message || '無法讀取 news-files');
    } finally {
      setLoadingFiles(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleSync = async () => {
    setSyncing(true);
    setError('');

    try {
      const response = await apiFetch('/api/news/sync', { method: 'POST' });
      setSyncResult(response || null);
      showNotification?.(
        `Sync complete: ${response?.newCount ?? 0} new, ${response?.updatedCount ?? 0} updated`,
      );
      await fetchFiles();
    } catch (err) {
      const message = err?.message || '新聞同步失敗';
      setError(message);
      showNotification?.(message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-linear-to-br from-slate-900 via-slate-800 to-cyan-900 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.24em] text-cyan-200">
              <ShieldCheck size={14} />
              Admin Debug
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">News 工具</h1>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-200 sm:text-base">
                這裡只提供管理用途：手動觸發 `POST /news/sync`，以及查看 `GET /news-files` 的本機 markdown 檔名清單。
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              {syncing ? '同步中...' : '立即同步新聞'}
            </button>
            <Link
              to="/news"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15"
            >
              查看公開新聞頁
              <ExternalLink size={16} />
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm font-semibold text-rose-700 shadow-sm">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-500">Sync Status</p>
              <h2 className="text-2xl font-black text-slate-900">最近同步結果</h2>
            </div>
          </div>

          {!syncResult ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
              尚未執行同步。
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <InfoCard label="ok" value={String(syncResult.ok ?? true)} />
              <InfoCard label="total" value={syncResult.total ?? 0} />
              <InfoCard label="newCount" value={syncResult.newCount ?? 0} />
              <InfoCard label="updatedCount" value={syncResult.updatedCount ?? 0} />
              <InfoCard label="generatedAt" value={syncResult.generatedAt || '-'} />
            </div>
          )}
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">Debug Files</p>
              <h2 className="text-2xl font-black text-slate-900">`/news-files`</h2>
            </div>
            <button
              type="button"
              onClick={fetchFiles}
              disabled={loadingFiles}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={16} className={loadingFiles ? 'animate-spin' : ''} />
              重新載入檔案清單
            </button>
          </div>

          {loadingFiles ? (
            <div className="mt-5 space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={`file-skeleton-${index}`} className="h-14 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
              ))}
            </div>
          ) : null}

          {!loadingFiles && files.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500">
                <FolderSearch size={28} />
              </div>
              <p className="mt-4 text-lg font-black text-slate-700">目前沒有可顯示的檔案</p>
              <p className="mt-2 text-sm text-slate-500">可以先手動同步一次，再重新整理這個列表。</p>
            </div>
          ) : null}

          {!loadingFiles && files.length > 0 ? (
            <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
              <div className="grid grid-cols-[96px_1fr] bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                <span>#</span>
                <span>filename</span>
              </div>
              <div className="divide-y divide-slate-200">
                {files.map((file, index) => (
                  <div key={file} className="grid grid-cols-[96px_1fr] px-4 py-3 text-sm">
                    <span className="font-black text-slate-400">{index + 1}</span>
                    <span className="break-all font-semibold text-slate-800">{file}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
};

const InfoCard = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 px-4 py-3">
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
    <p className="mt-1 break-all text-sm font-black text-slate-900">{String(value)}</p>
  </div>
);

export default AdminNewsToolsView;
