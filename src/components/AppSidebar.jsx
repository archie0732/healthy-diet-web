import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  MessageSquare,
  Camera,
  Users,
  BookOpen,
  Settings,
  LogOut,
  Shield,
  Route,
  Megaphone,
  FileText,
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

const mainMenu = [
  { title: '儀表板', url: '/', icon: Home },
  { title: 'AI 諮詢', url: '/consult', icon: MessageSquare },
  { title: '飲食分析', url: '/diet', icon: Camera },
  { title: '團隊資訊', url: '/member', icon: Users },
  { title: 'API 文件', url: '/api', icon: BookOpen },
];

const adminMenu = [
  { title: 'Admin 首頁', url: '/admin', icon: Shield },
  { title: 'User 管理', url: '/admin/users', icon: Users },
  { title: 'Route 控制', url: '/admin/route-controls', icon: Route },
  { title: '公告管理', url: '/admin/announcements', icon: Megaphone },
  { title: 'RAG 文件', url: '/admin/rag-documents', icon: FileText },
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
  const role = user?.role || localStorage.getItem('userRole') || '';
  const showAdmin = isAdminRole(role);

  return (
    <Sidebar variant="sidebar" className="border-r border-slate-200 bg-white">
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            <img src="/icon.webp" alt="Healthy Diet" className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="font-extrabold text-slate-900">Healthy Diet</p>
            <p className="text-xs text-slate-500">Workspace</p>
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
          <p className="truncate font-semibold text-slate-900">{user?.nickname || 'User'}</p>
          <p className="mb-3 truncate text-xs text-slate-500">{user?.email || '-'}</p>
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/profile"
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Settings size={14} />
              個人
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
            >
              <LogOut size={14} />
              登出
            </button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

