import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  MessageSquare,
  Camera,
  Users,
  BookOpen,
  Search,
  Share2,
  Settings,
  LogOut,
  Shield,
  Route,
  Megaphone,
  FileText,
  Newspaper,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { isAdminRole } from '@/lib/authSession';
import { useLanguage } from '@/i18n';
import LanguageSwitcher from './LanguageSwitcher';

const MAIN_MENU_CONFIG = [
  { key: 'nav.dashboard', defaultTitle: '儀表板', url: '/', icon: Home },
  { key: 'nav.consult', defaultTitle: 'AI 諮詢', url: '/consult', icon: MessageSquare },
  { key: 'nav.diet', defaultTitle: '飲食分析', url: '/diet', icon: Camera },
  { key: 'nav.news', defaultTitle: '衛教新聞', url: '/news', icon: Newspaper },
  { key: 'nav.knowledgeSearch', defaultTitle: '知識搜尋', url: '/knowledge-search', icon: Search },
  { key: 'nav.knowledgeGraph', defaultTitle: '知識圖譜', url: '/knowledge-graph', icon: Share2 },
  { key: 'nav.member', defaultTitle: '團隊資訊', url: '/member', icon: Users },
  { key: 'nav.apiDocs', defaultTitle: 'API 文件', url: '/api', icon: BookOpen },
];

const ADMIN_MENU_CONFIG = [
  { key: 'nav.adminHome', defaultTitle: 'Admin 首頁', url: '/admin', icon: Shield },
  { key: 'nav.adminUsers', defaultTitle: 'User 管理', url: '/admin/users', icon: Users },
  { key: 'nav.adminRouteControls', defaultTitle: 'Route 控制', url: '/admin/route-controls', icon: Route },
  { key: 'nav.adminAnnouncements', defaultTitle: '公告管理', url: '/admin/announcements', icon: Megaphone },
  { key: 'nav.adminRagDocuments', defaultTitle: 'RAG 文件', url: '/admin/rag-documents', icon: FileText },
  { key: 'nav.adminNewsTools', defaultTitle: '新聞工具', url: '/admin/news-tools', icon: Newspaper },
];

const MenuSection = ({ items, pathname }) => (
  <SidebarMenu className="gap-1.5">
    {items.map((item) => {
      const isActive = pathname === item.url;
      return (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton
            asChild
            isActive={isActive}
            className={`h-10 rounded-xl px-3 ${
              isActive
                ? 'bg-slate-900 text-white hover:bg-slate-900 hover:text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Link to={item.url} className="flex items-center gap-3">
              <item.icon size={17} />
              <span className="font-semibold">{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    })}
  </SidebarMenu>
);

export function AppSidebar({ user, handleLogout }) {
  const location = useLocation();
  const { t } = useLanguage();
  const role = user?.role || localStorage.getItem('userRole') || '';
  const showAdmin = isAdminRole(role);
  const avatarUrl = user?.avatar_url || user?.avatarUrl || '';
  const avatarFallback = user?.nickname?.charAt(0)?.toUpperCase() || 'U';

  const mainMenu = MAIN_MENU_CONFIG.map((item) => ({
    ...item,
    title: t(item.key, item.defaultTitle),
  }));

  const adminMenu = ADMIN_MENU_CONFIG.map((item) => ({
    ...item,
    title: t(item.key, item.defaultTitle),
  }));

  return (
    <Sidebar variant="sidebar" className="border-r border-slate-200 bg-white">
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            <img src="/icon.webp" alt="Healthy Diet" className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="font-extrabold text-slate-900">Healthy Diet</p>
            <p className="text-xs text-slate-500">{t('common.workspace', 'Workspace')}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <MenuSection items={mainMenu} pathname={location.pathname} />
          </SidebarGroupContent>
        </SidebarGroup>

        {showAdmin ? (
          <SidebarGroup>
            <p className="mb-2 px-2 text-xs font-bold uppercase tracking-widest text-slate-400">Admin</p>
            <SidebarGroupContent>
              <MenuSection items={adminMenu} pathname={location.pathname} />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarFooter className="px-3 pb-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-3 flex items-center justify-between border-b border-slate-200/60 pb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {t('common.language', 'Language')}
            </span>
            <LanguageSwitcher />
          </div>

          <div className="mb-3 flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-200">
              {avatarUrl ? (
                <img src={avatarUrl} alt="User Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-extrabold text-slate-700">
                  {avatarFallback}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{user?.nickname || 'User'}</p>
              <p className="truncate text-xs text-slate-500">{user?.email || '-'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/profile"
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Settings size={14} />
              {t('nav.profile', '個人')}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
            >
              <LogOut size={14} />
              {t('nav.logout', '登出')}
            </button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
