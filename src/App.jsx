import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import Dashboard from './views/Dashboard';
import Consult from './views/Consult';
import Diet from './views/Diet';
import Profile from './views/Profile';
import Member from './views/Member';
import ApiDocs from './views/ApiDocs';
import Privacy from './views/Privacy';
import LoginView from './views/LoginView';
import RegisterView from './views/RegisterView';
import NewsListView from './views/NewsListView';
import NewsDetailView from './views/NewsDetailView';
import KnowledgeSearchView from './views/KnowledgeSearchView';
import KnowledgeGraphView from './views/KnowledgeGraphView';
import AdminHome from './views/admin/AdminHome';
import AdminUsersView from './views/admin/AdminUsersView';
import AdminRouteControlsView from './views/admin/AdminRouteControlsView';
import AdminAnnouncementsView from './views/admin/AdminAnnouncementsView';
import AdminRagDocumentsView from './views/admin/AdminRagDocumentsView';
import AdminLoginView from './views/admin/AdminLoginView';
import AdminNewsToolsView from './views/admin/AdminNewsToolsView';
import {
  clearAuthSession,
  getStoredAuthSession,
  isAdminRole,
  persistAuthSession,
} from '@/lib/authSession';
import { buildApiUrl } from '@/lib/api';

const AUTH_LOGIN_NONCE_KEY = 'authLoginNonce';
const AUTH_EXCLUDE_LOGOUT_ENDPOINTS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/admin/login',
  '/api/auth/refresh',
]);

