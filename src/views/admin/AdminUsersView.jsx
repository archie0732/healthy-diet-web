import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { normalizeList, serializeQuery } from './utils';

const PAGE_SIZE = 50;

const AdminUsersView = ({ apiFetch }) => {
  const [users, setUsers] = useState([]);
  const [offset, setOffset] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [error, setError] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchUsers = async (nextOffset = offset) => {
    setLoadingList(true);
    setError('');
    try {
      const query = serializeQuery({ limit: PAGE_SIZE, offset: nextOffset });
      const data = await apiFetch(`/admin/users${query}`);
      const list = normalizeList(data, ['users', 'items', 'data', 'results']);
      setUsers(list);
      if (list.length > 0 && !selectedUserId) setSelectedUserId(list[0].id || list[0].userId || list[0]._id);
    } catch (err) {
      setError(err?.message || '讀取使用者清單失敗');
    } finally {
      setLoadingList(false);
    }
  };

  const fetchUserDetail = async (userId) => {
    if (!userId) return;
    setLoadingDetail(true);
    try {
      const data = await apiFetch(`/admin/users/${userId}`);
      setSelectedUser(data);
    } catch (err) {
      setSelectedUser(null);
      setError(err?.message || '讀取使用者詳細資料失敗');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchUsers(offset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  useEffect(() => {
    fetchUserDetail(selectedUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  const filteredUsers = useMemo(() => {
    if (!keyword.trim()) return users;
    const normalizedKeyword = keyword.trim().toLowerCase();
    return users.filter((user) => {
      const haystack = [user?.email, user?.nickname, user?.id, user?.userId]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedKeyword);
    });
  }, [keyword, users]);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">使用者管理</h1>
            <p className="text-sm text-slate-500">清單使用 `/admin/users`，詳細使用 `/admin/users/{'{user_id}'}`</p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => fetchUsers(offset)}
            type="button"
          >
            <RefreshCw size={16} />
            重新整理
          </button>
        </div>

        <label className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
          <Search size={15} className="text-slate-400" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
            placeholder="搜尋 email / nickname / id"
          />
        </label>

        {error ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
            {error}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between px-2 text-sm text-slate-500">
            <span>{loadingList ? '讀取中...' : `共 ${filteredUsers.length} 筆`}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-50"
                disabled={offset <= 0}
                onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
              >
                上一頁
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-50"
                disabled={users.length < PAGE_SIZE}
                onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
              >
                下一頁
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {filteredUsers.map((user) => {
              const id = user.id || user.userId || user._id;
              const active = id === selectedUserId;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedUserId(id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    active ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <p className="truncate font-semibold text-slate-900">{user.nickname || '-'}</p>
                  <p className="truncate text-sm text-slate-600">{user.email || '-'}</p>
                  <p className="truncate text-xs text-slate-400">{id}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-bold text-slate-900">使用者詳細資料</h2>
          {loadingDetail ? <p className="text-sm text-slate-500">讀取中...</p> : null}
          {!loadingDetail && !selectedUser ? <p className="text-sm text-slate-500">請從左側選擇使用者。</p> : null}
          {selectedUser ? (
            <pre className="max-h-[480px] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              {JSON.stringify(selectedUser, null, 2)}
            </pre>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AdminUsersView;

