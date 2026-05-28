import React, { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Home, MessageSquare, Camera, Users, User, Shield } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { isAdminRole } from '@/lib/authSession';

const NAV_ITEMS = [
  { to: '/', icon: Home, label: '首頁' },
  { to: '/consult', icon: MessageSquare, label: 'AI' },
  { to: '/diet', icon: Camera, label: '分析' },
  { to: '/member', icon: Users, label: '團隊' },
  { to: '/profile', icon: User, label: '我的' },
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

export default function Layout({ user, token, handleLogout, notification }) {
  const location = useLocation();
  const [announcement, setAnnouncement] = useState(null);

  const role = user?.role || localStorage.getItem('userRole') || '';
  const showAdminLink = isAdminRole(role);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const response = await fetch('/api/announcements/current');
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

            {showAdminLink ? (
              <div className="mb-4">
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <Shield size={15} />
                  進入 Admin Console
                </Link>
              </div>
            ) : null}

            <Outlet />
          </div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-slate-200 bg-white md:hidden">
          {NAV_ITEMS.map((item) => {
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
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </SidebarProvider>
  );
}

