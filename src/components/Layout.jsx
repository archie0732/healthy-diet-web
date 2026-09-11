import React, { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Home, MessageSquare, Camera, Users, User, Shield, Wrench, X } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { isAdminRole } from '@/lib/authSession';
import { buildApiUrl } from '@/lib/api';
import { useLanguage } from '@/i18n';
import LanguageSwitcher from './LanguageSwitcher';

const NAV_ITEM_CONFIG = [
  { to: '/', icon: Home, key: 'nav.home', defaultLabel: '首頁' },
  { to: '/consult', icon: MessageSquare, key: 'nav.ai', defaultLabel: 'AI' },
  { to: '/diet', icon: Camera, key: 'nav.analysis', defaultLabel: '分析' },
  { to: '/member', icon: Users, key: 'nav.team', defaultLabel: '團隊' },
  { to: '/profile', icon: User, key: 'nav.mine', defaultLabel: '我的' },
];

const normalizeAnnouncement = (payload) => {
  if (!payload || typeof payload !== 'object') return null;
  const raw = payload.current ?? payload.announcement ?? payload.data ?? payload;
  if (!raw || typeof raw !== 'object') return null;
  const title = raw.title || raw.subject || '最新公告';
  const content = raw.content || raw.message || raw.text || '';
  if (!String(content).trim()) return null;
  return {
    title,
    content: String(content),
  };
};

export default function Layout({ user, token, handleLogout, notification, maintenanceNotice, clearMaintenanceNotice }) {
  const location = useLocation();
  const { t } = useLanguage();
  const [announcement, setAnnouncement] = useState(null);

  const role = user?.role || localStorage.getItem('userRole') || '';
  const showAdminLink = isAdminRole(role);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const response = await fetch(buildApiUrl('/api/announcements/current'));
        if (!response.ok) return;
        const data = await response.json();
        setAnnouncement(normalizeAnnouncement(data));
      } catch {
        setAnnouncement(null);
      }
    };
    fetchAnnouncement();
  }, []);

  if (!token) return <Navigate to="/login" replace />;

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-slate-50 pb-16 md:pb-0">
        <AppSidebar user={user} handleLogout={handleLogout} />

        <main className="h-screen min-w-0 flex-1 overflow-y-auto">
          <div className="relative p-4 md:p-8">
            {/* Mobile Top Header */}
            <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs md:hidden">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  <img src="/icon.webp" alt="Healthy Diet" className="h-full w-full object-cover" />
                </div>
                <span className="text-sm font-extrabold text-slate-900">Healthy Diet</span>
              </div>
              <LanguageSwitcher />
            </div>

            {notification ? (
              <div
                className={`fixed left-1/2 top-8 z-50 -translate-x-1/2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-xl ${
                  notification.type === 'error' ? 'bg-rose-600' : 'bg-slate-900'
                }`}
              >
                {notification.msg}
              </div>
            ) : null}

            {announcement ? (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                <p className="font-bold">{announcement.title}</p>
                <p className="text-sm">{announcement.content}</p>
              </div>
            ) : null}

            {maintenanceNotice ? (
              <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900">
                <div className="flex items-start gap-3">
                  <Wrench size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">{t('common.maintenance', '功能維修中')}</p>
                    <p className="text-sm">{maintenanceNotice.message}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearMaintenanceNotice}
                  className="rounded-full p-1 text-rose-500 hover:bg-rose-100"
                >
                  <X size={16} />
                </button>
              </div>
            ) : null}

            {showAdminLink ? (
              <div className="mb-4">
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <Shield size={15} />
                  {t('common.adminConsole', '進入 Admin Console')}
                </Link>
              </div>
            ) : null}

            <Outlet />
          </div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-slate-200 bg-white md:hidden">
          {NAV_ITEM_CONFIG.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex h-full w-full flex-col items-center justify-center text-[10px] font-bold ${
                  active ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                <item.icon size={19} />
                <span>{t(item.key, item.defaultLabel)}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </SidebarProvider>
  );
}
