import React from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Activity, CheckCircle2, Home, MessageSquare, Camera, User } from "lucide-react";

export default function Layout({ user, token, handleLogout, notification }) {
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace />;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-slate-50 pb-16 md:pb-0">

        <AppSidebar user={user} handleLogout={handleLogout} />

        <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
          <div className="flex-1 p-4 md:p-10 relative">
            {notification && (
              <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl text-white shadow-2xl font-bold transition-all animate-in slide-in-from-top-4 ${notification.type === 'error' ? 'bg-red-500' : 'bg-slate-800'}`}>
                {notification.type === 'error' ? <Activity className="mr-2 inline-block" size={18} /> : <CheckCircle2 className="mr-2 inline-block" size={18} />}
                {notification.msg}
              </div>
            )}

            <Outlet />
          </div>
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 h-16 flex justify-around items-center px-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] pb-safe">
          <MobileBtn to="/" icon={Home} label="儀表板" active={location.pathname === "/"} />
          <MobileBtn to="/consult" icon={MessageSquare} label="AI諮詢" active={location.pathname === "/consult"} />
          <Link to="/diet" className="relative -top-4 flex flex-col items-center justify-center">
            <div className={`p-3 rounded-full shadow-lg text-white transition-colors ${location.pathname === "/diet" ? "bg-indigo-600" : "bg-emerald-500"}`}>
              <Camera size={26} />
            </div>
            <span className={`text-[10px] font-bold mt-1 ${location.pathname === "/diet" ? "text-indigo-600" : "text-emerald-600"}`}>辨識</span>
          </Link>
          <MobileBtn to="/member" icon={Users} label="團隊" active={location.pathname === "/member"} />
          <MobileBtn to="/profile" icon={User} label="設定" active={location.pathname === "/profile"} />
        </nav>
      </div>
    </SidebarProvider>
  );
}

const MobileBtn = ({ to, icon: Icon, label, active }) => (
  <Link to={to} className={`flex flex-col items-center justify-center w-full h-full pt-1 transition-colors ${active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
    <Icon size={22} className={active ? 'stroke-[2.5px] mb-1' : 'mb-1'} />
    <span className="text-[10px] font-bold">{label}</span>
  </Link>
);

// 為了讓 Users icon 正常顯示，需在 Layout.jsx 最上方引入
import { Users } from 'lucide-react';