const RequireAdmin = ({ token, role, children }) => {
  if (!token) return <Navigate to="/admin/login" replace />;
  if (!isAdminRole(role)) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  const [authSession, setAuthSession] = useState(() => getStoredAuthSession());
  const [user, setUser] = useState(null);
  const [notification, setNotification] = useState(null);
  const [maintenanceNotice, setMaintenanceNotice] = useState(null);

  const token = authSession.token;
  const role = authSession.role;

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLogout = () => {
    setAuthSession({ token: null, refreshToken: null, expiresIn: null, role: null });
    setUser(null);
    setMaintenanceNotice(null);
    clearAuthSession();
    sessionStorage.removeItem(AUTH_LOGIN_NONCE_KEY);
    localStorage.removeItem('hasSeenWelcome_v1.2');
  };

  const applyAuthPayload = (payload) => {
    sessionStorage.setItem(AUTH_LOGIN_NONCE_KEY, String(Date.now()));
    if (typeof payload === 'string') {
      const next = persistAuthSession({
        token: payload,
        refreshToken: authSession.refreshToken,
        expiresIn: authSession.expiresIn,
        role: authSession.role,
      });
      setAuthSession(next);
      return;
    }
    const next = persistAuthSession(payload || {});
    setAuthSession(next);
  };

  const apiFetch = async (endpoint, options = {}) => {
    const headers = { ...options.headers };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

    const response = await fetch(buildApiUrl(endpoint), {
      ...options,
      headers,
    });

    if (response.status === 401 && !AUTH_EXCLUDE_LOGOUT_ENDPOINTS.has(endpoint)) {
      handleLogout();
      throw new Error('登入狀態已失效，請重新登入。');
    }

    const contentType = response.headers.get('content-type') || '';
    const rawText = await response.text();
    let data = {};

    if (rawText) {
      const trimmed = rawText.trim();
      const shouldParseJson =
        contentType.includes('application/json') || trimmed.startsWith('{') || trimmed.startsWith('[');
      if (shouldParseJson) {
        try {
          data = JSON.parse(trimmed);
        } catch {
          const err = new Error(`JSON parse failed: ${trimmed.slice(0, 120)}`);
          err.status = response.status;
          throw err;
        }
      } else {
        data = { error: trimmed };
      }
    }

    if (!response.ok) {
      const err = new Error(data.error || `HTTP ${response.status}`);
      err.status = response.status;
      if (response.status === 503) {
        const reason = typeof data.reason === 'string' ? data.reason.trim() : '';
        const message = reason
          ? `此功能目前維修中：${reason}`
          : '此功能目前維修中，請稍後再試。';
        err.message = message;
        err.isMaintenance = true;
        setMaintenanceNotice({
          endpoint,
          message,
        });
      }
      throw err;
    }

    return data;
  };

  const fetchProfile = async () => {
    try {
      const data = await apiFetch('/api/user/profile');
      if (!data?.role && role) data.role = role;
      setUser(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const recordGlobalVisit = async () => {
      if (sessionStorage.getItem('hasRecordedVisit')) return;
      if (!token) return;

      try {
        const res = await fetch(buildApiUrl('/api/record'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        });
        if (res.ok) sessionStorage.setItem('hasRecordedVisit', 'true');
      } catch (err) {
        console.error('record visit failed:', err);
      }
    };

    recordGlobalVisit();
  }, [token]);

  useEffect(() => {
    if (token) fetchProfile();
    else setUser(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, role]);

  const layoutProps = useMemo(
    () => ({
      user,
      token,
      handleLogout,
      notification,
      maintenanceNotice,
      clearMaintenanceNotice: () => setMaintenanceNotice(null),
    }),
    [user, token, notification, maintenanceNotice],
  );

  return (
    <Router>
      <TooltipProvider>
        <ScrollToTop />
        <Routes>
          <Route
            path="/login"
            element={!token ? <LoginView setToken={applyAuthPayload} apiFetch={apiFetch} showNotification={showNotification} /> : <Navigate to="/" />}
          />
          <Route
            path="/register"
            element={!token ? <RegisterView setToken={applyAuthPayload} apiFetch={apiFetch} showNotification={showNotification} /> : <Navigate to="/" />}
          />
          <Route
            path="/admin/login"
            element={
              <AdminLoginView apiFetch={apiFetch} onLogin={applyAuthPayload} isAdmin={Boolean(token && isAdminRole(role))} />
            }
          />

          <Route element={<Layout {...layoutProps} />}>
            <Route path="/" element={<Dashboard user={user} apiFetch={apiFetch} />} />
            <Route
              path="/consult"
              element={<Consult user={user} apiFetch={apiFetch} fetchProfile={fetchProfile} showNotification={showNotification} />}
            />
            <Route path="/diet" element={<Diet apiFetch={apiFetch} showNotification={showNotification} />} />
            <Route
              path="/profile"
              element={
                <Profile
                  user={user}
                  apiFetch={apiFetch}
                  fetchProfile={fetchProfile}
                  showNotification={showNotification}
                  handleLogout={handleLogout}
                />
              }
            />
            <Route path="/member" element={<Member />} />
            <Route path="/news" element={<NewsListView apiFetch={apiFetch} role={role} />} />
            <Route path="/news/:id" element={<NewsDetailView apiFetch={apiFetch} />} />
            <Route path="/knowledge-search" element={<KnowledgeSearchView apiFetch={apiFetch} />} />
            <Route path="/knowledge-graph" element={<KnowledgeGraphView apiFetch={apiFetch} />} />
            <Route path="/api" element={<ApiDocs />} />
            <Route path="/privacy" element={<Privacy />} />

            <Route
              path="/admin"
              element={
                <RequireAdmin token={token} role={role}>
                  <AdminHome apiFetch={apiFetch} />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/users"
              element={
                <RequireAdmin token={token} role={role}>
                  <AdminUsersView apiFetch={apiFetch} />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/route-controls"
              element={
                <RequireAdmin token={token} role={role}>
                  <AdminRouteControlsView apiFetch={apiFetch} />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/announcements"
              element={
                <RequireAdmin token={token} role={role}>
                  <AdminAnnouncementsView apiFetch={apiFetch} />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/rag-documents"
              element={
                <RequireAdmin token={token} role={role}>
                  <AdminRagDocumentsView apiFetch={apiFetch} />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/news-tools"
              element={
                <RequireAdmin token={token} role={role}>
                  <AdminNewsToolsView apiFetch={apiFetch} showNotification={showNotification} />
                </RequireAdmin>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </TooltipProvider>
    </Router>
  );
}
