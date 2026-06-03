import React, { useEffect, useMemo, useState } from 'react';
import { Eye, FileText, FileUp, RefreshCw, RotateCw, Trash2 } from 'lucide-react';
import { useRustOpenApi } from '@/lib/rustOpenApi';
import { normalizeList, serializeQuery } from './utils';

const LIMIT = 50;
const MAX_UPLOAD_SIZE = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['pdf', 'txt', 'md', 'docx'];

const pickDocId = (item) => item?.id ?? item?._id ?? item?.documentId;

const statusTone = (status) => {
  if (status === 'ready') return 'bg-emerald-100 text-emerald-700';
  if (status === 'processing') return 'bg-blue-100 text-blue-700';
  if (status === 'failed') return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-700';
};

const formatUploadError = (targetFile) => {
  if (!targetFile) return '請先選擇要上傳的文件。';

  const ext = targetFile.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `只支援 ${ALLOWED_EXTENSIONS.join(', ')} 檔案格式。`;
  }

  if (targetFile.size > MAX_UPLOAD_SIZE) {
    return '檔案大小不能超過 20MB。';
  }

  return '';
};

const AdminRagDocumentsView = ({ apiFetch }) => {
  const { data: openApi, loading: openApiLoading, error: openApiError } = useRustOpenApi();
  const ragCapabilities = openApi?.capabilities?.ragDocuments || {};

  const [items, setItems] = useState([]);
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [file, setFile] = useState(null);
  const [embeddingModel, setEmbeddingModel] = useState('');
  const [error, setError] = useState('');
  const [busyAction, setBusyAction] = useState('');

  const fetchItems = async (nextOffset = offset) => {
    setError('');

    try {
      const query = serializeQuery({ limit: LIMIT, offset: nextOffset });
      const data = await apiFetch(`/admin/rag/documents${query}`);
      const list = normalizeList(data, ['documents', 'items', 'data', 'results']);
      setItems(list);

      if (!list.length) {
        setSelectedId(null);
        setSelectedDoc(null);
        return;
      }

      if (!selectedId || !list.some((item) => pickDocId(item) === selectedId)) {
        setSelectedId(pickDocId(list[0]));
      }
    } catch (err) {
      setError(err?.message || '無法載入 RAG 文件清單。');
    }
  };

  const fetchDetail = async (id) => {
    if (!id) return;

    try {
      const data = await apiFetch(`/admin/rag/documents/${id}`);
      setSelectedDoc(data);
    } catch (err) {
      setSelectedDoc(null);
      setError(err?.message || '無法載入文件詳細資料。');
    }
  };

  useEffect(() => {
    fetchItems(offset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  useEffect(() => {
    fetchDetail(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const selectedSummary = useMemo(
    () => items.find((item) => pickDocId(item) === selectedId) || null,
    [items, selectedId],
  );

  const handleUpload = async (event) => {
    event.preventDefault();

    const validationError = formatUploadError(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setBusyAction('upload');

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (embeddingModel.trim()) formData.append('embeddingModel', embeddingModel.trim());

      await apiFetch('/admin/rag/documents', {
        method: 'POST',
        body: formData,
      });

      setFile(null);
      setEmbeddingModel('');
      await fetchItems(offset);
    } catch (err) {
      setError(err?.message || '上傳 RAG 文件失敗。');
    } finally {
      setBusyAction('');
    }
  };

  const handleReindex = async () => {
    if (!selectedId || !ragCapabilities.reindex) return;

    setError('');
    setBusyAction('reindex');

    try {
      await apiFetch(`/admin/rag/documents/${selectedId}/reindex`, { method: 'POST' });
      await fetchItems(offset);
      await fetchDetail(selectedId);
    } catch (err) {
      setError(err?.message || '重新索引失敗。');
    } finally {
      setBusyAction('');
    }
  };

  const handleDelete = async () => {
    if (!selectedId || !ragCapabilities.remove) return;

    setError('');
    setBusyAction('delete');

    try {
      await apiFetch(`/admin/rag/documents/${selectedId}`, { method: 'DELETE' });
      setSelectedId(null);
      setSelectedDoc(null);
      await fetchItems(offset);
    } catch (err) {
      setError(err?.message || '刪除文件失敗。');
    } finally {
      setBusyAction('');
    }
  };

  const selectedData = selectedDoc || selectedSummary;
  const fileUrl = selectedData?.fileUrl || (selectedId ? `/api/admin/rag/documents/${selectedId}/file` : '');
  const previewUrl = selectedData?.previewUrl || (selectedId ? `/api/admin/rag/documents/${selectedId}/preview` : '');

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">RAG 文件管理</h1>
            <p className="text-sm text-slate-500">
              這頁會在執行時直接讀取 Rust `/openapi.yml`，並依公開 spec 顯示可用操作。
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchItems(offset)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            重新整理
          </button>
        </div>

        {ragCapabilities.reindex || ragCapabilities.remove ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Rust `/openapi.yml` 已列出 `reindex`、`delete`、`file` 與 `preview` 路由，相關操作已啟用。
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            目前 Rust `/openapi.yml` 沒有列出 `reindex` 或 `delete` endpoint，所以前端先隱藏這兩個操作。
          </div>
        )}

        {openApiLoading ? (
          <p className="mt-3 text-sm text-slate-500">正在同步 Rust `/openapi.yml` 能力旗標...</p>
        ) : null}

        {openApiError ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            無法重新整理 Rust `/openapi.yml`：{openApiError}
          </p>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
            {error}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_1.2fr]">
        <form onSubmit={handleUpload} className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-bold text-slate-900">上傳文件</h2>

          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">File</span>
            <input
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              accept=".pdf,.txt,.md,.docx"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">embeddingModel (optional)</span>
            <input
              value={embeddingModel}
              onChange={(event) => setEmbeddingModel(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="text-embedding-3-small"
            />
          </label>

          <p className="text-xs text-slate-500">支援 `pdf`、`txt`、`md`、`docx`，單檔上限 20MB。</p>

          <button
            type="submit"
            disabled={busyAction === 'upload'}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            <FileUp size={16} />
            {busyAction === 'upload' ? '上傳中...' : '上傳'}
          </button>
        </form>

        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-bold text-slate-900">文件列表</h2>

          <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
            <span>目前顯示 {items.length} 筆</span>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded border border-slate-200 px-2 py-1 disabled:opacity-50"
                disabled={offset <= 0}
                onClick={() => setOffset((prev) => Math.max(0, prev - LIMIT))}
              >
                上一頁
              </button>
              <button
                type="button"
                className="rounded border border-slate-200 px-2 py-1 disabled:opacity-50"
                disabled={items.length < LIMIT}
                onClick={() => setOffset((prev) => prev + LIMIT)}
              >
                下一頁
              </button>
            </div>
          </div>

          {!items.length ? <p className="text-sm text-slate-500">目前沒有文件。</p> : null}

          <div className="space-y-2">
            {items.map((item) => {
              const id = pickDocId(item);
              const active = id === selectedId;
              const status = item.status || 'uploaded';
              const fileName = item.fileName || item.filename || id;

              return (
                <button
                  type="button"
                  key={id}
                  onClick={() => setSelectedId(id)}
                  className={`w-full min-w-0 rounded-xl border px-3 py-3 text-left ${
                    active ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate font-semibold text-slate-900">{fileName}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${statusTone(status)}`}>
                      {status}
                    </span>
                  </div>
                  <p className="break-all text-xs text-slate-500">{id}</p>
                  <p className="mt-1 break-all text-xs text-slate-500">
                    sizeBytes: {item.sizeBytes ?? '-'} | chunkCount: {item.chunkCount ?? '-'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-bold text-slate-900">文件詳細資料</h2>

          {!selectedId ? <p className="text-sm text-slate-500">請先從左側選擇一份文件。</p> : null}

          {selectedId ? (
            <>
              <div className="grid min-w-0 grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <Info label="status" value={selectedData?.status || '-'} />
                <Info label="sizeBytes" value={selectedData?.sizeBytes ?? '-'} />
                <Info label="chunkCount" value={selectedData?.chunkCount ?? '-'} />
                <Info label="mimeType" value={selectedData?.mimeType || '-'} />
                <Info label="createdAt" value={selectedData?.createdAt || '-'} />
                <Info label="updatedAt" value={selectedData?.updatedAt || '-'} />
                <Info label="fileUrl" value={selectedData?.fileUrl || fileUrl} wrap />
                <Info label="previewUrl" value={selectedData?.previewUrl || previewUrl} wrap />
                <Info label="errorMessage" value={selectedData?.errorMessage || '-'} wrap />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {ragCapabilities.reindex ? (
                  <button
                    type="button"
                    onClick={handleReindex}
                    disabled={busyAction !== ''}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    <RotateCw size={15} />
                    {busyAction === 'reindex' ? 'Reindexing...' : 'Reindex'}
                  </button>
                ) : null}

                {ragCapabilities.remove ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={busyAction !== ''}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                    {busyAction === 'delete' ? 'Deleting...' : 'Delete'}
                  </button>
                ) : null}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {ragCapabilities.file ? (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <FileText size={15} />
                    Open File
                  </a>
                ) : null}

                {ragCapabilities.preview ? (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Eye size={15} />
                    Preview JSON
                  </a>
                ) : null}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                這個版本會依 Rust `/openapi.yml` 的能力旗標顯示功能，避免前端和後端公開規格脫節。
              </div>

              <pre className="max-h-60 min-w-0 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                {JSON.stringify(selectedData, null, 2)}
              </pre>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const Info = ({ label, value, wrap = false }) => (
  <div className="min-w-0 rounded-xl border border-slate-200 px-3 py-2">
    <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
    <p className={`${wrap ? 'whitespace-pre-wrap break-all' : 'truncate'} font-semibold text-slate-800`}>
      {String(value)}
    </p>
  </div>
);

export default AdminRagDocumentsView;
