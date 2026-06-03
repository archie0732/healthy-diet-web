import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Users, Route, Megaphone, FileText, Newspaper } from 'lucide-react';
import { isAdminRole } from '@/lib/authSession';

const cards = [
  { to: '/admin/users', title: 'User 管理', icon: Users, desc: '查看使用者資料與帳號狀態' },
  { to: '/admin/route-controls', title: 'Route 控制', icon: Route, desc: '管理受保護路由的開關與維護原因' },
  { to: '/admin/announcements', title: '公告管理', icon: Megaphone, desc: '建立、發布與封存前台公告' },
  { to: '/admin/rag-documents', title: 'RAG 文件', icon: FileText, desc: '上傳並查看知識庫文件與處理狀態' },
  { to: '/admin/news-tools', title: 'News 工具', icon: Newspaper, desc: '手動同步新聞並檢查 markdown 檔案清單' },
];

const AdminHome = ({ apiFetch }) => {
  const [me, setMe] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const data = await apiFetch('/admin/me');
        setMe(data);
      } catch (err) {
        setError(err?.message || '讀取管理者資訊失敗。');
      }
    };

    run();
  }, [apiFetch]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Admin Console</h1>
            <p className="text-sm text-slate-500">限 `operator` 與 `super_admin` 帳號使用。</p>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">
            {error}
          </p>
        ) : null}

        {me ? (
          <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 px-4 py-3">
              <p className="text-slate-500">Email</p>
              <p className="font-semibold text-slate-900">{me.email || '-'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 px-4 py-3">
              <p className="text-slate-500">Role</p>
              <p className="font-semibold text-slate-900">{me.role || '-'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 px-4 py-3">
              <p className="text-slate-500">Admin 權限</p>
              <p className="font-semibold text-slate-900">{isAdminRole(me.role) ? '已啟用' : '未啟用'}</p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
          >
            <div className="mb-3 flex items-center gap-2 text-slate-900">
              <card.icon size={18} />
              <h2 className="font-bold">{card.title}</h2>
            </div>
            <p className="text-sm text-slate-600">{card.desc}</p>
          </Link>
        ))}
      </section>
    </div>
  );
};

export default AdminHome;
