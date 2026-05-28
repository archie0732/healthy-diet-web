import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { normalizeList } from './utils';

const AdminRouteControlsView = ({ apiFetch }) => {
  const [controls, setControls] = useState([]);
  const [draftReasons, setDraftReasons] = useState({});
  const [loading, setLoading] = useState(false);
  const [updatingKey, setUpdatingKey] = useState('');
  const [error, setError] = useState('');

  const normalizeControl = (item) => {
    const normalized = { ...item };
    if (typeof normalized.isEnabled !== 'boolean' && typeof normalized.is_enabled === 'boolean') {
      normalized.isEnabled = normalized.is_enabled;
    }
    if (!normalized.routeKey && normalized.route_key) {
      normalized.routeKey = normalized.route_key;
    }
    return normalized;
  };

  const fetchControls = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/admin/route-controls');
      const list = normalizeList(data, ['routeControls', 'items', 'data', 'results']).map(normalizeControl);
      setControls(list);
      const reasonMap = {};
      list.forEach((item) => {
        reasonMap[item.routeKey] = item.reason || '';
      });
      setDraftReasons(reasonMap);
    } catch (err) {
      setError(err?.message || '讀取 route controls 失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchControls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async (item) => {
    if (!item?.routeKey || item.isProtected) return;
    setUpdatingKey(item.routeKey);
    setError('');
    try {
      const payload = {
        is_enabled: !item.isEnabled,
        reason: draftReasons[item.routeKey] || '',
      };
      const updated = await apiFetch(`/admin/route-controls/${encodeURIComponent(item.routeKey)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setControls((prev) =>
        prev.map((row) => (row.routeKey === item.routeKey ? normalizeControl({ ...row, ...updated }) : row)),
      );
    } catch (err) {
      setError(err?.message || '更新 route control 失敗');
    } finally {
      setUpdatingKey('');
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Route Controls</h1>
            <p className="text-sm text-slate-500">
              受控路由停用後，該路由會回傳 `503 Service Unavailable`
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={fetchControls}
            type="button"
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

      <div className="space-y-3">
        {loading ? <p className="text-sm text-slate-500">讀取中...</p> : null}
        {controls.map((item) => {
          const busy = updatingKey === item.routeKey;
          return (
            <div key={item.routeKey} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-slate-900">{item.routeKey}</p>
                  <p className="text-xs text-slate-500">
                    protected: {item.isProtected ? 'true' : 'false'} | updatedBy: {item.updatedBy || '-'} | updatedAt:{' '}
                    {item.updatedAt || '-'}
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                    item.isEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {item.isEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <label className="mb-3 block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">Reason</span>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  value={draftReasons[item.routeKey] ?? ''}
                  onChange={(e) =>
                    setDraftReasons((prev) => ({
                      ...prev,
                      [item.routeKey]: e.target.value,
                    }))
                  }
                  placeholder="maintenance"
                />
              </label>

              <button
                type="button"
                onClick={() => handleToggle(item)}
                disabled={item.isProtected || busy}
                className={`rounded-xl px-4 py-2 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  item.isEnabled ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {item.isProtected
                  ? 'Protected key 無法切換'
                  : busy
                    ? '更新中...'
                    : item.isEnabled
                      ? '停用此路由'
                      : '啟用此路由'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminRouteControlsView;
