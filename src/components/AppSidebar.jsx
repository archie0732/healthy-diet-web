import React from 'react';
import {
  Home, MessageSquare, Camera, Users,
  BookOpen, LogOut, Settings, Sun
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "儀表板", url: "/", icon: Home },
  { title: "AI 諮詢", url: "/consult", icon: MessageSquare },
  { title: "相機辨識", url: "/diet", icon: Camera },
  { title: "團隊成員", url: "/member", icon: Users },
  { title: "API 檔案", url: "/api", icon: BookOpen },
];

export function AppSidebar({ user, handleLogout }) {
  const location = useLocation();

  return (
    <Sidebar
      className="bg-white border-r-2 border-slate-200 text-slate-800 w-64 shadow-sm hidden md:flex"
      variant="sidebar"
    >
      <SidebarHeader className="p-6 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border-2 border-slate-200 shadow-sm">
                <img
                  src="/icon.webp"
                  alt="Logo"
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                />
              </div>
              <span className="font-extrabold text-xl text-slate-800 tracking-wide">
                健康飲食
              </span>
            </div>
            <span className="text-[13px] text-slate-500 font-bold tracking-wide">
              Professional Workspace
            </span>
          </div>
          <Sun size={18} className="text-slate-400 hover:text-amber-500 cursor-pointer transition-colors mt-1 stroke-[2.5px]" />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`h-12 px-4 rounded-xl transition-all duration-200 border-2 ${isActive
                        ? "bg-indigo-50 border-indigo-500 text-indigo-800 shadow-md font-bold"
                        : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-200 font-semibold"
                        }`}
                    >
                      <Link to={item.url} className="flex items-center gap-4">
                        <item.icon size={20} className={isActive ? "text-indigo-600 stroke-[2.5px]" : "text-slate-400 stroke-[2px]"} />
                        <span className="text-[15px] tracking-wide">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shrink-0 border-2 border-blue-200">
              {user?.nickname?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold text-slate-800 text-[15px] truncate">
                {user?.nickname || "使用者"}
              </span>
              <span className="text-[13px] text-slate-500 font-medium truncate">
                {user?.email || "user@example.com"}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              to="/profile"
              className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-slate-100 border-2 border-slate-200 text-slate-700 py-2 rounded-xl text-[14px] font-bold transition-colors shadow-sm"
            >
              <Settings size={16} className="stroke-[2.5px]" />
              設定
            </Link>
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 border-2 border-red-200 text-red-600 py-2 rounded-xl text-[14px] font-bold transition-colors shadow-sm"
            >
              <LogOut size={16} className="stroke-[2.5px]" />
              登出
            </button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
