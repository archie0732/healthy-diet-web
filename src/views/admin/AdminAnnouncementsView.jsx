import React, { useEffect, useMemo, useState } from 'react';
import { Megaphone, RefreshCw } from 'lucide-react';
import { normalizeList, serializeQuery } from './utils';

const LIMIT = 50;

const emptyForm = {
  title: '',
  content: '',
};

const pickAnnouncementId = (item) => item?.id ?? item?._id ?? item?.announcementId;

const AdminAnnouncementsView = ({ apiFetch }) => {
  const [items, setItems] = useState([]);
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchItems = async (nextOffset = offset) => {
    setError('');
    try {
      const query = serializeQuery({ limit: LIMIT, offset: nextOffset });
      const data = await apiFetch(`/admin/announcements${query}`);
      const list = normalizeList(data, ['announcements', 'items', 'data', 'results']);
      setItems(list);
      if (!selectedId && list[0]) setSelectedId(pickAnnouncementId(list[0]));
    } catch (err) {
      setError(err?.message || '讀取公告失敗');
    }
  };

  useEffect(() => {
    fetchItems(offset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  const selectedItem = useMemo(
    () => items.find((item) => pickAnnouncementId(item) === selectedId) || null,
    [items, selectedId],
  );

  useEffect(() => {
    if (selectedItem) {
      setEditForm({
        title: selectedItem.title || '',
        content: selectedItem.content || selectedItem.message || '',
      });
    } else {
      setEditForm(emptyForm);
    }
  }, [selectedItem]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await apiFetch('/admin/announcements', {
        method: 'POST',
        body: JSON.stringify(createForm),
      });
      setCreateForm(emptyForm);
      await fetchItems(offset);
    } catch (err) {
      setError(err?.message || '建立公告失敗');
    } finally {
      setBusy(false);
    }
  };

  const handlePatch = async () => {
    if (!selectedId) return;
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/admin/announcements/${selectedId}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });
      await fetchItems(offset);
    } catch (err) {
      setError(err?.message || '更新公告失敗');
    } finally {
      setBusy(false);
    }
  };

  const handleAction = async (action) => {
    if (!selectedId) return;
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/admin/announcements/${selectedId}/${action}`, {
        method: 'POST',
      });
      await fetchItems(offset);
    } catch (err) {
      setError(err?.message || `${action} 失敗`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Megaphone size={18} className="text-slate-700" />
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">公告管理</h1>
              <p className="text-sm text-slate-500">CRUD + publish/archive</p>
            </div>
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
        {error ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
            {error}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.1fr_1.1fr]">
        <form onSubmit={handleCreate} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <h2 className="font-bold text-slate-900">新增公告</h2>
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            placeholder="title"
            value={createForm.title}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
            required
          />
          <textarea
            className="min-h-32 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            placeholder="content"
            value={createForm.content}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, content: e.target.value }))}
            required
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-slate-900 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            建立公告
          </button>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-bold text-slate-900">公告列表</h2>
          <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
            <span>{items.length} 筆</span>
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
          <div className="space-y-2">
            {items.map((item) => {
              const id = pickAnnouncementId(item);
              const active = selectedId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedId(id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left ${
                    active ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <p className="truncate font-semibold text-slate-900">{item.title || '(untitled)'}</p>
                  <p className="truncate text-xs text-slate-500">{id}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <h2 className="font-bold text-slate-900">編輯 / 發布 / 封存</h2>
          {!selectedItem ? <p className="text-sm text-slate-500">先從列表選一筆公告</p> : null}
          {selectedItem ? (
            <>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                value={editForm.title}
                onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
              />
              <textarea
                className="min-h-32 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                value={editForm.content}
                onChange={(e) => setEditForm((prev) => ({ ...prev, content: e.target.value }))}
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={handlePatch}
                  disabled={busy}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  更新
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('publish')}
                  disabled={busy}
                  className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  Publish
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('archive')}
                  disabled={busy}
                  className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  Archive
                </button>
              </div>
              <pre className="max-h-40 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                {JSON.stringify(selectedItem, null, 2)}
              </pre>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AdminAnnouncementsView;

